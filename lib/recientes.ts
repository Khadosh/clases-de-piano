/**
 * Lo último que se estuvo practicando.
 *
 * Es un marcador, no un puntaje: la sala arranca con "seguir con" y el
 * ejercicio de ayer, porque el patrón real es practicar uno o dos por vez y
 * volver al mismo varios días seguidos. Se guardan **los últimos tres slugs,
 * en orden, y nada más** — sin fecha ni cuenta de veces. Con una fecha esto
 * se vuelve "hace cuatro días que no practicás", que es el boletín que el
 * proyecto decidió no tener (ver `lib/memoria.ts`).
 *
 * Vive en `localStorage` y no en `sessionStorage` a propósito: la pestaña se
 * cierra y al día siguiente hay que seguir donde se dejó. Es por aparato, y
 * está bien que lo sea: el marcador del teléfono de arriba del piano no
 * tiene por qué ser el de la compu.
 *
 * Todo pasa por estas tres funciones para que el día que haya usuario y
 * sesión, cambiar dónde se guarda sea cambiar este archivo y ningún otro.
 */

const CLAVE = "cuaderno-de-piano/recientes";
const CUANTOS = 3;

function disponible(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function leerRecientes(): string[] {
  const store = disponible();
  if (!store) return [];
  try {
    const crudo = store.getItem(CLAVE);
    const lista = crudo ? (JSON.parse(crudo) as unknown) : [];
    return Array.isArray(lista) ? lista.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

/** Abrir un ejercicio lo pone primero; si ya estaba, sube. */
export function anotarVisita(slug: string) {
  const store = disponible();
  if (!store) return;
  const lista = [slug, ...leerRecientes().filter((s) => s !== slug)].slice(0, CUANTOS);
  try {
    store.setItem(CLAVE, JSON.stringify(lista));
  } catch {
    // Sin espacio o sin permiso: se sigue sin marcador y ya.
  }
}

export function olvidarRecientes() {
  disponible()?.removeItem(CLAVE);
}
