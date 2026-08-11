/**
 * Pasa una grabación real por el detector y cuenta qué escuchó.
 *
 * Es la herramienta para calibrar: los tonos sintéticos de probar-pitch.mjs
 * dicen si el algoritmo está bien, pero no si los umbrales sirven para *tu*
 * piano, *tu* pieza y *tu* celular. Para eso hace falta una grabación.
 *
 *   node --experimental-strip-types scripts/escuchar-grabacion.mjs piano.wav
 *   node --experimental-strip-types scripts/escuchar-grabacion.mjs piano.wav --clarity 0.82 --rms 0.004
 *
 * Acepta WAV PCM directo. Para m4a/mp3/opus (lo que graba un celular) hace
 * falta ffmpeg en el PATH; si no está, se convierte a mano:
 *
 *   ffmpeg -i grabacion.m4a -ac 1 -ar 48000 -c:a pcm_s16le grabacion.wav
 */
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { detectPitch } from "../lib/pitch.ts";
import { noteName } from "../lib/music.ts";

// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const archivo = args.find((a) => !a.startsWith("--"));
const flag = (nombre, def) => {
  const i = args.indexOf(`--${nombre}`);
  return i >= 0 ? Number(args[i + 1]) : def;
};

if (!archivo || !existsSync(archivo)) {
  console.error("Uso: escuchar-grabacion.mjs <archivo de audio> [--clarity N] [--rms N]");
  process.exit(1);
}

const clarityMin = flag("clarity", undefined);
const rmsMin = flag("rms", undefined);
/** Cada cuántas muestras se toma una lectura. 800 @48k ≈ 60 por segundo, como el browser. */
const SALTO = flag("salto", 800);
const VENTANA = flag("ventana", 2048);

// ---------------------------------------------------------------------------
// Leer el audio
// ---------------------------------------------------------------------------

function leerWav(buf) {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    return null;
  }
  let pos = 12;
  let fmt = null;
  while (pos + 8 <= buf.length) {
    const id = buf.toString("ascii", pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    const cuerpo = pos + 8;
    if (id === "fmt ") {
      fmt = {
        formato: buf.readUInt16LE(cuerpo),
        canales: buf.readUInt16LE(cuerpo + 2),
        sampleRate: buf.readUInt32LE(cuerpo + 4),
        bits: buf.readUInt16LE(cuerpo + 14),
      };
    } else if (id === "data" && fmt) {
      const n = Math.floor(size / (fmt.bits / 8) / fmt.canales);
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        // Sólo el canal izquierdo: mezclar canales puede cancelar parciales.
        const off = cuerpo + i * fmt.canales * (fmt.bits / 8);
        if (fmt.formato === 3 && fmt.bits === 32) out[i] = buf.readFloatLE(off);
        else if (fmt.bits === 16) out[i] = buf.readInt16LE(off) / 32768;
        else if (fmt.bits === 32) out[i] = buf.readInt32LE(off) / 2147483648;
        else if (fmt.bits === 8) out[i] = (buf[off] - 128) / 128;
        else throw new Error(`WAV de ${fmt.bits} bits: no lo sé leer`);
      }
      return { muestras: out, sampleRate: fmt.sampleRate };
    }
    pos = cuerpo + size + (size % 2);
  }
  return null;
}

function cargar(ruta) {
  const crudo = readFileSync(ruta);
  const wav = leerWav(crudo);
  if (wav) return wav;

  // No es WAV: probar con ffmpeg.
  try {
    const salida = execFileSync(
      "ffmpeg",
      ["-v", "quiet", "-i", ruta, "-ac", "1", "-ar", "48000", "-f", "wav", "-c:a", "pcm_s16le", "pipe:1"],
      { maxBuffer: 512 * 1024 * 1024 },
    );
    const conv = leerWav(salida);
    if (conv) return conv;
  } catch {
    /* sigue abajo */
  }
  console.error(
    `No pude leer "${ruta}". Si no es un WAV PCM hace falta ffmpeg:\n` +
      `  ffmpeg -i "${ruta}" -ac 1 -ar 48000 -c:a pcm_s16le salida.wav`,
  );
  process.exit(1);
}

const { muestras, sampleRate } = cargar(archivo);
const dur = muestras.length / sampleRate;

// ---------------------------------------------------------------------------
// Escuchar
// ---------------------------------------------------------------------------

const opts = {};
if (clarityMin !== undefined) opts.clarityMin = clarityMin;
if (rmsMin !== undefined) opts.rmsMin = rmsMin;

/** Un tramo seguido en el que se leyó siempre la misma nota. */
const tramos = [];
let actual = null;
let lecturas = 0;
let sinLectura = 0;
let picoRms = 0;

const buf = new Float32Array(VENTANA);
for (let pos = 0; pos + VENTANA <= muestras.length; pos += SALTO) {
  buf.set(muestras.subarray(pos, pos + VENTANA));
  const r = detectPitch(buf, sampleRate, opts);
  const t = pos / sampleRate;

  if (!r) {
    sinLectura++;
    if (actual) {
      actual.fin = t;
      actual = null;
    }
    continue;
  }
  lecturas++;
  picoRms = Math.max(picoRms, r.rms);

  if (actual && actual.midi === r.midi) {
    actual.fin = t;
    actual.n++;
    actual.claritySum += r.clarity;
    actual.centsSum += r.cents;
  } else {
    if (actual) actual.fin = t;
    actual = {
      midi: r.midi,
      inicio: t,
      fin: t,
      n: 1,
      claritySum: r.clarity,
      centsSum: r.cents,
      rms: r.rms,
    };
    tramos.push(actual);
  }
}

// ---------------------------------------------------------------------------
// Informe
// ---------------------------------------------------------------------------

/** El mismo criterio que usa la app: un tramo cuenta si duró lo suficiente. */
const DURACION_MINIMA_MS = 100;
const duraLoSuficiente = (t) => (t.fin - t.inicio) * 1000 >= DURACION_MINIMA_MS;

console.log(`\narchivo: ${archivo}`);
console.log(
  `${dur.toFixed(1)}s @ ${sampleRate}Hz · ventana ${VENTANA} · ` +
    `umbrales: claridad ${clarityMin ?? "por defecto"}, rms ${rmsMin ?? "por defecto"}`,
);
console.log(
  `lecturas con nota: ${lecturas} · sin nota: ${sinLectura} · rms pico: ${picoRms.toFixed(4)}\n`,
);

if (picoRms < 0.02) {
  console.log(
    "⚠ La grabación entra muy bajito. Si el rms pico no llega a ~0.02, el\n" +
      "  umbral de silencio se come notas enteras: conviene grabar más cerca\n" +
      "  o normalizar el archivo antes.\n",
  );
}

console.log("tramos detectados (los que la app tomaría como nota van con ●):");
const sonoros = tramos.filter(duraLoSuficiente);
for (const t of tramos) {
  const cuenta = duraLoSuficiente(t);
  const dur = (t.fin - t.inicio) * 1000;
  console.log(
    `  ${cuenta ? "●" : "·"} ${t.inicio.toFixed(2).padStart(6)}s  ` +
      `${(noteName(t.midi) + (Math.floor(t.midi / 12) - 1)).padEnd(6)}  ` +
      `${String(Math.round(dur)).padStart(5)}ms  ` +
      `claridad ${(t.claritySum / t.n).toFixed(3)}  ` +
      `${Math.round(t.centsSum / t.n) >= 0 ? "+" : ""}${Math.round(t.centsSum / t.n)}¢  ` +
      `rms ${t.rms.toFixed(4)}`,
  );
}

// Lo que la app habría registrado: un tramo sostenido, y no dos veces la
// misma nota sin un silencio en el medio.
const registradas = [];
for (const t of sonoros) {
  if (registradas.length === 0 || registradas[registradas.length - 1] !== t.midi) {
    registradas.push(t.midi);
  }
}
console.log(`\nla app habría escuchado ${registradas.length} notas:`);
console.log("  " + registradas.map((m) => noteName(m)).join(" "));

const fugaces = tramos.length - sonoros.length;
if (fugaces > 0) {
  console.log(
    `\n${fugaces} tramo(s) demasiado corto(s) para contar. Si entre ellos hay\n` +
      `notas que sí tocaste, hay que bajar --clarity o --rms; si son basura,\n` +
      `el filtro está haciendo su trabajo.`,
  );
}
console.log();
