/**
 * Las canciones por capas: que los acordes sean los que el análisis dice, que
 * el metrónomo del puente acentúe 3+3+2, y que el riff mueva sólo la tercera
 * a sus vecinas. Es lo que la página afirma en pantalla; si se rompe la
 * secuencia de acordes o los acentos, esto tiene que gritar.
 */

import assert from "node:assert/strict";
import {
  acentosDeGrupos,
  arrancanEn,
  cifradoDeVoicing,
  corcheasDe,
  cuentaDeGrupos,
  gradoEnMayor,
  leerGrupos,
  saltoDeFundamental,
  sonandoEn,
  teclasQueSeQuedan,
  vecinaDeLaTercera,
} from "../lib/capas.ts";
import { CANCIONES, cancionPorSlug } from "../content/canciones.ts";
import { mod12 } from "../lib/music.ts";

let bien = 0;
const mal = [];
const probar = (que, fn) => {
  try {
    fn();
    bien++;
  } catch (e) {
    mal.push(`${que}: ${e.message}`);
  }
};

const sol = cancionPorSlug("here-comes-the-sun");
const capa = (tipo) => sol.capas.find((c) => c.tipo === tipo);

probar("los acentos: 3+3+2 es fuerte en el 1, medio en el 4 y en el 7", () => {
  assert.deepEqual(acentosDeGrupos([3, 3, 2]), ["fuerte", "debil", "debil", "medio", "debil", "debil", "medio", "debil"]);
  assert.deepEqual(cuentaDeGrupos([3, 3, 2]), [1, 2, 3, 1, 2, 3, 1, 2]);
  assert.deepEqual(acentosDeGrupos([3, 3, 3, 2]).map((a, i) => (a === "debil" ? null : i)).filter((i) => i !== null), [0, 3, 6, 9]);
  assert.equal(corcheasDe([3, 3, 3, 2]), 11);
  // Un 6/8 son los grupos [3, 3]: el mismo patrón que ya daba lib/ritmo.
  assert.deepEqual(acentosDeGrupos([3, 3]), ["fuerte", "debil", "debil", "medio", "debil", "debil"]);
});

probar("el editor de grupos lee 3+3+2 y rechaza lo que no es", () => {
  assert.deepEqual(leerGrupos("3+3+2"), [3, 3, 2]);
  assert.deepEqual(leerGrupos(" 3 + 3 + 3 + 2 "), [3, 3, 3, 2]);
  assert.equal(leerGrupos("3+0"), null);
  assert.equal(leerGrupos("3++2"), null);
  assert.equal(leerGrupos("12"), null);
});

probar("la capa del ritmo trae el 3+3+2 primero y algún compás largo", () => {
  const r = capa("ritmo");
  assert.deepEqual(r.compases[0].grupos, [3, 3, 2]);
  assert.ok(r.compases.some((c) => corcheasDe(c.grupos) > 8), "falta el compás largo");
});

probar("las cinco capas, en orden", () => {
  assert.deepEqual(sol.capas.map((c) => c.tipo), ["acordes", "riff", "ritmo", "progresion", "todo"]);
});

probar("la base: La, Re, Mi7 con los voicings del análisis", () => {
  const b = capa("acordes");
  assert.deepEqual(b.acordes.map(cifradoDeVoicing), ["A", "D", "E7"]);
  assert.deepEqual(b.acordes.map((v) => v.derecha), [[69, 73, 76], [69, 74, 78], [68, 71, 74, 76]]);
  assert.deepEqual(b.acordes.map((v) => v.izquierda.map(mod12)), [[9], [2], [4]], "la izquierda en las fundamentales");
});

probar("la base: la tecla que se queda entre vecinos es La, Re, Mi", () => {
  const [la, re, mi7] = capa("acordes").acordes;
  assert.deepEqual(teclasQueSeQuedan(la, re), [69]);
  assert.deepEqual(teclasQueSeQuedan(re, mi7), [74]);
  assert.deepEqual(teclasQueSeQuedan(mi7, la), [76]);
  assert.deepEqual(teclasQueSeQuedan(null, la), []);
});

probar("el puente: Do, Sol, Re, La, Mi7 — ♭III ♭VII IV I V7", () => {
  const p = capa("progresion");
  assert.deepEqual(p.acordes.map(cifradoDeVoicing), ["C", "G", "D", "A", "E7"]);
  const grados = p.acordes.map((v) => gradoEnMayor(v, sol.tonica));
  assert.deepEqual(grados.map((g) => g.romano), ["♭III", "♭VII", "IV", "I", "V7"]);
  assert.deepEqual(grados.map((g) => g.prestado), [true, true, false, false, false]);
  assert.deepEqual(grados.map((g) => g.funcion), ["reposo", "dominante", "subdominante", "reposo", "dominante"]);
});

probar("el puente: cada acorde sube una quinta hasta La, y cada enlace deja una tecla quieta", () => {
  const a = capa("progresion").acordes;
  for (let i = 0; i < 3; i++) assert.equal(saltoDeFundamental(a[i], a[i + 1]), 7, `${i} → ${i + 1}`);
  for (let i = 0; i < a.length - 1; i++) assert.equal(teclasQueSeQuedan(a[i], a[i + 1]).length, 1, `${i} → ${i + 1}`);
});

probar("el puente: un acorde por compás de 3+3+2, golpeado en cada grupo", () => {
  for (const c of capa("progresion").compases) {
    assert.deepEqual(c.grupos, [3, 3, 2]);
    assert.deepEqual(c.eventos.filter((e) => e.mano === "der").map((e) => e.t), [0, 3, 6]);
  }
});

probar("el riff: la izquierda quieta en la fundamental y la derecha mueve sólo 2ª, 3ª y 4ª", () => {
  const r = capa("riff");
  assert.deepEqual(r.compases.map((c) => cifradoDeVoicing(c.voicing)), ["A", "A", "D", "E7"]);
  for (const c of r.compases) {
    const izq = c.eventos.filter((e) => e.mano === "izq");
    assert.equal(izq.length, 1, "la izquierda ataca una sola vez");
    assert.equal(izq[0].dur, corcheasDe(c.grupos), "y sostiene todo el compás");
    const sueltas = c.eventos.filter((e) => e.mano === "der" && e.teclas.length === 1);
    const vecinas = [2, 3, 4].map((g) => vecinaDeLaTercera(c.voicing, g));
    for (const e of sueltas) assert.ok(vecinas.includes(e.teclas[0]), `tecla ${e.teclas[0]} fuera de las vecinas`);
    assert.equal(sueltas.at(-1).teclas[0], vecinas[1], "termina en la tercera");
    assert.ok(sueltas.some((e) => e.teclas[0] === vecinas[0]) && sueltas.some((e) => e.teclas[0] === vecinas[2]));
  }
  // En La: Si, Do♯, Re.
  assert.deepEqual([2, 3, 4].map((g) => vecinaDeLaTercera(r.compases[0].voicing, g)), [71, 73, 74]);
});

probar("lo que suena y lo que arranca en una corchea", () => {
  const c = capa("riff").compases[0];
  assert.deepEqual(arrancanEn(c, 2).flatMap((e) => e.teclas), [71]);
  assert.deepEqual(sonandoEn(c, 2).flatMap((e) => e.teclas).sort(), [45, 69, 71, 76].sort());
});

probar("ninguna canción trae letra, melodía ni audio: sólo capas de acordes, riff y ritmo", () => {
  for (const c of CANCIONES) {
    const texto = JSON.stringify(c);
    assert.ok(!/\.(mp3|wav|ogg|m4a)/i.test(texto), "un archivo de audio");
    assert.ok(!c.capas.some((k) => ["melodia", "letra"].includes(k.tipo)));
  }
});

console.log(`${bien} bien, ${mal.length} mal`);
if (mal.length) {
  for (const m of mal) console.log("  ✗ " + m);
  process.exit(1);
}
