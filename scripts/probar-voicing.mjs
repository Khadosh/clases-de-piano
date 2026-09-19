/**
 * El voicing contra lo que dijo el profe en la clase 7.
 *
 * La tercera nunca en la izquierda del voicing abierto, la cerrada apilada de a
 * terceras, la abierta separada por cuartas, quintas y sextas, y el de una mano
 * sin la fundamental. Es lo que el bloque afirma en pantalla, así que más vale
 * que sea verdad para todos los acordes y no sólo para el Do.
 */

import assert from "node:assert/strict";
import { CHORD_QUALITIES, mod12, qualityById } from "../lib/music.ts";
import {
  DISPOSICIONES,
  abierta,
  cerrada,
  corregirVoicing,
  esAbierta,
  gradoDeTecla,
  nombreDeIntervalo,
  saltosEntreVecinas,
  teclasDe,
  teclasQuePide,
  unaMano,
  voicingModelo,
} from "../lib/voicing.ts";

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

const MAJ = qualityById("maj");
const MAJ7 = qualityById("maj7");
const DOM7 = qualityById("dom7");
const clases = (pitches) => new Set(pitches.map(mod12));
/** Los que apilan terceras: los que el voicing de la clase reparte. */
const TERCIADOS = CHORD_QUALITIES.filter((q) => !q.grados);

probar("la cerrada de Do mayor es Do3 Mi3 Sol3, pegadas", () => {
  const v = cerrada(0, MAJ);
  assert.deepEqual(v.izquierda, [48, 52, 55]);
  assert.deepEqual(v.derecha, []);
  assert.equal(esAbierta(teclasDe(v)), false);
});

probar("la abierta 1-5 / 3-7 de Cmaj7 es Do3 Sol3 | Mi4 Si4", () => {
  const v = abierta(0, MAJ7, "15-37");
  assert.deepEqual(v.izquierda, [48, 55]);
  assert.deepEqual(v.derecha, [64, 71]);
});

probar("la abierta 1-7 / 3-5 de G7 es Sol Fa | Si Re", () => {
  const v = abierta(7, DOM7, "17-35");
  assert.deepEqual(v.izquierda, [55, 65]);
  assert.deepEqual(v.derecha, [71, 74]);
});

probar("la tríada abierta lleva 1-5 abajo y 3 más la fundamental duplicada arriba", () => {
  const v = abierta(0, MAJ, "15-37");
  assert.deepEqual(v.izquierda, [48, 55]);
  assert.deepEqual(v.derecha, [64, 72]);
  assert.equal(abierta(0, MAJ, "17-35"), null, "sin séptima no hay 1-7");
});

probar("la tercera nunca está en la izquierda del voicing abierto, en ningún acorde", () => {
  for (const q of TERCIADOS) {
    for (let root = 0; root < 12; root++) {
      for (const reparto of ["15-37", "17-35"]) {
        const v = abierta(root, q, reparto);
        if (!v) continue;
        for (const p of v.izquierda) {
          assert.notEqual(gradoDeTecla(p, root, q), 3, `${q.id} sobre ${root}, ${reparto}`);
        }
        assert.ok(v.derecha.some((p) => gradoDeTecla(p, root, q) === 3), "la tercera está arriba");
      }
    }
  }
});

probar("abrir el acorde no le cambia las notas: las mismas clases que la cerrada", () => {
  for (const q of TERCIADOS) {
    for (let root = 0; root < 12; root++) {
      const c = clases(teclasDe(cerrada(root, q)));
      for (const reparto of ["15-37", "17-35"]) {
        const v = abierta(root, q, reparto);
        if (v) assert.deepEqual(clases(teclasDe(v)), c, `${q.id} ${root} ${reparto}`);
      }
      const dup = abierta(root, q, "15-37", { duplicar: 5 });
      assert.deepEqual(clases(teclasDe(dup)), c, `${q.id} ${root} duplicada`);
    }
  }
});

probar("la cerrada va de a terceras y la 1-5 / 3-7 de a cuartas, quintas y sextas", () => {
  for (const q of TERCIADOS) {
    for (let root = 0; root < 12; root++) {
      for (const s of saltosEntreVecinas(teclasDe(cerrada(root, q)))) {
        assert.ok(s >= 2 && s <= 4, `cerrada ${q.id}: salto de ${s}`);
      }
      assert.ok(esAbierta(teclasDe(abierta(root, q, "15-37"))), `abierta ${q.id} sobre ${root}`);
    }
  }
});

probar("duplicar suma una voz a la derecha, arriba de todo, y es la que se pidió", () => {
  const v = abierta(0, MAJ7, "15-37", { duplicar: 1 });
  assert.deepEqual(v.derecha, [64, 71, 72]);
  assert.equal(gradoDeTecla(72, 0, MAJ7), 1);
  const q = abierta(0, MAJ7, "15-37", { duplicar: 5 });
  assert.equal(gradoDeTecla(q.derecha.at(-1), 0, MAJ7), 5);
});

probar("el de una mano esquiva la fundamental en las cuatriadas y gira", () => {
  const { derecha, sinFundamental } = unaMano(0, MAJ7, 0);
  assert.equal(sinFundamental, true);
  assert.deepEqual(derecha, [64, 67, 71]); // Mi Sol Si: la fundamental no está
  assert.ok(!derecha.some((p) => mod12(p) === 0));
  assert.deepEqual(unaMano(0, MAJ7, 1).derecha, [67, 71, 76]);
  assert.deepEqual(unaMano(0, MAJ7, 2).derecha, [71, 76, 79]);
  assert.deepEqual(unaMano(0, MAJ7, 3).derecha, [64, 67, 71], "tres notas, tres vueltas");
});

probar("una tríada a una mano no puede esquivar nada: sólo gira", () => {
  const { derecha, sinFundamental } = unaMano(0, MAJ, 1);
  assert.equal(sinFundamental, false);
  assert.deepEqual(derecha, [64, 67, 72]);
});

probar("los nombres de los saltos: 5 es cuarta, 7 quinta, 9 sexta, 12 octava", () => {
  assert.equal(nombreDeIntervalo(5), "4ª");
  assert.equal(nombreDeIntervalo(7), "5ª");
  assert.equal(nombreDeIntervalo(9), "6ª");
  assert.equal(nombreDeIntervalo(4), "3ª");
  assert.equal(nombreDeIntervalo(12), "8ª");
  assert.equal(nombreDeIntervalo(16), "8ª + 3ª");
});

// ---- El dictado -----------------------------------------------------------

const MIN7 = qualityById("min7");
const juzgar = (puestas, root, q, disposicion) => corregirVoicing(puestas, { root, q, disposicion })?.veredicto ?? null;

probar("dictado: la respuesta modelo de cada disposición se corrige a sí misma como bien", () => {
  for (const q of TERCIADOS) {
    for (let root = 0; root < 12; root++) {
      for (const { id, soloCuatriadas } of DISPOSICIONES) {
        if (soloCuatriadas && q.stack.length < 3) continue;
        const pedido = { root, q, disposicion: id };
        const modelo = voicingModelo(pedido);
        const c = corregirVoicing(teclasDe(modelo), pedido);
        assert.equal(c?.veredicto, "bien", `${q.id} sobre ${root}, ${id}`);
        assert.equal(teclasDe(modelo).length >= teclasQuePide(pedido), true);
      }
    }
  }
});

probar("en toda abierta la derecha arranca por lo menos a una cuarta del techo de la izquierda", () => {
  for (const q of TERCIADOS) {
    for (let root = 0; root < 12; root++) {
      for (const reparto of ["15-37", "17-35"]) {
        const v = abierta(root, q, reparto);
        if (!v) continue;
        assert.ok(v.derecha[0] - Math.max(...v.izquierda) >= 5, `${q.id} sobre ${root}, ${reparto}`);
      }
    }
  }
});

probar("dictado: no corrige hasta que estén las teclas que pide", () => {
  assert.equal(corregirVoicing([48, 55], { root: 0, q: MAJ7, disposicion: "15-37" }), null);
  assert.equal(corregirVoicing([48, 55, 64], { root: 0, q: MAJ7, disposicion: "15-37" }), null);
  // A una mano sin fundamental pide una tecla menos.
  assert.equal(teclasQuePide({ root: 0, q: MAJ7, disposicion: "una-mano" }), 3);
  assert.equal(teclasQuePide({ root: 0, q: MAJ, disposicion: "una-mano" }), 3);
});

probar("dictado abierto: la tercera abajo es el error de la clase, y se dice así", () => {
  // Do3 · Mi3 abajo, Sol4 · Si4 arriba: las notas están, el bajo está, la tercera no debía.
  assert.equal(juzgar([48, 52, 67, 71], 0, MAJ7, "15-37"), "tercera-abajo");
  // 1-7 abajo cuando se pidió 1-5.
  assert.equal(juzgar([48, 59, 64, 67], 0, MAJ7, "15-37"), "reparto");
  assert.equal(juzgar([48, 55, 64, 71], 0, MAJ7, "17-35"), "reparto");
  // El bajo no es la fundamental.
  assert.equal(juzgar([43, 48, 64, 71], 0, MAJ7, "15-37"), "bajo");
  // Una tecla ajena.
  assert.equal(juzgar([48, 55, 64, 70], 0, MAJ7, "15-37"), "notas");
});

probar("dictado abierto: el reparto bien pero pegado —Sol3 y Si3 a una tercera— no es abierto", () => {
  const c = corregirVoicing([48, 55, 59, 64], { root: 0, q: MAJ7, disposicion: "15-37" });
  assert.equal(c.veredicto, "pegado");
  assert.deepEqual(c.pegadas, [55, 59]);
  // Las manos se deducen del registro: las dos graves son la izquierda.
  assert.deepEqual(c.izquierda, [48, 55]);
  assert.deepEqual(c.derecha, [59, 64]);
});

probar("dictado abierto: la octava da igual, duplicar una voz no molesta, y el orden de la derecha tampoco", () => {
  assert.equal(juzgar([36, 43, 52, 59], 0, MAJ7, "15-37"), "bien", "una octava abajo");
  assert.equal(juzgar([48, 55, 64, 71, 72], 0, MAJ7, "15-37"), "bien", "fundamental duplicada arriba");
  assert.equal(juzgar([48, 55, 64, 67, 71], 0, MAJ7, "15-37"), "bien", "quinta duplicada");
  assert.equal(juzgar([48, 55, 71, 76], 0, MAJ7, "15-37"), "bien", "la séptima antes que la tercera");
  // Tríada: 1-5 abajo y la tercera arriba, con o sin la fundamental de vuelta.
  assert.equal(juzgar([48, 55, 64], 0, MAJ, "15-37"), "bien");
  assert.equal(juzgar([48, 55, 64, 72], 0, MAJ, "15-37"), "bien");
  assert.equal(juzgar([48, 52, 67], 0, MAJ, "15-37"), "tercera-abajo");
});

probar("dictado cerrado: apilado desde la fundamental y nada más", () => {
  assert.equal(juzgar([50, 53, 57, 60], 2, MIN7, "cerrada"), "bien");
  assert.equal(juzgar([62, 65, 69, 72], 2, MIN7, "cerrada"), "bien", "en otra octava");
  assert.equal(juzgar([50, 57, 65, 72], 2, MIN7, "cerrada"), "no-cerrada", "abierto");
  assert.equal(juzgar([53, 57, 60, 62], 2, MIN7, "cerrada"), "bajo", "girado");
});

probar("dictado a una mano: sin la fundamental, en cualquier giro; con ella, se dice", () => {
  assert.equal(juzgar([65, 69, 72], 2, MIN7, "una-mano"), "bien", "3-5-7");
  assert.equal(juzgar([69, 72, 77], 2, MIN7, "una-mano"), "bien", "girado");
  assert.equal(juzgar([62, 65, 69], 2, MIN7, "una-mano"), "con-fundamental");
  assert.equal(juzgar([65, 69, 71], 2, MIN7, "una-mano"), "notas");
  // Con una tríada no hay qué esquivar: son las tres, como caigan.
  assert.equal(juzgar([64, 67, 72], 0, MAJ, "una-mano"), "bien");
});

console.log(`${bien} bien, ${mal.length} mal`);
if (mal.length) {
  for (const m of mal) console.log("  ✗ " + m);
  process.exit(1);
}
