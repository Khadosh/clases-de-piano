/**
 * El importador de grabaciones contra la primera grabación que se transcribió
 * a mano: Pum-chá en La menor. Si lo automático no reproduce lo que costó
 * una tarde, no sirve.
 *
 *   npm run test:grabacion
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compasesIncompletos, duracionDeEvento } from "../lib/pentagrama.ts";
import { corteAutomatico, estimarBpm, figurasDe, importarGrabacion, instantesDe } from "./importar-grabacion.mjs";

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

const grabacion = JSON.parse(readFileSync(new URL("../partituras-fuente/grabaciones/pum-cha-en-la-menor.json", import.meta.url), "utf8"));
const COMPAS = { numerador: 4, denominador: 4 };
const figs = (evs) => evs.map((e) => `${e.midis.join("+") || "s"}:${e.divide}${e.puntillo ? "." : ""}${e.irregular ? "T" : ""}${e.ligada ? "~" : ""}`);

probar("las duraciones se escriben como figuras: derechas, con puntillo, tresillos, y ligadas si mezclan", () => {
  assert.deepEqual(figurasDe(12), [{ divide: 4 }], "un pulso es negra");
  assert.deepEqual(figurasDe(48), [{ divide: 1 }], "cuatro pulsos, redonda");
  assert.deepEqual(figurasDe(18), [{ divide: 4, puntillo: true }], "pulso y medio, negra con puntillo");
  assert.deepEqual(figurasDe(6), [{ divide: 8 }], "medio pulso, corchea");
  assert.deepEqual(figurasDe(3), [{ divide: 16 }]);
  assert.deepEqual(figurasDe(9), [{ divide: 8, puntillo: true }]);
  assert.deepEqual(figurasDe(4), [{ divide: 8, irregular: { en: 3, de: 2 } }], "un tercio, corchea de tresillo");
  assert.deepEqual(figurasDe(8), [{ divide: 4, irregular: { en: 3, de: 2 } }], "dos tercios, negra de tresillo");
  assert.deepEqual(figurasDe(16), [{ divide: 4 }, { divide: 8, irregular: { en: 3, de: 2 }, ligada: true }], "un pulso y un tercio, ligadas");
  assert.deepEqual(figurasDe(36), [{ divide: 2, puntillo: true }]);
  assert.deepEqual(figurasDe(7), [{ divide: 16 }, { divide: 8, irregular: { en: 3, de: 2 }, ligada: true }], "la mezcla sale exacta, en dos");
  assert.deepEqual(figurasDe(24, { silencio: true }), [{ divide: 2, midis: [] }], "los silencios no se ligan");
});

probar("las manos se parten solas en el hueco del registro medio: acá entre el Do4 del chá y el Sol4 de la melodía", () => {
  assert.equal(corteAutomatico(grabacion.notas), 61);
  assert.equal(corteAutomatico([{ midi: 58 }, { midi: 60 }, { midi: 62 }]), 60, "sin hueco, el Do central");
});

probar("los instantes agrupan las teclas que cayeron juntas", () => {
  const inst = instantesDe(grabacion.notas);
  assert.equal(inst[0].t, 1750);
  assert.deepEqual(inst[0].notas.map((n) => n.midi).sort(), [45, 69], "el La4 y el La2 del arranque cayeron a 5 ms");
  assert.equal(inst.length, 31);
});

probar("el bpm se estima de la mano izquierda, y da el de la toma", () => {
  const bpm = estimarBpm(grabacion.notas);
  assert.ok(bpm >= 80 && bpm <= 88, `estimó ${bpm}`);
});

probar("contra el reloj fijo los compases cierran igual, pero el rubato del final sale desparejo", () => {
  const pieza = importarGrabacion(grabacion, { bpm: 84 });
  assert.deepEqual(compasesIncompletos(pieza.izquierda, COMPAS), []);
  assert.deepEqual(compasesIncompletos(pieza.derecha, COMPAS), []);
  assert.ok(pieza.izquierda.some((e) => e.ligada), "el compás estirado se parte en figuras ligadas");
});

probar("Pum-chá en La menor con el pulso en la izquierda sale como se transcribió a mano: 4 compases, la izquierda en negras alternando bajo y acorde", () => {
  const pieza = importarGrabacion(grabacion, { bpm: 84, pulso: "izquierda" });
  assert.equal(pieza.compases, 4);
  assert.deepEqual(compasesIncompletos(pieza.izquierda, COMPAS), []);
  assert.deepEqual(compasesIncompletos(pieza.derecha, COMPAS), []);
  const izq = pieza.izquierda;
  assert.equal(izq.length, 16, figs(izq).join(" "));
  izq.forEach((e, i) => {
    assert.equal(e.divide, 4, `evento ${i} de la izquierda: ${figs([e])}`);
    assert.ok(!e.puntillo && !e.irregular && !e.ligada);
    if (i % 2 === 0) assert.equal(e.midis.length, 1, "pum: el bajo solo");
    else assert.ok(e.midis.length >= 3, `chá: el acorde entero (${figs([e])})`);
  });
  // Los chá tal cual se tocaron: Mi3 La3 Do4, Do3 Fa3 La3, Re3 Sol3 Si3.
  assert.deepEqual(izq[1].midis, [52, 57, 60]);
  assert.deepEqual(izq[5].midis, [48, 53, 57]);
  assert.deepEqual(izq[9].midis, [50, 55, 59]);
  // El Re3 fantasma del segundo chá del primer compás entró con el acorde: es
  // una tecla de verdad, y sacarla es del que revisa, no del importador.
  assert.deepEqual(izq[3].midis, [50, 52, 57, 60]);
});

probar("la derecha: los tresillos de la corrida se detectan, y el La final dura el compás", () => {
  const pieza = importarGrabacion(grabacion, { bpm: 84, pulso: "izquierda" });
  const der = pieza.derecha;
  const total = der.reduce((acc, e) => acc + duracionDeEvento(e), 0);
  assert.equal(total, 4, "cuatro redondas");
  const tresillos = der.filter((e) => e.irregular).length;
  assert.ok(tresillos >= 12, `sólo ${tresillos} notas de tresillo: ${figs(der).join(" ")}`);
  const ultimo = der[der.length - 1];
  assert.deepEqual(ultimo.midis, [69]);
  assert.equal(ultimo.divide, 1, `el La final: ${figs([ultimo])}`);
  // Sin note-off se avisa: es lo que hay que saber al revisar.
  assert.ok(pieza.avisos.some((a) => a.includes("note-off")));
});

probar("con note-off, la duración anotada manda y el aire queda como silencio", () => {
  const ms = 60000 / 100;
  const notas = [
    { t: 0, midi: 60, velocity: 80, dur: ms * 0.45 }, // una corchea corta, y aire
    { t: ms, midi: 62, velocity: 80, dur: ms * 2 }, // una blanca
    { t: ms * 3, midi: 64, velocity: 80, dur: ms * 0.9 },
    { t: 0, midi: 48, velocity: 80, dur: ms * 4 },
  ];
  const pieza = importarGrabacion({ notas }, { bpm: 100 });
  assert.deepEqual(figs(pieza.derecha), ["60:8", "s:8", "62:2", "64:4"]);
  assert.deepEqual(figs(pieza.izquierda), ["48:1"]);
  assert.deepEqual(compasesIncompletos(pieza.derecha, COMPAS), []);
  assert.ok(!pieza.avisos.some((a) => a.includes("note-off")));
});

probar("una nota que cruza la barra se parte y se liga", () => {
  const ms = 600;
  const notas = [
    { t: 0, midi: 48, velocity: 80 },
    { t: ms * 3, midi: 60, velocity: 80, dur: ms * 2 },
    { t: ms * 5, midi: 62, velocity: 80, dur: ms * 3 },
  ];
  const pieza = importarGrabacion({ notas }, { bpm: 100 });
  // El Re cierra justo el segundo compás: no hace falta silencio después.
  assert.deepEqual(figs(pieza.derecha), ["s:2.", "60:4", "60:4~", "62:2."]);
  assert.deepEqual(figs(pieza.izquierda), ["48:1", "s:1"]);
});

console.log(`${bien} bien, ${mal.length} mal`);
if (mal.length) {
  for (const m of mal) console.log("  ✗ " + m);
  process.exit(1);
}
