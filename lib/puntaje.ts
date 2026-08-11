/**
 * Seguir un ejercicio con lo que se está tocando.
 *
 * Es la otra mitad del micrófono, y la que resultó ser más importante: medido
 * sobre una grabación real, el detector cometía 7 errores y la pantalla marcaba
 * 45. La diferencia no era del detector, era de acá.
 *
 * Igual que `lib/notas.ts`, vive aparte de React para poder probarlo con un
 * array a mano.
 */

import { mismasClases, type Clases } from "./notas.ts";

export type Veredicto =
  /** Es la que iba (o una de las próximas): avanzá `cuantas` y quedate en `hasta`. */
  | { tipo: "avanza"; hasta: number; cuantas: number }
  /** La que acabás de contar, otra vez. No es error de nadie: se ignora. */
  | { tipo: "rebote" }
  /** No aparece por ningún lado: eso sí es otra nota. */
  | { tipo: "mal" };

export interface OpcionesSeguidor {
  /**
   * Cuántas notas para adelante se busca lo que tocaste antes de decir que
   * está mal.
   *
   * Es lo que evita el arrastre, que era la causa de casi todos los errores
   * que se veían en pantalla: cuando el micrófono se come una nota, la app se
   * queda esperándola y a partir de ahí *todo* lo que tocás bien sale en rojo.
   * Sobre una grabación real: con 1 (lo que había) 33 errores, con 2 nueve,
   * con 3 dos. De ahí para arriba no mejora — sólo se vuelve más difícil que
   * te marque un error de verdad, que también hace falta.
   */
  ventanaResync?: number;
}

export const VENTANA_RESYNC = 3;

/**
 * ¿Lo que tocaste sigue el ejercicio?
 *
 * Es una función pura a propósito: el índice lo guarda el que llama (en la app
 * es estado de React), así que acá no hay nada que se pueda desincronizar.
 */
export function evaluarNota(
  clases: Clases,
  esperado: readonly Clases[],
  i: number,
  opciones: OpcionesSeguidor = {},
): Veredicto {
  const ventana = opciones.ventanaResync ?? VENTANA_RESYNC;
  const en = (n: number) => (n >= 0 && n < esperado.length ? esperado[n] : null);

  // La que acabamos de dar por buena, otra vez: es un rebote del detector (la
  // misma tecla sonando entrecortada), no un error tuyo.
  const anterior = en(i - 1);
  if (anterior && mismasClases(anterior, clases)) return { tipo: "rebote" };

  for (let d = 0; d <= ventana; d++) {
    const candidata = en(i + d);
    if (candidata && mismasClases(candidata, clases)) {
      return { tipo: "avanza", hasta: i + d + 1, cuantas: d + 1 };
    }
  }
  return { tipo: "mal" };
}

export interface Marcada {
  /** En qué nota del ejercicio estaba parada la app. */
  en: number;
  oyo: Clases;
  esperaba: Clases | null;
}

export interface Resultado {
  bien: number;
  mal: number;
  marcadas: Marcada[];
}

/**
 * Correr una tanda entera de notas contra el ejercicio, como haría la app.
 *
 * Es lo que usan los tests y `npm run calibrar`: sirve para saber cuántos
 * errores vas a *ver*, que no es lo mismo que cuántos hubo.
 */
export function seguirTanda(
  notas: readonly Clases[],
  esperado: readonly Clases[],
  opciones: OpcionesSeguidor = {},
): Resultado {
  let i = 0;
  const r: Resultado = { bien: 0, mal: 0, marcadas: [] };
  for (const clases of notas) {
    const v = evaluarNota(clases, esperado, i, opciones);
    if (v.tipo === "avanza") {
      r.bien += v.cuantas;
      i = v.hasta;
    } else if (v.tipo === "mal") {
      r.mal++;
      r.marcadas.push({
        en: i,
        oyo: clases,
        esperaba: i < esperado.length ? esperado[i] : null,
      });
    }
    if (i >= esperado.length) break;
  }
  return r;
}
