/**
 * Prueba el juez del modo de seguirte.
 *
 *   npm run test:seguimiento
 *
 * El caso que importa es el de la octava: el Claro de luna arranca con
 * Do♯2 · Do♯3 en la izquierda y Sol♯3 en la derecha, y las tres teclas nunca
 * caen en el mismo milisegundo. Se juega la secuencia entera, tecla por
 * tecla, como llega del MIDI.
 */
import assert from "node:assert/strict";
import { juzgarInstante } from "../lib/seguimiento.ts";

// Notas sueltas: da igual la octava.
assert.deepEqual(juzgarInstante([64], [52]), { completo: true, sobran: 0 });
assert.deepEqual(juzgarInstante([64], [61]), { completo: false, sobran: 1 });

// Un acorde se acepta en cualquier orden y cualquier disposición.
assert.deepEqual(juzgarInstante([60, 64, 67], [67, 48, 76]), { completo: true, sobran: 0 });
assert.deepEqual(juzgarInstante([60, 64, 67], [60, 64]), { completo: false, sobran: 0 });
assert.deepEqual(juzgarInstante([60, 64, 67], [60, 64, 67, 62]), { completo: true, sobran: 1 });

// **La octava pide dos.** Con un solo Do♯ el instante sigue abierto.
assert.deepEqual(juzgarInstante([56, 37, 49], [37, 56]), { completo: false, sobran: 0 });
assert.deepEqual(juzgarInstante([56, 37, 49], [37, 56, 49]), { completo: true, sobran: 0 });
// Y un tercer Do♯ ya está de más aunque la nota sea la correcta.
assert.deepEqual(juzgarInstante([56, 37, 49], [37, 56, 49, 61]), { completo: true, sobran: 1 });

// El primer compás del Claro de luna, tecla por tecla, como llega del MIDI:
// la izquierda cae primero, después la derecha, y ningún instante se come al
// siguiente. Antes, el segundo Do♯ de la octava contaba como el Do♯4 del
// arpegio y el Do♯4 de verdad salía como "una nota de más".
const instantes = [[56, 37, 49], [61], [64], [56], [61], [64]];
// La derecha cae entre las dos teclas de la octava: es el orden que rompía.
const tocadas = [37, 56, 49, 61, 64, 56, 61, 64];
let i = 0;
let puestas = [];
let errores = 0;
for (const tecla of tocadas) {
  puestas.push(tecla);
  const v = juzgarInstante(instantes[i], puestas);
  if (!v.completo) continue;
  if (v.sobran > 0) errores++;
  puestas = [];
  i++;
}
assert.equal(i, instantes.length, "se recorrió el compás entero");
assert.equal(errores, 0, "sin errores fantasma");

console.log("seguimiento: todo bien");
