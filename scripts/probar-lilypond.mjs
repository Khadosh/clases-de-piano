/**
 * El lector de LilyPond contra las reglas que dice cumplir.
 *
 * Cada caso es un pedacito de LilyPond escrito a mano y lo que tiene que
 * salir del otro lado, pasando por el conversor **y por el importador de
 * MusicXML**, que es el camino real. Las reglas que más cuestan son las que
 * no dan ningún aviso cuando se leen mal —la octava relativa y la duración
 * heredada—, así que ésas son las que más casos tienen.
 */

import assert from "node:assert/strict";
import { convertir } from "./lilypond-a-musicxml.mjs";
import { importar } from "./importar-musicxml.mjs";

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

/** Convierte, importa y devuelve la pieza más los avisos de las dos etapas. */
function pieza(ly) {
  const { xml, avisos } = convertir(ly);
  const p = importar(xml);
  return { ...p, avisos: [...avisos, ...p.avisos], xml };
}
const midis = (fila) => fila.filter((e) => e.midis.length).map((e) => e.midis);
const solas = (fila) => midis(fila).map((m) => m[0]);
/** Los avisos que no son error en un caso de prueba: las repeticiones y el pentagrama solo. */
const sinRepeticiones = (avisos) => avisos.filter((a) => !/repeticiones|un solo pentagrama/.test(a));

// --- la octava relativa -------------------------------------------------------

probar("relativa: una escala sube de a un escalón sin comillas", () => {
  const p = pieza(`\\relative c' { c4 d e f g a b c }`);
  assert.deepEqual(solas(p.derecha[0]), [60, 62, 64, 65, 67, 69, 71, 72]);
});

probar("relativa: hasta una cuarta se queda, una quinta va para el otro lado", () => {
  const p = pieza(`\\relative c' { c4 f c g c a c b }`);
  assert.deepEqual(solas(p.derecha[0]), [60, 65, 60, 55, 60, 57, 60, 59]);
});

probar("relativa: las comillas se suman después de elegir la octava", () => {
  // Desde g' el c cercano es el de arriba (una cuarta), y la coma lo baja.
  const p = pieza(`\\relative c' { c4 g' c, f, }`);
  assert.deepEqual(solas(p.derecha[0]), [60, 67, 60, 53]);
});

probar("relativa: la alteración no cambia la octava (bes está cerca de c)", () => {
  const p = pieza(`\\relative c' { c4 bes fis }`);
  assert.deepEqual(solas(p.derecha[0]), [60, 58, 54]);
});

probar("relativa: adentro del acorde cada nota sigue a la anterior, y después se sigue desde la primera", () => {
  const p = pieza(`\\relative c' { <c e g>4 c <g' b d> g }`);
  assert.deepEqual(midis(p.derecha[0]), [[60, 64, 67], [60], [67, 71, 74], [67]]);
});

probar("relativa: después de un << >> se sigue desde la última nota de la primera rama", () => {
  const p = pieza(`\\relative c' { c4 << { e g } \\\\ { c, e } >> c }`);
  assert.deepEqual(solas(p.derecha[0]), [60, 64, 67, 72]);
  assert.deepEqual(solas(p.derecha[1]), [48, 52]);
});

probar("relativa: los adornos no suenan pero mueven la referencia", () => {
  const p = pieza(`\\relative c' { c4 \\grace { g'16 } a4 b2 }`);
  assert.deepEqual(solas(p.derecha[0]), [60, 69, 71]);
  assert.ok(p.avisos.some((a) => /adorno/.test(a)));
});

probar("absoluta: sin \\relative, c es Do3 y c' es el central", () => {
  const p = pieza(`{ c4 c' c'' c, }`);
  assert.deepEqual(solas(p.derecha[0]), [48, 60, 72, 36]);
});

probar("inglés: cs y df son teclas negras", () => {
  const p = pieza(`\\language "english" \\relative c' { cs4 df e ff }`);
  assert.deepEqual(solas(p.derecha[0]), [61, 61, 64, 64]);
});

probar("transpose: de Do a Re sube un tono", () => {
  const p = pieza(`\\transpose c d \\relative c' { c4 e g bes }`);
  assert.deepEqual(solas(p.derecha[0]), [62, 66, 69, 72]);
});

// --- la duración --------------------------------------------------------------

probar("duración: sin número, dura lo que la última escrita", () => {
  const p = pieza(`\\relative c' { c8 d e4 f g | a2 r2 | }`);
  assert.deepEqual(p.derecha[0].map((e) => e.divide), [8, 8, 4, 4, 4, 2, 2]);
  assert.deepEqual(sinRepeticiones(p.avisos), []);
});

probar("duración: la última escrita es la del texto, aunque esté en otra voz", () => {
  const p = pieza(`\\relative c' { c4 << { d8 e } \\\\ { f4 } >> g a }`);
  // La g hereda la negra de f4 (lo último escrito), no la corchea de la primera rama.
  const principal = p.derecha.find((v) => v.filter((e) => e.midis.length).length === 5);
  assert.deepEqual(principal.map((e) => e.divide), [4, 8, 8, 4, 4]);
});

probar("duración: puntillos y silencios con puntillo", () => {
  const p = pieza(`\\relative c' { c4. d8 r4. e8 }`);
  assert.deepEqual(p.derecha[0].map((e) => [e.divide, Boolean(e.puntillo), e.midis.length]), [
    [4, true, 1], [8, false, 1], [4, true, 0], [8, false, 1],
  ]);
});

probar("tresillos: \\times 2/3 y \\tuplet 3/2 son lo mismo", () => {
  const a = pieza(`\\relative c' { \\times 2/3 { c8 d e } f4 g2 }`);
  const b = pieza(`\\relative c' { \\tuplet 3/2 { c8 d e } f4 g2 }`);
  for (const p of [a, b]) {
    assert.deepEqual(p.derecha[0].map((e) => [e.divide, e.irregular ? `${e.irregular.en}:${e.irregular.de}` : ""]), [
      [8, "3:2"], [8, "3:2"], [8, "3:2"], [4, ""], [2, ""],
    ]);
    assert.deepEqual(sinRepeticiones(p.avisos), []);
  }
});

probar("un silencio de varios compases se parte en las barras", () => {
  const p = pieza(`{ \\time 3/4 R2.*2 c'4 d' e' }`);
  assert.deepEqual(p.derecha[0].map((e) => [e.divide, Boolean(e.puntillo)]).slice(0, 2), [[2, true], [2, true]]);
  assert.deepEqual(sinRepeticiones(p.avisos), []);
});

probar("multiplicador viejo: c4*2/3 es un tresillo", () => {
  const p = pieza(`\\relative c' { c4*2/3 d4*2/3 e4*2/3 f2 }`);
  assert.deepEqual(p.derecha[0].map((e) => [e.divide, e.irregular?.en ?? 0]), [[4, 3], [4, 3], [4, 3], [2, 0]]);
});

// --- compases, ligaduras, repeticiones -----------------------------------------

probar("anacrusa: \\partial acorta el primer compás y las barras después caen bien", () => {
  const p = pieza(`\\relative c' { \\partial 4 c4 | d2 e4 f | g1 | }`);
  assert.deepEqual(sinRepeticiones(p.avisos).filter((a) => !/anacrusa/.test(a)), []);
  assert.deepEqual(solas(p.derecha[0]), [60, 62, 64, 65, 67]);
});

probar("una barra que no cae donde la nuestra se avisa", () => {
  const { avisos } = convertir(`\\relative c' { c2 d4 | e1 | }`);
  assert.ok(avisos.some((a) => /barras de compás/.test(a)), avisos.join("; "));
});

probar("ligadura: c1~ c4 cruza la barra y el importador la deja ligada", () => {
  const p = pieza(`\\relative c' { c1~ | c4 r2. | }`);
  const notas = p.derecha[0].filter((e) => e.midis.length);
  assert.equal(notas.length, 2);
  assert.equal(notas[1].ligada, true);
  assert.deepEqual(sinRepeticiones(p.avisos), []);
});

probar("ligadura adentro de un acorde: sólo la nota marcada", () => {
  const { xml } = convertir(`\\relative c' { <c~ e>4 <c e> }`);
  assert.equal((xml.match(/<tie type="start"\/>/g) ?? []).length, 1);
  assert.equal((xml.match(/<tie type="stop"\/>/g) ?? []).length, 1);
});

probar("repetición: se escribe una vez, con la última alternativa", () => {
  const p = pieza(`\\relative c' { \\repeat volta 2 { c4 d } \\alternative { { e2 } { f2 } } }`);
  assert.deepEqual(solas(p.derecha[0]), [60, 62, 65]);
  assert.ok(p.avisos.some((a) => /repeticiones/.test(a)));
});

probar("repetición: la alternativa descartada mueve la octava igual", () => {
  const p = pieza(`\\relative c' { \\repeat volta 2 { c4 d } \\alternative { { e' e } { c c } } }`);
  // La primera alternativa sube a e'' y la segunda arranca desde ahí: c''.
  assert.deepEqual(solas(p.derecha[0]), [60, 62, 72, 72]);
});

probar("\\repeat unfold sí se desenrolla", () => {
  const p = pieza(`\\relative c' { \\repeat unfold 3 { c4 d } e2 }`);
  assert.deepEqual(solas(p.derecha[0]), [60, 62, 60, 62, 60, 62, 64]);
});

// --- pentagramas y voces ------------------------------------------------------

probar("dos pentagramas: el primero es la derecha, el segundo la izquierda", () => {
  const p = pieza(`
    upper = \\relative c'' { c4 d e f }
    lower = \\relative c { c4 d e f }
    \\score { \\new PianoStaff << \\new Staff \\upper \\new Staff \\lower >> }
  `);
  assert.deepEqual(solas(p.derecha[0]), [72, 74, 76, 77]);
  assert.deepEqual(solas(p.izquierda[0]), [48, 50, 52, 53]);
});

probar("el pentagrama en clave de Fa arriba se da vuelta", () => {
  const p = pieza(`\\score { << \\new Staff { \\clef bass c4 d e f } \\new Staff { \\clef treble c''4 d'' e'' f'' } >> }`);
  assert.deepEqual(solas(p.derecha[0]), [72, 74, 76, 77]);
  assert.deepEqual(solas(p.izquierda[0]), [48, 50, 52, 53]);
});

probar("\\change Staff manda la nota al otro pentagrama", () => {
  const p = pieza(`\\score { << \\new Staff = "up" { c''4 \\change Staff = "down" c4 \\change Staff = "up" c''2 } \\new Staff = "down" { r1 } >> }`);
  assert.deepEqual(solas(p.derecha[0]), [72, 72]);
  assert.deepEqual(solas(p.izquierda[0]), [48]);
});

probar("el << >> con variables sin notas al lado no inventa voces", () => {
  const p = pieza(`
    Global = { \\key g \\major \\time 3/4 }
    md = \\relative c'' { g4 a b }
    \\score { \\new Staff << \\Global \\clef treble \\context Voice = "uno" \\md >> }
  `);
  assert.equal(p.derecha.length, 1);
  assert.deepEqual(solas(p.derecha[0]), [67, 69, 71]);
  assert.deepEqual(p.tonalidad, { tonica: 7, modo: "mayor" });
  assert.deepEqual(p.compas, { numerador: 3, denominador: 4 });
});

probar("la armadura menor y el tempo del \\midi llegan al otro lado", () => {
  const p = pieza(`
    \\score { \\new Staff \\relative c'' { \\key g \\minor g4 a bes c } \\layout {} \\midi { \\tempo 4 = 140 } }
  `);
  assert.deepEqual(p.tonalidad, { tonica: 7, modo: "menor" });
  assert.equal(p.bpm, 140);
});

probar("lo que cuelga de una nota no la rompe: digitación, texto, dinámica, articulación", () => {
  const p = pieza(`\\relative c' { a16-1_\\markup {\\dynamic p \\italic "leggieremente"}-( b c b a8-)-. r <c-1 e-3 g-5>4^\\fermata_\\sf \\bar "|." }`);
  assert.deepEqual(midis(p.derecha[0]), [[57], [59], [60], [59], [57], [60, 64, 67]]);
});

console.log(`${bien} bien, ${mal.length} mal`);
if (mal.length) {
  for (const m of mal) console.log("  ✗ " + m);
  process.exit(1);
}
