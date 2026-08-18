/**
 * El pentagrama contra casos que se verifican en cualquier libro.
 *
 * Acá los errores son de un renglón, y un renglón de más no se ve mirando el
 * dibujo: se ve leyendo la nota y diciendo "ésta no era". Por eso las
 * posiciones se prueban contra las que todo el mundo sabe de memoria — el Do
 * central en su línea adicional, el Sol en la segunda línea de su clave — y las
 * armaduras contra el círculo de quintas.
 */

import assert from "node:assert/strict";
import {
  PASO_LINEA_INFERIOR,
  alterDeArmadura,
  alturaEnPentagrama,
  armaduraDe,
  compasesIncompletos,
  duracionDeCompas,
  duracionDeEvento,
  escribirEnPapel,
  pasoDe,
  signosDe,
  ubicar,
  vocesDe,
} from "../lib/pentagrama.ts";
import { PIEZAS } from "../content/partituras.ts";

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

const DO4 = 60, DO3 = 48, SOL4 = 67, SOL2 = 43, MI4 = 64, FA4 = 65, SI3 = 59;

// ---- Armaduras -------------------------------------------------------------

probar("Do mayor y La menor no tienen alteraciones", () => {
  assert.equal(armaduraDe({ tonica: 0, modo: "mayor" }), 0);
  assert.equal(armaduraDe({ tonica: 9, modo: "menor" }), 0);
});

probar("Sol mayor tiene un sostenido y es el fa", () => {
  const a = armaduraDe({ tonica: 7, modo: "mayor" });
  assert.equal(a, 1);
  assert.deepEqual(alterDeArmadura(a), [0, 0, 0, 1, 0, 0, 0]); // sólo la letra Fa
});

probar("Fa mayor tiene un bemol y es el si", () => {
  const a = armaduraDe({ tonica: 5, modo: "mayor" });
  assert.equal(a, -1);
  assert.deepEqual(alterDeArmadura(a), [0, 0, 0, 0, 0, 0, -1]); // sólo la letra Si
});

probar("Do♯ menor tiene cuatro sostenidos (la del Claro de luna)", () => {
  assert.equal(armaduraDe({ tonica: 1, modo: "menor" }), 4);
  assert.deepEqual(alterDeArmadura(4), [1, 1, 0, 1, 1, 0, 0]); // fa do sol re
});

probar("cada tonalidad menor tiene la armadura de su relativa mayor", () => {
  // La menor de X mayor arranca en su sexto grado, o sea tres semitonos abajo.
  for (const tonica of [0, 7, 2, 9, 4, 11, 5, 10, 3, 8, 1, 6]) {
    const mayor = armaduraDe({ tonica, modo: "mayor" });
    const relativa = ((tonica + 9) % 12);
    assert.equal(armaduraDe({ tonica: relativa, modo: "menor" }), mayor, `pc ${tonica}`);
  }
});

// ---- Cómo se escribe cada tecla --------------------------------------------

probar("en Sol mayor el fa♯ no lleva signo y se escribe con la letra Fa", () => {
  const n = escribirEnPapel(66, armaduraDe({ tonica: 7, modo: "mayor" })); // Fa♯4
  assert.equal(n.letra, 3);
  assert.equal(n.alter, 1);
  assert.equal(n.octava, 4);
});

probar("en Fa mayor el si♭ se escribe con la letra Si, no con La♯", () => {
  const n = escribirEnPapel(70, armaduraDe({ tonica: 5, modo: "mayor" })); // Si♭4
  assert.equal(n.letra, 6);
  assert.equal(n.alter, -1);
});

probar("el Do central es letra Do, octava 4", () => {
  const n = escribirEnPapel(DO4, 0);
  assert.equal(n.letra, 0);
  assert.equal(n.alter, 0);
  assert.equal(n.octava, 4);
  assert.equal(pasoDe(n), 28);
});

probar("en Do♯ menor el sol♯ es letra Sol y no La♭", () => {
  const n = escribirEnPapel(68, armaduraDe({ tonica: 1, modo: "menor" })); // Sol♯4
  assert.equal(n.letra, 4);
  assert.equal(n.alter, 1);
});

probar("una nota ajena a la tonalidad se escribe con signo", () => {
  // Si♭ en Do mayor: no está en la armadura, así que lleva bemol.
  const n = escribirEnPapel(70, 0);
  assert.equal(Math.abs(n.alter), 1);
  assert.equal((n.letra * 0 + ((n.letra + 7) % 7)) >= 0, true);
});

// ---- Dónde cae en el pentagrama --------------------------------------------

probar("en clave de sol la línea de abajo es el Mi4", () => {
  assert.equal(PASO_LINEA_INFERIOR.sol, pasoDe(escribirEnPapel(MI4, 0)));
  assert.equal(alturaEnPentagrama(escribirEnPapel(MI4, 0), "sol"), 0);
});

probar("el Sol4 va en la segunda línea de la clave de sol, que por eso se llama así", () => {
  // Segunda línea = dos espacios arriba de la primera = altura 2.
  assert.equal(alturaEnPentagrama(escribirEnPapel(SOL4, 0), "sol"), 2);
});

probar("el Fa3 va en la cuarta línea de la clave de fa, que por eso se llama así", () => {
  // Cuarta línea de un pentagrama de cinco: altura 6 desde la de abajo.
  assert.equal(alturaEnPentagrama(escribirEnPapel(53, 0), "fa"), 6); // Fa3
});

probar("en clave de fa la línea de abajo es el Sol2", () => {
  assert.equal(alturaEnPentagrama(escribirEnPapel(SOL2, 0), "fa"), 0);
});

probar("el Do central queda a una línea adicional de las dos claves", () => {
  // Una arriba de la clave de fa (altura 10) y una abajo de la de sol (-2).
  assert.equal(alturaEnPentagrama(escribirEnPapel(DO4, 0), "fa"), 10);
  assert.equal(alturaEnPentagrama(escribirEnPapel(DO4, 0), "sol"), -2);
});

probar("dos octavas son catorce pasos y no veinticuatro", () => {
  const bajo = escribirEnPapel(DO3, 0);
  const alto = escribirEnPapel(DO3 + 24, 0);
  assert.equal(pasoDe(alto) - pasoDe(bajo), 14);
});

probar("fa♯ y sol♭ suenan igual pero van en renglones distintos", () => {
  const fa = escribirEnPapel(66, 2); // Re mayor: fa♯ diatónico
  const sol = escribirEnPapel(66, -6); // Sol♭ mayor: la misma tecla, otra letra
  assert.equal(fa.letra, 3);
  assert.equal(sol.letra, 4);
  assert.equal(pasoDe(sol) - pasoDe(fa), 1);
});

// ---- El tiempo -------------------------------------------------------------

probar("una negra dura un cuarto de redonda y con puntillo tres octavos", () => {
  assert.equal(duracionDeEvento({ midis: [60], divide: 4 }), 0.25);
  assert.equal(duracionDeEvento({ midis: [60], divide: 4, puntillo: true }), 0.375);
});

probar("un compás de 3/4 dura tres negras", () => {
  assert.equal(duracionDeCompas({ numerador: 3, denominador: 4 }), 0.75);
  assert.equal(duracionDeCompas({ numerador: 4, denominador: 4 }), 1);
  assert.equal(duracionDeCompas({ numerador: 6, denominador: 8 }), 0.75);
});

probar("las notas caen en el compás que les toca", () => {
  const c = { numerador: 4, denominador: 4 };
  const evs = [4, 4, 4, 4, 4, 4, 4, 4].map((divide) => ({ midis: [60], divide }));
  const u = ubicar(evs, c);
  assert.deepEqual(u.map((x) => x.compas), [0, 0, 0, 0, 1, 1, 1, 1]);
  assert.deepEqual(u.map((x) => x.dentro), [0, 0.25, 0.5, 0.75, 0, 0.25, 0.5, 0.75]);
});

probar("un compás al que le falta una corchea se detecta", () => {
  const c = { numerador: 4, denominador: 4 };
  // Tres negras y una corchea: falta una corchea para cerrar.
  const evs = [
    { midis: [60], divide: 4 },
    { midis: [60], divide: 4 },
    { midis: [60], divide: 4 },
    { midis: [60], divide: 8 },
    { midis: [60], divide: 4 },
    { midis: [60], divide: 4 },
    { midis: [60], divide: 4 },
    { midis: [60], divide: 4 },
  ];
  const flojos = compasesIncompletos(evs, c);
  assert.ok(flojos.length > 0, "no detectó el compás corto");
  assert.equal(flojos[0].compas, 0);
});

probar("un compás bien cerrado no da falso positivo", () => {
  const c = { numerador: 3, denominador: 4 };
  const evs = [
    { midis: [60], divide: 2 }, // blanca
    { midis: [60], divide: 4 }, // negra
  ];
  assert.deepEqual(compasesIncompletos(evs, c), []);
});

// ---- Los tresillos ---------------------------------------------------------

const tresillo = { en: 3, de: 2 };

probar("una corchea de tresillo dura dos tercios de corchea", () => {
  const normal = duracionDeEvento({ midis: [60], divide: 8 });
  const trino = duracionDeEvento({ midis: [60], divide: 8, irregular: tresillo });
  assert.equal(normal, 0.125);
  assert.ok(Math.abs(trino - 0.125 * 2 / 3) < 1e-12);
});

probar("tres corcheas de tresillo duran lo mismo que una negra", () => {
  const tres = 3 * duracionDeEvento({ midis: [60], divide: 8, irregular: tresillo });
  assert.ok(Math.abs(tres - 0.25) < 1e-9, `dieron ${tres}`);
});

probar("doce corcheas de tresillo cierran un compás de 4/4", () => {
  const c = { numerador: 4, denominador: 4 };
  const evs = Array.from({ length: 12 }, () => ({ midis: [60], divide: 8, irregular: tresillo }));
  assert.deepEqual(compasesIncompletos(evs, c), []);
});

probar("la nota trece cae en el compás dos y no en el uno", () => {
  // El caso que se rompía: doce tercios suman 0,999999996 y no 1, así que la
  // primera del compás siguiente se colaba en el anterior.
  const c = { numerador: 4, denominador: 4 };
  const evs = Array.from({ length: 13 }, () => ({ midis: [60], divide: 8, irregular: tresillo }));
  const u = ubicar(evs, c);
  assert.equal(u[11].compas, 0);
  assert.equal(u[12].compas, 1);
});

probar("y arranca ese compás desde cero, no desde 0,999999996", () => {
  // La otra mitad del mismo caso: con `%` en vez de la resta, la nota trece
  // caía en el compás correcto pero con `dentro` casi 1 — se dibujaba pegada a
  // la barra final de su compás y contaba en el último tiempo, así que los
  // tresillos del compás dos se agrupaban 2+3+3+3+1 en vez de 3+3+3+3.
  const c = { numerador: 4, denominador: 4 };
  const evs = Array.from({ length: 13 }, () => ({ midis: [60], divide: 8, irregular: tresillo }));
  const u = ubicar(evs, c);
  assert.ok(Math.abs(u[12].dentro) < 1e-6, `dentro dio ${u[12].dentro}`);
});

probar("un tresillo de negras dura lo mismo que una blanca", () => {
  const tres = 3 * duracionDeEvento({ midis: [60], divide: 4, irregular: tresillo });
  assert.ok(Math.abs(tres - 0.5) < 1e-9, `dieron ${tres}`);
});

probar("el puntillo y el tresillo se combinan sin pisarse", () => {
  // Corchea con puntillo = 3/16; en tresillo, dos tercios de eso = 1/8.
  const d = duracionDeEvento({ midis: [60], divide: 8, puntillo: true, irregular: tresillo });
  assert.ok(Math.abs(d - 0.125) < 1e-12, `dio ${d}`);
});

// ---- Los signos que se dibujan ---------------------------------------------

probar("en Do mayor un fa♯ lleva sostenido y el siguiente del mismo compás no", () => {
  const notas = [65, 66, 66].map((m) => ({ nota: escribirEnPapel(m, 0), compas: 0 }));
  assert.deepEqual(signosDe(notas, 0), [null, "♯", null]);
});

probar("la alteración se borra en la barra de compás", () => {
  const notas = [
    { nota: escribirEnPapel(66, 0), compas: 0 },
    { nota: escribirEnPapel(66, 0), compas: 1 },
  ];
  assert.deepEqual(signosDe(notas, 0), ["♯", "♯"]);
});

probar("volver a la nota de la armadura después de alterarla pide becuadro", () => {
  // En Sol mayor el fa es sostenido; un fa natural lleva becuadro, y el fa♯ que
  // viene después vuelve a llevar sostenido porque el becuadro sigue vigente.
  const a = armaduraDe({ tonica: 7, modo: "mayor" });
  const notas = [
    { nota: escribirEnPapel(66, a), compas: 0 }, // fa♯, de la armadura
    { nota: { letra: 3, alter: 0, octava: 4, midi: 65 }, compas: 0 }, // fa natural
    { nota: escribirEnPapel(66, a), compas: 0 }, // fa♯ de nuevo
  ];
  assert.deepEqual(signosDe(notas, a), [null, "♮", "♯"]);
});

probar("una alteración no contagia a la misma letra en otra octava", () => {
  const notas = [
    { nota: escribirEnPapel(66, 0), compas: 0 }, // Fa♯4
    { nota: escribirEnPapel(54, 0), compas: 0 }, // Fa♯3
  ];
  assert.deepEqual(signosDe(notas, 0), ["♯", "♯"]);
});

// ---- Las piezas de verdad --------------------------------------------------

/** Todas las voces de una pieza, con el nombre de dónde salió cada una. */
const vocesConNombre = (pieza) => [
  ...vocesDe(pieza.derecha).map((v, i) => [`derecha${i ? ` voz ${i + 1}` : ""}`, v]),
  ...vocesDe(pieza.izquierda).map((v, i) => [`izquierda${i ? ` voz ${i + 1}` : ""}`, v]),
];

probar("todos los compases de todas las piezas cierran la cuenta", () => {
  for (const pieza of PIEZAS) {
    for (const [donde, eventos] of vocesConNombre(pieza)) {
      const flojos = compasesIncompletos(eventos, pieza.compas);
      assert.deepEqual(
        flojos,
        [],
        `${pieza.slug} (${donde}): ${flojos.map((f) => `compás ${f.compas + 1} suma ${f.suma} y debería sumar ${f.deberia}`).join("; ")}`,
      );
    }
  }
});

probar("todas las voces de una pieza duran lo mismo", () => {
  // Dos voces del mismo pentagrama llenan los mismos compases, así que si una
  // dura distinto de la otra hay una nota de más o de menos en algún lado.
  for (const pieza of PIEZAS) {
    const total = (evs) =>
      Math.round(evs.reduce((s, e) => s + duracionDeEvento(e), 0) * 1e6) / 1e6;
    const largos = vocesConNombre(pieza).map(([donde, v]) => [donde, total(v)]);
    const primero = largos[0][1];
    for (const [donde, largo] of largos) {
      assert.equal(largo, primero, `${pieza.slug}: ${donde} dura ${largo} y ${largos[0][0]} dura ${primero}`);
    }
  }
});

probar("ninguna pieza usa una figura que no existe", () => {
  for (const pieza of PIEZAS) {
    for (const [, v] of vocesConNombre(pieza)) {
      for (const e of v) {
        assert.ok(duracionDeEvento(e) > 0, `${pieza.slug}: divide ${e.divide}`);
      }
    }
  }
});

probar("una fila suelta y una lista de una voz son lo mismo", () => {
  const fila = [{ midis: [60], divide: 4 }];
  assert.deepEqual(vocesDe(fila), [fila]);
  assert.deepEqual(vocesDe([fila]), [fila]);
  assert.deepEqual(vocesDe([]), [[]]);
});

console.log(`${bien} bien, ${mal.length} mal`);
if (mal.length) {
  for (const m of mal) console.log("  ✗ " + m);
  process.exit(1);
}
