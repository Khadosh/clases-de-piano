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

// ---------------------------------------------------------------------------
// Inversiones
// ---------------------------------------------------------------------------

/**
 * Invertir es agarrar la nota de abajo y subirla una octava. Nada más.
 * El acorde sigue siendo el mismo —las mismas notas— pero cambia cuál queda
 * en el bajo, y con eso cambia el color y la comodidad de la mano.
 *
 * Un acorde de tres notas tiene dos inversiones; uno de cuatro, tres.
 */
export function invertir(pitches: Pitch[], n: number): Pitch[] {
  const out = [...pitches];
  for (let i = 0; i < n; i++) {
    const grave = out.shift();
    if (grave === undefined) break;
    out.push(grave + 12);
  }
  return out;
}

/** Cuántas inversiones tiene un acorde: siempre una menos que sus notas. */
export const cantidadDeInversiones = (q: ChordQuality) => q.stack.length;

export const NOMBRES_INVERSION = [
  "fundamental",
  "1ª inversión",
  "2ª inversión",
  "3ª inversión",
] as const;

/** Qué grado del acorde queda abajo en cada inversión: 1, 3, 5, 7. */
export const GRADOS_ACORDE = ["1", "3", "5", "7"] as const;

/**
 * Cifrado con barra: C/E es un Do mayor con el Mi en el bajo. Es como se
 * escribe una inversión cuando importa qué nota quedó abajo.
 */
export function simboloConBajo(
  root: PitchClass,
  q: ChordQuality,
  inversion: number,
): string {
  const base = chordSymbol(root, q);
  if (inversion === 0) return base;
  const bajo = mod12(root + intervalsOf(q)[inversion]);
  return `${base}/${NOTES_EN[bajo]}`;
}

export function allChords(filter?: (q: ChordQuality) => boolean): Chord[] {
  const qs = filter ? CHORD_QUALITIES.filter(filter) : CHORD_QUALITIES;
  const out: Chord[] = [];
  for (let root = 0; root < 12; root++) {
    for (const quality of qs) out.push({ root, quality });
  }
  return out;
}

/**
 * ¿Lo que armaste es el acorde que se pedía?
 *
 * El criterio es el musical y no el literal: tienen que estar las mismas notas
 * —en cualquier octava y en cualquier orden— y el bajo tiene que ser el que
 * corresponde. Eso acepta cualquier disposición razonable de la mano y a la vez
 * no deja pasar una inversión por otra.
 *
 * `bajo` es su propio caso a propósito: armar bien las notas y equivocarse de
 * vuelta es *el* error típico de las inversiones, y decirle "está mal" a eso no
 * enseña nada.
 */
export function corregirAcorde(
  armado: Pitch[],
  objetivo: Pitch[],
): "bien" | "bajo" | "mal" | null {
  if (armado.length !== objetivo.length || armado.length === 0) return null;
  const clases = new Set(armado.map(mod12));
  const esperadas = new Set(objetivo.map(mod12));
  const mismasNotas =
    clases.size === esperadas.size && [...esperadas].every((c) => clases.has(c));
  if (!mismasNotas) return "mal";
  return mod12(Math.min(...armado)) === mod12(Math.min(...objetivo))
    ? "bien"
    : "bajo";
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

/** De qué lado de la posición queda el grado que se saltea. */
export type Gap = "abajo" | "arriba";

/** Para dónde se va desplazando la mano. */
export type Sentido = "sube" | "baja";

export interface ExerciseStep {
  pitch: Pitch;
  finger: number;
  /** Grado más grave de las cinco teclas apoyadas en este momento. */
  home: number;
  /** De qué lado está el hueco ahora: en el ejercicio completo cambia a mitad. */
  gap: Gap;
  /** Cuántos desplazamientos van (0 = la posición inicial). */
  position: number;
  /** Marca la nota en la que la mano se corre un lugar. */
  isNewPosition?: boolean;
}

/**
 * Los cinco grados que ocupa la mano, de grave a agudo, relativos al más grave.
 *
 * Con el hueco abajo: 0, 2, 3, 4, 5 → do _ mi fa sol la.
 * Con el hueco arriba: 0, 1, 2, 3, 5 → do re mi fa _ la.
 */
export function positionOffsets(gap: Gap): number[] {
  return gap === "abajo" ? [0, 2, 3, 4, 5] : [0, 1, 2, 3, 5];
}

/** Las cinco teclas que la mano tiene apoyadas en un momento dado. */
export function manoEn(step: ExerciseStep, base: Pitch = 60): Pitch[] {
  return positionOffsets(step.gap).map((o) =>
    scaleDegreeToPitch(step.home + o, base),
  );
}

/**
 * El ejercicio de la clase 1.
 *
 * Es un recorrido continuo, no una ida y vuelta que cierra: **nunca se vuelve
 * al dedo que arrancó**. Se sube hasta el otro extremo de la mano, se baja, y
 * la última nota de la bajada ya es la nota nueva del dedo que guía: ahí la
 * mano se corrió un lugar y el ciclo sigue sin cortarse.
 *
 * Con la izquierda y el hueco abajo, arrancando en do, sale así:
 *
 *   do mi fa sol la sol fa mi | re · fa sol la si la sol fa | mi · sol la si do…
 *   └── posición 1 ────────┘   └ posición 2 ──────────────┘   └ posición 3 …
 *
 * El "re" cierra la primera posición y abre la segunda al mismo tiempo.
 * Se sigue hasta completar una octava; recién la última posición cierra
 * volviendo a su propia nota de arranque, para terminar en algún lado.
 */
export function buildExercise(opts: {
  hand: Hand;
  gap: Gap;
  /** Cuántos desplazamientos. 8 = una octava entera. */
  positions?: number;
  startDegree?: number;
  base?: Pitch;
  sentido?: Sentido;
  /**
   * La primera nota ya sonó en la fase anterior (para encadenar subida y
   * bajada sin repetirla).
   */
  incluirPrimera?: boolean;
  /**
   * Cómo termina la última posición. `cierra` vuelve a su nota de arranque;
   * `solo-ida` corta al llegar al otro extremo, que es lo que hace falta
   * cuando después sigue otra fase o cuando el ejercicio termina ahí.
   */
  ultima?: "cierra" | "solo-ida";
  /** Desde qué número empezar a contar las posiciones, para encadenar fases. */
  desdePosicion?: number;
}): ExerciseStep[] {
  const {
    hand,
    gap,
    positions = 8,
    startDegree = 0,
    base = 60,
    sentido = "sube",
    incluirPrimera = true,
    ultima = "cierra",
    desdePosicion = 0,
  } = opts;

  const dir = sentido === "sube" ? 1 : -1;
  const offsets = positionOffsets(gap);
  // En la izquierda el dedo 5 toca la nota más grave; en la derecha, el 1.
  const fingers = hand === "izquierda" ? [5, 4, 3, 2, 1] : [1, 2, 3, 4, 5];

  // El dedo que guía es el que está del lado del hueco: es el que arranca,
  // el que cierra y el que se desplaza.
  const lead = gap === "abajo" ? 0 : 4;
  const ida = gap === "abajo" ? [0, 1, 2, 3, 4] : [4, 3, 2, 1, 0];
  const vuelta = gap === "abajo" ? [3, 2, 1] : [1, 2, 3];

  const steps: ExerciseStep[] = [];
  const nota = (p: number, i: number, isNewPosition = false): ExerciseStep => {
    const home = startDegree + dir * p;
    return {
      pitch: scaleDegreeToPitch(home + offsets[i], base),
      finger: fingers[i],
      home,
      gap,
      position: desdePosicion + p,
      isNewPosition,
    };
  };

  for (let p = 0; p < positions; p++) {
    // La primera nota de cada posición ya sonó: es la nota del desplazamiento
    // con la que cerró la posición anterior. Sólo la primera de todas hay que
    // tocarla, y ni siquiera eso si viene encadenada de otra fase.
    if (p === 0 && incluirPrimera) steps.push(nota(p, lead, true));

    const esUltima = p === positions - 1;
    for (const i of ida.slice(1)) steps.push(nota(p, i));
    if (esUltima && ultima === "solo-ida") break;

    for (const i of vuelta) steps.push(nota(p, i));
    // El desplazamiento: el dedo que guía cae un lugar más adentro y con eso
    // ya arrancó la posición siguiente.
    if (!esUltima) steps.push(nota(p + 1, lead, true));
    else steps.push(nota(p, lead));
  }
  return steps;
}

/**
 * El ejercicio completo: sube una octava con el hueco abajo y baja una octava
 * con el hueco arriba.
 *
 * El pivote es lo lindo: al terminar la subida el dedo 1 está en la nota más
 * aguda, y la bajada arranca *de esa misma nota*. La mano no se mueve de
 * lugar, sólo se reacomoda —el hueco pasa del lado del dedo 5 al lado del
 * dedo 1— y ahora el que saltea y se desplaza es el agudo. Es el mismo
 * ejercicio dado vuelta, sin cortar el hilo.
 */
export function buildExerciseCompleto(opts: {
  hand: Hand;
  base?: Pitch;
  startDegree?: number;
  /** Desplazamientos por tramo. 8 = una octava para cada lado. */
  positions?: number;
}): ExerciseStep[] {
  const { hand, base = 60, startDegree = 0, positions = 8 } = opts;
  const subida = buildExercise({
    hand,
    gap: "abajo",
    sentido: "sube",
    positions,
    startDegree,
    base,
    ultima: "solo-ida",
  });
  const bajada = buildExercise({
    hand,
    gap: "arriba",
    sentido: "baja",
    positions,
    // Arranca donde terminó la subida, con la mano en el mismo lugar.
    startDegree: startDegree + positions - 1,
    base,
    incluirPrimera: false,
    ultima: "solo-ida",
    desdePosicion: positions,
  });
  return [...subida, ...bajada];
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
