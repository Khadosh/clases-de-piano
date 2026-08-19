/**
 * Prueba las cuentas de figuras y compases.
 *
 *   npm run test:ritmo
 *
 * Son cuentas chiquitas y por eso mismo fáciles de romper sin que se note: un
 * compás mal clasificado no tira ningún error, sólo suena distinto de como
 * debería y hay que tener oído para darse cuenta.
 */
import {
  FIGURAS,
  aCompuesto,
  aSimple,
  banderasDe,
  cabezaLlena,
  duracionDe,
  esCompuesto,
  figuraDeSubdivision,
  figuraQueDivide,
  partesPorTiempo,
  patronDe,
  pulsoDe,
  subdivisionDe,
  tiemposDe,
  tienePlica,
  duracionDeCompas,
  duracionDeRelleno,
  rellenosDe,
  hermanosDe,
  compasTexto,
} from "../lib/ritmo.ts";

let pasaron = 0;
let fallaron = 0;

function comprobar(titulo, obtenido, esperado) {
  const a = JSON.stringify(obtenido);
  const b = JSON.stringify(esperado);
  if (a === b) {
    pasaron++;
    console.log(`  ✓ ${titulo}`);
  } else {
    fallaron++;
    console.log(`  ✗ ${titulo}\n      esperaba ${b}\n      obtuvo   ${a}`);
  }
}

const c = (numerador, denominador) => ({ numerador, denominador });

console.log("\nlas figuras");

comprobar(
  "cada figura divide a la redonda en el doble que la anterior",
  FIGURAS.map((f) => f.divide),
  [1, 2, 4, 8, 16, 32, 64],
);

comprobar(
  "la redonda no tiene plica y la blanca sí",
  [tienePlica(FIGURAS[0]), tienePlica(FIGURAS[1])],
  [false, true],
);

comprobar(
  "la cabeza se llena recién en la negra",
  FIGURAS.map(cabezaLlena),
  [false, false, true, true, true, true, true],
);

comprobar(
  "las banderas: ninguna hasta la negra, después una por paso",
  FIGURAS.map(banderasDe),
  [0, 0, 0, 1, 2, 3, 4],
);

comprobar(
  "una negra dura un cuarto de redonda, y con puntillo un cuarto y medio",
  [duracionDe(FIGURAS[2]), duracionDe(FIGURAS[2], true)],
  [0.25, 0.375],
);

comprobar("figuraQueDivide(8) es la corchea", figuraQueDivide(8).id, "corchea");

console.log("\nsimples y compuestos");

comprobar(
  "2/4, 3/4 y 4/4 son simples",
  [c(2, 4), c(3, 4), c(4, 4)].map(esCompuesto),
  [false, false, false],
);

comprobar(
  "6/8, 9/8 y 12/8 son compuestos",
  [c(6, 8), c(9, 8), c(12, 8)].map(esCompuesto),
  [true, true, true],
);

comprobar(
  "3/8 NO es compuesto: es un simple de tres tiempos",
  esCompuesto(c(3, 8)),
  false,
);

comprobar(
  "la constante 3/2 lleva 2/4 a 6/8, 3/4 a 9/8 y 4/4 a 12/8",
  [c(2, 4), c(3, 4), c(4, 4)].map((x) => aCompuesto(x)),
  [c(6, 8), c(9, 8), c(12, 8)],
);

comprobar("y vuelve: 6/8 sale de 2/4", aSimple(c(6, 8)), c(2, 4));

comprobar(
  "en 6/8 se sienten dos tiempos, no seis",
  [tiemposDe(c(6, 8)), tiemposDe(c(9, 8)), tiemposDe(c(12, 8))],
  [2, 3, 4],
);

comprobar(
  "los simples parten cada tiempo en dos y los compuestos en tres",
  [partesPorTiempo(c(3, 4)), partesPorTiempo(c(6, 8))],
  [2, 3],
);

comprobar(
  "y por eso la subdivisión es binaria o ternaria",
  [subdivisionDe(c(4, 4)), subdivisionDe(c(12, 8))],
  ["binaria", "ternaria"],
);

console.log("\nel pulso");

comprobar(
  "en 3/4 el pulso es la negra, sin puntillo",
  [pulsoDe(c(3, 4)).figura.id, pulsoDe(c(3, 4)).conPuntillo],
  ["negra", false],
);

comprobar(
  "en 6/8 el pulso NO es la corchea: es la negra con puntillo",
  [pulsoDe(c(6, 8)).figura.id, pulsoDe(c(6, 8)).conPuntillo],
  ["negra", true],
);

comprobar(
  "en 6/4 el pulso es la blanca con puntillo",
  [pulsoDe(c(6, 4)).figura.id, pulsoDe(c(6, 4)).conPuntillo],
  ["blanca", true],
);

comprobar(
  "en 3/4 cada tiempo se parte en corcheas; en 6/8 también, pero de a tres",
  [figuraDeSubdivision(c(3, 4)).id, figuraDeSubdivision(c(6, 8)).id],
  ["corchea", "corchea"],
);

console.log("\nlos acentos");

comprobar(
  "3/4: seis corcheas, con golpe cada dos",
  patronDe(c(3, 4)),
  ["fuerte", "debil", "medio", "debil", "medio", "debil"],
);

comprobar(
  "6/8: las MISMAS seis corcheas, pero con golpe cada tres",
  patronDe(c(6, 8)),
  ["fuerte", "debil", "debil", "medio", "debil", "debil"],
);

comprobar(
  "4/4 tiene ocho subdivisiones y cuatro golpes",
  patronDe(c(4, 4)).filter((a) => a !== "debil").length,
  4,
);

comprobar(
  "3/4 y 6/8 tienen la misma cantidad de corcheas (por eso se confunden)",
  [patronDe(c(3, 4)).length, patronDe(c(6, 8)).length],
  [6, 6],
);

console.log("\ncuánto entra en un compás");

comprobar(
  "3/4 dura tres negras; 3/2, tres blancas",
  [duracionDeCompas(c(3, 4)), duracionDeCompas(c(3, 2))],
  [0.75, 1.5],
);

comprobar(
  "todos los rellenos de 3/4 llenan el compás justo, ni más ni menos",
  rellenosDe(c(3, 4)).map((r) => duracionDeRelleno(r)),
  [0.75, 0.75, 0.75],
);

comprobar(
  "en 3/4 se puede poner una blanca y una negra",
  rellenosDe(c(3, 4))[1].puestas.map((p) => p.figura.id),
  ["blanca", "negra"],
);

comprobar(
  "en 3/2 se puede poner una redonda y una blanca",
  rellenosDe(c(3, 2))[1].puestas.map((p) => p.figura.id),
  ["redonda", "blanca"],
);

comprobar(
  "y en un compuesto las figuras van con puntillo",
  rellenosDe(c(6, 8))[0].puestas.map((p) => `${p.figura.id}${p.conPuntillo ? "." : ""}`),
  ["negra.", "negra."],
);

comprobar(
  "los rellenos de un compuesto también llenan justo",
  rellenosDe(c(9, 8)).map(duracionDeRelleno),
  [1.125, 1.125, 1.125],
);

console.log("\nmismo total, distinto acento");

comprobar(
  "2/4 y 4/8 duran exactamente lo mismo",
  duracionDeCompas(c(2, 4)) === duracionDeCompas(c(4, 8)),
  true,
);

comprobar(
  "pero 2/4 tiene dos tiempos y 4/8 tiene cuatro",
  [tiemposDe(c(2, 4)), tiemposDe(c(4, 8))],
  [2, 4],
);

comprobar(
  "y por eso los golpes caen en otro lado",
  [
    patronDe(c(2, 4)).filter((a) => a !== "debil").length,
    patronDe(c(4, 8)).filter((a) => a !== "debil").length,
  ],
  [2, 4],
);

comprobar(
  "el hermano de 2/4 es 4/8",
  hermanosDe(c(2, 4)).map(compasTexto),
  ["4/8"],
);

comprobar(
  "3/4 y 6/8 son hermanos: es el MISMO fenómeno que 2/4 y 4/8",
  hermanosDe(c(3, 4)).map(compasTexto),
  ["6/8"],
);

comprobar(
  "el hermano de 4/4 es 2/2, y NO 12/8",
  hermanosDe(c(4, 4)).map(compasTexto),
  ["2/2"],
);

// Las dos relaciones son distintas y es fácil confundirlas: la constante
// conserva los TIEMPOS, el hermano conserva la DURACIÓN.
comprobar(
  "la constante NO conserva la duración: 2/4 dura 0.5 y 6/8 dura 0.75",
  [duracionDeCompas(c(2, 4)), duracionDeCompas(aCompuesto(c(2, 4)))],
  [0.5, 0.75],
);

comprobar(
  "lo que conserva es la cantidad de tiempos: los dos son de dos",
  [tiemposDe(c(2, 4)), tiemposDe(aCompuesto(c(2, 4)))],
  [2, 2],
);

comprobar(
  "el hermano es al revés: misma duración, distinta cantidad de tiempos",
  [
    duracionDeCompas(c(3, 4)) === duracionDeCompas(c(6, 8)),
    tiemposDe(c(3, 4)) !== tiemposDe(c(6, 8)),
  ],
  [true, true],
);

// ---------------------------------------------------------------------------
// Los dos quiz de compases: cien rondas de cada uno con azar sembrado.
// Lo que importa: que el compás cierre justo, que haya UNA sola opción que
// cierra la cuenta, y que los hermanos (3/4 y 6/8) nunca compitan entre sí.
// ---------------------------------------------------------------------------

import {
  azarSembrado,
  duracionPuesta,
  rondaCompletar,
  rondaNumero,
  sumaDe,
} from "../lib/compasQuiz.ts";

{
  const azar = azarSembrado(7);
  let cierran = 0, unicas = 0, sinHermanos = 0;
  for (let i = 0; i < 100; i++) {
    const r = rondaNumero(azar);
    if (Math.abs(sumaDe(r.figuras) - duracionDeCompas(r.compas)) < 1e-9) cierran++;
    const queCierran = r.opciones.filter(
      (o) => Math.abs(duracionDeCompas(o) - sumaDe(r.figuras)) < 1e-9,
    );
    if (queCierran.length === 1) unicas++;
    const duraciones = r.opciones.map(duracionDeCompas);
    if (new Set(duraciones.map((d) => d.toFixed(6))).size === duraciones.length) sinHermanos++;
  }
  comprobar("rondaNumero: las cien rondas cierran justo", cierran, 100);
  comprobar("rondaNumero: una sola opción cierra la cuenta", unicas, 100);
  comprobar("rondaNumero: sin duraciones repetidas entre opciones (los hermanos no compiten)", sinHermanos, 100);
}

{
  const azar = azarSembrado(11);
  let cierran = 0, unicas = 0;
  for (let i = 0; i < 100; i++) {
    const r = rondaCompletar(azar);
    const hueco = duracionDeCompas(r.compas) - sumaDe(r.figuras);
    if (Math.abs(duracionPuesta(r.falta) - hueco) < 1e-9) cierran++;
    const queCierran = r.opciones.filter(
      (o) => Math.abs(duracionPuesta(o) - hueco) < 1e-9,
    );
    if (queCierran.length === 1 && r.opciones.length === 4) unicas++;
  }
  comprobar("rondaCompletar: la que falta cierra el hueco exacto", cierran, 100);
  comprobar("rondaCompletar: cuatro opciones y una sola cierra", unicas, 100);
}

console.log(`\n${pasaron} bien, ${fallaron} mal\n`);
process.exit(fallaron > 0 ? 1 : 0);
