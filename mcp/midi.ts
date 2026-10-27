/**
 * Un archivo MIDI estándar (SMF formato 1) a partir de una pieza del cuaderno.
 *
 * Es la forma de **escuchar** lo que el MCP compone sin abrir la app: el
 * `.mid` se abre en GarageBand, Logic, MuseScore o cualquier DAW. Sin
 * dependencias, porque el formato es chiquito: una cabecera, una pista por
 * mano, y eventos de nota con su demora en ticks.
 *
 * Lo que no sabe: ligaduras (cada evento suena entero), y los grupos
 * irregulares se escriben con su duración real —un tresillo de corcheas dura
 * dos tercios de corchea cada uno— pero sin marcar el grupo, que al MIDI no
 * le importa.
 */

import type { Evento } from "../lib/pentagrama.ts";
import { duracionDeEvento } from "../lib/pentagrama.ts";

const TICKS_POR_NEGRA = 480;

function variable(n: number): number[] {
  const bytes = [n & 0x7f];
  while ((n >>= 7) > 0) bytes.unshift((n & 0x7f) | 0x80);
  return bytes;
}

function entero32(n: number): number[] {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
}

function entero16(n: number): number[] {
  return [(n >>> 8) & 0xff, n & 0xff];
}

function pista(eventos: Evento[], nombre: string, canal: number, velocidad: number): number[] {
  const bytes: number[] = [];
  const texto = [...new TextEncoder().encode(nombre)];
  bytes.push(0x00, 0xff, 0x03, ...variable(texto.length), ...texto);
  let espera = 0;
  for (const e of eventos) {
    // `duracionDeEvento` está en redondas; una redonda son cuatro negras.
    const ticks = Math.round(duracionDeEvento(e) * 4 * TICKS_POR_NEGRA);
    if (e.midis.length === 0) {
      espera += ticks;
      continue;
    }
    e.midis.forEach((m, i) => {
      bytes.push(...variable(i === 0 ? espera : 0), 0x90 | canal, m, velocidad);
    });
    e.midis.forEach((m, i) => {
      bytes.push(...variable(i === 0 ? ticks : 0), 0x80 | canal, m, 0);
    });
    espera = 0;
  }
  bytes.push(...variable(espera), 0xff, 0x2f, 0x00);
  return [...[0x4d, 0x54, 0x72, 0x6b], ...entero32(bytes.length), ...bytes];
}

export interface PiezaParaMidi {
  bpm: number;
  derecha: Evento[];
  izquierda: Evento[];
}

export function escribirMidi(pieza: PiezaParaMidi): Uint8Array {
  const microsPorNegra = Math.round(60_000_000 / pieza.bpm);
  const tempo = [0x00, 0xff, 0x51, 0x03, (microsPorNegra >> 16) & 0xff, (microsPorNegra >> 8) & 0xff, microsPorNegra & 0xff];
  const compas = [0x00, 0xff, 0x58, 0x04, 4, 2, 24, 8];
  const control = [...tempo, ...compas, 0x00, 0xff, 0x2f, 0x00];
  const pistas = [
    [...[0x4d, 0x54, 0x72, 0x6b], ...entero32(control.length), ...control],
    pista(pieza.derecha, "derecha", 0, 88),
    pista(pieza.izquierda, "izquierda", 1, 72),
  ];
  const cabecera = [...[0x4d, 0x54, 0x68, 0x64], ...entero32(6), ...entero16(1), ...entero16(pistas.length), ...entero16(TICKS_POR_NEGRA)];
  return new Uint8Array([...cabecera, ...pistas.flat()]);
}
