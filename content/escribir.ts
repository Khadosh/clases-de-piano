import type { Evento } from "@/lib/pentagrama";

/**
 * Los atajos con los que se escriben las piezas, para que se lean como música
 * y no como JSON. Viven aparte porque los usan dos archivos: las partituras
 * escritas a mano y las importadas de Mutopia.
 */

export const n = (midis: number | number[], divide: number, extra: Partial<Evento> = {}): Evento => ({
  midis: Array.isArray(midis) ? midis : [midis],
  divide,
  ...extra,
});

/** Tres en el tiempo de dos, que es el grupo irregular que aparece siempre. */
export const TRESILLO = { en: 3, de: 2 } as const;

export const silencio = (divide: number, extra: Partial<Evento> = {}): Evento => ({
  midis: [],
  divide,
  ...extra,
});
