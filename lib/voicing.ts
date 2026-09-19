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
  // La primera de la derecha por lo menos a una cuarta del techo de la
  // izquierda: con 1-7 abajo, la tercera cae a veces a una tercera de la
  // séptima (Si · Mi♭, en el menor con séptima mayor) y ahí se sube.
  let piso = techoIzq + 4;
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

// ---------------------------------------------------------------------------
// El dictado de voicing: se pide una disposición y se corrige lo que se tocó
// ---------------------------------------------------------------------------

export type Disposicion = "cerrada" | Reparto | "una-mano";

export const DISPOSICIONES: {
  id: Disposicion;
  nombre: string;
  /** Cómo se enuncia en el dictado: qué va en cada mano. */
  enunciado: string;
  /** Sólo tiene sentido con séptima: el 1-7 / 3-5 y el "sin fundamental". */
  soloCuatriadas: boolean;
}[] = [
  { id: "cerrada", nombre: "cerrada", enunciado: "todo apilado en una mano, de a terceras", soloCuatriadas: false },
  { id: "15-37", nombre: "abierta 1-5 / 3-7", enunciado: "1 y 5 en la izquierda, 3 y 7 en la derecha", soloCuatriadas: false },
  { id: "17-35", nombre: "abierta 1-7 / 3-5", enunciado: "1 y 7 en la izquierda, 3 y 5 en la derecha", soloCuatriadas: true },
  { id: "una-mano", nombre: "a una mano", enunciado: "sin la fundamental, girado como caiga cómodo", soloCuatriadas: true },
];

export interface PedidoDeVoicing {
  root: PitchClass;
  q: ChordQuality;
  disposicion: Disposicion;
}

/** Cuántas teclas pide como mínimo: las del acorde, o una menos sin la fundamental. */
export function teclasQuePide({ q, disposicion }: PedidoDeVoicing): number {
  const n = intervalsOf(q).length;
  return disposicion === "una-mano" && n >= 4 ? n - 1 : n;
}

/** La respuesta modelo, para las pistas y para "ver resuelto". */
export function voicingModelo({ root, q, disposicion }: PedidoDeVoicing): Voicing {
  if (disposicion === "cerrada") return cerrada(root, q);
  if (disposicion === "una-mano") return { izquierda: [], derecha: unaMano(root, q).derecha };
  return abierta(root, q, disposicion) ?? abierta(root, q, "15-37")!;
}

export type VeredictoVoicing =
  | "bien"
  /** Hay teclas que no son del acorde, o falta alguna. */
  | "notas"
  /** Las notas están, pero abajo de todo no está la fundamental. */
  | "bajo"
  /** La tercera quedó entre las dos más graves: justo lo que la clase saca de ahí. */
  | "tercera-abajo"
  /** Abajo fue el otro par (1-7 en vez de 1-5, o al revés). */
  | "reparto"
  /** El reparto está, pero la derecha arranca pegada a la izquierda: a una tercera o menos. */
  | "pegado"
  /** Se pidió cerrada y no está apilado de a terceras desde la fundamental. */
  | "no-cerrada"
  /** A una mano: la fundamental estaba, y ahí la pone el bajo. */
  | "con-fundamental";

export interface CorreccionDeVoicing {
  veredicto: VeredictoVoicing;
  /** Las manos deducidas del registro: con el MIDI no se sabe cuál apretó qué. */
  izquierda: Pitch[];
  derecha: Pitch[];
  /** Las dos teclas que quedaron pegadas, si el veredicto es "pegado". */
  pegadas?: [Pitch, Pitch];
}

/**
 * Corrige un voicing tocado contra el que se pidió.
 *
 * El criterio es el musical, como en el dictado de acordes: las notas del
 * acorde en cualquier octava. Pero acá la octava sí importa *relativamente*
 * —de qué grado es cada una de las dos más graves, y si hay aire entre
 * vecinas— porque eso es el voicing. Las manos se deducen del registro: en
 * el voicing abierto la izquierda son las dos teclas más graves. Una voz
 * duplicada (la fundamental o la quinta otra vez, arriba) no molesta.
 *
 * Devuelve null mientras falten teclas: se corrige recién con el acorde
 * completo, que ir marcando de a una es adivinar por descarte.
 */
export function corregirVoicing(puestas: Pitch[], pedido: PedidoDeVoicing): CorreccionDeVoicing | null {
  const { root, q, disposicion } = pedido;
  if (puestas.length < teclasQuePide(pedido)) return null;
  const orden = [...new Set(puestas)].sort((a, b) => a - b);
  const grados = orden.map((p) => gradoDeTecla(p, root, q));
  const clases = new Set(orden.map(mod12));
  const delAcorde = new Set(chordPitches(root, q).map(mod12));

  if (disposicion === "una-mano") {
    const manos = { izquierda: [], derecha: orden };
    if (grados.some((g) => g === null)) return { veredicto: "notas", ...manos };
    const sinFundamental = intervalsOf(q).length >= 4;
    if (sinFundamental && clases.has(root)) return { veredicto: "con-fundamental", ...manos };
    const esperadas = sinFundamental ? [...delAcorde].filter((c) => c !== root) : [...delAcorde];
    if (!esperadas.every((c) => clases.has(c))) return { veredicto: "notas", ...manos };
    return { veredicto: "bien", ...manos };
  }

  const manos =
    disposicion === "cerrada"
      ? { izquierda: orden, derecha: [] as Pitch[] }
      : { izquierda: orden.slice(0, 2), derecha: orden.slice(2) };
  const mismasNotas = grados.every((g) => g !== null) && [...delAcorde].every((c) => clases.has(c));
  if (!mismasNotas) return { veredicto: "notas", ...manos };
  if (grados[0] !== 1) return { veredicto: "bajo", ...manos };

  if (disposicion === "cerrada") {
    const apilado = chordPitches(orden[0], q);
    const igual = orden.length === apilado.length && orden.every((p, i) => p === apilado[i]);
    return { veredicto: igual ? "bien" : "no-cerrada", ...manos };
  }

  const reparto = REPARTOS.find((r) => r.id === disposicion)!;
  const abajo = [grados[0]!, grados[1]!].sort((a, b) => a - b);
  if (abajo.includes(3)) return { veredicto: "tercera-abajo", ...manos };
  const izqEsperada = reparto.izquierda.filter((g) => intervalsOf(q).length >= 4 || g !== 7);
  if (abajo.join() !== izqEsperada.join()) return { veredicto: "reparto", ...manos };

  // El aire se mide en la costura entre las manos: la primera tecla de la
  // derecha tiene que estar por lo menos a una cuarta del techo de la
  // izquierda. Adentro de la izquierda ya hay aire (1-5 es una quinta, 1-7
  // una séptima), y adentro de la derecha el 3-5 es una tercera por
  // definición, así que ahí no hay nada que pedir.
  const techo = manos.izquierda[1];
  const primeraDer = manos.derecha[0];
  if (primeraDer - techo < 5) {
    return { veredicto: "pegado", ...manos, pegadas: [techo, primeraDer] };
  }
  return { veredicto: "bien", ...manos };
}
