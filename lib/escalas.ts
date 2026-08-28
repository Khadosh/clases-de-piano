/**
 * Las escalas, por la misma idea que los acordes: **la receta en semitonos**.
 *
 * Una escala es una fila de distancias, y todo lo demás sale de ahí. La mayor
 * es tono-tono-semitono-tono-tono-tono-semitono, que es exactamente por qué las
 * teclas blancas desde Do dan la mayor sin ninguna negra: los dos semitonos de
 * la receta caen justo donde no hay tecla negra en el medio (mi-fa y si-do). Es
 * el mismo hecho que cuenta el bloque de semitonos, mirado desde el otro lado.
 *
 * **Acá no hay digitación.** Es lo primero que uno esperaría y falta a
 * propósito: la digitación de una escala no se deduce de la receta, es una
 * tabla por tonalidad y por mano, y ponerla mal enseña algo peor que no
 * ponerla. Queda para preguntarle al profe.
 */

export interface Escala {
  id: string;
  nombre: string;
  /** Semitonos desde la tónica, sin repetir la octava. */
  grados: readonly number[];
  /** Los saltos entre nota y nota, que es como la enseña un profe. */
  receta: string;
  vibe: string;
}

export const ESCALAS: Escala[] = [
  {
    id: "mayor",
    nombre: "Mayor",
    grados: [0, 2, 4, 5, 7, 9, 11],
    receta: "T T s T T T s",
    vibe: "La de las teclas blancas desde Do. Los dos semitonos caen donde no hay tecla negra en el medio.",
  },
  {
    id: "menor-natural",
    nombre: "Menor natural",
    grados: [0, 2, 3, 5, 7, 8, 10],
    receta: "T s T T s T T",
    vibe: "Las mismas notas de una mayor, empezando por su sexto grado. La de La menor es también la de las blancas.",
  },
  {
    id: "menor-armonica",
    nombre: "Menor armónica",
    grados: [0, 2, 3, 5, 7, 8, 11],
    receta: "T s T T s T+s s",
    vibe: "La menor con el séptimo grado subido, para que el V pida volver. De ahí sale ese salto de tono y medio que suena a otra cosa.",
  },
  {
    id: "menor-melodica",
    nombre: "Menor melódica",
    grados: [0, 2, 3, 5, 7, 9, 11],
    receta: "T s T T T T s",
    vibe: "La armónica sin ese salto raro: se sube también el sexto. Subiendo es ésta; bajando, clásicamente, se vuelve a la natural.",
  },
];

export function escalaPorId(id: string): Escala | undefined {
  return ESCALAS.find((e) => e.id === id);
}

/** Las notas de la escala, de la tónica a la octava, en MIDI. */
export function notasDeEscala(tonica: number, escala: Escala): number[] {
  return [...escala.grados.map((g) => tonica + g), tonica + 12];
}

/**
 * Los saltos entre nota y nota, en semitonos, incluida la vuelta a la octava.
 *
 * Es lo que se cuenta en voz alta al aprenderla, y suma 12 siempre — lo cual es
 * una manera prolija de decir que una escala es una forma de repartir la octava.
 */
export function saltosDeEscala(escala: Escala): number[] {
  const notas = [...escala.grados, 12];
  return notas.slice(1).map((n, i) => n - notas[i]);
}

/**
 * El campo armónico de una escala: sobre cada grado, una tríada apilando
 * **nota sí, nota no** dentro de la propia escala — la misma regla de la
 * clase 3, que ahí sólo se usó con la mayor. Las calidades no se eligen,
 * salen solas: por eso en la menor armónica el tercer grado da aumentado
 * (el acorde de la clase 1 que no aparecía nunca, por fin con casa).
 *
 * Devuelve las notas en MIDI desde la tónica dada; el nombre de cada acorde
 * lo pone `identificarAcorde`, que ya sabe todas las recetas.
 */
export function triadasDeEscala(tonica: number, escala: Escala): number[][] {
  return apilarTerceras(tonica, escala, 3);
}

/**
 * Lo mismo con una tercera más: las cuatriadas de la clase 2, deducidas de la
 * escala en vez de escritas. Sobre la mayor salen solas maj7 · m7 · m7 · maj7
 * · 7 · m7 · m7♭5 — la tabla de `TONALIDAD_MAYOR`, que así no puede discrepar.
 */
export function cuatriadasDeEscala(tonica: number, escala: Escala): number[][] {
  return apilarTerceras(tonica, escala, 4);
}

function apilarTerceras(tonica: number, escala: Escala, notas: number): number[][] {
  const dosOctavas = [...escala.grados, ...escala.grados.map((g) => g + 12)];
  return escala.grados.map((_, i) =>
    Array.from({ length: notas }, (_, n) => tonica + dosOctavas[i + 2 * n]),
  );
}
