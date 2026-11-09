/**
 * Los signos ♭ ♮ ♯ de los nombres (#14).
 *
 *   npm run test:signos
 *
 * Ni Fraunces ni Space Grotesk traen los signos, y el navegador los sacaba de
 * la fuente del sistema que los tuviera: en la Mac el ♯ de Times y el ♭ de
 * otra, más chica y con aire, así que «Si♭» se leía «Si ♭». Ahora los pone
 * `app/fuentes/signos.woff2`, primera en las dos pilas. Esto clava que la
 * fuente exista, que traiga los tres de verdad (se lee su tabla de caracteres)
 * y que las dos pilas la pongan primera.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { brotliDecompressSync } from "node:zlib";

const RAIZ = new URL("../", import.meta.url);
const SIGNOS = { "♭": 0x266d, "♮": 0x266e, "♯": 0x266f };

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

/** Los caracteres que la fuente sabe dibujar: la tabla `cmap` de un WOFF2. */
function caracteresDe(woff2) {
  const b = Buffer.from(woff2);
  assert.equal(b.toString("latin1", 0, 4), "wOF2", "no es un WOFF2");
  const tablas = b.readUInt16BE(12);
  let o = 48;
  const base128 = () => {
    let v = 0;
    for (let i = 0; i < 5; i++) {
      const x = b[o++];
      v = v * 128 + (x & 0x7f);
      if (!(x & 0x80)) return v;
    }
    throw new Error("UIntBase128 roto");
  };
  const dir = [];
  for (let i = 0; i < tablas; i++) {
    const flags = b[o++];
    let tag = flags & 0x3f;
    if (tag === 63) (tag = b.toString("latin1", o, o + 4)), (o += 4);
    const largo = base128();
    const version = flags >> 6;
    const transformada = tag === 10 || tag === 11 || tag === "glyf" || tag === "loca" ? version === 0 : version !== 0;
    dir.push({ tag, largo: transformada ? base128() : largo });
  }
  const datos = brotliDecompressSync(b.subarray(o, o + b.readUInt32BE(20)));
  let pos = 0;
  let cmap;
  for (const t of dir) {
    if (t.tag === 0 || t.tag === "cmap") cmap = datos.subarray(pos, pos + t.largo);
    pos += t.largo;
  }
  assert.ok(cmap, "la fuente no tiene tabla de caracteres");
  const hay = new Set();
  for (let i = 0; i < cmap.readUInt16BE(2); i++) {
    const sub = cmap.subarray(cmap.readUInt32BE(4 + i * 8 + 4));
    const formato = sub.readUInt16BE(0);
    if (formato === 4) {
      const n = sub.readUInt16BE(6) / 2;
      for (let s = 0; s < n; s++) {
        const fin = sub.readUInt16BE(14 + s * 2);
        const ini = sub.readUInt16BE(16 + n * 2 + s * 2);
        if (fin !== 0xffff) for (let c = ini; c <= fin; c++) hay.add(c);
      }
    } else if (formato === 12) {
      for (let g = 0; g < sub.readUInt32BE(12); g++)
        for (let c = sub.readUInt32BE(16 + g * 12); c <= sub.readUInt32BE(20 + g * 12); c++) hay.add(c);
    }
  }
  return hay;
}

const fuente = new URL("app/fuentes/signos.woff2", RAIZ);

probar("la fuente de los signos existe, es chica y trae ♭ ♮ ♯", () => {
  assert.ok(existsSync(fuente), "falta app/fuentes/signos.woff2");
  const bytes = readFileSync(fuente);
  // Recortada a tres signos son menos de 1 KB; una fuente entera acá sería bajar 100 KB para tres letras.
  assert.ok(bytes.length < 4096, `pesa ${bytes.length} bytes: ¿no está recortada?`);
  const hay = caracteresDe(bytes);
  for (const [signo, c] of Object.entries(SIGNOS)) assert.ok(hay.has(c), `no trae el ${signo}`);
  assert.ok(!hay.has(0x41), "trae letras: los signos tienen que ser lo único que cambie de fuente");
});

probar("la licencia de la fuente viaja con ella", () => {
  assert.ok(existsSync(new URL("app/fuentes/OFL.txt", RAIZ)), "falta app/fuentes/OFL.txt");
});

probar("las dos pilas de fuentes la ponen primera, sólo para los signos", () => {
  const css = readFileSync(new URL("app/globals.css", RAIZ), "utf8");
  for (const pila of ["--font-display", "--font-sans"]) {
    const m = css.match(new RegExp(`${pila}:\\s*([^;]+);`));
    assert.ok(m, `no encuentro ${pila}`);
    assert.match(m[1], /^var\(--font-signos\),/, `${pila} no arranca por los signos: ${m[1]}`);
  }
  const layout = readFileSync(new URL("app/layout.tsx", RAIZ), "utf8");
  assert.match(layout, /variable: "--font-signos"/);
  assert.match(layout, /unicode-range", value: "U\+266D-266F"/);
  assert.match(layout, /\$\{signos\.variable\}/, "la variable no está puesta en <html>");
});

console.log(`${bien} bien, ${mal.length} mal`);
if (mal.length) {
  for (const m of mal) console.log("  ✗ " + m);
  process.exit(1);
}
