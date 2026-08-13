/**
 * Prueba el enlace de acordes.
 *
 *   npm run test:enlace
 *
 * Lo que más importa acá no es que el óptimo sea óptimo —eso se ve— sino que
 * los dos criterios midan cosas distintas y que la corrección acepte cualquier
 * inversión, que es el punto entero del ejercicio.
 */
import { parseCifrado, chordPitches, mod12, noteName } from "../lib/music.ts";
import {
  bajoDe,
  totalDelRecorrido,
  costo,
  disposiciones,
  esElAcorde,
  mejorMovimiento,
  notasComunes,
  recorridoOptimo,
  saltoDelBajo,
  viajeDeLaMano,
} from "../lib/enlace.ts";

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

const PROG = ["C", "Dm7", "G7", "Em7", "Am", "Bm7b5", "E7", "Am"].map(parseCifrado);

console.log("\nlas disposiciones");

comprobar(
  "un acorde de tres notas tiene tres inversiones distintas",
  new Set(disposiciones(parseCifrado("C")).map((d) => d.inversion)).size,
  3,
);

comprobar(
  "y uno de cuatro, cuatro",
  new Set(disposiciones(parseCifrado("G7")).map((d) => d.inversion)).size,
  4,
);

comprobar(
  "ninguna disposición se sale del teclado",
  disposiciones(parseCifrado("Bm7b5")).every(
    (d) => Math.min(...d.pitches) >= 45 && Math.max(...d.pitches) <= 84,
  ),
  true,
);

console.log("\nlas medidas");

const doM = chordPitches(48, parseCifrado("C").quality); // Do Mi Sol
const doM1 = [52, 55, 60]; // Mi Sol Do: la misma mano, girada

comprobar("el bajo de Do mayor en fundamental es el Do", noteName(bajoDe(doM)), "Do");
comprobar(
  "de la fundamental a la 1ª inversión el bajo sube 4 semitonos",
  saltoDelBajo(doM, doM1),
  4,
);
comprobar(
  "las tres notas son las mismas, así que hay 3 comunes",
  notasComunes(doM, doM1),
  3,
);
comprobar(
  "pero la mano igual se movió (giró todo el acorde)",
  viajeDeLaMano(doM, doM1) > 0,
  true,
);

console.log("\nlos dos criterios");

comprobar(
  "con criterio bajo, un salto de bajo pesa más que cualquier viaje de mano",
  costo(doM, [49, 52, 56], "bajo") > costo(doM, [48, 55, 64], "bajo"),
  true,
);

const porBajo = recorridoOptimo(PROG, "bajo").pasos;
const porMano = recorridoOptimo(PROG, "mano").pasos;

const totalBajo = (r) =>
  r.slice(1).reduce((s, d, i) => s + saltoDelBajo(r[i].pitches, d.pitches), 0);
const totalMano = (r) =>
  r.slice(1).reduce((s, d, i) => s + viajeDeLaMano(r[i].pitches, d.pitches), 0);

comprobar(
  "el criterio del bajo mueve MENOS el bajo que el de la mano",
  totalBajo(porBajo) < totalBajo(porMano),
  true,
);

comprobar(
  "y el de la mano mueve MENOS la mano que el del bajo",
  totalMano(porMano) < totalMano(porBajo),
  true,
);

comprobar(
  "los dos arrancan en fundamental (el primer acorde lo damos nosotros)",
  [porBajo[0].inversion, porMano[0].inversion],
  [0, 0],
);

comprobar(
  "sobre la progresión de la clase 2 coinciden en 3 de 8",
  PROG.filter((_, i) => porBajo[i].inversion === porMano[i].inversion).length,
  3,
);

comprobar(
  "el óptimo es el del camino entero, no el de ir eligiendo lo mejor en cada paso",
  (() => {
    // Greedy: elegir lo más barato en cada paso sin mirar lo que viene.
    let previa = porBajo[0].pitches;
    let suma = 0;
    for (const acorde of PROG.slice(1)) {
      const m = mejorMovimiento(previa, acorde, "bajo");
      suma += saltoDelBajo(previa, m.disposicion.pitches);
      previa = m.disposicion.pitches;
    }
    return totalDelRecorrido(porBajo, "bajo") <= suma;
  })(),
  true,
);

console.log("\nla corrección");

comprobar(
  "Do mayor en fundamental es Do mayor",
  esElAcorde([48, 52, 55], parseCifrado("C")),
  true,
);
comprobar(
  "y en 1ª inversión también: elegir la inversión ES el ejercicio",
  esElAcorde([52, 55, 60], parseCifrado("C")),
  true,
);
comprobar(
  "y en cualquier octava",
  esElAcorde([72, 76, 79], parseCifrado("C")),
  true,
);
comprobar(
  "una nota de más no cuela",
  esElAcorde([48, 52, 55, 58], parseCifrado("C")),
  false,
);
comprobar(
  "y Do menor no es Do mayor",
  esElAcorde([48, 51, 55], parseCifrado("C")),
  false,
);

console.log("\nel mínimo se calcula desde donde estás");

const raro = [60, 64, 67]; // te fuiste dos octavas para arriba
const desdeRaro = mejorMovimiento(raro, parseCifrado("Dm7"), "bajo");
comprobar(
  "si te fuiste lejos, el mínimo se recalcula ahí y no te cobra el error viejo",
  desdeRaro.costo < costo(raro, chordPitches(50, parseCifrado("Dm7").quality), "bajo"),
  true,
);

console.log(`\n${pasaron} bien, ${fallaron} mal\n`);
process.exit(fallaron > 0 ? 1 : 0);
