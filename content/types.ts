/**
 * El modelo de contenido del cuaderno.
 *
 * Cada clase es un archivo en content/lessons/. Un archivo, un miércoles.
 * Los bloques son las piezas con las que se arma una clase: agregar una clase
 * nueva es escribir bloques, nunca tocar componentes.
 */

import type { Hand } from "@/lib/music";

export type Block =
  | SectionBlock
  | ProseBlock
  | CorrectionBlock
  | ChordLabBlock
  | ExerciseBlock
  | HandsBlock
  | NomenclatureBlock
  | QuoteBlock;

/**
 * Divide la clase en partes. No dibuja contenido: pone un título grande y
 * arma el índice de la clase, que se calcula solo a partir de estos bloques.
 * Las clases largas sin esto se vuelven un chorizo.
 */
export interface SectionBlock {
  kind: "section";
  title: string;
  intro?: string;
  emoji: string;
}

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
  /**
   * Suma el eje de las inversiones. Girar un acorde es la misma operación que
   * armarlo —las mismas notas, otra abajo— así que es el mismo bloque con una
   * fila más, y no uno aparte.
   */
  inversiones?: boolean;
}

/** El ejercicio de posiciones que sube y baja desplazándose. */
export interface ExerciseBlock {
  kind: "exercise";
  title: string;
  intro?: string;
  variants: {
    label: string;
    hand: Hand | "ambas";
    /**
     * `completo` sube una octava con el hueco abajo y baja otra con el hueco
     * arriba. `sube` y `baja` son cada tramo por separado, para estudiarlos.
     */
    recorrido: "completo" | "sube" | "baja";
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
