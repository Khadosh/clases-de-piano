/**
 * El modelo de contenido del cuaderno.
 *
 * Cada clase es un archivo en content/lessons/. Un archivo, un miércoles.
 * Los bloques son las piezas con las que se arma una clase: agregar una clase
 * nueva es escribir bloques, nunca tocar componentes.
 */

import type { Hand } from "@/lib/music";

export type Block =
  | ProseBlock
  | CorrectionBlock
  | ChordLabBlock
  | ExerciseBlock
  | HandsBlock
  | NomenclatureBlock
  | QuoteBlock;

/** Texto suelto. `text` acepta *asteriscos* para resaltar. */
export interface ProseBlock {
  kind: "prose";
  title?: string;
  text: string;
}

/** Una corrección del profe: qué estaba haciendo mal y con qué imagen lo explicó. */
export interface CorrectionBlock {
  kind: "correction";
  title: string;
  /** El error, dicho sin vueltas. */
  problem: string;
  /** Qué hay que hacer en cambio. */
  fix: string;
  /** La analogía del profe, si la hubo. Se muestra destacada. */
  analogy?: string;
  emoji: string;
}

/** Un set de acordes para explorar en el teclado. `qualities` son ids de CHORD_QUALITIES. */
export interface ChordLabBlock {
  kind: "chord-lab";
  title: string;
  intro?: string;
  qualities: string[];
  /** Muestra el botón de dictado (el ejercicio del profe). */
  dictation?: boolean;
}

/** El ejercicio de posiciones que sube y baja desplazándose. */
export interface ExerciseBlock {
  kind: "exercise";
  title: string;
  intro?: string;
  variants: {
    label: string;
    hand: Hand | "ambas";
    gapAt: 5 | 1;
    note?: string;
  }[];
}

/** Un reparto de notas entre las dos manos (tipo el acorde de Sol de la clase 1). */
export interface HandsBlock {
  kind: "hands";
  title: string;
  intro?: string;
  positions: {
    label: string;
    izquierda: number[]; // MIDI
    derecha: number[]; // MIDI
    note?: string;
  }[];
}

/** Tabla de cifrado inglés + quiz. */
export interface NomenclatureBlock {
  kind: "nomenclature";
  title: string;
  intro?: string;
  /** Ejemplos concretos que se vieron en clase, en cifrado. */
  examples: string[];
}

/** Algo que dijo el profe y quedó picando. */
export interface QuoteBlock {
  kind: "quote";
  text: string;
  by?: string;
}

export interface Lesson {
  /** Número de clase. Es el orden y también el nivel. */
  n: number;
  /** ISO date del miércoles en cuestión. */
  date: string;
  title: string;
  /** Una línea que resume la clase, para la portada. */
  summary: string;
  /** Palabras clave, se pintan como chips. */
  tags: string[];
  blocks: Block[];
  /** Para practicar hasta el próximo miércoles. */
  homework?: string[];
  /** Cosas que quedaron a medias o que hay que confirmar con el profe. */
  openQuestions?: string[];
}

export const slugOf = (l: Lesson) => `clase-${String(l.n).padStart(2, "0")}`;
