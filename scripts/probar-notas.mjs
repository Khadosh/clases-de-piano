/**
 * Prueba la capa que convierte lecturas en notas, y la que puntúa.
 *
 *   npm run test:notas
 *
 * Cada caso es una tira de lecturas escrita a mano, con su tiempo en
 * milisegundos. Corre en milisegundos y sin browser, que es todo el motivo por
 * el que esta lógica vive en `lib/notas.ts` y `lib/puntaje.ts` en vez de
 * adentro del hook: antes, para probar un cambio hacía falta levantar el
 * server, abrir Chromium con micrófono falso y esperar cuarenta segundos.
 *
 * Los casos no son inventados: son los errores que aparecieron de verdad
 * mirando una grabación de piano con un celular.
 */
import { segmentar, POR_DEFECTO } from "../lib/notas.ts";
import { evaluarNota, seguirTanda } from "../lib/puntaje.ts";

const DO = 0, RE = 2, MI = 4, FA = 5, SOL = 7, LA = 9, SI = 11;
const NOMBRE = { 0: "do", 2: "re", 4: "mi", 5: "fa", 7: "sol", 9: "la", 11: "si" };

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

/**
 * Escribe una tira de lecturas a 60 por segundo, como el browser.
 * `tramos` es [clase, cuántos milisegundos], y `null` es silencio.
 */
function tira(tramos) {
  const FRAME = 1000 / 60;
  const out = [];
  let t = 0;
  for (const [clase, ms] of tramos) {
    for (let pasado = 0; pasado < ms; pasado += FRAME) {
      out.push({ clases: clase === null ? [] : [clase], t, claridad: 0.95 });
      t += FRAME;
    }
  }
  return out;
}

const notasDe = (tramos, opts) =>
  segmentar(tira(tramos), opts).map((n) => n.clases[0]);

console.log("\nsegmentar lecturas en notas");

comprobar(
  "tres notas largas son tres notas",
  notasDe([[DO, 400], [MI, 400], [FA, 400]]),
  [DO, MI, FA],
);

comprobar(
  "el si de 20ms en el medio de un la no existió",
  notasDe([[LA, 300], [SI, 20], [LA, 300]]),
  [LA],
);

comprobar(
  "pero un si de 300ms sí existió",
  notasDe([[LA, 300], [SI, 300], [LA, 300]]),
  [LA, SI, LA],
);

comprobar(
  "el parpadeo de octava no corta la nota (es la misma clase)",
  notasDe([[LA, 200], [LA, 100], [LA, 200]]),
  [LA],
);

comprobar(
  "un bache de un frame en el medio de una nota tenida no la parte en dos",
  notasDe([[FA, 300], [null, 17], [FA, 300]]),
  [FA],
);

comprobar(
  "pero un silencio largo sí deja que la misma nota vuelva a contar",
  notasDe([[FA, 300], [null, 300], [FA, 300]]),
  [FA, FA],
);

comprobar(
  "el golpe del ataque (ruido de banda ancha, un frame) no mete nota",
  notasDe([[SI, 17], [DO, 400]]),
  [DO],
);

comprobar(
  "justo en el umbral: 50ms cuenta, 40ms no",
  [...notasDe([[DO, 300], [RE, 40], [MI, 300]]),
   "|",
   ...notasDe([[DO, 300], [RE, 60], [MI, 300]])],
  [DO, MI, "|", DO, RE, MI],
);

comprobar(
  "con el umbral en cero vuelve toda la basura (o sea: la regla es la que filtra)",
  notasDe([[LA, 300], [SI, 20], [LA, 300]], { duracionMinimaMs: 0, lecturasMinimas: 1 }),
  [LA, SI, LA],
);

console.log("\nlos acordes todavía no se detectan, pero la capa ya los pasa");

comprobar(
  "un conjunto de tres clases viaja entero",
  segmentar(
    tira([[null, 0]]).concat(
      Array.from({ length: 30 }, (_, i) => ({
        clases: [DO, MI, SOL],
        t: i * (1000 / 60),
        claridad: 0.95,
      })),
    ),
  ).map((n) => [...n.clases]),
  [[DO, MI, SOL]],
);

comprobar(
  "y cambiar una sola nota del acorde es un acorde nuevo",
  segmentar(
    Array.from({ length: 60 }, (_, i) => ({
      clases: i < 30 ? [DO, MI, SOL] : [DO, FA, SOL],
      t: i * (1000 / 60),
      claridad: 0.95,
    })),
  ).map((n) => [...n.clases]),
  [[DO, MI, SOL], [DO, FA, SOL]],
);

console.log("\npuntuar contra el ejercicio");

const ejercicio = [DO, MI, FA, SOL, LA, SOL, FA, MI, RE].map((c) => [c]);

comprobar(
  "la que iba avanza uno",
  evaluarNota([MI], ejercicio, 1),
  { tipo: "avanza", hasta: 2, cuantas: 1 },
);

comprobar(
  "la anterior otra vez es un rebote, no un error",
  evaluarNota([DO], ejercicio, 1),
  { tipo: "rebote" },
);

comprobar(
  "si el micrófono se comió una, se salta sin penalizar",
  evaluarNota([FA], ejercicio, 1),
  { tipo: "avanza", hasta: 3, cuantas: 2 },
);

comprobar(
  "si se comió tres seguidas, todavía engancha",
  evaluarNota([LA], ejercicio, 1),
  { tipo: "avanza", hasta: 5, cuantas: 4 },
);

comprobar(
  "una nota que no está en la ventana sí es un error",
  evaluarNota([SI], ejercicio, 1),
  { tipo: "mal" },
);

// El caso que rompía todo: una nota comida y a partir de ahí, rojo eterno.
const conUnaComida = [DO, MI, /* falta FA */ SOL, LA, SOL, FA, MI, RE].map((c) => [c]);

comprobar(
  "una nota comida NO arrastra el resto del ejercicio",
  seguirTanda(conUnaComida, ejercicio).mal,
  0,
);

comprobar(
  "sin ventana de resync, esa misma nota comida ensucia todo lo que sigue",
  seguirTanda(conUnaComida, ejercicio, { ventanaResync: 0 }).mal,
  // Cinco y no ocho porque el Fa de más adelante lo re-engancha de casualidad;
  // igual son cinco rojos por una nota que el micrófono no oyó.
  5,
);

comprobar(
  "tocar cualquier cosa igual se marca",
  seguirTanda([[DO], [MI], [SI], [FA]], ejercicio).mal,
  1,
);

console.log(
  `\n${pasaron} bien, ${fallaron} mal ` +
    `(duración mínima ${POR_DEFECTO.duracionMinimaMs}ms, silencio ${POR_DEFECTO.silencioMs}ms)\n`,
);
process.exit(fallaron > 0 ? 1 : 0);
