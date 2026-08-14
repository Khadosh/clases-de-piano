/**
 * Qué te cuesta, guardado entre sesiones.
 *
 * Esto rompe a medias la regla de que el puntaje se pierde al recargar, y la
 * diferencia importa: **no se guarda un puntaje, se guarda qué preguntar**.
 * No hay boletín, no hay porcentaje histórico ni racha de días; hay una cuenta
 * de aciertos y errores por acorde que sirve para una sola cosa, que es que los
 * que te salen mal vuelvan a aparecer más seguido. Un boletín te haría sentir
 * observado; esto te hace practicar lo que te falta.
 *
 * Vive en `localStorage` y si no está, no pasa nada: la app anda igual y elige
 * al azar como antes.
 */

const CLAVE = "cuaderno-de-piano/memoria";

export interface Marca {
  bien: number;
  mal: number;
}

type Memoria = Record<string, Marca>;

function disponible(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    // Safari en privado tira al *tocar* localStorage, no al leerlo.
    return null;
  }
}

export function leerMemoria(): Memoria {
  const store = disponible();
  if (!store) return {};
  try {
    const crudo = store.getItem(CLAVE);
    return crudo ? (JSON.parse(crudo) as Memoria) : {};
  } catch {
    return {};
  }
}

export function anotar(id: string, acerto: boolean) {
  const store = disponible();
  if (!store) return;
  const memoria = leerMemoria();
  const marca = memoria[id] ?? { bien: 0, mal: 0 };
  if (acerto) marca.bien++;
  else marca.mal++;
  memoria[id] = marca;
  try {
    store.setItem(CLAVE, JSON.stringify(memoria));
  } catch {
    // Sin espacio o sin permiso: se sigue sin memoria y ya.
  }
}

export function olvidar() {
  disponible()?.removeItem(CLAVE);
}

/**
 * Cuánto conviene que aparezca algo.
 *
 * Lo que nunca practicaste pesa más que lo que te sale siempre, pero menos que
 * lo que venís errando: primero se arreglan los agujeros, después se cubren los
 * huecos. El piso de 1 es para que nada desaparezca del todo — el que te sale
 * perfecto igual tiene que volver de vez en cuando o se olvida.
 */
export function peso(marca: Marca | undefined): number {
  if (!marca || marca.bien + marca.mal === 0) return 3;
  const intentos = marca.bien + marca.mal;
  return 1 + 5 * (marca.mal / intentos);
}

/** Uno al azar, pero con los que te cuestan cargados en el bombo. */
export function elegirConMemoria<T>(
  items: readonly T[],
  idDe: (item: T) => string,
  memoria: Memoria = leerMemoria(),
): T {
  const pesos = items.map((it) => peso(memoria[idDe(it)]));
  const total = pesos.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= pesos[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

/** Los que peor vienen, para poder decirlo en pantalla. */
export function flojos(memoria: Memoria = leerMemoria(), cuantos = 3): string[] {
  return Object.entries(memoria)
    .filter(([, m]) => m.mal > 0)
    .sort((a, b) => b[1].mal / (b[1].bien + b[1].mal) - a[1].mal / (a[1].bien + a[1].mal))
    .slice(0, cuantos)
    .map(([id]) => id);
}
