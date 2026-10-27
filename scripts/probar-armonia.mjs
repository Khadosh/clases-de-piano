/**
 * La armonía de las partituras contra las propias partituras.
 *
 * El análisis se escribe a mano, así que lo que se puede verificar se
 * verifica: que cada cifrado esté sobre el grado que dice (si no, el color de
 * tensión saldría de otro acorde), que el bajo que suena de verdad en ese
 * instante sea una nota del acorde —la de la barra, si tiene barra—, y que
 * las frases cubran la pieza entera sin huecos ni encimarse. Y las reglas
 * deducidas (función, romano, cadencia) contra casos escritos a mano.
 */

import assert from "node:assert/strict";
import { ARMONIAS } from "../content/armonias.ts";
import { piezaPorSlug } from "../content/partituras.ts";
import {
  acordesDeFrase,
  bajoEn,
  cadenciaDe,
  compasesDePieza,
  leerAcorde,
} from "../lib/armonia.ts";
import { intervalsOf, mod12 } from "../lib/music.ts";

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

const SOL_MENOR = { tonica: 7, modo: "menor" };
const DO_MAYOR = { tonica: 0, modo: "mayor" };
const frase = (en, acordes, hasta = 4) => ({ desde: 1, hasta, en, titulo: "", simple: "", tecnica: "", acordes });

// --- Las reglas, contra casos de libro ------------------------------------

probar("la función la pone el grado, en mayor y en menor", () => {
  const f = frase(SOL_MENOR, []);
  assert.equal(leerAcorde({ compas: 1, cifrado: "Gm", grado: 0 }, f).funcion, "reposo");
  assert.equal(leerAcorde({ compas: 1, cifrado: "Cm", grado: 3 }, f).funcion, "subdominante");
  assert.equal(leerAcorde({ compas: 1, cifrado: "D7", grado: 4 }, f).funcion, "dominante");
  assert.equal(leerAcorde({ compas: 1, cifrado: "Eb", grado: 5 }, f).funcion, "reposo");
  assert.equal(leerAcorde({ compas: 1, cifrado: "Am", grado: 5 }, frase(DO_MAYOR, [])).funcion, "reposo");
});

probar("un dominante secundario es tensión y se escribe V7/destino", () => {
  const a = leerAcorde({ compas: 1, cifrado: "A7", dominanteDe: 1 }, frase(DO_MAYOR, []));
  assert.equal(a.funcion, "dominante");
  assert.equal(a.romano, "V7/IIm");
  const b = leerAcorde({ compas: 1, cifrado: "G/B", dominanteDe: 3 }, frase(SOL_MENOR, []));
  assert.equal(b.romano, "V/IVm");
  assert.equal(b.nombre, "Sol/Si");
});

probar("el romano lleva la calidad: IVm, II°, V7", () => {
  const f = frase(SOL_MENOR, []);
  assert.equal(leerAcorde({ compas: 1, cifrado: "Cm", grado: 3 }, f).romano, "IVm");
  assert.equal(leerAcorde({ compas: 1, cifrado: "Adim", grado: 1 }, f).romano, "II°");
  assert.equal(leerAcorde({ compas: 1, cifrado: "D7/F#", grado: 4 }, f).romano, "V7");
  assert.equal(leerAcorde({ compas: 1, cifrado: "D7/F#", grado: 4 }, f).nombre, "Re7/Fa♯");
});

probar("un cifrado sobre otro grado se grita", () => {
  assert.throws(() => leerAcorde({ compas: 1, cifrado: "F", grado: 4 }, frase(DO_MAYOR, [])));
  assert.throws(() => leerAcorde({ compas: 1, cifrado: "D7", dominanteDe: 0 }, frase(DO_MAYOR, [])));
});

probar("las cadencias salen de los dos últimos acordes", () => {
  const leer = (cifrados) =>
    cadenciaDe(acordesDeFrase(frase(DO_MAYOR, cifrados.map(([cifrado, grado], i) => ({ compas: i + 1, cifrado, grado })), cifrados.length), 4))?.nombre;
  assert.equal(leer([["C", 0], ["G", 4]]), "Semicadencia");
  assert.equal(leer([["F", 3], ["G7", 4], ["C", 0]]), "Cadencia auténtica");
  assert.equal(leer([["F", 3], ["C", 0]]), "Cadencia plagal");
  assert.equal(leer([["G", 4], ["Am", 5]]), "Cadencia rota");
  assert.equal(leer([["C", 0], ["Dm", 1]]), undefined);
});

probar("cada acorde dura hasta que entra el siguiente", () => {
  const f = frase(DO_MAYOR, [
    { compas: 1, cifrado: "C", grado: 0 },
    { compas: 2, cifrado: "F", grado: 3 },
    { compas: 2, tiempo: 3, cifrado: "G", grado: 4 },
  ], 2);
  assert.deepEqual(acordesDeFrase(f, 3).map((a) => [a.desde, a.dura]), [[0, 3], [0, 2], [2, 1]]);
});

// --- Cada análisis contra su partitura -------------------------------------

for (const armonia of ARMONIAS) {
  const pieza = piezaPorSlug(armonia.slug);
  probar(`${armonia.slug}: la pieza existe`, () => assert.ok(pieza));
  if (!pieza) continue;
  const tiempos = pieza.compas.numerador;

  probar(`${armonia.slug}: las frases cubren la pieza entera, en orden y sin huecos`, () => {
    let esperado = 1;
    for (const f of armonia.frases) {
      assert.equal(f.desde, esperado, `la frase "${f.titulo}" arranca en ${f.desde} y se esperaba ${esperado}`);
      assert.ok(f.hasta >= f.desde);
      esperado = f.hasta + 1;
    }
    assert.equal(esperado - 1, compasesDePieza(pieza.derecha, pieza.izquierda, pieza.compas));
  });

  for (const f of armonia.frases) {
    probar(`${armonia.slug} ${f.desde}–${f.hasta}: los acordes caen adentro, en orden, y arranca con uno`, () => {
      assert.equal(f.acordes[0].compas, f.desde);
      assert.equal(f.acordes[0].tiempo ?? 1, 1);
      let antes = -1;
      for (const a of f.acordes) {
        assert.ok(a.compas >= f.desde && a.compas <= f.hasta, `compás ${a.compas} fuera de la frase`);
        const t = (a.compas - 1) * tiempos + (a.tiempo ?? 1) - 1;
        assert.ok(t > antes, `el acorde del compás ${a.compas} no va después del anterior`);
        assert.ok((a.tiempo ?? 1) <= tiempos);
        antes = t;
      }
    });

    let leidos = [];
    probar(`${armonia.slug} ${f.desde}–${f.hasta}: cada cifrado está sobre su grado`, () => {
      leidos = acordesDeFrase(f, tiempos);
    });
    for (const a of leidos) {
      const donde = `${armonia.slug} c. ${a.compas}${a.desde ? ` t. ${a.desde + 1}` : ""} ${a.cifrado}`;
      probar(`${donde}: el bajo que suena es el del cifrado`, () => {
        const bajo = bajoEn(pieza.derecha, pieza.izquierda, pieza.compas, a.compas, a.desde + 1);
        assert.notEqual(bajo, null, "no suena nada");
        const clases = intervalsOf(a.quality).map((iv) => mod12(a.root + iv));
        assert.ok(clases.includes(mod12(bajo)), `el bajo ${bajo} no está en el acorde`);
        assert.equal(mod12(bajo), a.bajo, `suena ${bajo} abajo y el cifrado dice otra cosa`);
      });
    }
  }
}

if (mal.length) {
  console.error(mal.map((m) => `✗ ${m}`).join("\n"));
  console.error(`\n${mal.length} mal, ${bien} bien`);
  process.exit(1);
}
console.log(`✓ ${bien} pruebas de la armonía`);
