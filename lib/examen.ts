import {
  CHORD_QUALITIES,
  NOMBRES_INVERSION,
  NOTES_ES,
  cantidadDeInversiones,
  chordPitches,
  invertir,
  noteName,
  pickRandom,
  shuffle,
  simboloConBajo,
  stackLabel,
  type ChordQuality,
  type Pitch,
} from "./music";

/**
 * Las preguntas del examen de cada clase.
 *
 * No están escritas a mano: se generan a partir de lo que la clase tocó. Eso
 * hace dos cosas que importan. Una, que agregar una clase nueva traiga su
 * examen sin escribir nada. Dos, que el examen sea distinto cada vez, así se
 * aprende la receta en vez de memorizar las respuestas.
 */

export type Pregunta =
  | {
      tipo: "opciones";
      consigna: string;
      /** Se muestra grande arriba, tipo el cifrado del dictado. */
      destacado?: string;
      opciones: string[];
      correcta: number;
      explicacion: string;
    }
  | {
      tipo: "armar";
      consigna: string;
      destacado: string;
      /** Las notas que hay que apretar, con su octava de referencia. */
      pitches: Pitch[];
      explicacion: string;
    };

const BASE = 48; // Do3, para que entren las inversiones sin irse del teclado

/** Tres recetas distintas de la correcta, para las opciones equivocadas. */
function recetasDistractoras(q: ChordQuality, pozo: ChordQuality[]): string[] {
  const otras = pozo.filter((o) => stackLabel(o) !== stackLabel(q));
  const vistas = new Set<string>();
  const out: string[] = [];
  for (const o of shuffle(otras)) {
    const s = stackLabel(o);
    if (vistas.has(s)) continue;
    vistas.add(s);
    out.push(s);
    if (out.length === 3) break;
  }
  // Si la clase tiene pocos acordes, se inventan recetas plausibles.
  while (out.length < 3) {
    const falsa = q.stack.map((n) => n + (Math.random() < 0.5 ? 1 : -1)).join(" + ");
    if (!vistas.has(falsa) && falsa !== stackLabel(q)) {
      vistas.add(falsa);
      out.push(falsa);
    }
  }
  return out;
}

function conOpciones(
  consigna: string,
  correcta: string,
  distractoras: string[],
  explicacion: string,
  destacado?: string,
): Pregunta {
  const opciones = shuffle([correcta, ...distractoras]);
  return {
    tipo: "opciones",
    consigna,
    destacado,
    opciones,
    correcta: opciones.indexOf(correcta),
    explicacion,
  };
}

// ---------------------------------------------------------------------------
// Las preguntas, una fábrica por tipo
// ---------------------------------------------------------------------------

function preguntaReceta(pozo: ChordQuality[]): Pregunta {
  const q = pickRandom(pozo);
  return conOpciones(
    `¿Cuál es la receta de un acorde ${q.name.toLowerCase()}?`,
    stackLabel(q),
    recetasDistractoras(q, pozo),
    `${q.name}: ${stackLabel(q)} semitonos. ${q.vibe}`,
  );
}

function preguntaCifrado(pozo: ChordQuality[]): Pregunta {
  const q = pickRandom(pozo);
  const root = Math.floor(Math.random() * 12);
  const notas = chordPitches(BASE + root, q)
    .map((p) => noteName(p))
    .join(" · ");
  const distractoras = new Set<string>();
  let guard = 0;
  while (distractoras.size < 3 && guard++ < 100) {
    const otra = pickRandom(pozo);
    const otroRoot =
      Math.random() < 0.5 ? root : Math.floor(Math.random() * 12);
    const cand = chordPitches(BASE + otroRoot, otra)
      .map((p) => noteName(p))
      .join(" · ");
    if (cand !== notas) distractoras.add(cand);
  }
  return conOpciones(
    "¿Qué notas tiene este acorde?",
    notas,
    [...distractoras],
    `${NOTES_ES[root]} ${q.name.toLowerCase()} se arma contando ${stackLabel(q)} desde ${NOTES_ES[root]}.`,
    simboloConBajo(root, q, 0),
  );
}

function preguntaArmar(pozo: ChordQuality[], conInversiones: boolean): Pregunta {
  const q = pickRandom(pozo);
  const root = Math.floor(Math.random() * 12);
  const inv = conInversiones
    ? Math.floor(Math.random() * (cantidadDeInversiones(q) + 1))
    : 0;
  const pitches = invertir(chordPitches(BASE + root, q), inv);
  return {
    tipo: "armar",
    consigna:
      inv === 0
        ? "Armalo en el teclado."
        : "Armalo en el teclado, con el bajo que pide.",
    destacado: simboloConBajo(root, q, inv),
    pitches,
    explicacion:
      inv === 0
        ? `${NOTES_ES[root]} ${q.name.toLowerCase()}: ${stackLabel(q)} desde ${NOTES_ES[root]}.`
        : `Es ${NOTES_ES[root]} ${q.name.toLowerCase()} en ${NOMBRES_INVERSION[inv]}: las mismas notas, pero con ${noteName(pitches[0])} abajo de todo.`,
  };
}

/** Los dos lugares del teclado sin tecla negra en el medio. */
function preguntaSemitonos(): Pregunta {
  const pares: [string, string, number][] = [
    ["mi", "fa", 1],
    ["si", "do", 1],
    ["do", "re", 2],
    ["re", "mi", 2],
    ["fa", "sol", 2],
    ["sol", "la", 2],
    ["la", "si", 2],
  ];
  const [a, b, n] = pickRandom(pares);
  return conOpciones(
    `¿Cuántos semitonos hay de ${a} a ${b}?`,
    String(n),
    [String(n === 1 ? 2 : 1), String(n + 2), "medio"],
    n === 1
      ? `Uno solo: entre ${a} y ${b} no hay tecla negra en el medio. Por eso ${a}♯ es ${b}.`
      : `Dos: entre ${a} y ${b} hay una tecla negra en el medio.`,
  );
}

function preguntaInversion(pozo: ChordQuality[]): Pregunta {
  const q = pickRandom(pozo.filter((x) => cantidadDeInversiones(x) >= 2) ?? pozo);
  const root = Math.floor(Math.random() * 12);
  const inv = 1 + Math.floor(Math.random() * cantidadDeInversiones(q));
  const pitches = invertir(chordPitches(BASE + root, q), inv);
  const correcta = noteName(pitches[0]);
  const otras = NOTES_ES.filter((n) => n !== correcta);
  return conOpciones(
    `¿Qué nota queda abajo de todo?`,
    correcta,
    shuffle([...otras]).slice(0, 3),
    `La barra dice cuál va en el bajo. ${simboloConBajo(root, q, inv)} es ${NOTES_ES[root]} ${q.name.toLowerCase()} con ${correcta} abajo.`,
    simboloConBajo(root, q, inv),
  );
}

// ---------------------------------------------------------------------------

export interface OpcionesExamen {
  /** Ids de acordes que la clase tocó. Si está vacío, no hay examen. */
  qualityIds: string[];
  /** ¿La clase vio inversiones? */
  inversiones: boolean;
  /** ¿La clase vio lo de los semitonos? */
  semitonos: boolean;
  cantidad?: number;
}

/**
 * Arma un examen mezclando los tipos de pregunta que la clase habilita.
 * Siempre hay al menos una de armar en el teclado: es la única que no se puede
 * contestar de casualidad.
 */
export function generarExamen({
  qualityIds,
  inversiones,
  semitonos,
  cantidad = 8,
}: OpcionesExamen): Pregunta[] {
  const pozo = qualityIds
    .map((id) => CHORD_QUALITIES.find((q) => q.id === id))
    .filter((q): q is ChordQuality => Boolean(q));
  if (pozo.length === 0) return [];

  const fabricas: (() => Pregunta)[] = [
    () => preguntaReceta(pozo),
    () => preguntaCifrado(pozo),
    () => preguntaArmar(pozo, false),
    () => preguntaArmar(pozo, inversiones),
  ];
  if (semitonos) fabricas.push(preguntaSemitonos);
  if (inversiones) {
    fabricas.push(() => preguntaInversion(pozo));
    fabricas.push(() => preguntaArmar(pozo, true));
  }

  const preguntas: Pregunta[] = [];
  // Se garantiza una de armar y después se completa mezclando.
  preguntas.push(preguntaArmar(pozo, false));
  while (preguntas.length < cantidad) {
    preguntas.push(pickRandom(fabricas)());
  }
  return shuffle(preguntas);
}
