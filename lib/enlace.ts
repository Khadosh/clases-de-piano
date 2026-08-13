/**
 * Enlace de acordes: cómo pasar de un acorde al siguiente moviéndose poco.
 *
 * La progresión viene toda en estado fundamental y hay que ir invirtiendo cada
 * acorde para que la mano —o el bajo— viaje lo menos posible. Es el ejercicio
 * clásico de armonía, y es de las pocas cosas del piano que se pueden calcular
 * exacto: las inversiones son finitas, así que se prueban todas.
 *
 * Hay **dos criterios** y no uno, porque miden cosas distintas y a veces se
 * pelean:
 *
 * - `bajo`: que la nota de abajo se mueva poco. Es el de Quique, y es el
 *   correcto cuando tocás el acorde con una mano sola: ahí la nota más grave
 *   *es* el bajo, y el oído la sigue más que a ninguna otra. Un bajo que salta
 *   suena mal aunque la mano casi no se haya movido.
 * - `mano`: que se mueva poco todo el acorde, reteniendo las notas comunes. Es
 *   el enlace de manual, y es el que sirve cuando alguien más hace el bajo.
 *
 * Medido sobre la progresión de la clase 2, los recorridos óptimos coinciden en
 * apenas 3 de 8 acordes: no son dos formas de decir lo mismo.
 *
 * Y ojo con creerle demasiado a `mano`. Sin más restricciones se queda pegado a
 * una posición y no la suelta —sobre esta progresión deja un Re en el bajo casi
 * de punta a punta— que es un pedal y no un enlace. Suena inmóvil, y encima a
 * veces deja intervalos chicos en el grave, que siempre embarran. Es el motivo
 * por el que el criterio del profe da mejores resultados en piano solo.
 *
 * No sabe nada de React: se prueba con `npm run test:enlace`.
 */

import {
  cantidadDeInversiones,
  chordPitches,
  invertir,
  mod12,
  type Chord,
  type Pitch,
} from "./music.ts";

export type Criterio = "bajo" | "mano";

export interface Disposicion {
  /** Las notas concretas, de grave a agudo. */
  pitches: Pitch[];
  /** Qué inversión es: 0 fundamental, 1 primera… */
  inversion: number;
}

/** El rango en el que se puede tocar, que es el del teclado que se dibuja. */
export const GRAVE = 45;
export const AGUDO = 84;

/** Todas las formas de tocar este acorde: cada inversión, en cada octava. */
export function disposiciones(acorde: Chord): Disposicion[] {
  const out: Disposicion[] = [];
  for (let inv = 0; inv <= cantidadDeInversiones(acorde.quality); inv++) {
    for (let oct = -2; oct <= 3; oct++) {
      const pitches = invertir(
        chordPitches(48 + acorde.root + oct * 12, acorde.quality),
        inv,
      );
      if (Math.min(...pitches) >= GRAVE && Math.max(...pitches) <= AGUDO) {
        out.push({ pitches, inversion: inv });
      }
    }
  }
  return out;
}

export const bajoDe = (pitches: readonly Pitch[]) => Math.min(...pitches);

/** Cuántos semitonos se mueve la nota de abajo. */
export const saltoDelBajo = (a: readonly Pitch[], b: readonly Pitch[]) =>
  Math.abs(bajoDe(b) - bajoDe(a));

/**
 * Cuánto viaja la mano entera: se emparejan las notas de grave a agudo y se
 * suman las distancias.
 *
 * Emparejar por posición y no buscar el mejor emparejamiento posible es a
 * propósito: en el piano los dedos no se cruzan, el más grave toca la más
 * grave. Y si un acorde tiene tres notas y el otro cuatro, la que sobra cuenta
 * como un salto mediano en vez de gratis.
 */
export function viajeDeLaMano(
  a: readonly Pitch[],
  b: readonly Pitch[],
): number {
  const x = [...a].sort((p, q) => p - q);
  const y = [...b].sort((p, q) => p - q);
  const n = Math.min(x.length, y.length);
  let suma = 0;
  for (let i = 0; i < n; i++) suma += Math.abs(x[i] - y[i]);
  return suma + Math.abs(x.length - y.length) * 6;
}

/** Cuántas notas se repiten entre los dos acordes, sin importar la octava. */
export function notasComunes(
  a: readonly Pitch[],
  b: readonly Pitch[],
): number {
  const clases = new Set(b.map(mod12));
  return a.filter((p) => clases.has(mod12(p))).length;
}

/**
 * Lo que cuesta este movimiento según el criterio.
 *
 * Con `bajo`, el salto del bajo pesa muchísimo más que el resto: el viaje de la
 * mano queda sólo como desempate, para que entre dos disposiciones con el
 * mismo bajo elija la más cómoda en vez de cualquiera.
 */
export function costo(
  a: readonly Pitch[],
  b: readonly Pitch[],
  criterio: Criterio,
): number {
  const mano = viajeDeLaMano(a, b);
  return criterio === "bajo" ? saltoDelBajo(a, b) * 100 + mano : mano;
}

/**
 * El costo más bajo posible para ir de `previa` a `acorde`, y una disposición
 * que lo consigue.
 *
 * Se calcula **desde donde estás**, no desde donde deberías haber estado. Si te
 * equivocaste antes, el mínimo se recalcula con tu posición real: el ejercicio
 * no te cobra dos veces el mismo error.
 */
export function mejorMovimiento(
  previa: readonly Pitch[],
  acorde: Chord,
  criterio: Criterio,
): { disposicion: Disposicion; costo: number } {
  const opciones = disposiciones(acorde);
  let mejor: { disposicion: Disposicion; costo: number } | null = null;
  for (const d of opciones) {
    const c = costo(previa, d.pitches, criterio);
    if (!mejor || c < mejor.costo) mejor = { disposicion: d, costo: c };
  }
  return mejor!;
}

/**
 * El mejor recorrido posible de la progresión entera.
 *
 * **No es ir eligiendo lo mejor en cada paso.** Eso es lo primero que uno
 * escribe y está mal: la disposición más cómoda para el acorde 2 puede dejar la
 * mano en un lugar pésimo para el 3, y el total termina siendo peor que si el 2
 * cedía un poco. Es exactamente por qué existe la programación dinámica.
 *
 * Así que se guarda, para cada disposición de cada acorde, el costo más barato
 * de llegar hasta ahí, y al final se desanda el camino. El primer acorde está
 * fijo en estado fundamental: es el que planta la mano.
 */
export function recorridoOptimo(
  acordes: readonly Chord[],
  criterio: Criterio,
  base: Pitch = 48,
): { pasos: Disposicion[]; costoTotal: number } {
  if (acordes.length === 0) return { pasos: [], costoTotal: 0 };

  const inicio: Disposicion = {
    pitches: chordPitches(base + acordes[0].root, acordes[0].quality),
    inversion: 0,
  };
  if (acordes.length === 1) return { pasos: [inicio], costoTotal: 0 };

  // Una capa por acorde. Cada nodo guarda cuánto costó llegar y de dónde vino.
  let capa = [{ d: inicio, total: 0, previo: -1 }];
  const capas = [capa];
  for (const acorde of acordes.slice(1)) {
    const siguiente = disposiciones(acorde).map((d) => {
      let mejor = Infinity;
      let previo = -1;
      capa.forEach((nodo, i) => {
        const t = nodo.total + costo(nodo.d.pitches, d.pitches, criterio);
        if (t < mejor) {
          mejor = t;
          previo = i;
        }
      });
      return { d, total: mejor, previo };
    });
    capas.push(siguiente);
    capa = siguiente;
  }

  let i = capa.reduce((mejor, n, idx) => (n.total < capa[mejor].total ? idx : mejor), 0);
  const costoTotal = capa[i].total;
  const pasos: Disposicion[] = [];
  for (let n = capas.length - 1; n >= 0; n--) {
    pasos.unshift(capas[n][i].d);
    i = capas[n][i].previo;
  }
  return { pasos, costoTotal };
}

/**
 * Lo mismo pero en la unidad que se le muestra al que toca: semitonos de
 * movimiento, sin el ×100 con el que el criterio del bajo se impone.
 */
export function totalDelRecorrido(
  pasos: readonly Disposicion[],
  criterio: Criterio,
): number {
  let suma = 0;
  for (let i = 1; i < pasos.length; i++) {
    suma +=
      criterio === "bajo"
        ? saltoDelBajo(pasos[i - 1].pitches, pasos[i].pitches)
        : viajeDeLaMano(pasos[i - 1].pitches, pasos[i].pitches);
  }
  return suma;
}

/**
 * ¿Lo que armaste es este acorde?
 *
 * A diferencia del dictado, acá **cualquier inversión vale**: elegir la
 * inversión es justamente el ejercicio, así que lo único que se comprueba es
 * que estén las notas que van.
 */
export function esElAcorde(armado: readonly Pitch[], acorde: Chord): boolean {
  const esperadas = new Set(
    chordPitches(48 + acorde.root, acorde.quality).map(mod12),
  );
  const puestas = new Set(armado.map(mod12));
  return (
    puestas.size === esperadas.size &&
    [...esperadas].every((c) => puestas.has(c))
  );
}
