/**
 * De una grabación MIDI de `/grabar` a una pieza propia, lista para pegar.
 *
 *   npm run importar:grabacion -- grabacion.json --bpm 84 --slug pum-cha --titulo "Pum-chá"
 *   npm run importar:grabacion -- grabacion.json            # estima el bpm y avisa
 *
 * Las tres piezas propias del cuaderno se transcribieron a mano leyendo el
 * JSON con los ojos, y son una tarde cada una. Esto hace lo mecánico: agrupa
 * las teclas que cayeron juntas en un instante, reparte las manos por
 * registro, cuantiza cada pulso a la grilla que mejor le queda —corcheas,
 * semicorcheas o tresillo, elegida pulso por pulso— y escribe cada duración
 * como figuras, ligadas si hace falta, cortadas en cada barra. Lo que no es
 * mecánico (el título, el `sobre`, qué tomas quedan) sigue siendo a mano, y
 * por eso el objeto sale con esos campos vacíos y con un `revisar` que dice
 * qué se supuso.
 *
 * **Sin note-off la duración se supone**: cada nota dura hasta la siguiente
 * de la misma mano, o hasta la barra si es la última. Las grabaciones nuevas
 * traen `dur` y ahí se usa; las viejas no lo tienen y se avisa.
 *
 * **El pulso lo puede poner la mano izquierda** (`--pulso izquierda`): cada
 * ataque de la izquierda es el pulso siguiente, y el tiempo se estira o se
 * encoge entre ataques. Es para el pum-chá con rubato: contra un reloj fijo
 * el compás que se estiró sale como semicorcheas ligadas, y contra la mano
 * sale como se tocó, que es en negras. Con la izquierda en plaqué (un ataque
 * por compás) no sirve, y por eso no es el default.
 */

import { readFileSync } from "node:fs";
import { compasesIncompletos, HOLGURA } from "../lib/pentagrama.ts";
import { escribirPieza } from "./escribir-pieza.mjs";

/**
 * Dos teclas a menos de esto, una de la otra, caen en el mismo instante:
 * nunca caen juntas de verdad. Se mide contra la anterior y no contra la
 * primera del grupo, así un acorde rodado —cuatro teclas a 25 ms cada una,
 * casi cien en total— sigue siendo un acorde.
 */
const VENTANA_ACORDE_MS = 40;
/** Por debajo de esto una tecla se rozó, no se tocó: se saca y se avisa. */
const VELOCIDAD_FANTASMA = 20;
/** Un pulso se parte en 12: entran corcheas (6), semicorcheas (3) y tresillos (4). */
const DOCEAVOS = 12;

const GRILLAS = [
  { nombre: "corchea", partes: 2 },
  { nombre: "tresillo", partes: 3 },
  { nombre: "semicorchea", partes: 4 },
];

/** Los instantes: las teclas agrupadas por ataque, en milisegundos. */
export function instantesDe(notas) {
  const orden = [...notas].sort((a, b) => a.t - b.t);
  const out = [];
  for (const n of orden) {
    const u = out[out.length - 1];
    if (u && n.t - u.notas[u.notas.length - 1].t < VENTANA_ACORDE_MS) u.notas.push(n);
    else out.push({ t: n.t, notas: [n] });
  }
  return out;
}

/**
 * Un bpm estimado de la mano izquierda: la mediana del tiempo entre sus
 * ataques suele ser el pulso, porque el acompañamiento va en pulsos y la
 * melodía no. Es una estimación y el informe lo dice: si lo sabés, pasalo.
 */
export function estimarBpm(notas, corte = 60) {
  const izq = instantesDe(notas.filter((n) => n.midi < corte));
  const gaps = izq.slice(1).map((x, i) => x.t - izq[i].t).filter((g) => g > 200 && g < 2000);
  if (gaps.length < 2) return null;
  gaps.sort((a, b) => a - b);
  const mediana = gaps[Math.floor(gaps.length / 2)];
  return Math.round(60000 / mediana);
}

/**
 * Dónde partir las manos, si no lo dicen: en el hueco más grande del registro
 * medio. En un pum-chá con la derecha cantando, entre el techo del chá y el
 * piso de la melodía suele haber una quinta vacía; si no hay hueco, el Do central.
 */
export function corteAutomatico(notas) {
  const teclas = [...new Set(notas.map((n) => n.midi))].sort((a, b) => a - b);
  let mejor = { gap: 0, corte: 60 };
  for (let i = 1; i < teclas.length; i++) {
    const a = teclas[i - 1];
    const b = teclas[i];
    if (a < 48 || b > 72) continue;
    if (b - a > mejor.gap) mejor = { gap: b - a, corte: a + 1 };
  }
  return mejor.gap >= 3 ? mejor.corte : 60;
}

/** Qué grilla le queda mejor a los ataques de un pulso: la más gruesa que no pierda. */
function grillaDelPulso(fracciones) {
  let mejor = null;
  for (const g of GRILLAS) {
    const error = fracciones.reduce((acc, f) => acc + Math.abs(f - Math.round(f * g.partes) / g.partes), 0);
    if (!mejor || error < mejor.error - 0.02) mejor = { ...g, error };
  }
  return mejor;
}

/**
 * Una duración en doceavos de pulso, como figuras.
 *
 * Los pulsos enteros van en figuras derechas, de la más grande a la más
 * chica; el resto, si es múltiplo de 3 doceavos es semicorcheas y corcheas,
 * si es múltiplo de 4 es tresillo. Lo que mezcla (7 = 3 + 4) sale en dos
 * figuras ligadas y se avisa: casi siempre es un ataque mal cuantizado.
 */
export function figurasDe(doceavos, { silencio = false } = {}) {
  const out = [];
  let d = doceavos;
  const pulsosEnteros = Math.floor(d / DOCEAVOS);
  // Derechas, en pulsos: redonda 4, blanca con puntillo 3, blanca 2, negra 1.
  const DERECHAS = [
    [4, { divide: 1 }],
    [3, { divide: 2, puntillo: true }],
    [2, { divide: 2 }],
    [1, { divide: 4 }],
  ];
  let pulsos = pulsosEnteros;
  for (const [cuantos, fig] of DERECHAS) {
    while (pulsos >= cuantos) {
      out.push({ ...fig });
      pulsos -= cuantos;
    }
  }
  d -= pulsosEnteros * DOCEAVOS;
  // Un pulso y medio, tres cuartos de pulso: el puntillo antes que la ligadura.
  if (out.length && out[out.length - 1].divide === 4 && !out[out.length - 1].puntillo && d === 6) {
    out[out.length - 1].puntillo = true;
    d = 0;
  }
  const parciales = (r) => {
    if (r === 0) return [];
    if (r % 4 === 0) {
      // Tresillos: 8 doceavos es una negra de tresillo, 4 una corchea.
      const t = [];
      let q = r;
      while (q >= 8) { t.push({ divide: 4, irregular: { en: 3, de: 2 } }); q -= 8; }
      while (q >= 4) { t.push({ divide: 8, irregular: { en: 3, de: 2 } }); q -= 4; }
      return t;
    }
    if (r % 3 === 0) {
      const t = [];
      let q = r;
      if (q === 9) return [{ divide: 8, puntillo: true }];
      while (q >= 6) { t.push({ divide: 8 }); q -= 6; }
      while (q >= 3) { t.push({ divide: 16 }); q -= 3; }
      return t;
    }
    // Mezcla: la parte derecha y la parte de tresillo, ligadas. Se avisa afuera.
    for (let a = 1; a * 4 < r; a++) {
      const resto = r - a * 4;
      if (resto % 3 === 0) return [...parciales(resto), ...parciales(a * 4)];
    }
    return [{ divide: 16 }];
  };
  out.push(...parciales(d));
  if (silencio) return out.map((f) => ({ ...f, midis: [] }));
  // Ligadas entre sí: es una sola nota escrita en pedazos.
  return out.map((f, i) => (i === 0 ? f : { ...f, ligada: true }));
}

export const esMezcla = (doceavos) => {
  const r = doceavos % DOCEAVOS;
  return r !== 0 && r % 3 !== 0 && r % 4 !== 0;
};

/**
 * La grabación entera a dos filas de eventos.
 *
 * `bpm` en negras por minuto, `arranque` el milisegundo del primer pulso (por
 * defecto el primer ataque), `corte` la tecla desde la que es mano derecha.
 */
export function importarGrabacion(grabacion, opciones = {}) {
  const avisos = [];
  const fantasma = opciones.fantasma ?? VELOCIDAD_FANTASMA;
  const rozadas = (grabacion.notas ?? []).filter((n) => n.velocity < fantasma);
  const notas = (grabacion.notas ?? []).filter((n) => n.velocity >= fantasma);
  if (notas.length === 0) throw new Error("La grabación no tiene notas MIDI.");
  if (rozadas.length) {
    avisos.push(
      `${rozadas.length} ${rozadas.length === 1 ? "tecla rozada" : "teclas rozadas"} (velocidad menor a ${fantasma}) quedaron afuera: ${rozadas.map((n) => `${n.midi} a los ${(n.t / 1000).toFixed(1)}s`).join(", ")}.`,
    );
  }
  const corte = opciones.corte ?? corteAutomatico(notas);
  if (opciones.corte === undefined) avisos.push(`Las manos se partieron en la tecla ${corte} (--corte para cambiarlo).`);
  const compas = opciones.compas ?? { numerador: 4, denominador: 4 };
  if (compas.denominador !== 4) avisos.push("Sólo se cuantiza con la negra de pulso (denominador 4); otro compás se importa como si lo fuera.");
  let bpm = opciones.bpm ?? null;
  if (!bpm) {
    bpm = estimarBpm(notas, corte);
    if (!bpm) throw new Error("No pude estimar el bpm: pasalo con --bpm.");
    avisos.push(`El bpm es una estimación (${bpm}), sacada de la mano izquierda. Si lo sabés, pasalo con --bpm.`);
  }
  const arranque = opciones.arranque ?? Math.min(...notas.map((n) => n.t));
  const msPorPulso = 60000 / bpm;
  /** De milisegundos a pulsos: contra el reloj, o contra los ataques de la izquierda. */
  let aPulsos = (t) => (t - arranque) / msPorPulso;
  if (opciones.pulso === "izquierda") {
    const anclas = instantesDe(notas.filter((n) => n.midi < corte)).map((i) => i.t);
    if (anclas.length < 2) throw new Error("La izquierda tiene menos de dos ataques: no puede llevar el pulso.");
    aPulsos = (t) => {
      if (t <= anclas[0]) return (t - anclas[0]) / msPorPulso;
      const k = anclas.findIndex((a, i) => i > 0 && t < a);
      if (k < 0) return anclas.length - 1 + (t - anclas[anclas.length - 1]) / msPorPulso;
      return k - 1 + (t - anclas[k - 1]) / (anclas[k] - anclas[k - 1]);
    };
    avisos.push(`El pulso lo puso la mano izquierda: cada uno de sus ${anclas.length} ataques es un pulso.`);
  }
  const conDur = notas.filter((n) => n.dur !== undefined).length;
  if (conDur === 0) avisos.push("La grabación no trae note-off: cada nota dura hasta la siguiente de su mano, o hasta la barra.");
  else if (conDur < notas.length) avisos.push(`${notas.length - conDur} notas sin note-off: ésas duran hasta la siguiente.`);

  const manos = { izquierda: [], derecha: [] };
  for (const inst of instantesDe(notas)) {
    for (const mano of ["izquierda", "derecha"]) {
      const mias = inst.notas.filter((n) => (mano === "izquierda" ? n.midi < corte : n.midi >= corte));
      if (!mias.length) continue;
      manos[mano].push({
        pulso: aPulsos(inst.t),
        midis: [...new Set(mias.map((n) => n.midi))].sort((a, b) => a - b),
        dur: mias.every((n) => n.dur !== undefined) ? Math.max(...mias.map((n) => n.dur)) / msPorPulso : null,
      });
    }
  }

  const pulsosPorCompas = compas.numerador;
  let compases = 0;
  const filas = {};
  let mezclas = 0;
  for (const mano of ["izquierda", "derecha"]) {
    const eventos = manos[mano];
    // Cuantizar pulso por pulso, con la grilla que mejor le queda a ese pulso.
    const porPulso = new Map();
    for (const e of eventos) {
      const k = Math.floor(e.pulso + HOLGURA);
      if (!porPulso.has(k)) porPulso.set(k, []);
      porPulso.get(k).push(e);
    }
    const cuantizados = [];
    for (const [k, evs] of porPulso) {
      const g = grillaDelPulso(evs.map((e) => e.pulso - k));
      for (const e of evs) {
        const en = k * DOCEAVOS + Math.round((e.pulso - k) * g.partes) * (DOCEAVOS / g.partes);
        const previo = cuantizados.find((c) => c.en === en);
        if (previo) previo.midis = [...new Set([...previo.midis, ...e.midis])].sort((a, b) => a - b);
        else cuantizados.push({ en, midis: e.midis, dur: e.dur, partes: g.partes });
      }
    }
    cuantizados.sort((a, b) => a.en - b.en);
    // Duraciones, en doceavos: la anotada (redondeada a la grilla, al menos
    // una parte, y nunca pisando la siguiente), o hasta la siguiente / la barra.
    for (let i = 0; i < cuantizados.length; i++) {
      const c = cuantizados[i];
      const siguiente = cuantizados[i + 1]?.en ?? Infinity;
      const finDeCompas = (Math.floor(c.en / (DOCEAVOS * pulsosPorCompas)) + 1) * DOCEAVOS * pulsosPorCompas;
      const tope = Math.min(siguiente, finDeCompas);
      if (c.dur !== null) {
        const unidad = DOCEAVOS / c.partes;
        const anotada = Math.max(unidad, Math.round((c.dur * DOCEAVOS) / unidad) * unidad);
        c.hasta = Math.min(c.en + anotada, siguiente);
      } else {
        c.hasta = tope;
      }
    }
    // A eventos con figuras: silencios en los huecos, corte en cada barra.
    const fila = [];
    let cursor = 0;
    const largoCompas = DOCEAVOS * pulsosPorCompas;
    /**
     * Una duración a la fila, como figuras. Se corta en cada barra y, si el
     * ataque no cae en un pulso, primero se llega al pulso siguiente: una nota
     * que arranca en la grilla de tresillo y termina en la de semicorcheas
     * dura, contada de punta a punta, algo que no es ninguna figura (un
     * doceavo de pulso); partida en el pulso, cada pedazo es de una sola
     * grilla y se escribe. Es como se escribe a mano, además.
     */
    const volcar = (desde, hasta, midis) => {
      let d = desde;
      let primera = true;
      const pedazo = (cuanto) => {
        if (esMezcla(cuanto)) mezclas++;
        for (const f of figurasDe(cuanto, { silencio: midis.length === 0 })) {
          const ev = { midis, divide: f.divide };
          if (f.puntillo) ev.puntillo = true;
          if (f.irregular) ev.irregular = f.irregular;
          if (midis.length && !primera) ev.ligada = true;
          fila.push(ev);
          primera = false;
        }
      };
      while (d < hasta) {
        const barra = (Math.floor(d / largoCompas) + 1) * largoCompas;
        const fin = Math.min(hasta, barra);
        const dentroDelPulso = d % DOCEAVOS;
        if (dentroDelPulso !== 0) {
          const cabeza = Math.min(DOCEAVOS - dentroDelPulso, fin - d);
          pedazo(cabeza);
          d += cabeza;
        }
        if (d < fin) {
          pedazo(fin - d);
          d = fin;
        }
      }
    };
    for (const c of cuantizados) {
      if (c.en > cursor) volcar(cursor, c.en, []);
      volcar(c.en, c.hasta, c.midis);
      cursor = c.hasta;
    }
    // Completar la última barra con silencio para que cierre.
    const ultimoFin = Math.ceil(cursor / largoCompas) * largoCompas;
    if (cursor < ultimoFin) volcar(cursor, ultimoFin, []);
    compases = Math.max(compases, Math.round(ultimoFin / largoCompas));
    filas[mano] = fila;
  }
  // Las dos manos tienen que durar lo mismo: la más corta se rellena.
  for (const mano of ["izquierda", "derecha"]) {
    const total = filas[mano].reduce((acc, e) => acc + duracionEnDoceavos(e), 0);
    const falta = compases * DOCEAVOS * pulsosPorCompas - total;
    if (falta > 0) {
      for (let c = 0; c < falta / (DOCEAVOS * pulsosPorCompas); c++) {
        filas[mano].push({ midis: [], divide: 1 });
      }
    }
  }
  if (mezclas) avisos.push(`${mezclas} duraciones que mezclan tresillo y grilla derecha: revisar esos ataques.`);
  for (const mano of ["izquierda", "derecha"]) {
    const rotos = compasesIncompletos(filas[mano], compas);
    if (rotos.length) avisos.push(`${mano}: ${rotos.length} compases que no cierran (${rotos.map((r) => r.compas + 1).join(", ")}).`);
  }
  return { bpm, compas, compases, derecha: filas.derecha, izquierda: filas.izquierda, avisos, arranque };
}

function duracionEnDoceavos(e) {
  const base = (DOCEAVOS * 4) / e.divide;
  const conPuntillo = e.puntillo ? base * 1.5 : base;
  return e.irregular ? (conPuntillo * e.irregular.de) / e.irregular.en : conPuntillo;
}

function principal() {
  const args = process.argv.slice(2);
  const archivo = args.find((a) => !a.startsWith("--"));
  if (!archivo) {
    console.error("Uso: npm run importar:grabacion -- grabacion.json [--bpm N] [--slug x] [--titulo x] [--corte 60] [--arranque ms] [--pulso izquierda] [--fantasma 20] [--tonica 0] [--modo mayor]");
    process.exit(1);
  }
  const opcion = (nombre) => {
    const i = args.indexOf(`--${nombre}`);
    return i >= 0 ? args[i + 1] : null;
  };
  const grabacion = JSON.parse(readFileSync(archivo, "utf8"));
  const pieza = importarGrabacion(grabacion, {
    bpm: opcion("bpm") ? Number(opcion("bpm")) : undefined,
    corte: opcion("corte") ? Number(opcion("corte")) : undefined,
    arranque: opcion("arranque") ? Number(opcion("arranque")) : undefined,
    pulso: opcion("pulso") ?? undefined,
    fantasma: opcion("fantasma") ? Number(opcion("fantasma")) : undefined,
  });
  const fecha = archivo.match(/(\d{4})-(\d{2})-(\d{2})/);
  const revisar = [
    `Importada de la grabación MIDI de la página de grabar${fecha ? ` (${fecha[3]}/${fecha[2]}/${fecha[1]})` : ""}, cuantizada a corcheas, semicorcheas o tresillos pulso por pulso.`,
    opcion("pulso") === "izquierda" ? "El pulso lo marcó la mano izquierda, así que el rubato de la toma quedó parejo." : "Contra un reloj fijo: si el pulso se estiró en la toma, acá sale desparejo.",
    ...pieza.avisos,
  ].join(" ");
  console.log(
    escribirPieza({
      slug: opcion("slug") ?? "grabacion",
      titulo: opcion("titulo") ?? "Sin título",
      compositor: "Joaquín",
      anio: String(new Date().getFullYear()),
      compas: pieza.compas,
      tonalidad: { tonica: Number(opcion("tonica") ?? 0), modo: opcion("modo") ?? "mayor" },
      bpm: pieza.bpm,
      dificultad: 2,
      propia: true,
      extra: `\n    revisar:\n      ${JSON.stringify(revisar)},`,
      derecha: [pieza.derecha],
      izquierda: [pieza.izquierda],
    }),
  );
  console.error(`\n// ${pieza.compases} compases a ${pieza.bpm} bpm, arrancando en el ms ${pieza.arranque}`);
  for (const a of pieza.avisos) console.error(`//   · ${a}`);
}

if (process.argv[1]?.endsWith("importar-grabacion.mjs")) principal();
