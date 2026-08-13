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

console.log(`\n${pasaron} bien, ${fallaron} mal\n`);
process.exit(fallaron > 0 ? 1 : 0);
