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

// ---------------------------------------------------------------------------
// Las funciones armónicas (clase 3)
// ---------------------------------------------------------------------------

export type Funcion = "reposo" | "subdominante" | "dominante";

/**
 * Qué función cumple cada grado, como lo dio el profe: REPOSO es la casa
 * adonde se tiende a volver (I, IIIm, VIm), TENSIÓN o dominante son los que
 * piden volver (V, VII°), y MEDIA TENSIÓN o subdominantes son los intermedios
 * (IIm, IV).
 */
export const FUNCION_DE_GRADO: Funcion[] = [
  "reposo", // I
  "subdominante", // IIm
  "reposo", // IIIm
  "subdominante", // IV
  "dominante", // V
  "reposo", // VIm
  "dominante", // VII°
];

export const FUNCIONES: Record<
  Funcion,
  { nombre: string; alias: string; grados: number[]; papel: string }
> = {
  reposo: {
    nombre: "Reposo",
    alias: "tónica",
    grados: [0, 2, 5],
    papel: "La casa. Adonde se tiende a volver.",
  },
  subdominante: {
    nombre: "Media tensión",
    alias: "subdominante",
    grados: [1, 3],
    papel: "Los intermedios. Salen de casa sin apurar la vuelta.",
  },
  dominante: {
    nombre: "Tensión",
    alias: "dominante",
    grados: [4, 6],
    papel: "Piden volver a la casa. No se pueden quedar ahí.",
  },
};

/**
 * La regla de oro del profe: en una secuencia de acordes nunca hay que repetir
 * cuatro funciones iguales seguidas — siempre hay que variar entre las tres.
 * Devuelve la racha más larga de la misma función, para poder avisar justo
 * cuando aparece la cuarta.
 */
export function rachaDeFuncion(grados: number[]): number {
  let mejor = 0;
  let racha = 0;
  let previa: Funcion | null = null;
  for (const g of grados) {
    const f = FUNCION_DE_GRADO[g];
    racha = f === previa ? racha + 1 : 1;
    previa = f;
    mejor = Math.max(mejor, racha);
  }
  return mejor;
}

export const violaLaReglaDeOro = (grados: number[]) => rachaDeFuncion(grados) >= 4;

/**
 * Las cadencias de la clase, mirando el final de la secuencia. La plagal va
 * como la dio el profe (V → IV → I); en la clase 4 ese nombre se completó:
 * ésa es la *compuesta* plagal, y la IV → I a secas es la subdominante
 * auténtica.
 */
export function cadenciaAlFinal(
  grados: number[],
): "autentica" | "rota" | "plagal" | null {
  const n = grados.length;
  const cola = (cuantos: number) => grados.slice(n - cuantos).join(",");
  if (n >= 3 && cola(3) === "4,3,0") return "plagal";
  if (n >= 2 && cola(2) === "4,0") return "autentica";
  if (n >= 2 && cola(2) === "4,5") return "rota";
  return null;
}

// ---------------------------------------------------------------------------
// Las cadencias con nombre y apellido (clase 4)
// ---------------------------------------------------------------------------

export interface Cadencia {
  /** Índices en `TONALIDAD_MAYOR`: [4, 0] es V → I. */
  grados: number[];
  nombre: string;
  /** El porqué del nombre, para la pista y la explicación del examen. */
  detalle: string;
}

/**
 * El sistema de nombres del profe: **el apellido lo pone la función del
 * acorde que llega a la tónica**. Si llega el V es dominante, si llega el IV
 * es subdominante; si el que llega no es el principal de su familia (el IIm
 * en lugar del IV) es una *sustitución*; y si son tres acordes, la cadencia
 * es *compuesta*.
 *
 * La rota va como quedó anotada en clase — V → IIIm — con la duda registrada
 * en la clase 4: la rota de la clase 3 era V → VIm, y el IIIm es el otro
 * primo del I. Hasta preguntar, acá viven las dos.
 */
export const CADENCIAS_CON_NOMBRE: Cadencia[] = [
  {
    grados: [4, 0],
    nombre: "Dominante auténtica",
    detalle: "V → I. La tensión resuelve derecho a la casa: la más famosa de todas.",
  },
  {
    grados: [3, 0],
    nombre: "Subdominante auténtica (plagal)",
    detalle: "IV → I. La media tensión llega a la casa sin pasar por el V: la llegada blanda.",
  },
  {
    grados: [1, 0],
    nombre: "Subdominante con sustitución",
    detalle:
      "IIm → I. Llega un subdominante, pero no el principal: el IIm sustituye al IV — misma familia, otro color.",
  },
  {
    grados: [4, 2],
    nombre: "Rota",
    detalle:
      "V → IIIm. El V promete la casa y cae en un primo del reposo. En la clase 3 la rota caía en el VIm; el IIIm es el otro primo.",
  },
  {
    grados: [4, 5],
    nombre: "Rota (al VIm)",
    detalle:
      "V → VIm. La rota de la clase 3: promete el I y aterriza en el relativo menor.",
  },
  {
    grados: [1, 4, 0],
    nombre: "Compuesta auténtica",
    detalle:
      "IIm → V → I. Tres acordes, las tres funciones: media tensión, tensión, casa. La del jazz.",
  },
  {
    grados: [4, 3, 0],
    nombre: "Compuesta plagal",
    detalle:
      "V → IV → I. La plagal de la clase 3, ahora con nombre completo: el V no resuelve, se ablanda pasando por el IV.",
  },
];
