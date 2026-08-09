/**
 * Detector de altura (qué nota estás tocando) por el método de McLeod.
 *
 * Es autocorrelación normalizada (NSDF). La autocorrelación pelada se equivoca
 * de octava todo el tiempo con el piano, porque el segundo armónico suele sonar
 * más fuerte que la fundamental; McLeod corrige eso eligiendo el *primer* pico
 * importante en vez del más alto.
 *
 * Sirve para una nota por vez. Para acordes hace falta otra cosa (análisis
 * espectral), que es harina de otro costal.
 */

/** Rango que nos importa: de Do1 a Do7, con margen. */
const HZ_MIN = 55;
const HZ_MAX = 2100;

/** Por debajo de esto es silencio (o ruido de sala) y no vale la pena mirar. */
const RMS_MIN = 0.01;

/**
 * Qué tan claro tiene que ser el pico para creerle. Bajo = más permisivo pero
 * más notas fantasma; alto = se pierde el final de las notas que se apagan.
 */
const CLARITY_MIN = 0.88;

export interface PitchReading {
  hz: number;
  /** Nota MIDI más cercana. Do central = 60. */
  midi: number;
  /** Qué tan desafinado está respecto de esa nota, en cents (-50 a 50). */
  cents: number;
  /** 0 a 1. Cuánta confianza hay en la lectura. */
  clarity: number;
  /** Volumen de entrada, para dibujar el vúmetro. */
  rms: number;
}

export function rmsOf(buf: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

export function hzToMidi(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440);
}

export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Qué tan alto tiene que ser un pico, comparado con el más alto, para que se lo
 * tome como el período real.
 *
 * Es la perilla de los errores de octava, y la tentación es subirla: si una
 * nota parpadea entre su octava y la de arriba, parece que hay que ser más
 * estricto con el pico temprano. Probado contra una grabación de piano de
 * verdad, subirla empeora todo (a 0.97 los errores se triplican). El 0.9 de la
 * receta original es el que va; el parpadeo se arregla en otro lado.
 */
const K_PICO = 0.9;

export function detectPitch(
  buf: Float32Array,
  sampleRate: number,
  opts: { rmsMin?: number; clarityMin?: number; k?: number } = {},
): PitchReading | null {
  const rmsMin = opts.rmsMin ?? RMS_MIN;
  const clarityMin = opts.clarityMin ?? CLARITY_MIN;
  const k = opts.k ?? K_PICO;

  const rms = rmsOf(buf);
  if (rms < rmsMin) return null;

  const W = buf.length;
  const tauMin = Math.max(2, Math.floor(sampleRate / HZ_MAX));
  const tauMax = Math.min(W - 2, Math.ceil(sampleRate / HZ_MIN));
  if (tauMax <= tauMin) return null;

  // NSDF: 2·Σ x[i]·x[i+τ] / Σ (x[i]² + x[i+τ]²). Da 1 en correlación perfecta.
  const nsdf = new Float32Array(tauMax + 1);
  for (let tau = tauMin; tau <= tauMax; tau++) {
    let acf = 0;
    let div = 0;
    for (let i = 0, n = W - tau; i < n; i++) {
      const a = buf[i];
      const b = buf[i + tau];
      acf += a * b;
      div += a * a + b * b;
    }
    nsdf[tau] = div > 0 ? (2 * acf) / div : 0;
  }

  // Máximos "clave": el pico más alto de cada tramo en que la NSDF es positiva.
  // Se empieza a mirar recién después del primer cruce por cero, para saltear
  // el pico trivial de τ chico.
  const peaks: number[] = [];
  let tau = tauMin;
  while (tau <= tauMax && nsdf[tau] > 0) tau++; // saltear el lóbulo inicial
  while (tau <= tauMax) {
    if (nsdf[tau] > 0) {
      let best = tau;
      while (tau <= tauMax && nsdf[tau] > 0) {
        if (nsdf[tau] > nsdf[best]) best = tau;
        tau++;
      }
      peaks.push(best);
    } else {
      tau++;
    }
  }
  if (peaks.length === 0) return null;

  // Acá está la gracia del método: en vez del pico más alto, se toma el
  // *primero* que llegue a cierto porcentaje del más alto. Ese es el período
  // real; los posteriores son sus múltiplos (la octava abajo, la doceava).
  //
  // El porcentaje es delicado. Si una nota tiene el segundo armónico fuerte
  // —el piano casi siempre— hay un pico en la mitad del período real, y si ese
  // pico entra por el umbral se contesta la octava de arriba. Con el 0.9 de la
  // receta original, en una grabación de piano de verdad las notas parpadeaban
  // entre su octava y la de arriba varias veces por nota.
  let maxVal = 0;
  for (const p of peaks) if (nsdf[p] > maxVal) maxVal = nsdf[p];
  const umbral = maxVal * k;
  const elegido = peaks.find((p) => nsdf[p] >= umbral) ?? peaks[0];

  // Interpolación parabólica: el período real casi nunca cae justo en una
  // muestra, y sin esto la afinación se va hasta medio semitono en los agudos.
  const y0 = nsdf[elegido - 1] ?? 0;
  const y1 = nsdf[elegido];
  const y2 = nsdf[elegido + 1] ?? 0;
  const denom = 2 * (2 * y1 - y0 - y2);
  const ajuste = denom !== 0 ? (y2 - y0) / denom : 0;
  const periodo = elegido + Math.max(-1, Math.min(1, ajuste));

  const clarity = Math.min(1, Math.max(0, y1));
  if (clarity < clarityMin) return null;

  const hz = sampleRate / periodo;
  if (hz < HZ_MIN || hz > HZ_MAX) return null;

  const exacto = hzToMidi(hz);
  const midi = Math.round(exacto);
  return { hz, midi, cents: Math.round((exacto - midi) * 100), clarity, rms };
}
