/**
 * La sección «Aprender» de una partitura: la ficha «Analizar» con los seis
 * pasos del profe y la práctica por capas, cada una con su loop. Nació con
 * Here Comes the Sun (#5–#10) y es una sola pieza para todas: cada canción
 * trae sus datos y la página `/partituras/<slug>/aprender` los dibuja.
 *
 * El tipo exige lo que la sección promete: los seis pasos (`Analisis`, de
 * `lib/analisis.ts`) y las capas en el orden en que se practican —primero la
 * base, después lo que se le pone encima— **terminando siempre en todo
 * junto**. `test:canciones` lo vuelve a mirar en tiempo de ejecución, porque
 * un paso con la respuesta vacía también compila.
 */

import type { CompasDeCapa, Voicing } from "@/lib/capas";
import type { Analisis } from "@/lib/analisis";
import type { TramoDeArmonia } from "@/lib/tramos";

interface CapaComun {
  titulo: string;
  /** Una línea: qué se practica en esta capa. */
  bajada: string;
  /** Cómo encararla. Acepta *asteriscos*. */
  como: string[];
}

export type CapaTodo = CapaComun & {
  /** Todo junto, por secciones, con cómo se toca cada una. */
  tipo: "todo";
  secciones: { nombre: string; caracter: string; compases: CompasDeCapa[] }[];
  notas: string[];
};

export type Capa =
  | CapaTodo
  | (CapaComun &
      (
        | {
            /** Los acordes uno por uno y en vuelta, con las teclas que se quedan marcadas. */
            tipo: "acordes";
            acordes: Voicing[];
            vuelta: CompasDeCapa[];
          }
        | {
            /** Un pasaje corto en loop, con el tempo regulable; antes, si hace falta, un paso previo más simple. */
            tipo: "riff";
            previo?: { titulo: string; como: string; compases: CompasDeCapa[] };
            nombreDelLoop: string;
            compases: CompasDeCapa[];
          }
        | {
            /** Sólo el metrónomo, con los acentos por grupos y los compases para elegir. */
            tipo: "ritmo";
            compases: { nombre: string; grupos: number[] }[];
          }
        | {
            /** Una progresión con su explicación en simple y la técnica aparte, pintada por tensión. */
            tipo: "progresion";
            acordes: Voicing[];
            compases: CompasDeCapa[];
            simple: string[];
            tecnica: string[];
          }
      ));

export interface Aprendizaje {
  /** El de la partitura, si la hay: así la partitura encuentra su «Aprender». */
  slug: string;
  titulo: string;
  autor: string;
  /** De dónde es, en pocas palabras. */
  origen: string;
  /** La tonalidad en la que se practica, escrita. */
  tonalidad: string;
  /** La clase de la tónica (0 = Do): para leer los grados. */
  tonica: number;
  /** Negras por minuto al 100 %. */
  tempo: number;
  bajada: string;
  /** En orden de práctica, y la última es todo junto. */
  capas: [...Exclude<Capa, CapaTodo>[], CapaTodo];
  /** La ficha «Analizar»: los seis pasos del profe, en su orden (`lib/analisis.ts`). */
  analisis: Analisis;
  /**
   * Si sale de una partitura: qué acorde suena en cada tramo, de punta a
   * punta. Las capas se parten con esto (`tramosDePieza`) y el test lo cruza
   * con las notas de la partitura.
   */
  armonia?: TramoDeArmonia[];
  /**
   * Las notas de la derecha que caen en el primer tiempo de un tramo sin ser
   * de su acorde, por índice de tramo: las apoyaturas. El análisis las
   * explica; `test:canciones` grita por cualquier otra.
   */
  apoyaturas?: number[];
  /** Lo que conviene chequear: la duda anotada antes que el invento. */
  revisar: string[];
}
