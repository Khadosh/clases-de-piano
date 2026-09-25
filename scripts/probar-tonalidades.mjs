/**
 * Las tonalidades contra lo que dice cualquier libro.
 *
 * El módulo no guarda ninguna tabla: escribe la escala letra por letra y
 * cuenta los signos. Eso es cómodo y también es una afirmación fuerte —que el
 * orden fa-do-sol-re-la-mi-si, las quince tonalidades y la regla del último
 * sostenido salen solas— así que más vale verificarla contra casos que se
 * pueden chequear a mano: Sol con un fa♯, Mi♭ con tres bemoles, Do♯ mayor con
 * su Si♯, la relativa menor de cada una.
 */

import assert from "node:assert/strict";
import {
  ORDEN_BEMOLES,
  ORDEN_SOSTENIDOS,
  TONALIDADES,
  armaduraDeTono,
  enarmonicaDe,
  escalaEscrita,
  escalaLegible,
  leerArmadura,
  nombreDeTono,
  nota,
  notasDeTono,
  relativaMayor,
  relativaMenor,
  signosDeArmadura,
  teclasDeTono,
  tonoDeArmadura,
  vecindadDe,
} from "../lib/tonalidades.ts";
import { ESCALAS, escalaPorId, triadasDeEscala } from "../lib/escalas.ts";
import { escribirNota, identificarAcorde, mod12 } from "../lib/music.ts";
import { armaduraDe } from "../lib/pentagrama.ts";

const escritas = (t) => notasDeTono(t).map((n) => escribirNota(n));
const mayor = (letra, alter = 0) => ({ tonica: nota(letra, alter), modo: "mayor" });
const menor = (letra, alter = 0) => ({ tonica: nota(letra, alter), modo: "menor" });

// --- Las escalas del cuaderno, una por una -------------------------------

assert.deepEqual(escritas(mayor(0)), ["Do", "Re", "Mi", "Fa", "Sol", "La", "Si"]);
assert.deepEqual(escritas(mayor(4)), ["Sol", "La", "Si", "Do", "Re", "Mi", "Fa♯"]);
assert.deepEqual(escritas(mayor(1)), ["Re", "Mi", "Fa♯", "Sol", "La", "Si", "Do♯"]);
assert.deepEqual(escritas(mayor(2)), ["Mi", "Fa♯", "Sol♯", "La", "Si", "Do♯", "Re♯"]);
// La de siete sostenidos: la única con Si♯, que es la tecla del Do.
assert.deepEqual(escritas(mayor(0, 1)), ["Do♯", "Re♯", "Mi♯", "Fa♯", "Sol♯", "La♯", "Si♯"]);
assert.deepEqual(escritas(mayor(3)), ["Fa", "Sol", "La", "Si♭", "Do", "Re", "Mi"]);
assert.deepEqual(escritas(mayor(2, -1)), ["Mi♭", "Fa", "Sol", "La♭", "Si♭", "Do", "Re"]);
assert.deepEqual(escritas(mayor(4, -1)), ["Sol♭", "La♭", "Si♭", "Do♭", "Re♭", "Mi♭", "Fa"]);
// Y la de siete bemoles, con su Fa♭, que es la tecla del Mi.
assert.deepEqual(escritas(mayor(0, -1)), ["Do♭", "Re♭", "Mi♭", "Fa♭", "Sol♭", "La♭", "Si♭"]);

// El Si♯ y el Fa♭ son las teclas que uno diría de otra manera: se escriben
// así porque la letra la pone el abecedario, no el dedo.
assert.equal(nota(6, 1).pc, 0);
assert.equal(nota(3, -1).pc, 4);

// --- Las menores ---------------------------------------------------------

assert.deepEqual(escritas(menor(5)), ["La", "Si", "Do", "Re", "Mi", "Fa", "Sol"]);
assert.deepEqual(escritas(menor(2)), ["Mi", "Fa♯", "Sol", "La", "Si", "Do", "Re"]);
assert.deepEqual(escritas(menor(1)), ["Re", "Mi", "Fa", "Sol", "La", "Si♭", "Do"]);

// --- La armadura es una cuenta -------------------------------------------

assert.equal(armaduraDeTono(mayor(0)), 0);
assert.equal(armaduraDeTono(mayor(4)), 1);
assert.equal(armaduraDeTono(mayor(3)), -1);
assert.equal(armaduraDeTono(mayor(2, -1)), -3);
assert.equal(armaduraDeTono(mayor(0, 1)), 7);
assert.equal(armaduraDeTono(mayor(0, -1)), -7);
// La menor comparte armadura con su relativa: son las mismas siete notas.
for (const t of TONALIDADES) {
  assert.equal(armaduraDeTono(t.menor), t.armadura, nombreDeTono(t.menor));
  assert.deepEqual(
    new Set(notasDeTono(t.mayor).map((n) => n.pc)),
    new Set(notasDeTono(t.menor).map((n) => n.pc)),
    nombreDeTono(t.mayor),
  );
}

// --- Son quince, y no porque estén escritas ------------------------------

assert.equal(TONALIDADES.length, 15);
assert.deepEqual(
  TONALIDADES.map((t) => t.armadura),
  [-7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7],
);
assert.deepEqual(
  TONALIDADES.map((t) => nombreDeTono(t.mayor, "en")),
  ["Cb", "Gb", "Db", "Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#"],
);
// La tabla de relativas del cuaderno, de punta a punta.
assert.deepEqual(
  TONALIDADES.map((t) => nombreDeTono(t.menor, "en")),
  ["Abm", "Ebm", "Bbm", "Fm", "Cm", "Gm", "Dm", "Am", "Em", "Bm", "F#m", "C#m", "G#m", "D#m", "A#m"],
);
// Ida y vuelta.
for (const t of TONALIDADES) {
  assert.deepEqual(relativaMenor(t.mayor), t.menor, nombreDeTono(t.mayor));
  assert.deepEqual(relativaMayor(t.menor), t.mayor, nombreDeTono(t.menor));
}

// Las que quedaron afuera son las que pedían doble signo, no las que a alguien
// le parecieron feas: Sol♯ mayor tendría Fa♯♯.
const solSostenido = escalaEscrita(nota(4, 1), escalaPorId("mayor"));
assert.ok(solSostenido.some((n) => Math.abs(n.alter) > 1));

// --- El orden de los signos sale solo ------------------------------------

// Los sostenidos de cada tonalidad son un prefijo de fa-do-sol-re-la-mi-si, y
// los bemoles del orden al revés. Nadie se lo dijo al módulo: se deduce de qué
// letras pidieron signo en cada escala.
for (const t of TONALIDADES) {
  const conSigno = notasDeTono(t.mayor).filter((n) => n.alter !== 0);
  const orden = t.armadura > 0 ? ORDEN_SOSTENIDOS : ORDEN_BEMOLES;
  const esperadas = orden.slice(0, Math.abs(t.armadura));
  assert.deepEqual(
    new Set(conSigno.map((n) => n.letra)),
    new Set(esperadas),
    `los signos de ${nombreDeTono(t.mayor)}`,
  );
  assert.deepEqual(
    signosDeArmadura(t.armadura).map((n) => escribirNota(n)),
    esperadas.map((letra) => escribirNota(nota(letra, t.armadura > 0 ? 1 : -1))),
  );
}
assert.deepEqual(
  signosDeArmadura(3).map((n) => escribirNota(n)),
  ["Fa♯", "Do♯", "Sol♯"],
);
assert.deepEqual(
  signosDeArmadura(-3).map((n) => escribirNota(n)),
  ["Si♭", "Mi♭", "La♭"],
);

// --- La regla para leer una armadura -------------------------------------

// La que se usa mirando un papel: el último sostenido más un semitono, o el
// anteúltimo bemol. Que coincida siempre con la lista es la única forma
// honesta de afirmar que la regla funciona.
for (const t of TONALIDADES) {
  const { tonica } = leerArmadura(t.armadura);
  assert.deepEqual(
    tonica,
    t.mayor.tonica,
    `leer ${t.armadura} tendría que dar ${nombreDeTono(t.mayor)}`,
  );
}
// Los dos ejemplos del cuaderno.
assert.equal(escribirNota(leerArmadura(3).tonica), "La");
assert.equal(escribirNota(leerArmadura(-3).tonica), "Mi♭");
assert.equal(escribirNota(leerArmadura(0).tonica), "Do");
assert.equal(escribirNota(leerArmadura(-1).tonica), "Fa");

// --- Enarmónicas ---------------------------------------------------------

const pares = TONALIDADES.filter((t) => enarmonicaDe(t)).map((t) =>
  [nombreDeTono(t.mayor, "en"), nombreDeTono(enarmonicaDe(t).mayor, "en")].sort().join("/"),
);
assert.deepEqual([...new Set(pares)].sort(), ["B/Cb", "C#/Db", "F#/Gb"]);

// --- Contra el pentagrama ------------------------------------------------

// El pentagrama elige el enarmónico por costumbre (Fa♯ y no Sol♭) pero el
// número de alteraciones tiene que ser el mismo de acá, o una partitura
// saldría con una armadura y la clase diría otra.
for (const t of TONALIDADES) {
  for (const tono of [t.mayor, t.menor]) {
    const delPapel = armaduraDe({ tonica: mod12(tono.tonica.pc), modo: tono.modo });
    assert.equal(
      Math.abs(delPapel - armaduraDeTono(tono)) % 12,
      0,
      `${nombreDeTono(tono)}: el papel dice ${delPapel}`,
    );
  }
}

// --- Las teclas ----------------------------------------------------------

// Do♭ mayor suena en Si: el papel y el piano no dicen lo mismo, y eso es medio
// tema de la clase.
assert.equal(mod12(teclasDeTono(mayor(0, -1))[0]), 11);
assert.deepEqual(teclasDeTono(mayor(0), 60), [60, 62, 64, 65, 67, 69, 71, 72]);
assert.equal(teclasDeTono(mayor(4), 60).length, 8);

console.log("tonalidades: todo bien ✓");

// --- La escala de una tecla, escrita para leer ----------------------------

// El ejercicio de escalas acepta cualquier tecla como tónica, así que hay que
// elegir con qué nombres escribirla: la de costumbre, salvo que pida dobles.
const nombres = (pc, id) => escalaLegible(pc, escalaPorId(id)).map((n) => escribirNota(n));
assert.deepEqual(nombres(5, "mayor"), ["Fa", "Sol", "La", "Si♭", "Do", "Re", "Mi"]);
// La tecla negra de Mi♭: la mayor de Re♯ pediría dobles, así que va Mi♭…
assert.deepEqual(nombres(3, "mayor"), ["Mi♭", "Fa", "Sol", "La♭", "Si♭", "Do", "Re"]);
// …y la menor también, aunque Re♯ menor se pueda escribir: manda la costumbre,
// que es la que dice el botón de la tónica.
assert.equal(nombres(3, "menor-natural")[0], "Mi♭");
// La armónica sube el séptimo: en La menor es Sol♯, no La♭.
assert.equal(nombres(9, "menor-armonica").at(-1), "Sol♯");
// Y ninguna escala de ninguna tecla sale con doble signo.
for (const e of ESCALAS) {
  for (let pc = 0; pc < 12; pc++) {
    assert.ok(
      escalaLegible(pc, e).every((n) => Math.abs(n.alter) <= 1),
      `${e.nombre} desde ${pc}`,
    );
  }
}

console.log("escalas legibles: todo bien ✓");

// --- La vecindad: los acordes de la tonalidad son las casillas pegadas ----

// Lo que hace útil al círculo. Se cruza contra el camino largo —apilar
// terceras de la propia escala e identificar cada acorde— porque la
// afirmación es fuerte: si fuera falsa, el dibujo enseñaría algo que no es.
for (const t of TONALIDADES) {
  if (Math.abs(t.armadura) > 6) continue; // en los extremos los nombres son enarmónicos
  const tonica = 60 + mod12(t.mayor.tonica.pc);
  const triadas = triadasDeEscala(tonica, escalaPorId("mayor"));
  const vecinos = Object.fromEntries(vecindadDe(t.armadura).map((v) => [v.grado, v]));
  const cifras = ["I", "ii", "iii", "IV", "V", "vi"];
  for (let g = 0; g < 6; g++) {
    const acorde = identificarAcorde(triadas[g]);
    const v = vecinos[cifras[g]];
    assert.ok(v, `${nombreDeTono(t.mayor)} sin vecino para ${cifras[g]}`);
    assert.equal(
      v.tono.tonica.pc,
      mod12(acorde.root),
      `el ${cifras[g]} de ${nombreDeTono(t.mayor)}: la casilla dice ${nombreDeTono(v.tono)}`,
    );
    assert.equal(v.modo, acorde.quality.id === "min" ? "menor" : "mayor");
  }
  // El séptimo es disminuido y por eso no tiene casilla en el círculo.
  assert.equal(identificarAcorde(triadasDeEscala(tonica, escalaPorId("mayor"))[6]).quality.id, "dim");
}

// Y en los extremos la vecindad no se rompe: se completa con la enarmónica.
const extremo = vecindadDe(-7);
assert.equal(extremo.length, 6);
assert.ok(extremo.find((v) => v.grado === "IV").enarmonica);

console.log("la vecindad del círculo: todo bien ✓");
