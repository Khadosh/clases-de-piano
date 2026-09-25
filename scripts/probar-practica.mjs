/**
 * La sala de práctica contra su propio contrato: las direcciones.
 *
 * Cada slug es una URL que alguien dejó abierta arriba del piano, así que la
 * lista entera —con su orden, que es el del "siguiente" del pie— está
 * congelada acá. Si un cambio la mueve, este test lo dice antes que el
 * teléfono. Agregar un ejercicio al final de su paso es agregar una línea;
 * cambiar una dirección existente pide pensarlo dos veces y dejar un alias.
 */

import assert from "node:assert/strict";
import { AREAS, FORMAS, aliases, buscar, casaDe, catalogo, catalogoDe, rutaDe, vecinasDeTema } from "../content/practica.ts";

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

// Las dos casas, cada una con su orden. Lo que decide en cuál cae es si el
// ejercicio te contesta algo: mirar y probar no, corrige y puntúa sí.
const TALLER = [
  "manos",
  "texturas", "laboratorio", "identificador", "voicing",
  "tonalidades", "armaduras", "circulo",
  "semitonos", "funciones", "paralelas", "dominantes", "tritonal",
  "notas-guia", "grilla",
  "figuras", "compases",
];

const SALA = [
  "posiciones", "escalas",
  "oido", "contrarreloj", "cifrado", "dictado-voicing", "enlace",
  "que-tonalidad",
  "grados", "cadencias", "inventor",
  "melodia", "encima",
  "que-compas", "completar-compas",
];

const SLUGS = [
  // 1 · las manos
  "manos", "posiciones", "escalas",
  // 2 · armar acordes
  "texturas", "laboratorio", "identificador", "voicing", "oido", "contrarreloj", "cifrado", "dictado-voicing", "enlace",
  // 3 · las tonalidades
  "tonalidades", "armaduras", "circulo", "que-tonalidad",
  // 4 · la armonía
  "semitonos", "funciones", "paralelas", "dominantes", "tritonal", "grados", "cadencias", "inventor",
  // 5 · la melodía
  "notas-guia", "grilla", "melodia", "encima",
  // 6 · el tiempo
  "figuras", "compases", "que-compas", "completar-compas",
];

const ALIAS = {
  "notas-guia-clase-5": { slug: "notas-guia", renglon: 1 },
  "notas-guia-clase-6": { slug: "notas-guia", renglon: 2 },
};

probar("las direcciones de la sala son exactamente éstas, en este orden", () => {
  assert.deepEqual(catalogo().map((e) => e.slug), SLUGS);
});

probar("el taller y la sala tienen cada uno lo suyo, en este orden", () => {
  assert.deepEqual(catalogoDe("taller").map((e) => e.slug), TALLER);
  assert.deepEqual(catalogoDe("sala").map((e) => e.slug), SALA);
  // Juntas siguen siendo el catálogo entero: nadie se perdió en la mudanza.
  assert.equal(TALLER.length + SALA.length, SLUGS.length);
  assert.deepEqual([...TALLER, ...SALA].sort(), [...SLUGS].sort());
});

probar("la casa la decide la forma, y la ruta la casa", () => {
  for (const e of catalogo()) {
    assert.equal(e.casa, casaDe(e.forma), e.slug);
    const esperada = e.casa === "taller" ? `/taller/${e.slug}` : `/practica/${e.slug}`;
    assert.equal(rutaDe(e), esperada);
  }
  // Ninguna herramienta te contesta nada, ningún ejercicio deja de contestar.
  for (const e of catalogoDe("taller")) assert.ok(["mirar", "probar"].includes(e.forma), e.slug);
  for (const e of catalogoDe("sala")) assert.ok(["corrige", "puntua"].includes(e.forma), e.slug);
});

probar("el vecino del pie es de la misma casa", () => {
  for (const slug of [...TALLER, ...SALA]) {
    const { entrada, anterior, siguiente } = buscar(slug);
    for (const v of [anterior, siguiente]) {
      if (v) assert.equal(v.casa, entrada.casa, `${slug} → ${v.slug}`);
    }
  }
});

probar("hay puente entre las dos casas en los temas que están de los dos lados", () => {
  // No es cosmético: es lo que hace que separarlas no sea un muro. Mirando el
  // círculo se quiere el quiz de armaduras, y al revés.
  const circulo = buscar("circulo").entrada;
  assert.ok(vecinasDeTema(circulo).some((e) => e.slug === "que-tonalidad"));
  const quiz = buscar("que-tonalidad").entrada;
  assert.ok(vecinasDeTema(quiz).some((e) => e.slug === "circulo"));
  // El puente siempre cruza de casa, nunca se queda del mismo lado.
  for (const e of catalogo()) {
    for (const v of vecinasDeTema(e)) {
      assert.notEqual(v.casa, e.casa, `${e.slug} → ${v.slug}`);
      assert.equal(v.area, e.area);
    }
  }
});

probar("las direcciones viejas siguen abriendo algo", () => {
  assert.deepEqual(aliases(), ALIAS);
  for (const [viejo, a] of Object.entries(ALIAS)) {
    const hallado = buscar(viejo);
    assert.ok(hallado, viejo);
    assert.equal(hallado.entrada.slug, a.slug);
    assert.equal(hallado.renglon, a.renglon);
  }
  assert.equal(buscar("no-existe"), null);
});

probar("ningún alias pisa una dirección real, y nadie se llama como la ruta de los pasos", () => {
  const reales = new Set(catalogo().map((e) => e.slug));
  for (const viejo of Object.keys(aliases())) assert.ok(!reales.has(viejo), viejo);
  // Los pasos viven en /practica/paso/<id>: "paso" no puede ser un ejercicio.
  assert.ok(!reales.has("paso"));
});

probar("cada paso de la rutina tiene algo adentro y cada ejercicio tiene forma", () => {
  const todo = catalogo();
  for (const a of AREAS) {
    assert.ok(todo.some((e) => e.area === a.id), `el paso ${a.id} está vacío`);
    // Un paso de la rutina sin nada que te corrija dejaría una card que lleva
    // a una página vacía.
    assert.ok(
      catalogoDe("sala").some((e) => e.area === a.id),
      `el paso ${a.id} no tiene ningún ejercicio, sólo herramientas`,
    );
  }
  for (const e of todo) assert.ok(e.forma in FORMAS, `${e.slug} sin forma`);
});

probar("adentro de cada paso el orden es mirar → probar → corrige → puntúa", () => {
  const rango = { mirar: 0, probar: 1, corrige: 2, puntua: 3 };
  for (const a of AREAS) {
    const formas = catalogo().filter((e) => e.area === a.id).map((e) => rango[e.forma]);
    for (let i = 1; i < formas.length; i++) assert.ok(formas[i] >= formas[i - 1], a.id);
  }
});

probar("los renglones de notas guía viven en una sola página", () => {
  const ng = catalogo().filter((e) => e.tipo === "notas-guia");
  assert.equal(ng.length, 1);
  assert.equal(ng[0].renglones.length, 3);
  assert.deepEqual(ng[0].renglones.map((r) => r.lesson.n), [4, 5, 6]);
});

console.log(`${bien} bien, ${mal.length} mal`);
if (mal.length) {
  for (const m of mal) console.log("  ✗ " + m);
  process.exit(1);
}
