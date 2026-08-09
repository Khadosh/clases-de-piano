/**
 * Calibra el detector contra una grabación del ejercicio.
 *
 *   node --experimental-strip-types scripts/calibrar-mic.mjs grabacion.wav
 *
 * A diferencia de escuchar-grabacion.mjs, que sólo lista lo que oyó, este
 * script sabe qué había que tocar y mide el error de verdad.
 *
 * Dos decisiones importantes de método:
 *
 * 1. NO puntúa como la app. La app espera nota por nota, así que si se
 *    desincroniza una vez, todo lo que viene después cuenta como error y el
 *    número deja de decir nada sobre el detector. Acá se alinea con distancia
 *    de edición, que separa los tres errores que son distintos entre sí:
 *    notas cambiadas, notas inventadas y notas comidas. Las *inventadas* son
 *    las que rompen la app.
 *
 * 2. La autocorrelación de cada ventana se calcula una sola vez y se guardan
 *    los picos. Probar un juego de umbrales después es sólo recorrer esa
 *    tabla, así que el barrido entero sale en un segundo en vez de minutos.
 */
import { readFileSync, existsSync } from "node:fs";
import { hzToMidi } from "../lib/pitch.ts";
import { buildExercise, mod12, noteName } from "../lib/music.ts";

const archivo = process.argv[2];
if (!archivo || !existsSync(archivo)) {
  console.error(
    "Uso: calibrar-mic.mjs <grabacion.wav>\n" +
      "Tiene que ser el ejercicio de la izquierda con hueco abajo, desde do,\n" +
      "una octava entera. Si no es WAV, convertilo antes:\n" +
      "  ffmpeg -i grabacion.m4a -ac 1 -ar 48000 -c:a pcm_s16le grabacion.wav",
  );
  process.exit(1);
}

// --- audio ---------------------------------------------------------------
function leerWav(buf) {
  let pos = 12;
  let fmt = null;
  while (pos + 8 <= buf.length) {
    const id = buf.toString("ascii", pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    const c = pos + 8;
    if (id === "fmt ") {
      fmt = {
        canales: buf.readUInt16LE(c + 2),
        sampleRate: buf.readUInt32LE(c + 4),
        bits: buf.readUInt16LE(c + 14),
      };
    } else if (id === "data" && fmt) {
      if (fmt.bits !== 16) throw new Error("por ahora sólo WAV de 16 bits");
      const n = Math.floor(size / 2 / fmt.canales);
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++)
        out[i] = buf.readInt16LE(c + i * fmt.canales * 2) / 32768;
      return { muestras: out, sampleRate: fmt.sampleRate };
    }
    pos = c + size + (size % 2);
  }
  throw new Error("no encontré datos de audio en el WAV");
}

const { muestras, sampleRate } = leerWav(readFileSync(archivo));
const esperado = buildExercise({
  hand: "izquierda",
  gap: "abajo",
  positions: 8,
  base: 48,
}).map((s) => mod12(s.pitch));

const VENTANA = 2048;
const SALTO = 800; // ~60 lecturas/s, como el requestAnimationFrame del browser
const HZ_MIN = 55;
const HZ_MAX = 2100;

// --- precomputar los picos de cada ventana --------------------------------
process.stdout.write("analizando… ");
const tabla = [];
{
  const buf = new Float32Array(VENTANA);
  const tauMin = Math.max(2, Math.floor(sampleRate / HZ_MAX));
  const tauMax = Math.min(VENTANA - 2, Math.ceil(sampleRate / HZ_MIN));
  const nsdf = new Float32Array(tauMax + 2);
  for (let pos = 0; pos + VENTANA <= muestras.length; pos += SALTO) {
    buf.set(muestras.subarray(pos, pos + VENTANA));
    let sum = 0;
    for (let i = 0; i < VENTANA; i++) sum += buf[i] * buf[i];

    for (let tau = tauMin; tau <= tauMax; tau++) {
      let acf = 0;
      let div = 0;
      for (let i = 0, n = VENTANA - tau; i < n; i++) {
        const a = buf[i];
        const b = buf[i + tau];
        acf += a * b;
        div += a * a + b * b;
      }
      nsdf[tau] = div > 0 ? (2 * acf) / div : 0;
    }

    const picos = [];
    let tau = tauMin;
    while (tau <= tauMax && nsdf[tau] > 0) tau++;
    while (tau <= tauMax) {
      if (nsdf[tau] > 0) {
        let best = tau;
        while (tau <= tauMax && nsdf[tau] > 0) {
          if (nsdf[tau] > nsdf[best]) best = tau;
          tau++;
        }
        const y0 = nsdf[best - 1] ?? 0;
        const y1 = nsdf[best];
        const y2 = nsdf[best + 1] ?? 0;
        const den = 2 * (2 * y1 - y0 - y2);
        const aj = den !== 0 ? Math.max(-1, Math.min(1, (y2 - y0) / den)) : 0;
        picos.push({ valor: y1, midi: Math.round(hzToMidi(sampleRate / (best + aj))) });
      } else tau++;
    }
    tabla.push({ rms: Math.sqrt(sum / VENTANA), picos });
  }
}
console.log(`${tabla.length} ventanas, ${(muestras.length / sampleRate).toFixed(1)}s\n`);

// --- simular la app -------------------------------------------------------
function leer(w, k, clarityMin, rmsMin) {
  if (w.rms < rmsMin || w.picos.length === 0) return null;
  let max = 0;
  for (const p of w.picos) if (p.valor > max) max = p.valor;
  const elegido = w.picos.find((p) => p.valor >= max * k) ?? w.picos[0];
  if (elegido.valor < clarityMin) return null;
  return elegido.midi >= 33 && elegido.midi <= 96 ? elegido.midi : null;
}

function transcribir(p) {
  let candidata = null;
  let reps = 0;
  let ultima = null;
  let silencios = 0;
  const out = [];
  for (const w of tabla) {
    const midi = leer(w, p.k, p.clarityMin, p.rmsMin);
    if (midi === null) {
      silencios++;
      candidata = null;
      reps = 0;
      if (silencios >= p.soltarTras) ultima = null;
      continue;
    }
    silencios = 0;
    const clase = mod12(midi);
    const id = p.porClase ? clase : midi;
    if (midi === candidata) {
      reps++;
      if (reps === p.confirmaciones && id !== ultima) {
        ultima = id;
        out.push(clase);
      }
    } else {
      candidata = midi;
      reps = 1;
    }
  }
  return out;
}

/** Levenshtein con desglose de qué tipo de error fue cada uno. */
function alinear(oido, esp) {
  const n = oido.length;
  const m = esp.length;
  const D = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  const op = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1));
  for (let i = 1; i <= n; i++) {
    D[i][0] = i;
    op[i][0] = 1;
  }
  for (let j = 1; j <= m; j++) {
    D[0][j] = j;
    op[0][j] = 2;
  }
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) {
      const igual = oido[i - 1] === esp[j - 1];
      const sub = D[i - 1][j - 1] + (igual ? 0 : 1);
      const ins = D[i - 1][j] + 1;
      const del = D[i][j - 1] + 1;
      const best = Math.min(sub, ins, del);
      D[i][j] = best;
      op[i][j] = best === sub ? (igual ? 0 : 3) : best === ins ? 1 : 2;
    }
  let i = n;
  let j = m;
  const r = { ok: 0, cambiadas: 0, inventadas: 0, comidas: 0, n };
  while (i > 0 || j > 0) {
    const o = op[i][j];
    if (o === 0) { r.ok++; i--; j--; }
    else if (o === 3) { r.cambiadas++; i--; j--; }
    else if (o === 1) { r.inventadas++; i--; }
    else { r.comidas++; j--; }
  }
  r.total = r.cambiadas + r.inventadas + r.comidas;
  return r;
}

const ev = (p) => alinear(transcribir(p), esperado);
const fmt = (r) =>
  `${String(r.n).padStart(3)} notas · ${String(r.ok).padStart(2)} ok · ` +
  `${String(r.cambiadas).padStart(2)} cambiadas · ${String(r.inventadas).padStart(3)} inventadas · ` +
  `${String(r.comidas).padStart(2)} comidas → ${r.total} errores`;

// Lo que tiene la app hoy. Si tocás los umbrales en lib/, actualizá esto.
const ACTUAL = {
  k: 0.9,
  clarityMin: 0.88,
  rmsMin: 0.01,
  confirmaciones: 3,
  soltarTras: 6,
  porClase: true,
};

console.log("con los valores que tiene la app hoy:");
console.log("  " + fmt(ev(ACTUAL)));

console.log("\nqué pasa si me muevo de cada uno (menos errores = mejor):");
for (const [campo, valores] of [
  ["k", [0.85, 0.88, 0.9, 0.92, 0.95, 0.97]],
  ["clarityMin", [0.82, 0.85, 0.88, 0.9, 0.92, 0.95]],
  ["rmsMin", [0.005, 0.008, 0.01, 0.015, 0.02, 0.03]],
  ["confirmaciones", [2, 3, 4, 5]],
  ["soltarTras", [1, 2, 4, 6, 8, 12]],
  ["porClase", [true, false]],
]) {
  const fila = valores
    .map((v) => {
      const t = ev({ ...ACTUAL, [campo]: v }).total;
      const marca = v === ACTUAL[campo] ? "*" : " ";
      return `${v}:${t}${marca}`;
    })
    .join("  ");
  console.log(`  ${campo.padEnd(15)} ${fila}`);
}
console.log("  (* = el valor actual)");

let mejor = null;
for (const k of [0.85, 0.88, 0.9, 0.92, 0.95])
  for (const clarityMin of [0.82, 0.85, 0.88, 0.9, 0.92])
    for (const rmsMin of [0.005, 0.01, 0.015, 0.02])
      for (const confirmaciones of [2, 3, 4, 5])
        for (const soltarTras of [2, 4, 6, 8, 12]) {
          const p = { k, clarityMin, rmsMin, confirmaciones, soltarTras, porClase: true };
          const r = ev(p);
          if (!mejor || r.total < mejor.r.total) mejor = { p, r };
        }
console.log("\nla mejor combinación del barrido:");
console.log(
  `  k=${mejor.p.k} claridad=${mejor.p.clarityMin} rms=${mejor.p.rmsMin} ` +
    `confirmaciones=${mejor.p.confirmaciones} soltarTras=${mejor.p.soltarTras}`,
);
console.log("  " + fmt(mejor.r));
console.log(
  "\n  Ojo: una diferencia de uno o dos errores sobre una sola grabación es\n" +
    "  ruido. Mover un umbral se justifica cuando la mejora es clara y se\n" +
    "  sostiene en más de una grabación.",
);

console.log("\nlo que escuchó:");
console.log("  " + transcribir(ACTUAL).map(noteName).join(" "));
console.log("lo que había que tocar:");
console.log("  " + esperado.map(noteName).join(" "));
