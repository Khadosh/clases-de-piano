/**
 * Regenera `content/partituras-mutopia.ts` desde los LilyPond de
 * `partituras-fuente/mutopia/`.
 *
 *   npm run importar:mutopia
 *
 * Es el importador de MusicXML corrido sobre lo que sale del lector de
 * LilyPond, más la ficha de cada pieza —título en castellano, número en el
 * libro, dificultad, tempo de estudio y qué mirar— que vive acá y no en el
 * archivo generado, para que se pueda volver a correr cuando el lector
 * mejore sin perder lo escrito a mano.
 *
 * Lo que el lector o el importador no pudieron se anota en `revisar` de cada
 * pieza, que es donde el que la abre lo va a leer.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { convertir } from "./lilypond-a-musicxml.mjs";
import { importar } from "./importar-musicxml.mjs";

const FUENTES = "partituras-fuente/mutopia";
const SALIDA = "content/partituras-mutopia.ts";

const BURGMULLER = {
  compositor: "Friedrich Burgmüller",
  anio: "1851",
  coleccion: "25 estudios fáciles, op. 100",
};

/**
 * La ficha de cada archivo. `sobre` no lleva la indicación de tempo porque
 * ésa viene del archivo (el `meter` del header) y se antepone sola.
 */
const FICHAS = {
  "BachJS-BWVAnh115-anna-magdalena-05": {
    slug: "minueto-en-sol-menor",
    titulo: "Minueto en Sol menor",
    compositor: "Christian Petzold",
    anio: "c. 1725",
    dificultad: 2,
    bpm: 96,
    sobre:
      "El hermano del Minueto en Sol: en el cuaderno de Anna Magdalena van uno detrás del otro, y también éste resultó ser de Petzold. La misma derecha cantando sobre una izquierda que camina, pero en menor —Si♭ y Mi♭ en la armadura— y con el Fa♯ que aparece cada vez que la frase quiere volver a casa: el dominante de Sol menor pidiendo su sensible. En el medio hay un pasaje a dos voces en la derecha.",
  },
  "BurgmullerJFF-O100-25EF-01": {
    slug: "burgmuller-01-candor", titulo: "Candor", numero: 1, dificultad: 2, bpm: 100,
    sobre: "Corcheas ligadas en la derecha, todas por grado conjunto, sobre blancas de la izquierda. El primero del libro y el que enseña a cantar con el dedo: una frase entera sin cortar.",
  },
  "BurgmullerJFF-O100-25EF-02": {
    slug: "burgmuller-02-arabesco", titulo: "Arabesco", numero: 2, dificultad: 2, bpm: 104,
    sobre: "El más famoso del libro. Carreras de cuatro semicorcheas en una mano y acordes secos en la otra, primero la derecha y después al revés. Los acordes son los que ya sabés: Lam, Rem y Mi7.",
  },
  "BurgmullerJFF-O100-25EF-03": {
    slug: "burgmuller-03-pastoral", titulo: "Pastoral", numero: 3, dificultad: 2, bpm: 80,
    sobre: "El 6/8 de la clase 2 hecho música: dos pulsos con puntillo que se mecen, y arriba una melodía con adornos (que acá se saltearon: quedan las notas de verdad).",
  },
  "BurgmullerJFF-O100-25EF-04": {
    slug: "burgmuller-04-la-pequena-reunion", titulo: "La pequeña reunión", numero: 4, dificultad: 2, bpm: 100,
    sobre: "Las dos manos en terceras y sextas, alternándose: lo que hace una lo contesta la otra. Es un estudio de manos que se turnan sin pisarse.",
  },
  "BurgmullerJFF-O100-25EF-05": {
    slug: "burgmuller-05-inocencia", titulo: "Inocencia", numero: 5, dificultad: 2, bpm: 92,
    sobre: "Escalitas de corcheas en Fa, ligadas de a dos, sobre un acompañamiento que casi no se mueve. Un vals sin pretensiones para practicar el Si♭ de la armadura.",
  },
  "BurgmullerJFF-O100-25EF-06": {
    slug: "burgmuller-06-progreso", titulo: "Progreso", numero: 6, dificultad: 3, bpm: 100,
    sobre: "Escalas en las dos manos a la vez, a la octava, subiendo y bajando. Es el ejercicio de posiciones con las manos juntas, y el nombre lo dice todo.",
  },
  "BurgmullerJFF-O100-25EF-07": {
    slug: "burgmuller-07-la-corriente-clara", titulo: "La corriente clara", numero: 7, dificultad: 3, bpm: 116,
    sobre: "La melodía va escondida arriba de un ondular de semicorcheas en la misma mano: dos voces en la derecha, la de arriba cantando y la de abajo corriendo. Se lee con las plicas para lados distintos.",
  },
  "BurgmullerJFF-O100-25EF-08": {
    slug: "burgmuller-08-la-graciosa", titulo: "La graciosa", numero: 8, dificultad: 3, bpm: 84,
    sobre: "Las vueltitas de cuatro notas rápidas antes de cada nota larga son un grupeto escrito con todas las letras. Vals en Fa, con la izquierda marcando el uno.",
  },
  "BurgmullerJFF-O100-25EF-09": {
    slug: "burgmuller-09-la-caza", titulo: "La caza", numero: 9, dificultad: 3, bpm: 126,
    sobre: "Cornos de caza: quintas y sextas repetidas en 6/8, con anacrusa. Se toca con todo el brazo. El compás 1 es el de la anacrusa, así que la numeración queda corrida uno respecto de la edición.",
  },
  "BurgmullerJFF-O100-25EF-10": {
    slug: "burgmuller-10-tierna-flor", titulo: "Tierna flor", numero: 10, dificultad: 3, bpm: 96,
    sobre: "Melodía cantable en Re, en frases de dos compases que se responden, con un par de adornos (salteados acá). Para pensar las notas guía antes de tocarla.",
  },
  "BurgmullerJFF-O100-25EF-11": {
    slug: "burgmuller-11-la-lavandera", titulo: "La lavandera", numero: 11, dificultad: 3, bpm: 104,
    sobre: "La bergeronnette es el pajarito que mueve la cola sin parar, y la pieza es eso: corcheas cortas que saltan de a dos. Livianito, staccato, sin apurarse.",
  },
  "BurgmullerJFF-O100-25EF-12": {
    slug: "burgmuller-12-el-adios", titulo: "El adiós", numero: 12, dificultad: 4, bpm: 120,
    sobre: "Tresillos de corcheas sin parar en la derecha, agitato, en La menor: la más larga del libro hasta acá. Arranca con anacrusa, así que los compases quedan corridos uno respecto de la edición.",
  },
  "BurgmullerJFF-O100-25EF-13": {
    slug: "burgmuller-13-consolacion", titulo: "Consolación", numero: 13, dificultad: 3, bpm: 100,
    sobre: "Dos voces en cada mano: la melodía arriba y un acompañamiento de corcheas repetidas en la misma mano. Es el pentagrama a dos voces de las partituras, con las plicas para cada lado, en las dos manos a la vez.",
  },
  "BurgmullerJFF-O100-25EF-15": {
    slug: "burgmuller-15-balada", titulo: "Balada", numero: 15, dificultad: 3, bpm: 84,
    sobre: "En Do menor y en 3/8: la izquierda lleva la melodía en corcheas rápidas y misteriosas mientras la derecha pone acordes cortos. La sección del medio pasa a Do mayor, la paralela de la clase 4.",
  },
  "BurgmullerJFF-O100-25EF-16": {
    slug: "burgmuller-16-dulce-lamento", titulo: "Dulce lamento", numero: 16, dificultad: 3, bpm: 92,
    sobre: "En Sol menor, con la melodía ligada de a dos como suspiros y la izquierda arpegiando por debajo. Para practicar el cantabile de la clase 4 en menor.",
  },
  "BurgmullerJFF-O100-25EF-17": {
    slug: "burgmuller-17-la-parlanchina", titulo: "La parlanchina", numero: 17, dificultad: 3, bpm: 88,
    sobre: "Semicorcheas repetidas en la derecha que no paran de hablar, en 3/8 y en Fa. Dos voces en la derecha: la que charla y la que canta arriba.",
  },
  "BurgmullerJFF-O100-25EF-18": {
    slug: "burgmuller-18-inquietud", titulo: "Inquietud", numero: 18, dificultad: 4, bpm: 100,
    sobre: "Grupos de semicorcheas siempre a contratiempo, en Mi menor, agitato. La mano tiene que entrar después del silencio cada vez, y eso es lo que inquieta.",
  },
};

const REPETICIONES = /repeticiones/;

function escribirEvento(e) {
  const midis = e.midis.length === 0 ? "[]" : e.midis.length === 1 ? String(e.midis[0]) : `[${e.midis.join(", ")}]`;
  const partes = [];
  if (e.puntillo) partes.push("puntillo: true");
  if (e.ligada) partes.push("ligada: true");
  if (e.irregular) {
    partes.push(
      e.irregular.en === 3 && e.irregular.de === 2
        ? "irregular: TRESILLO"
        : `irregular: { en: ${e.irregular.en}, de: ${e.irregular.de} }`,
    );
  }
  const extra = partes.length ? `, { ${partes.join(", ")} }` : "";
  return e.midis.length === 0 ? `silencio(${e.divide}${extra})` : `n(${midis}, ${e.divide}${extra})`;
}

function escribirFila(evs, sangria) {
  const lineas = [];
  for (const txt of evs.map(escribirEvento)) {
    const ultima = lineas[lineas.length - 1];
    if (ultima && (ultima + ", " + txt).length < 76) lineas[lineas.length - 1] = ultima + ", " + txt;
    else lineas.push(txt);
  }
  return lineas.map((l) => `${sangria}${l},`).join("\n");
}

function escribirVoces(voces, sangria) {
  if (voces.length === 1) return escribirFila(voces[0], sangria);
  return voces.map((v) => `${sangria}[\n${escribirFila(v, sangria + "  ")}\n${sangria}],`).join("\n");
}

const q = (s) => JSON.stringify(s);

function piezaDe(archivo) {
  const ficha = FICHAS[archivo];
  if (!ficha) return null;
  const texto = readFileSync(join(FUENTES, `${archivo}.ly`), "utf8");
  const { xml, avisos, header, compases } = convertir(texto, FUENTES);
  const p = importar(xml);
  const todos = [...avisos, ...p.avisos];

  const revisar = [`Importada del LilyPond de Mutopia (${archivo}.ly).`];
  if (todos.some((a) => REPETICIONES.test(a))) revisar.push("Las repeticiones no están escritas: cada sección va una vez, con su última casilla.");
  const adornos = todos.find((a) => /adorno/.test(a));
  if (adornos) revisar.push(adornos.replace(/^Hay /, "Se saltearon ").replace(/ y se saltearon\.$/, "."));
  if (todos.some((a) => /armadura cambia/.test(a))) revisar.push("La armadura cambia en el medio y nuestro modelo tiene una sola: esa parte se lee con los signos sueltos.");
  if (todos.some((a) => /anacrusa/.test(a))) revisar.push("Arranca con anacrusa, rellenada con silencios: los números de compás quedan corridos uno.");
  for (const a of todos) {
    if (/no cierra la cuenta|voces y sólo entran|encimadas|no es ninguna figura|no se pudo|barras de compás/.test(a)) revisar.push(a);
  }

  const marcacion = header.meter ? `${header.meter}. ` : "";
  const esLibro = "numero" in ficha;
  const campos = [
    `slug: ${q(ficha.slug)}`,
    `titulo: ${q(ficha.titulo)}`,
    `compositor: ${q(ficha.compositor ?? BURGMULLER.compositor)}`,
    `anio: ${q(ficha.anio ?? BURGMULLER.anio)}`,
    esLibro ? `coleccion: { titulo: ${q(BURGMULLER.coleccion)}, numero: ${ficha.numero} }` : null,
    `compas: { numerador: ${p.compas.numerador}, denominador: ${p.compas.denominador} }`,
    `tonalidad: { tonica: ${p.tonalidad.tonica}, modo: ${q(p.tonalidad.modo)} }`,
    `bpm: ${ficha.bpm}`,
    `dificultad: ${ficha.dificultad}`,
    `sobre:\n      ${q(marcacion + ficha.sobre)}`,
    `hasta: ${q(`Entera: ${compases} compases, sin las repeticiones.`)}`,
    `revisar:\n      ${q(revisar.join(" "))}`,
    `derecha: [\n${escribirVoces(p.derecha, "      ")}\n    ]`,
    `izquierda: [\n${escribirVoces(p.izquierda, "      ")}\n    ]`,
  ].filter(Boolean);
  console.error(`// ${ficha.slug}: ${compases} compases${todos.length ? " — " + todos.join(" / ") : ""}`);
  return `  {\n    ${campos.join(",\n    ")},\n  },`;
}

function principal() {
  const archivos = readdirSync(FUENTES).filter((f) => f.endsWith(".ly")).map((f) => f.replace(/\.ly$/, "")).sort();
  const piezas = archivos.map(piezaDe).filter(Boolean);
  const salida = `import type { Pieza } from "@/content/partituras";
import { n, silencio, TRESILLO } from "@/content/escribir";

/**
 * Las piezas importadas de la biblioteca de Mutopia, generadas por
 * \`npm run importar:mutopia\` desde los LilyPond de \`partituras-fuente/mutopia/\`.
 *
 * **No se edita a mano.** La ficha de cada pieza —título, número, dificultad,
 * tempo, qué mirar— vive en \`scripts/importar-mutopia.mjs\`; las notas salen
 * del archivo. Si algo está mal, se arregla ahí y se vuelve a generar.
 */
export const MUTOPIA: Pieza[] = [
${piezas.join("\n")}
];
`;
  writeFileSync(SALIDA, salida);
  console.error(`// ${SALIDA}: ${piezas.length} piezas`);
}

principal();
