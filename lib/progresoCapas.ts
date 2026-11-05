/**
 * Qué capas de una canción ya salen.
 *
 * Es un marcador, como `recientes`: lo pone el que practica con un toque
 * ("ya me sale") y lo saca con otro. Sin fecha ni cuenta de veces —eso sería
 * el boletín que el cuaderno no tiene—, sólo el número de cada capa que se
 * dio por hecha. En `localStorage`, por aparato, y todo pasa por estas
 * funciones para que el día que haya sesión se cambie este archivo y nada más.
 */

const CLAVE = (slug: string) => `cuaderno-de-piano/capas/${slug}`;
/** Para que las dos vistas (la sala y la canción) se enteren en la misma pestaña. */
export const EVENTO = "cuaderno-de-piano:capas";

function disponible(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function capasHechas(slug: string): number[] {
  const store = disponible();
  if (!store) return [];
  try {
    const lista = JSON.parse(store.getItem(CLAVE(slug)) ?? "[]") as unknown;
    return Array.isArray(lista) ? lista.filter((n): n is number => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}

export function marcarCapa(slug: string, capa: number, hecha: boolean) {
  const store = disponible();
  if (!store) return;
  const resto = capasHechas(slug).filter((n) => n !== capa);
  const lista = (hecha ? [...resto, capa] : resto).sort((a, b) => a - b);
  try {
    store.setItem(CLAVE(slug), JSON.stringify(lista));
    window.dispatchEvent(new Event(EVENTO));
  } catch {
    // Sin espacio o sin permiso: se sigue sin marcador.
  }
}
