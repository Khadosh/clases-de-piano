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
