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
import { AREAS, FORMAS, aliases, buscar, catalogo } from "../content/practica.ts";

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

const SLUGS = [
  // 1 · las manos
  "manos", "posiciones", "escalas",
  // 2 · armar acordes
  "laboratorio", "identificador", "oido", "contrarreloj", "cifrado", "enlace",
  // 3 · la armonía
  "semitonos", "funciones", "paralelas", "dominantes", "grados", "cadencias", "inventor",
  // 4 · la melodía
  "notas-guia", "grilla", "melodia", "encima",
  // 5 · el tiempo
  "figuras", "compases", "que-compas", "completar-compas",
];

const ALIAS = { "notas-guia-clase-5": { slug: "notas-guia", renglon: 1 } };

probar("las direcciones de la sala son exactamente éstas, en este orden", () => {
  assert.deepEqual(catalogo().map((e) => e.slug), SLUGS);
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

probar("ningún alias pisa una dirección real", () => {
  const reales = new Set(catalogo().map((e) => e.slug));
  for (const viejo of Object.keys(aliases())) assert.ok(!reales.has(viejo), viejo);
});

probar("cada paso de la rutina tiene algo adentro y cada ejercicio tiene forma", () => {
  const todo = catalogo();
  for (const a of AREAS) {
    assert.ok(todo.some((e) => e.area === a.id), `el paso ${a.id} está vacío`);
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
  assert.equal(ng[0].renglones.length, 2);
  assert.deepEqual(ng[0].renglones.map((r) => r.lesson.n), [4, 5]);
});

console.log(`${bien} bien, ${mal.length} mal`);
if (mal.length) {
  for (const m of mal) console.log("  ✗ " + m);
  process.exit(1);
}
