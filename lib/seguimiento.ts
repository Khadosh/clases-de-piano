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
