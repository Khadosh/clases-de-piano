import { mod12 } from "./music.ts";

/**
 * Lo que se tocó contra lo que la partitura pedía en un instante.
 *
 * Se compara por nota y no por octava —el ejercicio es leer, no dónde—, pero
 * **contando**: un instante con la octava Do♯2 · Do♯3 pide dos Do♯, no uno.
 *
 * Con un conjunto de clases el instante se daba por completo con el primer
 * Do♯ que llegaba, y el segundo —la otra mitad de la misma octava, unos
 * milisegundos después, porque tres teclas nunca caen juntas— caía en el
 * instante siguiente. En el Claro de luna ese siguiente es justo el Do♯4 del
 * arpegio, así que se lo comía calladito, y el Do♯4 de verdad aparecía
 * después como nota de más: un error por compás que no era de nadie.
 */
export interface Veredicto {
  /** Ya están todas las notas que pedía el instante. */
  completo: boolean;
  /** Cuántas de las tocadas no iban: ni por nota ni por cantidad. */
  sobran: number;
}

export function juzgarInstante(esperadas: number[], puestas: number[]): Veredicto {
  const pedidas = contar(esperadas);
  const tocadas = contar(puestas);
  let completo = true;
  for (const [clase, n] of pedidas) {
    if ((tocadas.get(clase) ?? 0) < n) completo = false;
  }
  let sobran = 0;
  for (const [clase, n] of tocadas) {
    sobran += Math.max(0, n - (pedidas.get(clase) ?? 0));
  }
  return { completo, sobran };
}

function contar(midis: number[]): Map<number, number> {
  const cuenta = new Map<number, number>();
  for (const m of midis) {
    const c = mod12(m);
    cuenta.set(c, (cuenta.get(c) ?? 0) + 1);
  }
  return cuenta;
}

/**
 * Cuántos instantes hacia adelante se mira cuando te comiste una nota.
 *
 * Es la ventana de resync del micrófono, pero por otro motivo: el teclado no
 * se come ninguna nota, el que se la come sos vos. Errás una, seguís tocando,
 * y la partitura se quedaba clavada esperando esa nota mientras todo lo que
 * venía después caía como "de más". Dos alcanza para un traspié; más grande
 * y empieza a saltar adonde no fuiste.
 */
export const VENTANA_SEGUIMIENTO = 2;

/**
 * Si lo último que tocaste es exactamente uno de los instantes que vienen,
 * cuál: 0 es el siguiente, 1 el de después. null si no es ninguno.
 *
 * Se mira sólo el final de lo tocado —los últimos tantos como pide cada
 * instante— y se pide que coincida entero, sin sobras. Y el que llama lo
 * consulta recién cuando hay algo puesto que el instante actual no quería:
 * mientras estés armando el acorde correcto, tecla por tecla, la primera de
 * ellas no puede mandarte al instante siguiente aunque él también la pida.
 */
export function resincronizar(siguientes: number[][], puestas: number[]): number | null {
  for (let d = 0; d < siguientes.length; d++) {
    const pedido = siguientes[d];
    if (pedido.length === 0 || pedido.length > puestas.length) continue;
    const cola = puestas.slice(-pedido.length);
    const v = juzgarInstante(pedido, cola);
    if (v.completo && v.sobran === 0) return d;
  }
  return null;
}

/**
 * Lo que el seguimiento lleva entre tecla y tecla.
 *
 * Es un valor y no estado de React a propósito: el componente lo guarda en
 * refs, y el test lo juega tecla por tecla con la **misma** función. Antes el
 * test reimplementaba este loop, que es la clase de copia que se separa sin
 * avisar (ya pasó con el script de calibrar el micrófono).
 */
export interface EstadoDelSeguimiento {
  /** El instante que se está esperando. */
  i: number;
  /** Las teclas tocadas en ese instante, como llegan. */
  puestas: number[];
  /** Notas que no iban, contadas por instante. */
  deMas: number;
  /** Instantes que se saltearon para alcanzarte. */
  comidas: number;
}

export const seguimientoDesde = (i: number): EstadoDelSeguimiento => ({ i, puestas: [], deMas: 0, comidas: 0 });

/**
 * Una tecla más, y adónde queda el seguimiento.
 *
 * - Se acepta el instante completo, no nota por nota; lo que sobra se anota
 *   como "de más" y se avanza igual, que quedarse trabado es peor.
 * - Mientras lo puesto sea parte del instante, se espera el resto.
 * - Si hay algo que el instante no quería, capaz te comiste una nota: si lo
 *   último que tocaste es justo uno de los instantes que vienen (hasta
 *   `VENTANA_SEGUIMIENTO`, y nunca más allá de `limite`), se salta ahí y lo
 *   salteado cuenta como comido.
 *
 * `limite` es hasta dónde se mira (exclusivo): el recorte de compases que se
 * está practicando termina ahí y el seguimiento no debe cruzarlo.
 */
export function avanzar(
  estado: EstadoDelSeguimiento,
  instantes: number[][],
  tecla: number,
  limite = instantes.length,
): EstadoDelSeguimiento {
  const pedido = instantes[estado.i];
  if (!pedido) return estado;
  const puestas = [...estado.puestas, tecla];
  const { completo, sobran } = juzgarInstante(pedido, puestas);
  if (completo) {
    return { ...estado, i: estado.i + 1, puestas: [], deMas: estado.deMas + (sobran > 0 ? 1 : 0) };
  }
  if (sobran === 0) return { ...estado, puestas };
  const siguientes = instantes.slice(estado.i + 1, Math.min(estado.i + 1 + VENTANA_SEGUIMIENTO, limite));
  const d = resincronizar(siguientes, puestas);
  if (d === null) return { ...estado, puestas };
  return { ...estado, i: estado.i + d + 2, puestas: [], comidas: estado.comidas + d + 1 };
}
