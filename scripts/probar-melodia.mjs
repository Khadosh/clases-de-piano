/**
 * La melodía generada, contra sus propias reglas.
 *
 * El generador promete tres cosas —nota del acorde en los pulsos fuertes,
 * las ajenas ganadas por grado conjunto, final largo en el último acorde— y
 * acá se verifica que las cumple **siempre**: sobre todas las progresiones
 * del catálogo y un montón de semillas, no sobre la que salió linda una vez.
 * Es la misma idea que test:grados: teoría que la app afirma no puede quedar
 * sólo escrita.
 */

import assert from "node:assert/strict";
import {
  analizarMelodia,
  componerMelodia,
  esDelAcorde,
  eventosDeMelodiaEscrita,
  gradoDeTecla,
  lugaresDeMelodia,
  posicionDeLugar,
  resumenDeMelodia,
  GRADO_MAX,
  GRADO_MIN,
} from "../lib/melodia.ts";
import { PROGRESIONES } from "../lib/grados.ts";
import { compasesIncompletos, ubicar, HOLGURA } from "../lib/pentagrama.ts";
import { MAJOR_SCALE, mod12, scaleDegreeToPitch } from "../lib/music.ts";

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

const COMPAS = { numerador: 4, denominador: 4 };
const SEMILLAS = Array.from({ length: 25 }, (_, i) => i + 1);
const CASOS = PROGRESIONES.flatMap((p) =>
  SEMILLAS.map((s) => ({ nombre: `${p.nombre} (semilla ${s})`, grados: p.grados, semilla: s })),
);

probar("toda melodía cierra la cuenta de todos sus compases", () => {
  for (const c of CASOS) {
    const eventos = componerMelodia(c.grados, c.semilla);
    assert.deepEqual(compasesIncompletos(eventos, COMPAS), [], c.nombre);
    const total = ubicar(eventos, COMPAS).at(-1);
    assert.equal(total.compas, c.grados.length - 1, c.nombre);
  }
});

probar("toda nota es de Do mayor y está en el rango de la melodía", () => {
  for (const c of CASOS) {
    for (const e of componerMelodia(c.grados, c.semilla)) {
      const midi = e.midis[0];
      assert.ok(MAJOR_SCALE.includes(mod12(midi)), `${c.nombre}: ${midi} no es de Do mayor`);
      const d = gradoDeTecla(midi);
      assert.ok(d >= GRADO_MIN && d <= GRADO_MAX, `${c.nombre}: grado ${d} fuera de rango`);
    }
  }
});

probar("en los pulsos fuertes (1 y 3) siempre hay una nota del acorde", () => {
  for (const c of CASOS) {
    for (const n of ubicar(componerMelodia(c.grados, c.semilla), COMPAS)) {
      const fuerte =
        Math.abs(n.dentro) < HOLGURA || Math.abs(n.dentro - 0.5) < HOLGURA;
      if (!fuerte) continue;
      const d = gradoDeTecla(n.midis[0]);
      assert.ok(
        esDelAcorde(d, c.grados[n.compas]),
        `${c.nombre}: compás ${n.compas + 1}, pulso fuerte con grado ${d}`,
      );
    }
  }
});

probar("toda nota ajena al acorde llega o se va por grado conjunto", () => {
  for (const c of CASOS) {
    const eventos = ubicar(componerMelodia(c.grados, c.semilla), COMPAS);
    const grados = eventos.map((n) => gradoDeTecla(n.midis[0]));
    grados.forEach((d, i) => {
      if (esDelAcorde(d, c.grados[eventos[i].compas])) return;
      const pasoAntes = i > 0 && Math.abs(d - grados[i - 1]) === 1;
      const pasoDespues = i + 1 < grados.length && Math.abs(d - grados[i + 1]) === 1;
      assert.ok(pasoAntes || pasoDespues, `${c.nombre}: nota ${i} de aire (grado ${d})`);
    });
  }
});

probar("no hay saltos de más de una octava", () => {
  for (const c of CASOS) {
    const midis = componerMelodia(c.grados, c.semilla).map((e) => e.midis[0]);
    midis.slice(1).forEach((m, i) => {
      assert.ok(Math.abs(m - midis[i]) <= 12, `${c.nombre}: salto de ${Math.abs(m - midis[i])}`);
    });
  }
});

probar("el final es una redonda del último acorde", () => {
  for (const c of CASOS) {
    const eventos = componerMelodia(c.grados, c.semilla);
    const final = eventos.at(-1);
    assert.equal(final.divide, 1, c.nombre);
    assert.ok(
      esDelAcorde(gradoDeTecla(final.midis[0]), c.grados.at(-1)),
      `${c.nombre}: termina afuera del acorde`,
    );
  }
});

probar("la misma semilla da la misma melodía, y otra semilla otra", () => {
  const grados = PROGRESIONES[0].grados;
  assert.deepEqual(componerMelodia(grados, 7), componerMelodia(grados, 7));
  const distintas = new Set(
    SEMILLAS.map((s) => JSON.stringify(componerMelodia(grados, s))),
  );
  assert.ok(distintas.size > SEMILLAS.length / 2, `sólo ${distintas.size} melodías distintas`);
});

// ---- La melodía escrita a mano ----------------------------------------------

probar("la grilla: cuatro pulsos por compás y una redonda al final", () => {
  assert.equal(lugaresDeMelodia(4), 13);
  assert.equal(lugaresDeMelodia(1), 1);
  assert.deepEqual(posicionDeLugar(0, 4), { compas: 0, pulso: 0, esFinal: false });
  assert.deepEqual(posicionDeLugar(11, 4), { compas: 2, pulso: 3, esFinal: false });
  assert.deepEqual(posicionDeLugar(12, 4), { compas: 3, pulso: 0, esFinal: true });
});

probar("una melodía escrita completa cierra la cuenta", () => {
  const grados = [0, 3, 4, 0];
  const notas = Array.from({ length: lugaresDeMelodia(4) }, () => 0);
  const eventos = eventosDeMelodiaEscrita(notas, 4);
  assert.deepEqual(compasesIncompletos(eventos, COMPAS), []);
});

probar("el veredicto: acorde, paso y aire como los define la regla", () => {
  // Sobre I – V: Do Re Mi Fa | Sol. El Re y el Fa caminan; todo lo demás es
  // del acorde. Y sobre I: un La caído del cielo entre dos Do es aire.
  assert.deepEqual(analizarMelodia([0, 1, 2, 3, 4], [0, 4]), [
    "acorde", "paso", "acorde", "paso", "acorde",
  ]);
  assert.deepEqual(analizarMelodia([0, 5, 0], [0]), ["acorde", "aire", "acorde"]);
});

probar("el resumen cuenta los pulsos fuertes y mira el final", () => {
  const r = resumenDeMelodia([0, 1, 2, 3, 4], [0, 4]);
  assert.equal(r.fuertes, 3); // pulsos 1 y 3 del primer compás, y la redonda
  assert.equal(r.fuertesBien, 3);
  assert.equal(r.deAire, 0);
  assert.equal(r.terminaEnAcorde, true);
  assert.equal(r.terminaEnCasa, true); // Sol es la fundamental del V
});

probar("gradoDeTecla es el inverso de scaleDegreeToPitch, y las negras no son grado", () => {
  for (let d = GRADO_MIN - 7; d <= GRADO_MAX + 7; d++) {
    assert.equal(gradoDeTecla(scaleDegreeToPitch(d)), d);
  }
  assert.equal(gradoDeTecla(61), null); // Do♯ no es de Do mayor
});

console.log(`${bien} bien, ${mal.length} mal`);
if (mal.length) {
  for (const m of mal) console.log("  ✗ " + m);
  process.exit(1);
}
