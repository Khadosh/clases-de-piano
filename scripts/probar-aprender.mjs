/**
 * La sección «Aprender» de las partituras (#11): que cada una tenga los seis
 * pasos y sus capas terminando en todo junto, que una partitura sin datos no
 * la tenga, y que el análisis de la Oda y del Canon diga lo que suena en sus
 * partituras — cada acorde contra las notas de su tramo, los grados, la
 * armadura, los dominantes y la tecla que se queda.
 */

import assert from "node:assert/strict";
import { APRENDER, aprenderDe, compasesDeCapa, faltasDe, rutaDeAprender } from "../content/aprender/index.ts";
import { PIEZAS, piezaPorSlug } from "../content/partituras.ts";
import {
  ANCHO_DE_TECLADO_EN_CELULAR,
  BLANCA_MINIMA_EN_CELULAR,
  acentosDeCompas,
  cifradoDeCompas,
  cifradoDeVoicing,
  corcheasDe,
  gradoEnMayor,
  manosDeCompases,
  rangoDeCompases,
  teclasDelCompas,
} from "../lib/capas.ts";
import { ajenasDelTramo, notasEnCorcheas, tramosDePieza } from "../lib/tramos.ts";
import { armaduraEscrita, campoArmonico, leerDominante, tonoMayorDe } from "../lib/analisis.ts";
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

probar("Here Comes the Sun, la Oda y el Canon tienen «Aprender», y en su dirección", () => {
  assert.deepEqual(APRENDER.map((a) => a.slug), ["here-comes-the-sun", "oda-a-la-alegria", "canon-en-re"]);
  assert.equal(rutaDeAprender("canon-en-re"), "/partituras/canon-en-re/aprender");
  // La Oda y el Canon son partituras; Here Comes the Sun no (tiene derechos).
  assert.ok(piezaPorSlug("oda-a-la-alegria") && piezaPorSlug("canon-en-re"));
  assert.equal(piezaPorSlug("here-comes-the-sun"), undefined);
});

probar("una partitura sin datos no tiene «Aprender»", () => {
  const sin = PIEZAS.filter((p) => !aprenderDe(p.slug)).map((p) => p.slug);
  assert.ok(sin.includes("para-elisa") && sin.includes("oda-a-la-alegria-en-sol"));
  assert.equal(aprenderDe("para-elisa"), null);
  assert.equal(sin.length, PIEZAS.length - 2);
});

probar("cada «Aprender» tiene los seis pasos y sus capas, terminando en todo junto", () => {
  for (const a of APRENDER) assert.deepEqual(faltasDe(a), [], a.slug);
});

// Que el control controle: a una sección que está bien se le saca un paso o
// una capa y `faltasDe` lo tiene que decir. Si no, el test de arriba no prueba nada.
probar("si le falta un paso, una capa, todo junto o el loop de una capa, se grita", () => {
  const canon = aprenderDe("canon-en-re");
  const sinPaso = { ...canon, analisis: { ...canon.analisis } };
  delete sinPaso.analisis.prestamo;
  assert.deepEqual(faltasDe(sinPaso), ["falta el paso «prestamo»"]);

  const vacio = { ...canon, analisis: { ...canon.analisis, armadura: { ...canon.analisis.armadura, respuesta: " " } } };
  assert.deepEqual(faltasDe(vacio), ["el paso «armadura» está vacío"]);

  assert.deepEqual(faltasDe({ ...canon, capas: canon.capas.slice(0, -1) }), ["la última capa no es «todo junto»"]);
  assert.deepEqual(faltasDe({ ...canon, capas: canon.capas.slice(-1) }), ["no hay ninguna capa antes de «todo junto»"]);
  assert.deepEqual(faltasDe({ ...canon, capas: [] }), ["no tiene capas"]);

  const sinLoop = { ...canon, capas: [{ ...canon.capas[0], compases: [] }, ...canon.capas.slice(1)] };
  assert.deepEqual(faltasDe(sinLoop), ["la capa 1 («El bajo») no tiene nada para el loop"]);
});

probar("la tonalidad y el tempo de «Aprender» son los de su partitura", () => {
  for (const a of APRENDER) {
    const p = piezaPorSlug(a.slug);
    if (!p) continue;
    assert.equal(a.tonica, p.tonalidad.tonica, a.slug);
    assert.equal(p.tonalidad.modo, "mayor", a.slug);
    assert.equal(a.tempo, p.bpm, a.slug);
  }
});

// ---------------------------------------------------------------------------
// La armonía contra la partitura
// ---------------------------------------------------------------------------

const deLaPartitura = APRENDER.filter((a) => piezaPorSlug(a.slug));

probar("la armonía cubre la partitura entera, de punta a punta", () => {
  for (const a of deLaPartitura) {
    const p = piezaPorSlug(a.slug);
    assert.ok(a.armonia?.length, `${a.slug}: sin armonía`);
    const total = a.armonia.reduce((s, [, l]) => s + l, 0);
    for (const [voces, mano] of [[p.izquierda, "izq"], [p.derecha, "der"]]) {
      const notas = notasEnCorcheas(voces, mano);
      const fin = Math.max(...notas.map((n) => n.t + n.dur));
      assert.equal(fin, total, `${a.slug}: la ${mano} dura ${fin} corcheas y la armonía ${total}`);
    }
  }
});

probar("cada acorde del análisis suena en su tramo: la izquierda entera y la derecha en el primer tiempo son del acorde", () => {
  for (const a of deLaPartitura) {
    const tramos = tramosDePieza(piezaPorSlug(a.slug), a.armonia, { manos: ["izq", "der"] });
    tramos.forEach((t, i) => {
      const ajenas = ajenasDelTramo(t);
      if ((a.apoyaturas ?? []).includes(i)) assert.ok(ajenas.length, `${a.slug}, tramo ${i + 1}: la apoyatura declarada no está`);
      else assert.deepEqual(ajenas, [], `${a.slug}, tramo ${i + 1} (${t.etiqueta}): notas fuera del acorde`);
    });
  }
});

probar("los dominantes y los préstamos del análisis son los que suenan", () => {
  for (const a of deLaPartitura) {
    const tono = tonoMayorDe(a.tonica);
    const campo = campoArmonico(tono).map((c) => c.teclas.map(mod12).sort().join());
    const clases = (v) => [...new Set((v.acorde ?? [...v.izquierda, ...v.derecha]).map(mod12))].sort().join();
    const suenan = a.armonia.map(([v]) => cifradoDeVoicing(v));
    const afuera = a.armonia.filter(([v]) => !campo.includes(clases(v))).map(([v]) => cifradoDeVoicing(v));
    assert.deepEqual([...new Set(afuera)], a.analisis.prestamo.acordes.map(cifradoDeVoicing), `${a.slug}: préstamos`);
    for (const v of a.analisis.dominantes.acordes) assert.ok(suenan.includes(cifradoDeVoicing(v)), `${a.slug}: ${cifradoDeVoicing(v)} no suena`);
    const leidos = a.analisis.dominantes.acordes.map((v) => leerDominante(v, tono));
    assert.equal(a.analisis.otroCampo.modula, leidos.some((d) => d.tipo === "efectivo"), `${a.slug}: modula`);
  }
});

// ---------------------------------------------------------------------------
// La Oda
// ---------------------------------------------------------------------------

const oda = aprenderDe("oda-a-la-alegria");
const tonoDo = tonoMayorDe(0);

probar("la Oda: Do y Sol, un acorde por compás y el Sol–Do de la cadencia en el 8", () => {
  assert.deepEqual(oda.armonia.map(([v, l]) => `${cifradoDeVoicing(v)}${l}`), ["C8", "G8", "C8", "G8", "C8", "G8", "C8", "G4", "C4"]);
  assert.deepEqual([...new Set(oda.armonia.map(([v]) => gradoEnMayor(v, 0).romano))], ["I", "V"]);
});

probar("la Oda: sin armadura, el campo de Do, el Sol como único dominante y la apoyatura del compás 4", () => {
  assert.deepEqual(armaduraEscrita(tonoDo), []);
  assert.deepEqual(campoArmonico(tonoDo).map((c) => c.nombre), ["Do", "Rem", "Mim", "Fa", "Sol", "Lam", "Si°"]);
  assert.deepEqual(oda.analisis.dominantes.acordes.map((v) => leerDominante(v, tonoDo)).map((d) => [d.nombre, d.romano, d.va, d.tipo]), [
    ["Sol", "V", "Do", "principal"],
  ]);
  assert.deepEqual(oda.apoyaturas, [3]);
  const t = tramosDePieza(piezaPorSlug("oda-a-la-alegria"), oda.armonia, { manos: ["der"] })[3];
  assert.deepEqual(ajenasDelTramo(t), [64], "el Mi4 sobre el Sol");
});

probar("la Oda: la izquierda deja el Sol quieto de Do a Sol y de vuelta, con «=»", () => {
  const vuelta = oda.capas.find((k) => k.tipo === "acordes").vuelta;
  const quedan = vuelta.map((_, i) => teclasDelCompas(vuelta, i, 0).filter((x) => x.queda).map((x) => x.pitch));
  // C(Do·Sol) G/B(Si·Sol) C G(Sol·Re) C G/B C(Do·Mi) G C; el primero viene del último, que es el mismo Do·Sol.
  assert.deepEqual(quedan, [[48, 55], [55], [55], [], [], [55], [], [], []]);
  assert.ok(vuelta.every((c) => c.eventos.every((e) => e.mano === "izq")), "la izquierda sola");
});

probar("la Oda: la derecha es la melodía de la partitura, de Do a Sol, y la primera frase termina en Re", () => {
  const riff = oda.capas.find((k) => k.tipo === "riff");
  const notas = riff.compases.flatMap((c) => c.eventos.map((e) => e.teclas[0]));
  assert.ok(notas.every((p) => p >= 60 && p <= 67), "se sale de los cinco dedos");
  assert.equal(notas.length, 30);
  const frase = riff.previo.compases.flatMap((c) => c.eventos.map((e) => e.teclas[0]));
  assert.equal(frase.at(-1), 62);
  assert.equal(notas.at(-1), 60);
});

// ---------------------------------------------------------------------------
// El Canon
// ---------------------------------------------------------------------------

const canon = aprenderDe("canon-en-re");
const tonoRe = tonoMayorDe(2);
const capaDe = (titulo) => canon.capas.find((k) => k.titulo === titulo);

probar("el Canon: D A Bm F♯m G D G A, dos vueltas, I V vi iii IV I IV V", () => {
  const vuelta = ["D", "A", "Bm", "F#m", "G", "D", "G", "A"];
  assert.deepEqual(canon.armonia.map(([v]) => cifradoDeVoicing(v)), [...vuelta, ...vuelta]);
  assert.ok(canon.armonia.every(([, l]) => l === 4), "cada acorde dura dos tiempos");
  const p = capaDe("Los ocho acordes");
  const grados = p.acordes.map((v) => gradoEnMayor(v, 2));
  assert.deepEqual(grados.map((g) => g.romano), ["I", "V", "vi", "iii", "IV", "I", "IV", "V"]);
  assert.deepEqual(grados.map((g) => g.funcion), ["reposo", "dominante", "reposo", "reposo", "subdominante", "reposo", "subdominante", "dominante"]);
  assert.ok(grados.every((g) => !g.prestado));
});

probar("el Canon: dos sostenidos, el campo de Re, y el La como único dominante", () => {
  assert.deepEqual(armaduraEscrita(tonoRe).map((n) => escribirNota(n)), ["Fa♯", "Do♯"]);
  assert.deepEqual(campoArmonico(tonoRe).map((c) => c.nombre), ["Re", "Mim", "Fa♯m", "Sol", "La", "Sim", "Do♯°"]);
  assert.deepEqual(canon.analisis.dominantes.acordes.map((v) => leerDominante(v, tonoRe)).map((d) => [d.nombre, d.romano, d.va, d.tipo]), [
    ["La", "V", "Re", "principal"],
  ]);
});

probar("el Canon: el bajo son las ocho notas de la partitura, bajando de a cuarta en los tres primeros pares", () => {
  const bajo = capaDe("El bajo").compases.map((c) => c.eventos.map((e) => e.teclas));
  assert.deepEqual(bajo, [[[50]], [[45]], [[47]], [[42]], [[43]], [[38]], [[43]], [[45]]]);
  for (const i of [0, 2, 4]) assert.equal(bajo[i][0][0] - bajo[i + 1][0][0], 5, `par ${i / 2 + 1}`);
});

probar("el Canon: los acordes plantados dejan una tecla quieta donde la capa dice", () => {
  const c = capaDe("Los ocho acordes").compases;
  const quedan = c.map((_, i) => teclasDelCompas(c, i, null).filter((x) => x.queda).map((x) => x.pitch));
  // Re←La: La; La←Re: La; Sim←La: nada; Fa♯m←Sim: Fa♯; Sol←Fa♯m: nada; Re←Sol: Re; Sol←Re: Re; La←Sol: nada.
  assert.deepEqual(quedan, [[57], [57], [], [54], [], [50], [50], []]);
});

probar("el Canon: el arpegio es fundamental, tercera, quinta y octava; la derecha, una blanca del acorde por tramo", () => {
  for (const c of capaDe("El arpegio").compases) {
    const notas = c.eventos.map((e) => e.teclas[0]);
    assert.deepEqual(notas.map((p) => p - notas[0]).map(mod12), [0, notas[1] - notas[0] === 3 ? 3 : 4, 7, 0], c.etiqueta);
    assert.equal(notas[3] - notas[0], 12);
  }
  const der = capaDe("La derecha").compases.map((c) => c.eventos.map((e) => [e.teclas[0], e.dur]));
  assert.deepEqual(der, [[[78, 4]], [[76, 4]], [[74, 4]], [[73, 4]], [[71, 4]], [[69, 4]], [[71, 4]], [[73, 4]]]);
});

probar("el Canon: el click es fuerte en el tiempo 1 del compás y medio en el 3, aunque ahí cambie el acorde (#12)", () => {
  for (const titulo of ["El bajo", "Los ocho acordes", "El arpegio", "La derecha"]) {
    const primeros = capaDe(titulo).compases.map((c) => acentosDeCompas(c)[0]);
    assert.deepEqual(primeros, primeros.map((_, i) => (i % 2 ? "medio" : "fuerte")), titulo);
  }
  // Adentro de cada tramo, los dos tiempos y sus corcheas: fuerte (o medio), débil, medio, débil.
  const [uno, tres] = capaDe("El arpegio").compases;
  assert.deepEqual(acentosDeCompas(uno), ["fuerte", "debil", "medio", "debil"]);
  assert.deepEqual(acentosDeCompas(tres), ["medio", "debil", "medio", "debil"]);
});

probar("la Oda: el Do de la cadencia entra en el tiempo 3 del compás 8, y el click no lo marca como barra (#12)", () => {
  const vuelta = oda.capas.find((k) => k.tipo === "acordes").vuelta;
  assert.deepEqual(vuelta.map((c) => acentosDeCompas(c)[0]), [...Array(8).fill("fuerte"), "medio"]);
});

// ---------------------------------------------------------------------------
// Todas
// ---------------------------------------------------------------------------

probar("en el celular cada mano entra entera, también la izquierda del Canon", () => {
  const blancas = ({ from, to }) =>
    Array.from({ length: to - from + 1 }, (_, i) => from + i).filter((p) => ![1, 3, 6, 8, 10].includes(mod12(p))).length;
  const entran = Math.floor(ANCHO_DE_TECLADO_EN_CELULAR / BLANCA_MINIMA_EN_CELULAR);
  for (const a of APRENDER)
    for (const k of a.capas)
      for (const compases of compasesDeCapa(k)) {
        if (k.tipo === "ritmo") continue;
        for (const mano of ["izq", "der"]) {
          const r = rangoDeCompases(compases, mano);
          assert.ok(blancas(r) <= entran, `${a.slug}, ${k.titulo}, ${mano}: ${blancas(r)} blancas y entran ${entran}`);
        }
      }
});

probar("cada compás de capa cierra su cuenta y tiene su cifrado al lado", () => {
  for (const a of deLaPartitura)
    for (const k of a.capas)
      for (const compases of compasesDeCapa(k))
        for (const c of compases) {
          const largo = corcheasDe(c.grupos);
          assert.ok(c.eventos.every((e) => e.t >= 0 && e.t + e.dur <= largo), `${a.slug}, ${k.titulo}: un evento se pasa del compás`);
          assert.ok(cifradoDeCompas(c), `${a.slug}, ${k.titulo}: sin cifrado`);
        }
});

probar("en el celular se dibuja el teclado de cada mano que toca algo, y sólo ésas", () => {
  // La izquierda sola del Canon no tiene derecha: un teclado vacío de la derecha repetía las teclas de la izquierda.
  assert.deepEqual(manosDeCompases(capaDe("Los ocho acordes").compases), ["izq"]);
  assert.deepEqual(manosDeCompases(capaDe("El bajo").compases), ["izq"]);
  // La derecha sola lleva la izquierda apagada abajo: es el acorde.
  assert.deepEqual(manosDeCompases(capaDe("La derecha").compases), ["der", "izq"]);
  for (const k of aprenderDe("here-comes-the-sun").capas)
    for (const compases of compasesDeCapa(k)) if (k.tipo !== "ritmo") assert.deepEqual(manosDeCompases(compases), ["der", "izq"], k.titulo);
});

console.log(`${bien} bien, ${mal.length} mal`);
if (mal.length) {
  for (const m of mal) console.log("  ✗ " + m);
  process.exit(1);
}
