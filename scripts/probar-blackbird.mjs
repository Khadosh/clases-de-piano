/**
 * Blackbird en «Aprender» (#13): que los acordes y el bajo cierren entre sí
 * —el bajo que camina, la décima pegada, el Sol que se queda— y que el
 * análisis de los seis pasos diga lo que suena en las capas, acorde por
 * acorde. Los acordes son los de la grabación según el análisis de Pollack
 * (#15): el bajo y la décima de cada compás se clavan contra sus figuras.
 */

import assert from "node:assert/strict";
import { aprenderDe, faltasDe } from "../content/aprender/index.ts";
import { ESTROFA, INTERLUDIO, LINEA_1, PUENTE } from "../content/aprender/blackbird.ts";
import { piezaPorSlug } from "../content/partituras.ts";
import {
  acentosDeCompas,
  cifradoDeCompas,
  cifradoDeVoicing,
  corcheasDe,
  gradoEnMayor,
  identificarVoicing,
  teclasDelCompas,
  teclasQueSeQuedan,
} from "../lib/capas.ts";
import { armaduraEscrita, campoArmonico, leerDominante, leerPrestamo, tonoMayorDe } from "../lib/analisis.ts";
import { escribirNota, mod12 } from "../lib/music.ts";

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

const bb = aprenderDe("blackbird");
const tono = tonoMayorDe(7);
const capa = (titulo) => bb.capas.find((k) => k.titulo === titulo);
const bajoDe = (v) => Math.min(...v.izquierda);

probar("Blackbird tiene «Aprender», sin partitura (tiene derechos), con los seis pasos y sus capas", () => {
  assert.ok(bb, "no está en APRENDER");
  assert.equal(piezaPorSlug("blackbird"), undefined);
  assert.deepEqual(faltasDe(bb), []);
  assert.deepEqual(
    bb.capas.map((k) => k.tipo),
    ["riff", "acordes", "riff", "progresion", "todo"],
  );
  assert.equal(bb.tonica, 7);
});

probar("los acordes de la estrofa y del puente, en orden", () => {
  assert.deepEqual(ESTROFA.map(cifradoDeVoicing), [
    "G", "Am7", "G", "G",
    "C", "C#dim", "D", "D#dim", "Em", "Em/D#",
    "D", "C#dim", "C", "Cm",
    "G", "A7", "D7sus4", "G",
  ]);
  assert.deepEqual(INTERLUDIO.map(cifradoDeVoicing), ["C", "G", "A7", "D7sus4", "G"]);
  assert.deepEqual(PUENTE.map(cifradoDeVoicing), ["F", "C", "Dm", "C", "Bb", "C", "F", "C", "Dm", "C", "Bb", "A7", "D7sus4", "G"]);
  // El Sol/Si y el Do/Mi llevan la tercera en el bajo: es lo que hace caminar al bajo.
  assert.equal(mod12(bajoDe(ESTROFA[2])), 11);
  assert.equal(mod12(bajoDe(PUENTE[1])), 4);
});

probar("el bajo y la línea de arriba de cada acorde son los de Pollack (figuras 139.1, 139.2 y 139.3)", () => {
  // [bajo, la nota de la línea de arriba], en clases de nota. La de arriba es la
  // décima casi siempre; en los disminuidos es la quinta. El bajo es la nota más
  // grave, y la de arriba tiene que estar en la derecha.
  const G = 7, A = 9, B = 11, C = 0, Cs = 1, D = 2, Ds = 3, E = 4, F = 5, Fs = 6, Bb = 10;
  const comparar = (vs, figura) => {
    assert.equal(vs.length, figura.length);
    vs.forEach((v, i) => {
      const [bajo, arriba] = figura[i];
      assert.equal(mod12(bajoDe(v)), bajo, `${cifradoDeVoicing(v)} (${i}): el bajo`);
      assert.ok(v.derecha.map(mod12).includes(arriba), `${cifradoDeVoicing(v)} (${i}): falta la nota ${arriba} arriba`);
    });
  };
  comparar(ESTROFA, [
    [G, B], [A, C], [B, D], [G, B],
    [C, E], [Cs, G], [D, Fs], [Ds, A], [E, G], [Ds, G],
    [D, Fs], [Cs, G], [C, E], [C, Ds],
    [B, D], [A, Cs], [A, C], [G, B],
  ]);
  comparar(INTERLUDIO, [[C, E], [B, D], [A, Cs], [D, C], [G, B]]);
  comparar(PUENTE, [
    [F, A], [E, G], [D, F], [C, E], [Bb, D], [C, E],
    [F, A], [E, G], [D, F], [C, E], [Bb, D], [A, Cs], [D, C], [G, B],
  ]);
});

probar("el bajo camina: la primera línea por la escala, la subida y la bajada por semitonos", () => {
  const notas = ESTROFA.map(bajoDe);
  assert.deepEqual(LINEA_1.map(bajoDe), [43, 45, 47, 43]);
  // Do · Do♯ · Re · Re♯ · Mi: de a semitono para arriba.
  const subida = notas.slice(4, 9);
  for (let i = 1; i < subida.length; i++) assert.equal(subida[i] - subida[i - 1], 1, `la subida, paso ${i}`);
  // Mi · Mi♭ · Re · Do♯ · Do · (Do) · Si · La: para abajo, nunca más de un tono.
  const bajada = notas.slice(8, 16);
  for (let i = 1; i < bajada.length; i++) {
    const paso = bajada[i - 1] - bajada[i];
    assert.ok(paso >= 0 && paso <= 2, `la bajada, de ${bajada[i - 1]} a ${bajada[i]}`);
  }
  // De Mi a Do, la bajada entera es cromática: Mi · Mi♭ · Re · Do♯ · Do.
  assert.deepEqual(notas.slice(8, 13), [52, 51, 50, 49, 48]);
  assert.equal(mod12(notas.at(-2)), 9, "el La se queda bajo el Re7sus4");
  assert.equal(mod12(notas.at(-1)), 7, "y cae en Sol");
  // El puente baja Fa Mi Re Do Si♭ dos veces: la primera vuelve al Do, la segunda sigue al La.
  assert.deepEqual(PUENTE.slice(0, 6).map(bajoDe), [53, 52, 50, 48, 46, 48]);
  assert.deepEqual(PUENTE.slice(6, 12).map(bajoDe), [53, 52, 50, 48, 46, 45]);
});

probar("la derecha arranca en la décima del bajo, que es la tercera del acorde", () => {
  for (const v of [...ESTROFA, ...INTERLUDIO, ...PUENTE]) {
    // En el Re7sus4 la décima del La7 baja al Do, la séptima (figuras 139.1 y 139.2):
    // con el La abajo sigue siendo una décima; con el Re, es una séptima.
    if (identificarVoicing(v).quality.id === "7sus4") {
      assert.equal(mod12(Math.min(...v.derecha)), 0, "el Do");
      continue;
    }
    const decima = Math.min(...v.derecha);
    const a = identificarVoicing(v);
    assert.ok([15, 16].includes(decima - bajoDe(v)), `${cifradoDeVoicing(v)}: ${decima - bajoDe(v)} semitonos`);
    // Arriba del bajo, la décima es la tercera del acorde (o la quinta, si el bajo ya es la tercera).
    const grado = mod12(decima - a.root);
    assert.ok([3, 4, 7].includes(grado), `${cifradoDeVoicing(v)}: la décima es el grado ${grado}`);
  }
});

probar("el Sol4 se queda arriba de Sol a Do♯°, y en toda la bajada; el Re y el Re♯° no lo tienen", () => {
  const conSol = ESTROFA.map((v) => v.derecha.includes(67));
  assert.deepEqual(conSol, [true, true, true, true, true, true, false, false, true, true, false, true, true, true, true, true, true, true]);
  // Y la tecla que se queda es la que el teclado marca.
  for (let i = 1; i < 6; i++) assert.ok(teclasQueSeQuedan(ESTROFA[i - 1], ESTROFA[i]).includes(67), `al ${cifradoDeVoicing(ESTROFA[i])}`);
  // Del Do al Do menor se mueve un solo dedo: el Mi al Mi♭.
  const [doM, doMenor] = [ESTROFA[12], ESTROFA[13]];
  assert.deepEqual(doM.derecha.filter((p) => !doMenor.derecha.includes(p)), [64]);
  assert.deepEqual(doMenor.derecha.filter((p) => !doM.derecha.includes(p)), [63]);
});

probar("la capa de los acordes marca el Sol que se queda en el teclado", () => {
  const v = capa("Los acordes con el Sol arriba").vuelta;
  const quedan = teclasDelCompas(v, 1, null).filter((t) => t.queda).map((t) => t.pitch);
  assert.deepEqual(quedan, [67], "Sol → Lam7: el Sol4");
});

probar("el bajo solo: suena sólo la izquierda, en cada tiempo, con el acorde apagado y el cifrado en la cuenta", () => {
  const k = capa("El bajo que camina");
  for (const compases of [k.compases, k.previo.compases]) {
    // La derecha se dibuja apagada (es la capa siguiente) y nunca suena.
    assert.ok(teclasDelCompas(compases, 0, 0).filter((t) => t.mano === "der").every((t) => !t.suena));
    for (const c of compases) {
      assert.ok(c.eventos.every((e) => e.mano === "izq" && e.teclas.length === 1));
      assert.deepEqual(c.eventos.map((e) => e.t), Array.from({ length: corcheasDe(c.grupos) / 2 }, (_, i) => i * 2));
      assert.ok(cifradoDeCompas(c));
    }
  }
  assert.deepEqual(k.compases.map(cifradoDeCompas), ESTROFA.map(cifradoDeVoicing));
});

probar("el punteo: en el tiempo bajo y décima juntos, en el «y» lo de arriba solo", () => {
  const k = capa("La derecha: la décima y el Sol");
  for (const c of [...k.compases, ...k.previo.compases]) {
    const v = c.voicing;
    const decima = Math.min(...v.derecha);
    for (let t = 0; t < corcheasDe(c.grupos); t++) {
      const arrancan = c.eventos.filter((e) => e.t === t).flatMap((e) => e.teclas).sort((a, b) => a - b);
      if (t % 2 === 0) assert.deepEqual(arrancan, [...v.izquierda, decima].sort((a, b) => a - b), `${cifradoDeVoicing(v)}, corchea ${t}`);
      else assert.deepEqual(arrancan, v.derecha.filter((p) => p !== decima), `${cifradoDeVoicing(v)}, corchea ${t}`);
    }
  }
});

probar("dos acordes por compás de 4/4: el segundo entra en el tiempo 3 y no suena como barra (#12)", () => {
  const c = capa("La derecha: la décima y el Sol").compases;
  assert.deepEqual(c.map((m) => acentosDeCompas(m)[0]), ESTROFA.map((_, i) => (i % 2 ? "medio" : "fuerte")));
  // Dieciocho acordes de dos tiempos: nueve compases de 4/4 justos.
  assert.equal(c.reduce((s, m) => s + corcheasDe(m.grupos), 0), 72);
  // El interludio son cinco: el Sol del final dura el compás entero y cierra en 4/4.
  const inter = capa("Todo junto").secciones.find((x) => x.nombre === "Interludio").compases;
  assert.equal(corcheasDe(inter.at(-1).grupos), 8);
  assert.equal(inter.reduce((s, m) => s + corcheasDe(m.grupos), 0) % 8, 0);
});

// ---------------------------------------------------------------------------
// El análisis, acorde por acorde
// ---------------------------------------------------------------------------

const ana = bb.analisis;

probar("tonalidad, campo y armadura: Sol mayor, Sol Lam Sim Do Re Mim Fa♯°, un sostenido", () => {
  assert.equal(escribirNota(tono.tonica), "Sol");
  assert.deepEqual(campoArmonico(tono).map((a) => a.nombre), ["Sol", "Lam", "Sim", "Do", "Re", "Mim", "Fa♯°"]);
  assert.deepEqual(armaduraEscrita(tono).map((n) => escribirNota(n)), ["Fa♯"]);
});

probar("cada acorde de la estrofa es del campo, dominante (o su disminuido) o prestado — y nada más", () => {
  const campo = campoArmonico(tono).map((a) => [...new Set(a.teclas.map(mod12))].sort().join());
  const clases = (v) => [...new Set((v.acorde ?? [...v.izquierda, ...v.derecha]).map(mod12))].sort().join();
  const triada = (v) => {
    const a = identificarVoicing(v);
    return [a.root, a.root + a.quality.stack[0], a.root + a.quality.stack[0] + a.quality.stack[1]].map(mod12).sort().join();
  };
  const dominantes = ana.dominantes.acordes.map(cifradoDeVoicing);
  const prestados = ana.prestamo.acordes.map(cifradoDeVoicing);
  // El Mim/Re♯ es el Mim con el bajo bajando: Pollack no le da raíz.
  const dePaso = ["Em/D#"];
  for (const v of [...ESTROFA, ...INTERLUDIO, ...PUENTE]) {
    const c = cifradoDeVoicing(v);
    if (dePaso.includes(c)) continue;
    const delCampo = campo.includes(triada(v));
    const disminuido = identificarVoicing(v).quality.id === "dim";
    assert.ok(delCampo || dominantes.includes(c) || disminuido || prestados.includes(c), `${c} (${clases(v)}) no está explicado`);
  }
});

probar("las quintas mayores: Re7sus4 es el V7 y La7 el V7/V, que cae en Re", () => {
  assert.deepEqual(ana.dominantes.acordes.map((v) => leerDominante(v, tono)).map((d) => [d.nombre, d.romano, d.va, d.tipo]), [
    ["Re7sus4", "V7sus4", "Sol", "principal"],
    ["La7", "V7/V", "Re", "secundario"],
  ]);
  // Los dos están en lo que se toca.
  const suenan = [...ESTROFA, ...PUENTE].map(cifradoDeVoicing);
  for (const v of ana.dominantes.acordes) assert.ok(suenan.includes(cifradoDeVoicing(v)));
});

probar("el Do♯° es el La7 sin el La y el Re♯° el Si7 sin el Si: van al acorde de arriba", () => {
  const dis = ESTROFA.filter((v) => identificarVoicing(v).quality.id === "dim");
  for (const v of dis) {
    const { root } = identificarVoicing(v);
    const dominante = [root - 4, root, root + 3, root + 6].map(mod12).sort().join();
    const sinFundamental = [root, root + 3, root + 6].map(mod12).sort().join();
    assert.equal(dominante.split(",").filter((x) => sinFundamental.split(",").includes(x)).length, 3);
    // Y en la estrofa, el que viene después está un semitono arriba: es su llegada.
    const i = ESTROFA.indexOf(v);
    const siguiente = ESTROFA[i + 1];
    if (i === 5 || i === 7) assert.equal(mod12(identificarVoicing(siguiente).root - root), 1, `${cifradoDeVoicing(v)} → ${cifradoDeVoicing(siguiente)}`);
  }
});

probar("el paso 5: ningún dominante lleva afuera, así que no modula", () => {
  const efectivos = ana.dominantes.acordes.map((v) => leerDominante(v, tono)).filter((d) => d.tipo === "efectivo");
  assert.equal(ana.otroCampo.modula, efectivos.length > 0);
  assert.equal(ana.otroCampo.modula, false);
});

probar("el paso 6: Do menor, Fa, Rem y Si♭ vienen de Sol menor, y ninguno es del campo", () => {
  const leidos = ana.prestamo.acordes.map((v) => leerPrestamo(v, tono));
  assert.deepEqual(leidos.map((p) => [p.nombre, p.romano, p.de && `${escribirNota(p.de.tonica)} ${p.de.modo}`]), [
    ["Dom", "iv", "Sol menor"],
    ["Fa", "♭VII", "Sol menor"],
    ["Rem", "v", "Sol menor"],
    ["Si♭", "♭III", "Sol menor"],
  ]);
  const campo = campoArmonico(tono).map((a) => a.nombre);
  for (const p of leidos) assert.ok(!campo.includes(p.nombre), `${p.nombre} está en el campo de Sol mayor`);
});

probar("el puente pintado: ♭VII IV v IV ♭III IV, y ♭VII IV v IV ♭III V7/V V7sus4 I, con los prestados marcados y el La7 como tensión", () => {
  const g = capa("El puente").acordes.map((v) => gradoEnMayor(v, 7));
  assert.deepEqual(g.map((x) => x.romano), ["♭VII", "IV", "v", "IV", "♭III", "IV", "♭VII", "IV", "v", "IV", "♭III", "V7/V", "V7sus4", "I"]);
  assert.deepEqual(g.map((x) => x.prestado), [true, false, true, false, true, false, true, false, true, false, true, false, false, false]);
  assert.equal(g[11].funcion, "dominante", "el La7 es tensión, no media tensión");
  assert.equal(g[12].funcion, "dominante", "el Re7sus4 también");
  // El Do menor tiene la fundamental en la escala y la tercera de Sol menor: es prestado igual.
  assert.deepEqual(gradoEnMayor(ESTROFA[13], 7), { romano: "iv", funcion: "subdominante", prestado: true });
});

console.log(`${bien} bien, ${mal.length} mal`);
if (mal.length) {
  for (const m of mal) console.log("  ✗ " + m);
  process.exit(1);
}
