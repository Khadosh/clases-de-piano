/**
 * El voicing: dónde va cada nota del acorde, y en qué mano.
 *
 * Es lo de la clase 7. Un acorde son las mismas tres o cuatro notas se
 * toquen como se toquen, pero *cómo* se reparten cambia todo el color: apiladas
 * en la izquierda (1-3-5, la posición cerrada) suenan densas y oscuras; con la
 * tercera subida a la derecha y la izquierda tocando sólo la fundamental y la
 * quinta (o la séptima), el mismo acorde se abre y respira. La tercera es la
 * nota que dice si el acorde es mayor o menor, así que no se saca: se muda de
 * mano y de registro.
 *
 * Todo sale de la receta del acorde (`intervalsOf`) y de un reparto de grados
 * por mano; no hay tabla de voicings. Sin React ni audio: `npm run
 * test:voicing`.
 */

import { chordPitches, intervalsOf, mod12, type ChordQuality, type Pitch, type PitchClass } from "./music.ts";

/** Los grados de un acorde, en el orden de la receta: 1, 3, 5 y, si hay, 7. */
export type GradoDeAcorde = 1 | 3 | 5 | 7;
export const GRADOS_DE_ACORDE: GradoDeAcorde[] = [1, 3, 5, 7];

export interface Voicing {
  izquierda: Pitch[];
  derecha: Pitch[];
}

/** Las teclas de un voicing de grave a agudo, sin importar la mano. */
export const teclasDe = (v: Voicing): Pitch[] => [...v.izquierda, ...v.derecha].sort((a, b) => a - b);

/** Qué grado del acorde es cada tecla: la fundamental es 1, la tercera 3… */
export function gradoDeTecla(pitch: Pitch, root: PitchClass, q: ChordQuality): GradoDeAcorde | null {
  const i = intervalsOf(q).findIndex((iv) => mod12(root + iv) === mod12(pitch));
  return i < 0 ? null : GRADOS_DE_ACORDE[i];
}

/** La tecla de un grado del acorde a partir de una fundamental en MIDI. */
function teclaDelGrado(grado: GradoDeAcorde, fundamental: Pitch, q: ChordQuality): Pitch | null {
  const i = GRADOS_DE_ACORDE.indexOf(grado);
  const ivs = intervalsOf(q);
  return i < ivs.length ? fundamental + ivs[i] : null;
}

/** La primera aparición de una clase de altura estrictamente arriba de `piso`. */
function arribaDe(pc: PitchClass, piso: Pitch): Pitch {
  let p = piso + 1;
  while (mod12(p) !== pc) p++;
  return p;
}

/**
 * La posición cerrada: el acorde tal cual se arma, apilado en una mano.
 * Con la fundamental en Do3 es la versión más densa —las tres notas juntas y
 * graves—, y es el punto de comparación de todo lo demás.
 */
export function cerrada(root: PitchClass, q: ChordQuality, base: Pitch = 48): Voicing {
  return { izquierda: chordPitches(base + root, q), derecha: [] };
}

export type Reparto = "15-37" | "17-35";

export const REPARTOS: { id: Reparto; izquierda: GradoDeAcorde[]; derecha: GradoDeAcorde[]; nombre: string }[] = [
  { id: "15-37", izquierda: [1, 5], derecha: [3, 7], nombre: "1 y 5 abajo, 3 y 7 arriba" },
  { id: "17-35", izquierda: [1, 7], derecha: [3, 5], nombre: "1 y 7 abajo, 3 y 5 arriba" },
];

/**
 * El voicing abierto a dos manos, como lo dio el profe: dos dedos en la
 * izquierda y dos en la derecha (o tres, duplicando una voz). La izquierda
 * lleva la fundamental y la quinta o la séptima; la tercera va siempre a la
 * derecha, arriba, donde no ensucia.
 *
 * Con una tríada no hay séptima: el reparto 1-5 / 3-7 queda 1-5 / 3, y ahí
 * la derecha duplica la fundamental para tener dos dedos. El 1-7 / 3-5 no
 * existe para tríadas, y devuelve null.
 *
 * `duplicar` suma una voz más a la derecha —la fundamental o la quinta, una
 * octava arriba de donde ya está— para acentuarla.
 */
export function abierta(
  root: PitchClass,
  q: ChordQuality,
  reparto: Reparto = "15-37",
  opciones: { base?: Pitch; duplicar?: GradoDeAcorde | null } = {},
): Voicing | null {
  const { base = 48, duplicar = null } = opciones;
  const r = REPARTOS.find((x) => x.id === reparto)!;
  const fundamental = base + root;
  const tieneSeptima = intervalsOf(q).length >= 4;
  if (!tieneSeptima && reparto === "17-35") return null;

  const izquierda = r.izquierda
    .map((g) => teclaDelGrado(g, fundamental, q))
    .filter((p): p is Pitch => p !== null);
  const techoIzq = Math.max(...izquierda);

  // Los grados de la derecha, cada uno en su primera aparición arriba de la
  // izquierda, de grave a agudo: así quedan a cuartas, quintas y sextas de
  // sus vecinas y no pegadas.
  const gradosDer = r.derecha.filter((g) => teclaDelGrado(g, fundamental, q) !== null);
  if (!tieneSeptima) gradosDer.push(1);
  const derecha: Pitch[] = [];
  let piso = techoIzq;
  for (const g of gradosDer) {
    const pc = mod12(teclaDelGrado(g, fundamental, q)!);
    const p = arribaDe(pc, piso);
    derecha.push(p);
    piso = p;
  }
  if (duplicar !== null) {
    const pc = mod12(teclaDelGrado(duplicar, fundamental, q) ?? fundamental);
    derecha.push(arribaDe(pc, Math.max(...derecha)));
  }
  return { izquierda, derecha };
}

/**
 * El voicing a una mano: el acorde sin la fundamental y girado, como en el
 * jazz. La fundamental la pone el bajo (o nadie, y el oído la completa), y lo
 * que queda —3, 5 y 7— se invierte para que caiga cómodo bajo la mano.
 *
 * Una tríada sin fundamental son dos notas, que no es un acorde: ahí lo que
 * queda es girarla, y `sinFundamental` lo dice.
 */
export function unaMano(
  root: PitchClass,
  q: ChordQuality,
  inversion = 0,
  base: Pitch = 60,
): { derecha: Pitch[]; sinFundamental: boolean } {
  const ivs = intervalsOf(q);
  const sinFundamental = ivs.length >= 4;
  const notas = (sinFundamental ? ivs.slice(1) : ivs).map((iv) => base + root + iv);
  const n = ((inversion % notas.length) + notas.length) % notas.length;
  const derecha = [...notas];
  for (let i = 0; i < n; i++) derecha.push(derecha.shift()! + 12);
  return { derecha, sinFundamental };
}

/** Los saltos entre teclas vecinas, en semitonos, de grave a agudo. */
export function saltosEntreVecinas(pitches: Pitch[]): number[] {
  const orden = [...pitches].sort((a, b) => a - b);
  return orden.slice(1).map((p, i) => p - orden[i]);
}

/**
 * Abierta según la clase: ninguna nota pegada a su vecina por una tercera o
 * menos. Cuartas, quintas y sextas —y más— sí.
 */
export const esAbierta = (pitches: Pitch[]) => saltosEntreVecinas(pitches).every((s) => s >= 5);

const NOMBRES_INTERVALO = [
  "unísono",
  "2ª menor",
  "2ª",
  "3ª menor",
  "3ª",
  "4ª",
  "tritono",
  "5ª",
  "6ª menor",
  "6ª",
  "7ª menor",
  "7ª",
  "8ª",
] as const;

/** Cómo se llama un salto: 7 semitonos es una quinta. Más de una octava, "8ª +". */
export function nombreDeIntervalo(semitonos: number): string {
  if (semitonos <= 12) return NOMBRES_INTERVALO[semitonos];
  return `8ª + ${NOMBRES_INTERVALO[semitonos - 12]}`;
}
