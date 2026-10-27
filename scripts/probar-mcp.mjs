/**
 * El MCP de composición, contra lo que promete.
 *
 * Dos capas: las herramientas puras (`mcp/herramientas.ts`) con casos que se
 * pueden razonar a mano, y el servidor entero levantado por stdio con un
 * cliente MCP de verdad, que es la condición real en la que falla —un import
 * roto, un esquema que no serializa, una herramienta que no aparece.
 */

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  acorde,
  analizar,
  componer,
  enlazar,
  escribirMano,
  leerGrado,
  leerTonica,
  progresion,
  tonalidad,
  voicing,
  PedidoInvalido,
} from "../mcp/herramientas.ts";
import { escribirMidi } from "../mcp/midi.ts";
import { duracionDeEvento } from "../lib/pentagrama.ts";

let casos = 0;
const caso = (nombre, fn) => {
  fn();
  casos++;
  console.log(`  ✓ ${nombre}`);
};

console.log("herramientas");

caso("las tónicas se leen en los dos idiomas y con los dos signos", () => {
  assert.equal(leerTonica("C").pc, 0);
  assert.equal(leerTonica("F#").pc, 6);
  assert.equal(leerTonica("Bb").pc, 10);
  assert.equal(leerTonica("Si♭").pc, 10);
  assert.equal(leerTonica("Fa♯").alter, 1);
  assert.equal(leerTonica("sol").pc, 7);
  assert.throws(() => leerTonica("H"), PedidoInvalido);
});

caso("ii – V – I en Fa es Gm · C7 · F", () => {
  const r = progresion({ tonalidad: "F", grados: ["ii", "V7", "I"] });
  assert.deepEqual(r.cifrados, ["Gm", "C7", "F"]);
  assert.equal(r.cadenciaAlFinal, "autentica");
  assert.deepEqual(r.acordes.map((a) => a.funcion), ["subdominante", "dominante", "reposo"]);
});

caso("los préstamos salen de la menor paralela", () => {
  const r = progresion({ tonalidad: "C", grados: ["I", "bVI", "bVII", "I"] });
  assert.deepEqual(r.cifrados, ["C", "Ab", "Bb", "C"]);
  assert.equal(r.acordes[1].prestado, true);
  const iv = progresion({ tonalidad: "C", grados: ["iv"] });
  assert.deepEqual(iv.cifrados, ["Fm"]);
});

caso("en menor el V mayúsculo viene de la armónica y el v de la natural", () => {
  const r = progresion({ tonalidad: "A", modo: "menor", grados: ["i", "iv", "V7", "i"] });
  assert.deepEqual(r.cifrados, ["Am", "Dm", "E7", "Am"]);
  const natural = progresion({ tonalidad: "A", modo: "menor", grados: ["v"] });
  assert.deepEqual(natural.cifrados, ["Em"]);
});

caso("la regla de oro avisa a la cuarta función igual", () => {
  const r = progresion({ tonalidad: "C", grados: ["I", "iii", "vi", "I", "V"] });
  assert.ok(r.avisos.some((a) => /regla de oro/.test(a)));
  const bien = progresion({ tonalidad: "C", grados: ["I", "vi", "ii", "V"] });
  assert.ok(!bien.avisos.some((a) => /regla de oro/.test(a)));
});

caso("escribir II en mayor avisa pero no inventa un acorde", () => {
  const { acorde: a, aviso } = leerGrado("II", "mayor");
  assert.equal(a, 1);
  assert.match(aviso, /menor/);
  assert.throws(() => leerGrado("VIII", "mayor"), PedidoInvalido);
});

caso("un acorde por cifrado trae sus inversiones con barra", () => {
  const r = acorde({ cifrado: "Em" });
  assert.equal(r.nombre, "Mi menor");
  assert.deepEqual(r.inversiones.map((i) => i.cifrado), ["Em", "Em/G", "Em/B"]);
  assert.equal(r.receta, "3 + 4");
});

caso("un acorde por teclas se identifica aunque esté invertido", () => {
  const r = acorde({ teclas: [64, 67, 72] }); // Mi Sol Do: Do mayor en primera inversión.
  assert.equal(r.cifrado, "C");
  assert.match(r.observacion, /invertido/);
  assert.equal(acorde({ teclas: [60, 61, 62] }).reconocido, false);
});

caso("el enlace deja la progresión con el bajo quieto", () => {
  const r = enlazar({ acordes: ["C", "Am", "F", "G"], criterio: "bajo" });
  assert.equal(r.pasos.length, 4);
  assert.equal(r.pasos[0].cifrado, "C");
  // Con el criterio del bajo, de C a Am lo más cerca es Am/C: el bajo no se mueve.
  assert.equal(r.pasos[1].cifrado, "Am/C");
  assert.ok(r.movimientoTotalEnSemitonos <= 6);
});

caso("el voicing abierto reparte 1-5 a la izquierda y 3-7 a la derecha", () => {
  const r = voicing({ cifrado: "G7", disposicion: "15-37" });
  assert.equal(r.izquierda.length, 2);
  assert.equal(r.derecha.length, 2);
  assert.throws(() => voicing({ cifrado: "C", disposicion: "una-mano" }), PedidoInvalido);
});

caso("analizar adivina la tonalidad y nombra el dominante secundario", () => {
  const r = analizar({ acordes: ["C", "A7", "Dm7", "G7", "C"] });
  assert.equal(r.tonalidad.nombre, "Do mayor");
  assert.equal(r.acordes[1].grado, "V7/ii");
  assert.equal(r.acordes[2].grado, "ii7");
  assert.equal(r.cadenciaAlFinal, "autentica");
});

caso("analizar reconoce el sustituto tritonal", () => {
  const r = analizar({ acordes: ["Dm7", "Db7", "C"], tonalidad: "C" });
  assert.match(r.acordes[1].grado, /^subV7/);
  assert.match(r.acordes[1].comentario, /G7/);
});

caso("la ficha de Re mayor tiene dos sostenidos y Si menor de relativa", () => {
  const r = tonalidad({ tonalidad: "D" });
  assert.equal(r.armadura.cantidad, 2);
  assert.deepEqual(r.armadura.notas, ["Fa♯", "Do♯"]);
  assert.equal(r.relativa, "Si menor");
  assert.equal(r.campoArmonico[4].cuatriada, "A7");
  assert.equal(r.dominantes[1].cifrado, "E7"); // El V7/V de Re es Mi7.
});

caso("escribir una mano rellena los huecos con silencios y cierra el compás", () => {
  const pumCha = [
    { t: 0, dur: 1, pitches: [36], mano: "izquierda" },
    { t: 2, dur: 1, pitches: [36], mano: "izquierda" },
  ];
  const fila = escribirMano(pumCha, 1);
  assert.deepEqual(fila.map((e) => [e.midis.length, e.divide]), [[1, 4], [0, 4], [1, 4], [0, 4]]);
  const total = fila.reduce((s, e) => s + duracionDeEvento(e), 0);
  assert.equal(total, 1);
});

caso("componer da una pieza que cierra todos los compases en las dos manos", () => {
  for (const textura of ["plaque", "pum-cha", "arpegio", "arpegio-intercalado"]) {
    for (const melodia of [false, true]) {
      const r = componer({ tonalidad: "G", grados: ["I", "vi", "ii", "V7"], textura, melodia, semilla: 3 });
      const suma = (fila) => fila.reduce((s, e) => s + duracionDeEvento(e), 0);
      assert.equal(suma(r.pieza.derecha), r.compases, `${textura} melodia=${melodia} derecha`);
      assert.equal(suma(r.pieza.izquierda), r.compases, `${textura} melodia=${melodia} izquierda`);
      assert.equal(r.compases, 4);
      assert.deepEqual(r.cifrados, ["G", "Em", "Am", "D7"]);
    }
  }
});

caso("la melodía se transporta con la tonalidad y trae sus notas guía", () => {
  const r = componer({ tonalidad: "F", grados: ["ii", "V7", "I"], melodia: true, semilla: 7 });
  assert.equal(r.notasGuia.length, 3); // Una por acorde; la última es la del final.
  const notas = r.pieza.derecha.flatMap((e) => e.midis);
  // Fa mayor no tiene Si natural: ninguna nota de la melodía es 59, 71 ni 83.
  assert.ok(notas.every((m) => m % 12 !== 11), "la melodía trae un Si natural en Fa mayor");
  const mismo = componer({ tonalidad: "F", grados: ["ii", "V7", "I"], melodia: true, semilla: 7 });
  assert.deepEqual(mismo.pieza, r.pieza);
});

caso("el MIDI que sale es un SMF válido con tres pistas", () => {
  const r = componer({ tonalidad: "C", grados: ["I", "IV", "V", "I"], textura: "arpegio" });
  const bytes = escribirMidi(r.pieza);
  assert.equal(String.fromCharCode(...bytes.slice(0, 4)), "MThd");
  assert.equal((bytes[10] << 8) | bytes[11], 3);
  assert.equal(String.fromCharCode(...bytes.slice(14, 18)), "MTrk");
  // Se recorren las pistas como lo haría un secuenciador: delta, estado,
  // datos. Tantos note-on como note-off, y cada pista termina en fin de pista.
  let on = 0, off = 0, pistas = 0;
  let i = 14;
  while (i < bytes.length) {
    assert.equal(String.fromCharCode(...bytes.slice(i, i + 4)), "MTrk");
    const largo = (bytes[i + 4] << 24) | (bytes[i + 5] << 16) | (bytes[i + 6] << 8) | bytes[i + 7];
    let j = i + 8;
    const fin = j + largo;
    let cerrada = false;
    while (j < fin) {
      while (bytes[j] & 0x80) j++; // delta-time de largo variable
      j++;
      const estado = bytes[j++];
      if (estado === 0xff) {
        const tipo = bytes[j++];
        const n = bytes[j++];
        if (tipo === 0x2f) cerrada = true;
        j += n;
      } else if ((estado & 0xf0) === 0x90) { on++; j += 2; }
      else if ((estado & 0xf0) === 0x80) { off++; j += 2; }
      else assert.fail(`estado desconocido ${estado.toString(16)} en la pista ${pistas}`);
    }
    assert.ok(cerrada, `la pista ${pistas} no termina en fin de pista`);
    pistas++;
    i = fin;
  }
  assert.equal(pistas, 3);
  assert.ok(on > 0 && on === off, `note-on ${on} vs note-off ${off}`);
});

console.log("\nservidor por stdio");

const cliente = new Client({ name: "probar-mcp", version: "1.0.0" });
await cliente.connect(
  new StdioClientTransport({
    command: process.execPath,
    args: ["--experimental-strip-types", "--no-warnings", "mcp/servidor.ts"],
  }),
);

caso("las herramientas están todas", () => {});
const { tools } = await cliente.listTools();
const nombres = tools.map((t) => t.name).sort();
assert.deepEqual(nombres, ["acorde", "analizar", "componer", "enlazar", "progresion", "progresiones_conocidas", "tonalidad", "voicing"]);
console.log(`    ${nombres.join(", ")}`);

const prog = await cliente.callTool({ name: "progresion", arguments: { tonalidad: "Bb", grados: ["ii", "V7", "I"] } });
assert.deepEqual(JSON.parse(prog.content[0].text).cifrados, ["Cm", "F7", "Bb"]);
console.log("  ✓ progresion responde por stdio");

const malo = await cliente.callTool({ name: "progresion", arguments: { tonalidad: "C", grados: ["IX"] } });
assert.equal(malo.isError, true);
assert.match(malo.content[0].text, /No (entiendo|sé qué hacer)/);
console.log("  ✓ un pedido inválido vuelve como error legible, no como excepción");

const carpeta = mkdtempSync(join(tmpdir(), "mcp-piano-"));
const ruta = join(carpeta, "vuelta.mid");
const comp = await cliente.callTool({
  name: "componer",
  arguments: { tonalidad: "D", grados: ["I", "V", "vi", "IV"], textura: "pum-cha", melodia: true, archivoMidi: ruta },
});
const resultado = JSON.parse(comp.content[0].text);
assert.equal(resultado.archivoMidi, ruta);
assert.equal(String.fromCharCode(...readFileSync(ruta).subarray(0, 4)), "MThd");
assert.match(resultado.codigoParaPartituras, /propia: true/);
assert.match(resultado.codigoParaPartituras, /slug: "i-v-vi-iv-en-re-mayor"/);
console.log(`  ✓ componer escribe el .mid (${ruta}) y el código para partituras.ts`);

await cliente.close();
console.log(`\n${casos + 4} casos, todo bien.`);
