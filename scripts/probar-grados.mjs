/**
 * Los grados y las escalas contra casos escritos a mano.
 *
 * Es teoría que la app afirma y que Quique todavía no dio, así que conviene
 * tenerla clavada contra ejemplos que se pueden verificar en cualquier libro:
 * la tonalidad de Do sin alteraciones, la de Sol con un fa♯, la ii-V-I de Fa.
 */

import assert from "node:assert/strict";
import {
  GRADOS_MAYOR,
  PROGRESIONES,
  TONALIDAD_MAYOR,
  raizDelGrado,
} from "../lib/grados.ts";
import {
  ESCALAS,
  escalaPorId,
  notasDeEscala,
  saltosDeEscala,
} from "../lib/escalas.ts";
import { CHORD_QUALITIES, chordSymbol, qualityById } from "../lib/music.ts";

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

const DO = 0, SOL = 7, FA = 5, LA = 9;

// ---- Los grados ------------------------------------------------------------

probar("la escala mayor son siete grados", () => {
  assert.equal(GRADOS_MAYOR.length, 7);
  assert.deepEqual([...GRADOS_MAYOR], [0, 2, 4, 5, 7, 9, 11]);
});

probar("la tonalidad de Do no tiene ninguna alteración", () => {
  const blancas = [0, 2, 4, 5, 7, 9, 11];
  assert.deepEqual(
    TONALIDAD_MAYOR.map((_, g) => raizDelGrado(DO, g)),
    blancas,
  );
});

probar("la tonalidad de Sol tiene fa♯ y nada más", () => {
  const notas = TONALIDAD_MAYOR.map((_, g) => raizDelGrado(SOL, g)).sort((a, b) => a - b);
  // Sol mayor: sol la si do re mi fa♯ → las blancas menos Fa, más Fa♯.
  assert.deepEqual(notas, [0, 2, 4, 6, 7, 9, 11]);
});

probar("las calidades de los grados son las de apilar terceras de la escala", () => {
  assert.deepEqual(
    TONALIDAD_MAYOR.map((g) => g.triada),
    ["maj", "min", "min", "maj", "maj", "min", "dim"],
  );
  assert.deepEqual(
    TONALIDAD_MAYOR.map((g) => g.cuatriada),
    ["maj7", "min7", "min7", "maj7", "dom7", "min7", "m7b5"],
  );
});

probar("todas las calidades de la tabla existen en CHORD_QUALITIES", () => {
  for (const g of TONALIDAD_MAYOR) {
    assert.ok(qualityById(g.triada), `falta la tríada ${g.triada}`);
    assert.ok(qualityById(g.cuatriada), `falta la cuatriada ${g.cuatriada}`);
  }
});

probar("el V es el único dominante", () => {
  const dominantes = TONALIDAD_MAYOR.filter((g) => g.cuatriada === "dom7");
  assert.equal(dominantes.length, 1);
  assert.equal(dominantes[0].cifra, "V");
});

probar("la ii–V–I de Do da Dm7 · G7 · Cmaj7", () => {
  const iiVI = PROGRESIONES.find((p) => p.nombre === "ii – V – I");
  const cifrados = iiVI.grados.map((g) =>
    chordSymbol(raizDelGrado(DO, g), qualityById(TONALIDAD_MAYOR[g].cuatriada)),
  );
  assert.deepEqual(cifrados, ["Dm7", "G7", "Cmaj7"]);
});

probar("la ii–V–I de Fa da Gm7 · C7 · Fmaj7", () => {
  const iiVI = PROGRESIONES.find((p) => p.nombre === "ii – V – I");
  const cifrados = iiVI.grados.map((g) =>
    chordSymbol(raizDelGrado(FA, g), qualityById(TONALIDAD_MAYOR[g].cuatriada)),
  );
  assert.deepEqual(cifrados, ["Gm7", "C7", "Fmaj7"]);
});

probar("todas las progresiones apuntan a grados que existen", () => {
  for (const p of PROGRESIONES) {
    assert.ok(p.grados.length >= 3, `${p.nombre} es muy corta`);
    for (const g of p.grados) {
      assert.ok(g >= 0 && g < 7, `${p.nombre} apunta al grado ${g}`);
    }
  }
});

// ---- Las escalas -----------------------------------------------------------

probar("toda escala reparte exactamente la octava", () => {
  for (const e of ESCALAS) {
    const suma = saltosDeEscala(e).reduce((a, b) => a + b, 0);
    assert.equal(suma, 12, `${e.nombre} suma ${suma}`);
  }
});

probar("toda escala tiene siete notas y ocho con la octava", () => {
  for (const e of ESCALAS) {
    assert.equal(e.grados.length, 7, e.nombre);
    assert.equal(notasDeEscala(48, e).length, 8, e.nombre);
  }
});

probar("Do mayor son las siete blancas", () => {
  const mayor = escalaPorId("mayor");
  assert.deepEqual(notasDeEscala(48 + DO, mayor), [48, 50, 52, 53, 55, 57, 59, 60]);
});

probar("La menor natural son las mismas blancas", () => {
  const menor = escalaPorId("menor-natural");
  const notas = notasDeEscala(48 + LA, menor).map((p) => ((p % 12) + 12) % 12);
  assert.deepEqual([...notas].slice(0, 7).sort((a, b) => a - b), [0, 2, 4, 5, 7, 9, 11]);
});

probar("la receta de la mayor es T T s T T T s", () => {
  const mayor = escalaPorId("mayor");
  assert.deepEqual(saltosDeEscala(mayor), [2, 2, 1, 2, 2, 2, 1]);
  assert.equal(mayor.receta, "T T s T T T s");
});

probar("la armónica tiene el salto de tono y medio y la natural no", () => {
  const armonica = escalaPorId("menor-armonica");
  const natural = escalaPorId("menor-natural");
  assert.ok(saltosDeEscala(armonica).includes(3), "la armónica no tiene el T+s");
  assert.ok(!saltosDeEscala(natural).includes(3), "la natural tiene un T+s de más");
});

probar("la melódica es la armónica con el sexto subido", () => {
  const armonica = escalaPorId("menor-armonica");
  const melodica = escalaPorId("menor-melodica");
  assert.equal(melodica.grados[5] - armonica.grados[5], 1);
  assert.equal(melodica.grados[6], armonica.grados[6]);
});

probar("las recetas escritas coinciden con los saltos calculados", () => {
  const letra = (n) => (n === 1 ? "s" : n === 2 ? "T" : "T+s");
  for (const e of ESCALAS) {
    assert.equal(saltosDeEscala(e).map(letra).join(" "), e.receta, e.nombre);
  }
});

probar("no hay dos escalas con el mismo id", () => {
  assert.equal(new Set(ESCALAS.map((e) => e.id)).size, ESCALAS.length);
});

probar("las calidades de los grados están todas en el catálogo del código", () => {
  const ids = new Set(CHORD_QUALITIES.map((q) => q.id));
  for (const g of TONALIDAD_MAYOR) {
    assert.ok(ids.has(g.triada) && ids.has(g.cuatriada), g.cifra);
  }
});

console.log(`${bien} bien, ${mal.length} mal`);
if (mal.length) {
  for (const m of mal) console.log("  ✗ " + m);
  process.exit(1);
}
