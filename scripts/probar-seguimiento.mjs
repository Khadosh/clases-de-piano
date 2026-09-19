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
import { VENTANA_SEGUIMIENTO, juzgarInstante, resincronizar } from "../lib/seguimiento.ts";

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


// ---- Cuando te comés una nota ------------------------------------------------
//
// Antes, errar una nota y seguir de largo dejaba la partitura clavada en esa
// nota para siempre, y todo lo que venía después salía "de más". Ahora, si lo
// último que tocaste es exactamente uno de los dos instantes que vienen, se
// salta ahí y lo salteado cuenta como comido.

/** El seguidor tal como lo juega la partitura, tecla por tecla. */
function seguir(instantes, tocadas) {
  let i = 0;
  let puestas = [];
  let deMas = 0;
  let comidas = 0;
  for (const tecla of tocadas) {
    puestas.push(tecla);
    const v = juzgarInstante(instantes[i], puestas);
    if (v.completo) {
      if (v.sobran > 0) deMas++;
      puestas = [];
      i++;
      continue;
    }
    if (v.sobran === 0) continue;
    const d = resincronizar(instantes.slice(i + 1, i + 1 + VENTANA_SEGUIMIENTO), puestas);
    if (d === null) continue;
    comidas += d + 1;
    puestas = [];
    i += d + 2;
  }
  return { i, deMas, comidas };
}

// Do Re Mi Fa Sol: te comés el Re y seguís. La partitura te alcanza en el Mi.
assert.deepEqual(seguir([[60], [62], [64], [65], [67]], [60, 64, 65, 67]), { i: 5, deMas: 0, comidas: 1 });
// Errás el Re (tocás Do♯) y seguís con el Mi: el Re se comió, el Do♯ no se cuenta dos veces.
assert.deepEqual(seguir([[60], [62], [64], [65], [67]], [60, 61, 64, 65, 67]), { i: 5, deMas: 0, comidas: 1 });
// Errás y te corregís en el acto: una de más, ninguna comida, sin saltar.
assert.deepEqual(seguir([[60], [62], [64]], [60, 61, 62, 64]), { i: 3, deMas: 1, comidas: 0 });
// Te comés dos seguidas: todavía alcanza. Tres, no: ahí te espera.
assert.deepEqual(seguir([[60], [62], [64], [65], [67]], [60, 65, 67]), { i: 5, deMas: 0, comidas: 2 });
assert.deepEqual(seguir([[60], [62], [64], [65], [67]], [60, 67]).i, 1);

// **Un acorde no manda al instante siguiente mientras lo armás.** El acorde
// Do · Mi · Sol y después un Do solo: la primera tecla del acorde es un Do y
// coincide con lo que viene, pero no es un error, así que no se salta.
assert.deepEqual(seguir([[60, 64, 67], [60], [64]], [60, 64, 67, 60, 64]), { i: 3, deMas: 0, comidas: 0 });
// Y al revés: un instante de acorde salteado se alcanza cuando se toca entero el que sigue.
assert.deepEqual(seguir([[60], [62, 65, 69], [64]], [60, 64]), { i: 3, deMas: 0, comidas: 1 });
// Un acorde que viene no se completa con una tecla sola.
assert.equal(resincronizar([[62, 65, 69]], [61]), null);
assert.equal(resincronizar([[62, 65, 69]], [61, 62, 65, 69]), 0);

console.log("seguimiento: todo bien");
