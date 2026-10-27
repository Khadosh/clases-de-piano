/** Tipos de `escribir-pieza.mjs`, para que el MCP lo importe desde TypeScript. */
import type { Evento } from "../lib/pentagrama.ts";

export function evento(e: Evento): string;
export function filaDe(evs: Evento[]): string[];
export function escribirVoces(voces: Evento[][], sangria: string): string;
export function escribirPieza(pieza: {
  slug: string;
  titulo: string;
  compositor?: string;
  anio?: string;
  compas: { numerador: number; denominador: number };
  tonalidad: { tonica: number; modo: "mayor" | "menor" };
  bpm: number;
  dificultad?: number;
  propia?: boolean;
  derecha: Evento[][];
  izquierda: Evento[][];
  extra?: string;
}): string;
