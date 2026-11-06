/**
 * Las capas de una partitura, sacadas de sus notas: nada se copia a mano.
 *
 * Una pieza es una fila de eventos por mano (`lib/pentagrama.ts`); una capa
 * es una lista de compases de corcheas con su acorde (`lib/capas.ts`). El
 * puente entre las dos es **la armonía del análisis**: qué acorde suena en
 * cada tramo y cuántas corcheas dura. Con eso se parten las notas de la
 * partitura en tramos, cada uno con su acorde de fondo, y la capa toca
 * exactamente lo que está escrito —la izquierda, la derecha o las dos—.
 *
 * Por qué el tramo y no el compás: en el Canon el acorde cambia cada dos
 * tiempos, y el teclado de la capa dibuja un acorde por compás de capa.
 *
 * Puro, como el resto de `lib/`: `test:canciones` cruza cada tramo con sus
 * notas para que el análisis no pueda decir un acorde que no suena.
 */

import { duracionDeEvento, vocesDe, type Evento as EventoDePapel, type Voces } from "./pentagrama.ts";
import { mod12, type Pitch } from "./music.ts";
import { esCompuesto, type Acento, type Compas } from "./ritmo.ts";
import { cifradoDeVoicing, teclasDeVoicing, type CompasDeCapa, type Evento, type Mano, type Voicing } from "./capas.ts";

/** Lo que hace falta de una pieza: sus dos manos, y su compás para los acentos. */
export interface ManosDePieza {
  derecha: Voces;
  izquierda: Voces;
  compas?: Compas;
}

/**
 * Los acentos de la partitura corchea por corchea, desde la corchea `desde`
 * de la pieza: fuerte en la barra, medio en cada tiempo, débil el resto. Un
 * tramo no es un compás —en el Canon son dos por compás— y el segundo arranca
 * en el tiempo 3, que es medio y no fuerte (#12).
 */
export function acentosDePartitura(compas: Compas, desde: number, largo: number): Acento[] {
  const barra = (compas.numerador * 8) / compas.denominador;
  const tiempo = esCompuesto(compas) ? 3 : 8 / compas.denominador;
  return Array.from({ length: largo }, (_, i) => {
    const p = (desde + i) % barra;
    return p === 0 ? "fuerte" : p % tiempo === 0 ? "medio" : "debil";
  });
}

/** Un acorde del análisis y cuántas corcheas dura. */
export type TramoDeArmonia = [acorde: Voicing, corcheas: number];

/** Una nota de la partitura en corcheas desde el arranque de la pieza. */
interface NotaEnCorcheas {
  t: number;
  dur: number;
  teclas: Pitch[];
  mano: Mano;
}

/**
 * La primera voz de una mano en corcheas, con las ligadas sumadas a la
 * anterior y sin silencios. Grita si una figura no cae en la grilla de
 * corcheas: las capas cuentan de a corchea y una semicorchea se perdería.
 */
export function notasEnCorcheas(voces: Voces, mano: Mano): NotaEnCorcheas[] {
  const out: NotaEnCorcheas[] = [];
  let t = 0;
  for (const e of vocesDe(voces)[0] as EventoDePapel[]) {
    const dur = duracionDeEvento(e) * 8;
    if (Math.abs(dur - Math.round(dur)) > 1e-6) throw new Error(`una figura de ${dur} corcheas no entra en una capa`);
    const d = Math.round(dur);
    if (e.ligada && out.length) out[out.length - 1].dur += d;
    else if (e.midis.length) out.push({ t, dur: d, teclas: e.midis, mano });
    t += d;
  }
  return out;
}

export interface OpcionesDeTramos {
  /** Qué manos suenan. La otra igual se dibuja, apagada, como fondo. */
  manos: Mano[];
  /** Del tramo `de` (incluido) al `a` (excluido): un pedazo de la vuelta. Por defecto, todos. */
  de?: number;
  a?: number;
  /** Cada mano tocada como bloque, todo el tramo: los acordes plantados antes del arpegio. */
  plaque?: boolean;
  /** Sólo la primera nota de cada tramo en la izquierda, larga: el bajo solo. */
  bajo?: boolean;
}

/**
 * Los tramos de una pieza: uno por acorde de la armonía, con lo que la
 * partitura tiene adentro. El acorde de fondo de cada tramo son las teclas
 * de la izquierda de la partitura (lo que el teclado dibuja) y se nombra con
 * el acorde del análisis, porque la izquierda a veces toca dos notas.
 */
export function tramosDePieza(pieza: ManosDePieza, armonia: TramoDeArmonia[], op: OpcionesDeTramos): CompasDeCapa[] {
  const notas = [...notasEnCorcheas(pieza.izquierda, "izq"), ...notasEnCorcheas(pieza.derecha, "der")];
  const de = op.de ?? 0;
  let t0 = armonia.slice(0, de).reduce((s, [, l]) => s + l, 0);
  return armonia.slice(de, op.a ?? armonia.length).map(([acorde, largo]) => {
    const fin = t0 + largo;
    const adentro = notas.filter((n) => n.t >= t0 && n.t < fin);
    const izquierda = [...new Set(adentro.filter((n) => n.mano === "izq").flatMap((n) => n.teclas))].sort((a, b) => a - b);
    const voicing: Voicing = { izquierda, derecha: [], acorde: teclasDeVoicing(acorde) };
    const eventos: Evento[] = [];
    for (const mano of op.manos) {
      const deLaMano = adentro.filter((n) => n.mano === mano);
      if (!deLaMano.length) continue;
      if (op.plaque) {
        eventos.push({ t: 0, dur: largo, teclas: [...new Set(deLaMano.flatMap((n) => n.teclas))].sort((a, b) => a - b), mano });
      } else if (op.bajo && mano === "izq") {
        eventos.push({ t: 0, dur: largo, teclas: [Math.min(...deLaMano[0].teclas)], mano });
      } else {
        for (const n of deLaMano) eventos.push({ t: n.t - t0, dur: Math.min(n.dur, fin - n.t), teclas: n.teclas, mano });
      }
    }
    const grupos = Array.from({ length: Math.ceil(largo / 2) }, (_, i) => Math.min(2, largo - 2 * i));
    const acentos = pieza.compas && acentosDePartitura(pieza.compas, t0, largo);
    t0 = fin;
    return { grupos, eventos, voicing, etiqueta: cifradoDeVoicing(voicing), ...(acentos && { acentos }) };
  });
}

/**
 * Las notas de un tramo que no son del acorde que el análisis le pone: las de
 * la izquierda, todas, y las de la derecha que caen en su primera corchea.
 * Es lo que `test:canciones` pide vacío, salvo las apoyaturas que el análisis
 * declara y explica.
 */
export function ajenasDelTramo(c: CompasDeCapa): Pitch[] {
  const del = new Set((c.voicing?.acorde ?? (c.voicing ? teclasDeVoicing(c.voicing) : [])).map(mod12));
  return c.eventos
    .filter((e) => e.mano === "izq" || e.t === 0)
    .flatMap((e) => e.teclas)
    .filter((p) => !del.has(mod12(p)));
}
