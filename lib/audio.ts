"use client";

import { freq, type Pitch } from "./music";

/**
 * Un piano de juguete hecho con osciladores. No pretende sonar a Steinway:
 * alcanza para chequear con la oreja que el acorde que ves es el que suena.
 * Cero assets, cero peso, funciona en Vercel sin subir un solo sample.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ensure(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.28;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Hay que llamarlo desde un gesto del usuario antes del primer sonido. */
export function wakeAudio() {
  ensure();
}

/**
 * El mismo AudioContext que usa el sintetizador, para que el micrófono no abra
 * uno aparte: dos contextos compiten por el audio del sistema y en algunos
 * browsers uno de los dos queda mudo.
 */
export function getAudioContext(): AudioContext | null {
  return ensure();
}

export function playNote(pitch: Pitch, duration = 0.9, delay = 0) {
  const ac = ensure();
  if (!ac || !master) return;

  const t0 = ac.currentTime + delay;
  const f = freq(pitch);

  // Fundamental + un par de armónicos flojos: le da algo de cuerpo.
  const partials: [number, number, OscillatorType][] = [
    [1, 1, "triangle"],
    [2, 0.32, "sine"],
    [3, 0.12, "sine"],
  ];

  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(0.9, t0 + 0.008);
  env.gain.exponentialRampToValueAtTime(0.28, t0 + 0.12);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  env.connect(master);

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

export function playChord(pitches: Pitch[], duration = 1.6) {
  pitches.forEach((p, i) => playNote(p, duration, i * 0.012));
}

/** Arpegio: útil para escuchar la fórmula del acorde nota por nota. */
export function playArpeggio(pitches: Pitch[], step = 0.16) {
  pitches.forEach((p, i) => playNote(p, 0.5, i * step));
  playChord(pitches, 1.6);
}
