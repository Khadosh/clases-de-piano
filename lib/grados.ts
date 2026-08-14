/**
 * Los grados de una tonalidad.
 *
 * Es el paso que sigue a saber armar acordes sueltos: en un tema no se piensa
 * "Sol séptima", se piensa "el quinto grado", y por eso la misma progresión se
 * puede mudar de tono sin volver a aprenderla. Todo sale de una sola tabla —
 * qué nota de la escala es cada grado y qué calidad le toca— y de ahí el cifrado
 * se calcula, no se escribe.
 *
 * Sin dependencias de React ni de nada: se prueba con `npm run test:grados`.
 */

/** Semitonos desde la tónica hasta cada grado de la escala mayor. */
export const GRADOS_MAYOR = [0, 2, 4, 5, 7, 9, 11] as const;

export interface Grado {
  /** Cómo se escribe. Minúscula = menor, el ° y el ø son los disminuidos. */
  cifra: string;
  /** El id de `CHORD_QUALITIES` para la tríada de ese grado. */
  triada: string;
  /** Y para la cuatriada, que es lo que se vio en la clase 2. */
  cuatriada: string;
  /** Para poder decir en una pista de qué se trata. */
  papel: string;
}

/**
 * Los siete grados de una tonalidad mayor.
 *
 * Las calidades no son un capricho: salen de apilar terceras de la propia
 * escala. Por eso el V es el único con séptima menor sobre tríada mayor —el
 * acorde dominante— y el VII sale disminuido.
 */
export const TONALIDAD_MAYOR: Grado[] = [
  { cifra: "I", triada: "maj", cuatriada: "maj7", papel: "la casa" },
  { cifra: "ii", triada: "min", cuatriada: "min7", papel: "el que prepara al V" },
  { cifra: "iii", triada: "min", cuatriada: "min7", papel: "el primo del I" },
  { cifra: "IV", triada: "maj", cuatriada: "maj7", papel: "el que se aleja" },
  { cifra: "V", triada: "maj", cuatriada: "dom7", papel: "el que pide volver" },
  { cifra: "vi", triada: "min", cuatriada: "min7", papel: "el relativo menor" },
  { cifra: "vii", triada: "dim", cuatriada: "m7b5", papel: "el inestable" },
];

/** La fundamental de un grado, en clase de altura. */
export function raizDelGrado(tonica: number, grado: number): number {
  return (((tonica + GRADOS_MAYOR[grado]) % 12) + 12) % 12;
}

export interface Progresion {
  nombre: string;
  /** Índices en `TONALIDAD_MAYOR`, o sea 0 = I. */
  grados: number[];
  porQue: string;
}

/**
 * Las progresiones que se practican.
 *
 * Son las que aparecen en todos lados, y están puestas en orden de utilidad y
 * no de dificultad: la ii-V-I es la primera porque es la que hay que tener en
 * los dedos en las doce tonalidades.
 */
export const PROGRESIONES: Progresion[] = [
  {
    nombre: "ii – V – I",
    grados: [1, 4, 0],
    porQue: "La cadencia de todo el jazz y de media música popular. Si vas a tener una sola en los dedos, es ésta.",
  },
  {
    nombre: "I – vi – ii – V",
    grados: [0, 5, 1, 4],
    porQue: "El giro que da vueltas sobre sí mismo: termina pidiendo el I y podés volver a empezar sin cortar.",
  },
  {
    nombre: "I – IV – V – I",
    grados: [0, 3, 4, 0],
    porQue: "La cadencia clásica. Salir de casa, alejarse, y el V trayéndote de vuelta.",
  },
  {
    nombre: "vi – IV – I – V",
    grados: [5, 3, 0, 4],
    porQue: "La de las canciones de guitarra alrededor del fogón. Los mismos cuatro acordes de arriba, empezando por el menor.",
  },
  {
    nombre: "I – V – vi – IV",
    grados: [0, 4, 5, 3],
    porQue: "La misma vuelta que la anterior corrida de lugar, y suena completamente distinta. De ahí que el orden importe.",
  },
  {
    nombre: "iii – vi – ii – V – I",
    grados: [2, 5, 1, 4, 0],
    porQue: "La cadena de quintas: cada acorde cae una quinta del siguiente. Es la ii-V-I con más pista de despegue.",
  },
];
