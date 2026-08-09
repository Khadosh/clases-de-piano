/**
 * Motor de teoría musical del proyecto.
 *
 * Todo se calcula acá: los acordes no están hardcodeados en ningún lado, se
 * construyen apilando semitonos igual que como los explica el profe
 * ("mayor = 4 + 3", "menor = 3 + 4"). Si algún día aparece un acorde nuevo en
 * una clase, se agrega una receta a CHORD_QUALITIES y el resto de la app
 * (teclado, dictado, quiz de nomenclatura) lo soporta sola.
 */

export type Pitch = number; // MIDI. Do central (C4) = 60.
export type PitchClass = number; // 0..11, donde 0 = Do

export const NOTES_ES = [
  "Do",
  "Do♯",
  "Re",
  "Re♯",
  "Mi",
  "Fa",
  "Fa♯",
  "Sol",
  "Sol♯",
  "La",
  "La♯",
  "Si",
] as const;

export const NOTES_EN = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

/** Los mismos negros, escritos con bemol. Útil para no mentir en los acordes. */
export const NOTES_ES_FLAT = [
  "Do",
  "Re♭",
  "Re",
  "Mi♭",
  "Mi",
  "Fa",
  "Sol♭",
  "Sol",
  "La♭",
  "La",
  "Si♭",
  "Si",
] as const;

export const NOTES_EN_FLAT = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;

export const BLACK_PCS = new Set([1, 3, 6, 8, 10]);

export const isBlack = (p: Pitch) => BLACK_PCS.has(mod12(p));

export function mod12(n: number): PitchClass {
  return ((n % 12) + 12) % 12;
}

export function noteName(
  p: Pitch,
  opts: { lang?: "es" | "en"; flat?: boolean } = {},
): string {
  const { lang = "es", flat = false } = opts;
  const table =
    lang === "es"
      ? flat
        ? NOTES_ES_FLAT
        : NOTES_ES
      : flat
        ? NOTES_EN_FLAT
        : NOTES_EN;
  return table[mod12(p)];
}

export function octaveOf(p: Pitch): number {
  return Math.floor(p / 12) - 1;
}

export function noteNameWithOctave(p: Pitch, lang: "es" | "en" = "es"): string {
  return `${noteName(p, { lang })}${octaveOf(p)}`;
}

/** Frecuencia en Hz, temperamento igual, La4 = 440. */
export function freq(p: Pitch): number {
  return 440 * Math.pow(2, (p - 69) / 12);
}

// ---------------------------------------------------------------------------
// Acordes
// ---------------------------------------------------------------------------

export type ChordFamily = "triada" | "suspendido" | "septima";

export interface ChordQuality {
  id: string;
  /** Cómo se llama en castellano, como lo dice el profe. */
  name: string;
  /** Sufijo en nomenclatura inglesa: "" para mayor, "m" para menor, etc. */
  suffix: string;
  /** Variantes de escritura que también son válidas (para el quiz). */
  aliases?: string[];
  family: ChordFamily;
  /**
   * La receta tal cual se piensa al tocar: cuántos semitonos hay de cada dedo
   * al siguiente. Mayor = [4, 3] → "cuatro y tres".
   */
  stack: number[];
  /** Una línea de por qué suena como suena. */
  vibe: string;
  /** Clase de color de Tailwind para pintarlo en el teclado. */
  tone: "sol" | "luna" | "brasa" | "menta" | "uva" | "niebla";
  /** En qué clase apareció por primera vez. */
  learnedIn: number;
}

export const CHORD_QUALITIES: ChordQuality[] = [
  {
    id: "maj",
    name: "Mayor",
    suffix: "",
    family: "triada",
    stack: [4, 3],
    vibe: "El de tierra firme. Primero el salto grande, después el chico.",
    tone: "sol",
    learnedIn: 1,
  },
  {
    id: "min",
    name: "Menor",
    suffix: "m",
    aliases: ["min", "-"],
    family: "triada",
    stack: [3, 4],
    vibe: "El mayor dado vuelta: chico y después grande. Baja la persiana.",
    tone: "luna",
    learnedIn: 1,
  },
  {
    id: "aug",
    name: "Aumentado",
    suffix: "aug",
    aliases: ["+", "#5"],
    family: "triada",
    stack: [4, 4],
    vibe: "Dos saltos grandes iguales. No descansa en ningún lado, siempre empuja.",
    tone: "brasa",
    learnedIn: 1,
  },
  {
    id: "dim",
    name: "Disminuido",
    suffix: "dim",
    aliases: ["°", "o"],
    family: "triada",
    stack: [3, 3],
    vibe: "Dos saltos chicos iguales. Apretado, tenso, de película de suspenso.",
    tone: "uva",
    learnedIn: 1,
  },
  {
    id: "sus2",
    name: "Sus2",
    suffix: "sus2",
    family: "suspendido",
    stack: [2, 5],
    vibe: "Corrés el dedo del medio un lugar para abajo. Ni alegre ni triste: abierto.",
    tone: "menta",
    learnedIn: 1,
  },
  {
    id: "sus4",
    name: "Sus4",
    suffix: "sus4",
    aliases: ["sus"],
    family: "suspendido",
    stack: [5, 2],
    vibe: "Corrés el dedo del medio un lugar para arriba. Queda colgado, pidiendo resolver.",
    tone: "menta",
    learnedIn: 1,
  },
  {
    id: "maj7",
    name: "Séptima mayor",
    suffix: "maj7",
    aliases: ["△", "Δ", "M7"],
    family: "septima",
    stack: [4, 3, 4],
    vibe: "Mayor + un salto grande arriba. El triangulito. Suena a domingo a la tarde.",
    tone: "sol",
    learnedIn: 1,
  },
  {
    id: "dom7",
    name: "Séptima (de dominante)",
    suffix: "7",
    family: "septima",
    stack: [4, 3, 3],
    vibe: "Mayor + un salto chico arriba. El que tira para adelante, el del blues.",
    tone: "brasa",
    learnedIn: 1,
  },
  {
    id: "min7",
    name: "Séptima menor",
    suffix: "m7",
    aliases: ["min7", "-7"],
    family: "septima",
    stack: [3, 4, 3],
    vibe: "Menor + salto chico. Tristeza cómoda, sin drama.",
    tone: "luna",
    learnedIn: 1,
  },
  {
    id: "minmaj7",
    name: "Menor con séptima mayor",
    suffix: "m(maj7)",
    aliases: ["m△", "mM7"],
    family: "septima",
    stack: [3, 4, 4],
    vibe: "El bicho raro: menor abajo, triangulito arriba. Suena a espía.",
    tone: "uva",
    learnedIn: 1,
  },
];

export const qualityById = (id: string) =>
  CHORD_QUALITIES.find((q) => q.id === id);

/** La fórmula tal cual la dice el profe: "4 + 3". */
export function stackLabel(q: ChordQuality): string {
  return q.stack.join(" + ");
}

/** Intervalos desde la fundamental: [0, 4, 7] para mayor. */
export function intervalsOf(q: ChordQuality): number[] {
  const out = [0];
  let acc = 0;
  for (const step of q.stack) {
    acc += step;
    out.push(acc);
  }
  return out;
}

/** Las notas concretas del acorde, en MIDI, a partir de una fundamental. */
export function chordPitches(root: Pitch, q: ChordQuality): Pitch[] {
  return intervalsOf(q).map((i) => root + i);
}

/**
 * Cifrado inglés completo: "C", "Am", "F#maj7", "Gsus4".
 * Elegimos sostenido o bemol según lo que se lea menos horrible.
 */
export function chordSymbol(root: PitchClass, q: ChordQuality): string {
  return `${NOTES_EN[mod12(root)]}${q.suffix}`;
}

export function chordNameEs(root: PitchClass, q: ChordQuality): string {
  return `${NOTES_ES[mod12(root)]} ${q.name.toLowerCase()}`;
}

export interface Chord {
  root: PitchClass;
  quality: ChordQuality;
}

export function allChords(filter?: (q: ChordQuality) => boolean): Chord[] {
  const qs = filter ? CHORD_QUALITIES.filter(filter) : CHORD_QUALITIES;
  const out: Chord[] = [];
  for (let root = 0; root < 12; root++) {
    for (const quality of qs) out.push({ root, quality });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Escalas y ejercicios
// ---------------------------------------------------------------------------

/** Do mayor: las teclas blancas. Es la escala de los ejercicios de la clase 1. */
export const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

/** Grado de escala (0 = Do4) a nota MIDI, dentro de Do mayor. */
export function scaleDegreeToPitch(degree: number, base: Pitch = 60): Pitch {
  const oct = Math.floor(degree / 7);
  const idx = ((degree % 7) + 7) % 7;
  return base + oct * 12 + MAJOR_SCALE[idx];
}

export type Hand = "izquierda" | "derecha";

export interface ExerciseStep {
  pitch: Pitch;
  finger: number;
  /** Marca el momento en el que la mano se desplaza un lugar. */
  isNewPosition?: boolean;
}

/**
 * El ejercicio de la clase 1.
 *
 * En su versión original (mano izquierda, dedo 5 abajo): do - mi - fa - sol - la.
 * O sea: el dedo 5 arranca, se saltea un grado, y de ahí en adelante van todos
 * seguidos. Sube, baja, y cuando vuelve el dedo 5 se corre un lugar y empieza
 * de nuevo: re - fa - sol - la - si.
 *
 * `gapAt: 5` pone el salto del lado del dedo 5; `gapAt: 1`, del lado del dedo 1
 * (la variante invertida).
 */
export function positionDegrees(gapAt: 5 | 1): number[] {
  // Grados relativos al primer grado de la posición.
  return gapAt === 5 ? [0, 2, 3, 4, 5] : [0, 1, 2, 3, 5];
}

export function buildExercise(opts: {
  hand: Hand;
  gapAt: 5 | 1;
  positions: number;
  startDegree?: number;
  base?: Pitch;
}): ExerciseStep[] {
  const { hand, gapAt, positions, startDegree = 0, base = 60 } = opts;
  const rel = positionDegrees(gapAt);
  const steps: ExerciseStep[] = [];

  for (let p = 0; p < positions; p++) {
    const degrees = rel.map((d) => startDegree + p + d);
    // El dedo 5 de la izquierda toca la nota más grave; el de la derecha, la más
    // aguda. La secuencia siempre sube y baja; lo que cambia es la digitación.
    const fingers =
      hand === "izquierda" ? [5, 4, 3, 2, 1] : [1, 2, 3, 4, 5];

    const up = degrees.map((d, i) => ({
      pitch: scaleDegreeToPitch(d, base),
      finger: fingers[i],
      isNewPosition: i === 0,
    }));
    // La vuelta no repite la nota de arriba ni la de abajo.
    const down = up.slice(0, -1).reverse().map((s) => ({ ...s, isNewPosition: false }));
    steps.push(...up, ...down);
  }
  return steps;
}

// ---------------------------------------------------------------------------
// Ayuda para el quiz de nomenclatura
// ---------------------------------------------------------------------------

/** Devuelve un entero pseudo-aleatorio determinístico a partir de una semilla. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };
}

export function pickRandom<T>(arr: T[], rnd: () => number = Math.random): T {
  return arr[Math.floor(rnd() * arr.length)];
}

export function shuffle<T>(arr: T[], rnd: () => number = Math.random): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
