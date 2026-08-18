"use client";

import { freq, noteNameWithOctave, type Pitch } from "./music";

/**
 * El sonido de la app.
 *
 * Hay dos instrumentos y se elige solo:
 *
 * 1. Un piano de verdad, con los samples de `public/piano/`. Tone.Sampler
 *    estira cada sample a las notas de al lado, así que alcanza con uno cada
 *    tres semitonos.
 * 2. Unos osciladores. No suenan a piano pero suenan afinados, que para
 *    chequear un acorde con la oreja alcanza.
 *
 * La 2 no es un fallback de emergencia: es lo que suena en el primer segundo,
 * mientras bajan los samples, y también si nunca llegan. La app nunca queda
 * muda.
 *
 * **Tone se carga tarde, a propósito.** Son 59 KB comprimidos, casi un cuarto
 * del javascript de la página, y no hace falta ni un byte hasta que apretás
 * algo que suena. Se importa recién en `wakeAudio()`, que siempre corre desde
 * un gesto del usuario, así que baja junto con los samples y no antes.
 */

/** Un sample cada tres semitonos, de Do2 a Do6. Los nombres son los de Tone. */
const SAMPLES = [
  "C2", "D#2", "F#2", "A2",
  "C3", "D#3", "F#3", "A3",
  "C4", "D#4", "F#4", "A4",
  "C5", "D#5", "F#5", "A5",
  "C6",
];

// ---------------------------------------------------------------------------
// El contexto
// ---------------------------------------------------------------------------

let ctx: AudioContext | null = null;

/**
 * El AudioContext de la app, y hay uno solo: el micrófono cuelga de este mismo.
 * Dos contextos compiten por el audio del sistema y en algunos browsers uno de
 * los dos queda mudo. Por eso lo creamos nosotros y después le pedimos a Tone
 * que use éste, en vez de dejar que se arme el suyo.
 */
export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

// ---------------------------------------------------------------------------
// El piano
// ---------------------------------------------------------------------------

type Sampler = {
  triggerAttackRelease: (nota: string, dur: number, cuando: number) => void;
};

let sampler: Sampler | null = null;
let listo = false;

/**
 * La promesa de que el piano está listo (o de que no va a estarlo).
 *
 * Existe porque hay dos formas de pedir sonido y necesitan cosas distintas. La
 * mayoría —apretar una tecla, escuchar un acorde— quiere sonar *ya*, y que la
 * primera nota salga con osciladores mientras bajan los samples está bien. Pero
 * el que agenda una pieza entera de una sola vez no puede hacer eso: agendaría
 * los cuarenta segundos con osciladores y ya no hay vuelta atrás, aunque los
 * samples lleguen dos segundos después. Ése tiene que esperar.
 */
let cargando: Promise<void> | null = null;

function cargarPiano(): Promise<void> {
  if (cargando) return cargando;
  cargando = (async () => {
    const ac = getAudioContext();
    if (!ac) return;
    try {
      const Tone = await import("tone");
      Tone.setContext(ac);
      await new Promise<void>((resolver) => {
        const s = new Tone.Sampler({
          urls: Object.fromEntries(
            SAMPLES.map((n) => [n, `${n.replace("#", "s")}.mp3`]),
          ),
          baseUrl: "/piano/",
          release: 1.2,
          onload: () => {
            listo = true;
            sampler = s;
            resolver();
          },
          onerror: () => {
            // No están los samples: nos quedamos con los osciladores y listo.
            listo = false;
            sampler = null;
            resolver();
          },
        }).toDestination();
        s.volume.value = -6;
      });
    } catch {
      listo = false;
      sampler = null;
    }
  })();
  return cargando;
}

/**
 * Hay que llamarlo desde un gesto del usuario antes del primer sonido.
 *
 * Devuelve una promesa por si al que llama le importa que ya esté el piano de
 * verdad; casi nadie la usa, y está bien: la nota suena igual con osciladores.
 */
export function wakeAudio(): Promise<void> {
  getAudioContext();
  return cargarPiano();
}

/** ¿Ya está el piano de verdad, o lo que suena son los osciladores? */
export function hayPiano() {
  return listo;
}

// ---------------------------------------------------------------------------
// Los osciladores, para cuando no hay samples
// ---------------------------------------------------------------------------

function osciladores(pitch: Pitch, duration: number, t0: number) {
  const ac = getAudioContext();
  if (!ac) return;
  const f = freq(pitch);

  // Fundamental + un par de armónicos flojos: le da algo de cuerpo.
  const partials: [number, number, OscillatorType][] = [
    [1, 1, "triangle"],
    [2, 0.32, "sine"],
    [3, 0.12, "sine"],
  ];

  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(0.25, t0 + 0.008);
  env.gain.exponentialRampToValueAtTime(0.08, t0 + 0.12);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  env.connect(ac.destination);

  for (const [mult, gain, type] of partials) {
    const osc = ac.createOscillator();
    osc.type = type;
    osc.frequency.value = f * mult;
    const g = ac.createGain();
    g.gain.value = gain;
    osc.connect(g).connect(env);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }
}

// ---------------------------------------------------------------------------
// Tocar
// ---------------------------------------------------------------------------

/**
 * `cuando` es un instante del reloj del audio (`getAudioContext().currentTime`
 * + lo que sea). Si no se pasa, suena ya. Agendar contra el reloj del audio en
 * vez de "cuando llegue el timer" es lo que hace que el pulso no tambalee.
 */
export function playNote(pitch: Pitch, duration = 0.9, cuando?: number) {
  const ac = getAudioContext();
  if (!ac) return;
  // Nunca agendar en el pasado: Tone lo rechaza y la nota se pierde.
  const t = Math.max(cuando ?? 0, ac.currentTime);
  if (listo && sampler) {
    sampler.triggerAttackRelease(noteNameWithOctave(pitch, "en"), duration, t);
  } else {
    osciladores(pitch, duration, t);
  }
}

export function playChord(pitches: Pitch[], duration = 1.6, cuando?: number) {
  const ac = getAudioContext();
  if (!ac) return;
  const t = Math.max(cuando ?? 0, ac.currentTime);
  // Un hilito de separación entre notas: un acorde perfectamente simultáneo
  // suena a sintetizador, no a mano.
  pitches.forEach((p, i) => playNote(p, duration, t + i * 0.012));
}

/**
 * El click del metrónomo. Tres alturas, para los tres acentos del compás.
 *
 * Va con oscilador y no con los samples de piano a propósito: un piano tiene
 * ataque lento y cola larga, y para marcar dónde cae un golpe hace falta lo
 * contrario — algo corto y seco. Además tiene que poder sonar *encima* de lo
 * que estés tocando sin taparlo.
 *
 * `cuando` es del reloj del audio, igual que en `playNote`: el pulso se agenda,
 * no se dispara cuando llega el timer.
 */
export function playClick(
  acento: "fuerte" | "medio" | "debil" = "medio",
  cuando?: number,
) {
  const ac = getAudioContext();
  if (!ac) return;
  const t = Math.max(cuando ?? 0, ac.currentTime);
  const { hz, vol } =
    acento === "fuerte"
      ? { hz: 1600, vol: 0.5 }
      : acento === "medio"
        ? { hz: 1050, vol: 0.32 }
        : { hz: 780, vol: 0.14 };

  const osc = ac.createOscillator();
  osc.type = "square";
  osc.frequency.value = hz;
  const env = ac.createGain();
  // 35ms y se terminó: si el click dura más, se pisa con el siguiente cuando el
  // tempo sube y deja de servir para contar.
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(vol, t + 0.002);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
  osc.connect(env).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.06);
}

/** Arpegio: útil para escuchar la fórmula del acorde nota por nota. */
export function playArpeggio(pitches: Pitch[], step = 0.16) {
  const ac = getAudioContext();
  if (!ac) return;
  const t = ac.currentTime;
  pitches.forEach((p, i) => playNote(p, 0.5, t + i * step));
  playChord(pitches, 1.6, t + pitches.length * step + 0.1);
}
