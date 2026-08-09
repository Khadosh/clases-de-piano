/**
 * Prueba del detector de altura contra señales sintéticas.
 *
 * No alcanza con probarlo con senos puros: el piano tiene armónicos fuertes
 * (muchas veces el segundo suena más que la fundamental) y ahí es donde los
 * detectores ingenuos contestan una octava más arriba. Estas señales imitan
 * eso a propósito.
 *
 *   node --experimental-strip-types scripts/probar-pitch.mjs
 */
import { detectPitch, midiToHz } from "../lib/pitch.ts";
import { noteName } from "../lib/music.ts";

const SR = 48000;
const N = 2048;

/** Tono con armónicos, el segundo más fuerte que la fundamental, y algo de ruido. */
function tonoDePiano(midi, { ruido = 0.01, fase = 0.3 } = {}) {
  const f = midiToHz(midi);
  const buf = new Float32Array(N);
  const parciales = [
    [1, 0.6],
    [2, 1.0],
    [3, 0.5],
    [4, 0.25],
    [5, 0.12],
  ];
  for (let i = 0; i < N; i++) {
    let v = 0;
    for (const [mult, amp] of parciales) {
      v += amp * Math.sin((2 * Math.PI * f * mult * i) / SR + mult * fase);
    }
    buf[i] = v * 0.2 + (Math.random() * 2 - 1) * ruido;
  }
  return buf;
}

let ok = 0;
let fallos = 0;
const errores = [];

// Todo el rango del ejercicio y bastante más: Do2 a Do6.
for (let midi = 36; midi <= 84; midi++) {
  const r = detectPitch(tonoDePiano(midi), SR);
  if (!r) {
    fallos++;
    errores.push(`${noteName(midi)}${Math.floor(midi / 12) - 1} (${midi}): sin lectura`);
  } else if (r.midi !== midi) {
    fallos++;
    errores.push(
      `${noteName(midi)}${Math.floor(midi / 12) - 1} (${midi}): detectó ${r.midi} (${r.hz.toFixed(1)} Hz, claridad ${r.clarity.toFixed(2)})`,
    );
  } else {
    ok++;
  }
}

console.log(`notas con armónicos: ${ok} bien, ${fallos} mal`);
errores.forEach((e) => console.log("  ✗", e));

// Silencio y ruido puro no tienen que devolver nada.
const silencio = detectPitch(new Float32Array(N), SR);
const ruido = new Float32Array(N);
for (let i = 0; i < N; i++) ruido[i] = (Math.random() * 2 - 1) * 0.3;
const soloRuido = detectPitch(ruido, SR);
console.log("silencio →", silencio === null ? "null ✓" : `¡${silencio.midi}! ✗`);
console.log(
  "ruido blanco →",
  soloRuido === null ? "null ✓" : `${soloRuido.midi} (claridad ${soloRuido.clarity.toFixed(2)}) ✗`,
);

// Afinación fina: un La 20 cents alto tiene que leerse como La, 20 cents alto.
const desafinado = new Float32Array(N);
const f = 440 * Math.pow(2, 20 / 1200);
for (let i = 0; i < N; i++) {
  desafinado[i] =
    0.5 * Math.sin((2 * Math.PI * f * i) / SR) +
    0.5 * Math.sin((4 * Math.PI * f * i) / SR);
}
const d = detectPitch(desafinado, SR);
console.log(
  "La4 +20 cents →",
  d ? `midi ${d.midi}, ${d.cents} cents` : "sin lectura ✗",
);

process.exit(fallos > 0 ? 1 : 0);
