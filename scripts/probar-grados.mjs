/**
 * Los grados y las escalas contra casos escritos a mano.
 *
 * Es teoría que la app afirma y que Quique todavía no dio, así que conviene
 * tenerla clavada contra ejemplos que se pueden verificar en cualquier libro:
 * la tonalidad de Do sin alteraciones, la de Sol con un fa♯, la ii-V-I de Fa.
 */

import assert from "node:assert/strict";
import {
  CADENCIAS_CON_NOMBRE,
  FUNCION_DE_GRADO,
  GRADOS_MAYOR,
  PRESTAMOS,
  PROGRESIONES,
  TONALIDAD_MAYOR,
  cadenciaAlFinal,
  cifradoDelAcorde,
  clasesDelAcorde,
  esPrestado,
  gradoDe,
  intervalosDelAcorde,
  rachaDeFuncion,
  raizDelGrado,
  violaLaReglaDeOro,
} from "../lib/grados.ts";
import {
  ESCALAS,
  escalaPorId,
  notasDeEscala,
  saltosDeEscala,
  triadasDeEscala,
} from "../lib/escalas.ts";
import {
  CHORD_QUALITIES,
  chordSymbol,
  identificarAcorde,
  parseCifradoConBajo,
  qualityById,
} from "../lib/music.ts";

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

// ---- Las funciones armónicas de la clase 3, contra la tabla del cuaderno ---

probar("las funciones grado por grado: I IIIm VIm reposo, V VII° tensión, IIm IV media", () => {
  assert.deepEqual(FUNCION_DE_GRADO, [
    "reposo", "subdominante", "reposo", "subdominante", "dominante", "reposo", "dominante",
  ]);
});

probar("la regla de oro: cuatro reposos seguidos la violan, tres no", () => {
  assert.equal(violaLaReglaDeOro([0, 2, 5, 0]), true);
  assert.equal(violaLaReglaDeOro([0, 2, 5, 1, 3, 0]), false); // C Em Am Dm F C, del papel
});

probar("la racha cuenta seguidas y no totales", () => {
  assert.equal(rachaDeFuncion([0, 4, 0, 4, 0, 4]), 1);
});

probar("las tres cadencias del cuaderno: V→I auténtica, V→VI rota, V→IV→I plagal", () => {
  assert.equal(cadenciaAlFinal([1, 4, 0]), "autentica");
  assert.equal(cadenciaAlFinal([0, 4, 5]), "rota");
  assert.equal(cadenciaAlFinal([0, 4, 3, 0]), "plagal");
  assert.equal(cadenciaAlFinal([0, 3]), null);
});

// ---- Los campos armónicos de la clase 4, contra el cuaderno de papel -------
//
// Éstos son los apuntes de la clase tal cual quedaron escritos. Que la cuenta
// de nota-sí-nota-no dé exactamente lo mismo que lo anotado es la mejor
// verificación de las dos cosas a la vez: de la regla y de los apuntes.

const nombreDeTriada = (midis) => {
  const id = identificarAcorde(midis);
  assert.ok(id, `no se reconoce el acorde ${midis.join(",")}`);
  return chordSymbol(id.root, id.quality);
};

probar("el campo de Do mayor: C Dm Em F G Am Bdim", () => {
  const acordes = triadasDeEscala(0, escalaPorId("mayor")).map(nombreDeTriada);
  assert.deepEqual(acordes, ["C", "Dm", "Em", "F", "G", "Am", "Bdim"]);
});

probar("el campo de Do menor antigua: Cm Ddim Eb Fm Gm Ab Bb", () => {
  const acordes = triadasDeEscala(0, escalaPorId("menor-natural")).map(nombreDeTriada);
  assert.deepEqual(acordes, ["Cm", "Ddim", "Eb", "Fm", "Gm", "Ab", "Bb"]);
});

probar("el campo de Do menor armónica: Cm Ddim Eb+ Fm G Ab Bdim", () => {
  const acordes = triadasDeEscala(0, escalaPorId("menor-armonica")).map(nombreDeTriada);
  assert.deepEqual(acordes, ["Cm", "Ddim", "Ebaug", "Fm", "G", "Ab", "Bdim"]);
});

probar("el campo de Do menor melódica: Cm Dm Eb+ F G Adim Bdim", () => {
  const acordes = triadasDeEscala(0, escalaPorId("menor-melodica")).map(nombreDeTriada);
  assert.deepEqual(acordes, ["Cm", "Dm", "Ebaug", "F", "G", "Adim", "Bdim"]);
});

probar("las cadencias con nombre usan grados que existen y no se repiten", () => {
  const formas = new Set();
  for (const c of CADENCIAS_CON_NOMBRE) {
    for (const g of c.grados) assert.ok(g >= 0 && g < 7, c.nombre);
    // Toda cadencia con nombre termina llegando a algún lado: dos o tres acordes.
    assert.ok(c.grados.length >= 2 && c.grados.length <= 3, c.nombre);
    formas.add(c.grados.join(","));
  }
  assert.equal(formas.size, CADENCIAS_CON_NOMBRE.length, "hay una forma repetida");
});

// ---- Los préstamos melódicos de la clase 4 ---------------------------------

probar("el préstamo estrella es el Fm: el IV de la menor, primero en la lista", () => {
  const fm = PRESTAMOS[0];
  assert.equal(fm.cifrado, "Fm");
  assert.equal(fm.grado, 3);
  assert.equal(FUNCION_DE_GRADO[fm.grado], "subdominante"); // la función la pone el grado
});

probar("los préstamos son los acordes de las menores que el campo mayor no tiene", () => {
  // De los apuntes: Cm, Ddim, Eb, Eb+, Fm, Gm, Ab, Bb y Adim. Ni uno diatónico
  // (el G de la armónica y el Bdim son los del campo mayor: no se prestan) ni
  // uno repetido (el Cm está en las tres menores y se ofrece una vez).
  const cifrados = PRESTAMOS.map((p) => p.cifrado).sort();
  assert.deepEqual(cifrados, ["Ab", "Adim", "Bb", "Cm", "Ddim", "Eb", "Ebaug", "Fm", "Gm"]);
  assert.equal(new Set(cifrados).size, PRESTAMOS.length);
});

probar("el Fm prestado tiene las notas del Fm de verdad y la fundamental del IV", () => {
  const fm = { grado: 3, deEscala: "menor-natural" };
  assert.deepEqual(intervalosDelAcorde(fm), [0, 3, 7]); // receta menor
  assert.deepEqual([...clasesDelAcorde(fm)].sort((a, b) => a - b), [0, 5, 8]); // Fa La♭ Do
  assert.equal(gradoDe(fm), 3);
  assert.equal(esPrestado(fm), true);
  assert.equal(esPrestado(3), false);
  assert.equal(cifradoDelAcorde(3), "F"); // el mismo grado sin préstamo
});

probar("la regla de oro no se entera del préstamo: mira grados", () => {
  // I – IV – iv(prestado) – I leído en grados es 0,3,3,0: dos subdominantes
  // seguidos, ninguna racha de cuatro.
  assert.equal(violaLaReglaDeOro([0, 3, 3, 0].map((g) => g)), false);
});

probar("el cifrado con barra del renglón de la clase 4: Em/B es la 2ª inversión", () => {
  const emB = parseCifradoConBajo("Em/B");
  assert.equal(emB.chord.root, 4);
  assert.equal(emB.inversion, 2);
  const dmA = parseCifradoConBajo("Dm/A");
  assert.equal(dmA.inversion, 2);
  assert.equal(parseCifradoConBajo("C").inversion, 0);
  // Una barra que pide una nota que el acorde no tiene no es un acorde.
  assert.equal(parseCifradoConBajo("C/D"), null);
});

console.log(`${bien} bien, ${mal.length} mal`);
if (mal.length) {
  for (const m of mal) console.log("  ✗ " + m);
  process.exit(1);
}
