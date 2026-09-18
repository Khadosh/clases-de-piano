/**
 * Las texturas contra lo que la clase 7 dijo de cada una.
 *
 * Las del piano: que cada compás cierre la cuenta, que el pum-chá alterne
 * bajo y acorde, que el arpegio vaya 1 · 5 · 3 · 7 (u 8). Las cuatro de la
 * música: que la melodía sea la misma en todas, que la homofonía mueva sus
 * voces con el mismo ritmo y la polifonía no, y que la contravoz escrita a
 * mano caiga en el acorde en los pulsos fuertes.
 */

import assert from "node:assert/strict";
import { chordPitches, mod12, qualityById } from "../lib/music.ts";
import {
  FRASE_ACORDES,
  FRASE_CONTRAVOZ,
  FRASE_MELODIA,
  PULSOS_DE_FRASE,
  TEXTURAS_PIANO,
  TIPOS_DE_TEXTURA,
  compasDe,
  gradosDelArpegio,
  repartir,
  vestir,
  vocesDebajo,
} from "../lib/texturas.ts";

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
const DOM7 = qualityById("dom7");
const HOLGURA = 1e-6;
const fin = (eventos) => Math.max(...eventos.map((e) => e.t + e.dur));
const clases = (pitches) => new Set(pitches.map(mod12));

// ---- Las del piano ----------------------------------------------------------

probar("repartir: el bajo grave y el acorde entero cerca del Do central", () => {
  const c = repartir(0, MAJ);
  assert.equal(c.bajo, 36);
  assert.deepEqual(clases(c.derecha), clases(chordPitches(60, MAJ)));
  assert.ok(Math.min(...c.derecha) >= 55 && Math.min(...c.derecha) <= 65);
  const g = repartir(7, DOM7);
  assert.equal(g.bajo, 43);
  assert.equal(g.derecha.length, 4);
  const la = repartir(9, MAJ);
  assert.equal(la.bajo, 33, "el La va abajo del Do2 para no irse agudo");
});

probar("cada textura del piano llena el compás y ninguna se pasa", () => {
  for (const { id } of TEXTURAS_PIANO) {
    for (const q of [MAJ, DOM7]) {
      for (let root = 0; root < 12; root++) {
        const eventos = compasDe(id, repartir(root, q));
        assert.ok(eventos.length > 0, id);
        assert.equal(Math.min(...eventos.map((e) => e.t)), 0, `${id} arranca en el 1`);
        assert.ok(Math.abs(fin(eventos) - 4) < HOLGURA, `${id} sobre ${root}: termina en ${fin(eventos)}`);
        for (const e of eventos) assert.ok(e.pitches.length > 0, `${id}: evento sin teclas`);
      }
    }
  }
});

probar("plaqué es una sola cosa en el primer pulso, con el bajo y el acorde", () => {
  const eventos = compasDe("plaque", repartir(0, MAJ));
  assert.equal(eventos.length, 2);
  assert.ok(eventos.every((e) => e.t === 0 && e.dur === 4));
  assert.deepEqual(clases(eventos.flatMap((e) => e.pitches)), clases(chordPitches(60, MAJ)));
});

probar("pum-chá alterna el bajo solo y el acorde de la derecha, pulso por pulso", () => {
  const acorde = repartir(5, MAJ);
  const eventos = compasDe("pum-cha", acorde);
  assert.deepEqual(eventos.map((e) => e.t), [0, 1, 2, 3]);
  assert.deepEqual(eventos.map((e) => e.mano), ["izquierda", "derecha", "izquierda", "derecha"]);
  assert.deepEqual(eventos[0].pitches, [acorde.bajo]);
  assert.deepEqual(eventos[1].pitches, acorde.derecha);
});

probar("el arpegio va 1 · 5 · 3 · 7, y con tríada la octava en vez de la séptima", () => {
  assert.deepEqual(gradosDelArpegio(DOM7), [0, 7, 4, 10]);
  assert.deepEqual(gradosDelArpegio(MAJ), [0, 7, 4, 12]);
  const eventos = compasDe("arpegio", repartir(0, MAJ));
  assert.deepEqual(
    eventos.map((e) => e.pitches[0]),
    [36, 43, 40, 48, 48, 55, 52, 60],
  );
  assert.ok(eventos.every((e) => Math.abs(e.dur - 0.5) < HOLGURA), "corcheas");
  assert.deepEqual(eventos.slice(0, 4).map((e) => e.mano), Array(4).fill("izquierda"));
  assert.deepEqual(eventos.slice(4).map((e) => e.mano), Array(4).fill("derecha"));
});

probar("el intercalado alterna las manos nota por nota y mantiene el mismo orden", () => {
  const eventos = compasDe("arpegio-intercalado", repartir(0, DOM7));
  assert.deepEqual(
    eventos.map((e) => e.mano),
    ["izquierda", "derecha", "izquierda", "derecha", "izquierda", "derecha", "izquierda", "derecha"],
  );
  assert.deepEqual(
    eventos.map((e) => mod12(e.pitches[0])),
    [0, 7, 4, 10, 0, 7, 4, 10],
  );
  assert.deepEqual(eventos.map((e) => e.pitches[0]), [36, 55, 40, 58, 36, 55, 40, 58]);
});

// ---- Las cuatro de la música --------------------------------------------------

probar("la frase cierra la cuenta compás por compás, y la contravoz también", () => {
  for (const voz of [FRASE_MELODIA, FRASE_CONTRAVOZ]) {
    for (let c = 0; c < FRASE_ACORDES.length; c++) {
      const notas = voz.filter((n) => n.compas === c);
      const suma = notas.reduce((acc, n) => acc + n.dur, 0);
      assert.ok(Math.abs(suma - PULSOS_DE_FRASE) < HOLGURA, `compás ${c + 1}: suma ${suma}`);
      for (let i = 1; i < notas.length; i++) {
        assert.ok(Math.abs(notas[i].t - (notas[i - 1].t + notas[i - 1].dur)) < HOLGURA, `compás ${c + 1} tiene huecos`);
      }
    }
  }
});

probar("en los pulsos fuertes las dos voces caen en el acorde del compás", () => {
  for (const voz of [FRASE_MELODIA, FRASE_CONTRAVOZ]) {
    for (const n of voz) {
      if (n.t !== 0 && n.t !== 2) continue;
      const acorde = FRASE_ACORDES[n.compas];
      const c = clases(chordPitches(acorde.root, acorde.quality));
      assert.ok(c.has(mod12(n.pitch)), `compás ${n.compas + 1}, pulso ${n.t + 1}: ${n.pitch}`);
    }
  }
});

probar("la melodía es la misma en las cuatro texturas, y va en la derecha", () => {
  const original = FRASE_MELODIA.map((n) => `${n.compas * PULSOS_DE_FRASE + n.t}:${n.dur}:${n.pitch}`);
  for (const { id } of TIPOS_DE_TEXTURA) {
    const derecha = vestir(id)
      .filter((e) => e.mano === "derecha")
      .map((e) => `${e.t}:${e.dur}:${e.pitches[0]}`);
    assert.deepEqual(derecha, original, id);
  }
});

probar("monofonía: la izquierda hace exactamente lo mismo, una octava abajo", () => {
  const eventos = vestir("monofonia");
  const der = eventos.filter((e) => e.mano === "derecha");
  const izq = eventos.filter((e) => e.mano === "izquierda");
  assert.equal(der.length, izq.length);
  der.forEach((e, i) => {
    assert.equal(izq[i].t, e.t);
    assert.equal(izq[i].dur, e.dur);
    assert.equal(izq[i].pitches[0], e.pitches[0] - 12);
  });
});

probar("homofonía: cada nota de arriba baja con dos voces del acorde, en el mismo instante y con la misma duración", () => {
  const eventos = vestir("homofonia");
  const der = eventos.filter((e) => e.mano === "derecha");
  const izq = eventos.filter((e) => e.mano === "izquierda");
  assert.equal(der.length, izq.length);
  der.forEach((e, i) => {
    assert.equal(izq[i].t, e.t);
    assert.equal(izq[i].dur, e.dur);
    assert.equal(izq[i].pitches.length, 2);
    assert.ok(izq[i].pitches.every((p) => p < e.pitches[0]), "las voces van debajo");
    const compas = Math.floor(e.t / PULSOS_DE_FRASE);
    const acorde = FRASE_ACORDES[compas];
    const c = clases(chordPitches(acorde.root, acorde.quality));
    assert.ok(izq[i].pitches.every((p) => c.has(mod12(p))), "y son del acorde");
  });
  assert.deepEqual(vocesDebajo(64, FRASE_ACORDES[0], 2), [60, 55]);
});

probar("polifonía: la izquierda tiene su propio ritmo, distinto del de la melodía", () => {
  const eventos = vestir("polifonia");
  const ritmo = (mano) => eventos.filter((e) => e.mano === mano).map((e) => `${e.t}:${e.dur}`).join(" ");
  assert.notEqual(ritmo("izquierda"), ritmo("derecha"));
  assert.ok(eventos.filter((e) => e.mano === "izquierda").length > FRASE_MELODIA.length);
});

probar("melodía acompañada: un acorde por compás, plaqué, en la izquierda", () => {
  const izq = vestir("melodia-acompanada").filter((e) => e.mano === "izquierda");
  assert.equal(izq.length, FRASE_ACORDES.length);
  izq.forEach((e, i) => {
    assert.equal(e.t, i * PULSOS_DE_FRASE);
    assert.equal(e.dur, PULSOS_DE_FRASE);
    assert.deepEqual(clases(e.pitches), clases(chordPitches(FRASE_ACORDES[i].root, FRASE_ACORDES[i].quality)));
  });
});

console.log(`${bien} bien, ${mal.length} mal`);
if (mal.length) {
  for (const m of mal) console.log("  ✗ " + m);
  process.exit(1);
}
