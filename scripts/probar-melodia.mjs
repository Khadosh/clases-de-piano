/**
 * La melodía generada, contra sus propias reglas.
 *
 * El generador promete —nota del acorde en los pulsos fuertes, las ajenas
 * ganadas por grado conjunto, respiraciones sólo en pulso débil, final largo
 * en el último acorde, y las guías respetadas— y acá se verifica que cumple
 * **siempre**: sobre todas las progresiones del catálogo (con préstamos
 * incluidos) y un montón de semillas, no sobre la que salió linda una vez.
 * Es la misma idea que test:grados: teoría que la app afirma no puede quedar
 * sólo escrita.
 */

import assert from "node:assert/strict";
import {
  analizarEscrita,
  candidatosDelAcorde,
  componerMelodia,
  duracionEscrita,
  esDelAcorde,
  eventosEscritos,
  figuraEntra,
  gradoDeTecla,
  midiDeNota,
  mismaNota,
  notaDeTecla,
  posicionEscrita,
  resumenDeEscrita,
  sugerirGuias,
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
const FM = { grado: 3, deEscala: "menor-natural" };
// Las progresiones del catálogo más las de la tarea de la clase 4: con el
// préstamo estrella adentro.
const SECUENCIAS = [
  ...PROGRESIONES.map((p) => ({ nombre: p.nombre, acordes: p.grados })),
  { nombre: "I – IV – iv – I (préstamo)", acordes: [0, 3, FM, 0] },
  { nombre: "I – iv – V – I (préstamo)", acordes: [0, FM, 4, 0] },
];
const CASOS = SECUENCIAS.flatMap((p) =>
  SEMILLAS.map((s) => ({ nombre: `${p.nombre} (semilla ${s})`, acordes: p.acordes, semilla: s })),
);

const notas = (eventos) => eventos.filter((e) => e.midis.length > 0);

probar("toda melodía cierra la cuenta de todos sus compases", () => {
  for (const c of CASOS) {
    const eventos = componerMelodia(c.acordes, c.semilla);
    assert.deepEqual(compasesIncompletos(eventos, COMPAS), [], c.nombre);
    const total = ubicar(eventos, COMPAS).at(-1);
    assert.equal(total.compas, c.acordes.length - 1, c.nombre);
  }
});

probar("toda nota está en el rango, y las diatónicas son de Do mayor", () => {
  for (const c of CASOS) {
    for (const e of notas(componerMelodia(c.acordes, c.semilla))) {
      const midi = e.midis[0];
      const n = notaDeTecla(midi);
      assert.ok(n, `${c.nombre}: ${midi} no se puede escribir`);
      assert.ok(n.d >= GRADO_MIN && n.d <= GRADO_MAX, `${c.nombre}: grado ${n.d} fuera de rango`);
      const diatonica = c.acordes.every((a) => typeof a === "number");
      if (diatonica) {
        assert.ok(MAJOR_SCALE.includes(mod12(midi)), `${c.nombre}: ${midi} no es de Do mayor`);
      }
    }
  }
});

probar("en los pulsos fuertes (1 y 3) siempre hay una nota del acorde", () => {
  for (const c of CASOS) {
    for (const n of ubicar(componerMelodia(c.acordes, c.semilla), COMPAS)) {
      if (n.midis.length === 0) continue;
      const fuerte =
        Math.abs(n.dentro) < HOLGURA || Math.abs(n.dentro - 0.5) < HOLGURA;
      if (!fuerte) continue;
      assert.ok(
        esDelAcorde(notaDeTecla(n.midis[0]), c.acordes[n.compas]),
        `${c.nombre}: compás ${n.compas + 1}, pulso fuerte afuera del acorde`,
      );
    }
  }
});

probar("toda nota ajena al acorde llega o se va por grado conjunto", () => {
  for (const c of CASOS) {
    const eventos = ubicar(componerMelodia(c.acordes, c.semilla), COMPAS).filter(
      (n) => n.midis.length > 0,
    );
    eventos.forEach((n, i) => {
      const nota = notaDeTecla(n.midis[0]);
      if (esDelAcorde(nota, c.acordes[n.compas])) return;
      // El paso se mide en semitonos (1 o 2), que vale también con bemoles.
      const dist = (j) =>
        j >= 0 && j < eventos.length
          ? Math.abs(eventos[j].midis[0] - n.midis[0])
          : null;
      const paso = (x) => x !== null && x >= 1 && x <= 2;
      assert.ok(paso(dist(i - 1)) || paso(dist(i + 1)), `${c.nombre}: nota ${i} de aire`);
    });
  }
});

probar("no hay saltos de más de una octava", () => {
  for (const c of CASOS) {
    const midis = notas(componerMelodia(c.acordes, c.semilla)).map((e) => e.midis[0]);
    midis.slice(1).forEach((m, i) => {
      assert.ok(Math.abs(m - midis[i]) <= 12, `${c.nombre}: salto de ${Math.abs(m - midis[i])}`);
    });
  }
});

probar("el final es una redonda del último acorde", () => {
  for (const c of CASOS) {
    const final = componerMelodia(c.acordes, c.semilla).at(-1);
    assert.equal(final.divide, 1, c.nombre);
    assert.ok(
      esDelAcorde(notaDeTecla(final.midis[0]), c.acordes.at(-1)),
      `${c.nombre}: termina afuera del acorde`,
    );
  }
});

probar("las respiraciones sólo caen en el pulso débil, y alguna semilla respira", () => {
  let respiraciones = 0;
  for (const c of CASOS) {
    for (const n of ubicar(componerMelodia(c.acordes, c.semilla), COMPAS)) {
      if (n.midis.length > 0) continue;
      respiraciones++;
      const fuerte =
        Math.abs(n.dentro) < HOLGURA || Math.abs(n.dentro - 0.5) < HOLGURA;
      assert.ok(!fuerte, `${c.nombre}: un silencio en pulso fuerte`);
    }
  }
  assert.ok(respiraciones > 0, "ninguna melodía respira");
});

probar("la misma semilla da la misma melodía, y otra semilla otra", () => {
  const acordes = PROGRESIONES[0].grados;
  assert.deepEqual(componerMelodia(acordes, 7), componerMelodia(acordes, 7));
  const distintas = new Set(
    SEMILLAS.map((s) => JSON.stringify(componerMelodia(acordes, s))),
  );
  assert.ok(distintas.size > SEMILLAS.length / 2, `sólo ${distintas.size} melodías distintas`);
});

// ---- Los préstamos y las guías ----------------------------------------------

probar("el Fm presta el La♭: es candidato, y es del acorde", () => {
  const candidatos = candidatosDelAcorde(FM);
  const laBemol = candidatos.find((n) => n.b && ((n.d % 7) + 7) % 7 === 5);
  assert.ok(laBemol, "el La♭ no está entre los candidatos del Fm");
  assert.equal(mod12(midiDeNota(laBemol)), 8);
  assert.ok(esDelAcorde(laBemol, FM));
  // Y sobre el IV diatónico no hay ningún bemol que ofrecer.
  assert.ok(candidatosDelAcorde(3).every((n) => !n.b));
});

probar("con guías elegidas, cada compás aterriza en la prometida", () => {
  for (const p of SECUENCIAS) {
    for (const semilla of SEMILLAS.slice(0, 5)) {
      const guias = sugerirGuias(p.acordes, semilla + 100);
      const eventos = ubicar(componerMelodia(p.acordes, semilla, guias), COMPAS);
      const primeras = new Map();
      for (const n of eventos) {
        if (n.midis.length === 0) continue;
        if (!primeras.has(n.compas)) primeras.set(n.compas, n.midis[0]);
      }
      guias.forEach((g, c) => {
        assert.equal(
          primeras.get(c),
          midiDeNota(g),
          `${p.nombre}: el compás ${c + 1} no arranca en su guía`,
        );
      });
    }
  }
});

probar("las guías sugeridas son notas del acorde que reciben", () => {
  for (const p of SECUENCIAS) {
    const guias = sugerirGuias(p.acordes, 3);
    assert.equal(guias.length, p.acordes.length);
    guias.forEach((g, i) => {
      assert.ok(esDelAcorde(g, p.acordes[i]), `${p.nombre}: guía ${i} afuera del acorde`);
    });
  }
});

probar("notaDeTecla escribe los bemoles achatables y rebota el resto", () => {
  assert.deepEqual(notaDeTecla(60), { d: 0 });
  assert.deepEqual(notaDeTecla(68), { d: 5, b: true }); // La♭4
  assert.deepEqual(notaDeTecla(63), { d: 2, b: true }); // Mi♭4
  assert.deepEqual(notaDeTecla(70), { d: 6, b: true }); // Si♭4
  assert.equal(notaDeTecla(61), null); // Do♯: Re no se achata en las menores
  assert.ok(mismaNota(notaDeTecla(68), { d: 5, b: true }));
});

probar("gradoDeTecla es el inverso de scaleDegreeToPitch, y las negras no son grado", () => {
  for (let d = GRADO_MIN - 7; d <= GRADO_MAX + 7; d++) {
    assert.equal(gradoDeTecla(scaleDegreeToPitch(d)), d);
  }
  assert.equal(gradoDeTecla(61), null);
});

// ---- La melodía escrita a mano ----------------------------------------------

const N = (d, divide, b) => ({ nota: b ? { d, b: true } : { d }, divide });
const S = (divide) => ({ nota: null, divide });

probar("el presupuesto de la escritura: figuras que entran y compás que avanza", () => {
  const compases = 3;
  assert.deepEqual(posicionEscrita([], compases), {
    compas: 0, dentro: 0, esUltimo: false, completa: false,
  });
  // Media blanca escrita: la redonda ya no entra, la blanca justo cierra.
  const media = [N(0, 4), N(1, 4)];
  assert.equal(duracionEscrita(media), 0.5);
  assert.equal(figuraEntra(media, 1, compases), false);
  assert.equal(figuraEntra(media, 2, compases), true);
  assert.equal(figuraEntra(media, 8, compases), true);
  // En el último compás sólo entra la redonda del final.
  const dosCompases = [N(0, 1), N(2, 1)];
  assert.equal(posicionEscrita(dosCompases, compases).esUltimo, true);
  assert.equal(figuraEntra(dosCompases, 4, compases), false);
  assert.equal(figuraEntra(dosCompases, 1, compases), true);
  // Completa: no entra nada más.
  const completa = [N(0, 1), N(2, 1), N(4, 1)];
  assert.equal(posicionEscrita(completa, compases).completa, true);
  assert.equal(figuraEntra(completa, 1, compases), false);
});

probar("una melodía escrita completa cierra la cuenta, con silencios y todo", () => {
  const escrita = [N(2, 4), N(1, 4), N(0, 2), S(4), N(4, 4), N(3, 8), N(2, 8), S(4), N(0, 1)];
  assert.deepEqual(compasesIncompletos(eventosEscritos(escrita), COMPAS), []);
});

probar("el veredicto: acorde, paso y aire, y los silencios no se juzgan", () => {
  // Sobre I – V: Do Re Mi Fa | Sol. El Re y el Fa caminan; lo demás es del
  // acorde. El silencio da null y corta la caminata: una ajena después de
  // respirar no llegó caminando desde atrás.
  const escrita = [N(0, 4), N(1, 4), N(2, 4), N(3, 4), N(4, 1)];
  assert.deepEqual(analizarEscrita(escrita, [0, 4]), [
    "acorde", "paso", "acorde", "paso", "acorde",
  ]);
  const conSilencio = [N(0, 4), N(0, 4), N(0, 2), S(4), N(5, 4), N(0, 2), N(0, 1)];
  const v = analizarEscrita(conSilencio, [0, 0]);
  assert.equal(v[3], null);
  assert.equal(v[4], "aire"); // el La tras el silencio no llega caminando
});

probar("el resumen: fuertes, aterrizajes, respiración y variedad", () => {
  // I – V con guías Mi y Sol: aterriza bien en las dos, respira y varía.
  const guias = [{ d: 2 }, { d: 4 }];
  const escrita = [N(2, 4), N(1, 4), N(0, 4), S(4), N(4, 1)];
  const r = resumenDeEscrita(escrita, [0, 4], guias);
  assert.equal(r.aterrizajes, 2);
  assert.equal(r.aterrizajesBien, 2);
  assert.equal(r.respira, true);
  assert.equal(r.varia, true);
  assert.equal(r.terminaEnAcorde, true);
  assert.equal(r.terminaEnCasa, true); // Sol es la fundamental del V
  assert.ok(r.fuertes >= 2 && r.fuertesBien >= 2);
  // Y errarle a la guía se nota: arrancar en Do cuando se prometió Mi.
  const errada = resumenDeEscrita([N(0, 1), N(4, 1)], [0, 4], guias);
  assert.equal(errada.aterrizajesBien, 1);
  assert.equal(errada.respira, false);
  assert.equal(errada.varia, false);
});

probar("el La♭ escrito sobre el Fm es del acorde, y sobre el F es aire", () => {
  const laBemol = [N(0, 2), N(5, 2, true), N(0, 1)];
  assert.deepEqual(analizarEscrita(laBemol, [FM, 0]).slice(0, 2), ["acorde", "acorde"]);
  // Sobre el IV mayor, la misma tecla no pertenece y tampoco llega caminando.
  const sobreMayor = analizarEscrita([N(0, 2), N(5, 2, true), N(0, 1)], [3, 0]);
  assert.equal(sobreMayor[1], "aire");
});

probar("el Fa sobre G7 es del acorde: la séptima cuenta como nota propia", () => {
  const v7 = { grado: 4, septima: true };
  assert.equal(esDelAcorde({ d: 3 }, v7), true); // Fa, la nota del color
  assert.equal(esDelAcorde({ d: 3 }, 4), false); // sobre el G a secas, no
  // Y por eso es candidata a guía del V7, cosa que sobre la tríada no era.
  assert.ok(candidatosDelAcorde(v7).some((n) => mismaNota(n, { d: 3 })));
  // La escritura lo ve igual: sol-fa-mi-re sobre G7 arranca con dos propias.
  const frase = [N(4, 4), N(3, 4), N(2, 4), N(1, 4), N(0, 1)];
  assert.deepEqual(analizarEscrita(frase, [v7, 0]).slice(0, 2), ["acorde", "acorde"]);
});

probar("componer sobre cuatriadas cumple las mismas promesas", () => {
  const acordes = [0, { grado: 1, septima: true }, { grado: 4, septima: true }, 0];
  for (const semilla of SEMILLAS) {
    const eventos = componerMelodia(acordes, semilla);
    assert.equal(compasesIncompletos(eventos, COMPAS).length, 0);
    for (const u of ubicar(eventos, COMPAS)) {
      if (u.midis.length === 0) continue;
      const fuerte = Math.abs(u.dentro) < HOLGURA || Math.abs(u.dentro - 0.5) < HOLGURA;
      if (fuerte) {
        const a = acordes[Math.min(u.compas, acordes.length - 1)];
        assert.ok(
          esDelAcorde(notaDeTecla(u.midis[0]), a),
          `semilla ${semilla}: pulso fuerte fuera del acorde`,
        );
      }
    }
  }
});

console.log(`${bien} bien, ${mal.length} mal`);
if (mal.length) {
  for (const m of mal) console.log("  ✗ " + m);
  process.exit(1);
}
