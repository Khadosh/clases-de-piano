/**
 * La armonía de una partitura: qué acorde suena en cada compás, qué función
 * cumple y cómo cierra cada frase.
 *
 * Es el mapa de funciones de la clase 3 puesto arriba de una pieza de verdad.
 * El análisis se escribe a mano —qué acorde es cada compás es una lectura y
 * no una cuenta: una nota de paso no es un acorde nuevo, y eso lo decide el
 * oído— pero **todo lo que se deduce, se deduce**:
 *
 * - **La función la pone el grado**, igual que en la secuencia: el dato dice
 *   "grado 4" y el color de tensión sale de `FUNCION_DE_GRADO`. Un dominante
 *   secundario se declara por adónde va (`dominanteDe`) y es tensión siempre.
 * - **El número romano sale del grado y del cifrado**: "IVm", "VII°", "V7/IIm".
 * - **La cadencia de cada frase sale de sus dos últimos acordes**: termina en
 *   el V es una pregunta (semicadencia), V → I es la auténtica, etcétera.
 *
 * Y lo que se escribe a mano se verifica contra la partitura
 * (`test:armonia`): que la fundamental del cifrado sea la del grado que dice,
 * y que el bajo que suena de verdad en ese instante sea una nota del acorde —
 * el de la barra, si tiene barra. Un análisis que no coincide con las notas
 * está enseñando otra pieza.
 *
 * Función pura, sin React.
 */

import { FUNCION_DE_GRADO, type Funcion } from "./grados.ts";
import {
  escribirNota,
  intervalsOf,
  mod12,
  parseCifradoConBajo,
  raizEscrita,
  type ChordQuality,
} from "./music.ts";
import {
  duracionDeCompas,
  duracionDeEvento,
  vocesDe,
  type Tonalidad,
  type Voces,
} from "./pentagrama.ts";
import type { Compas } from "./ritmo.ts";

/** Semitonos desde la tónica a cada grado. La menor es la natural: el V mayor es préstamo de la armónica y se escribe en el cifrado. */
const ESCALA: Record<Tonalidad["modo"], number[]> = {
  mayor: [0, 2, 4, 5, 7, 9, 11],
  menor: [0, 2, 3, 5, 7, 8, 10],
};

/** Las calidades de las tríadas de cada grado, para nombrar el destino de un secundario. */
const TRIADAS: Record<Tonalidad["modo"], string[]> = {
  mayor: ["maj", "min", "min", "maj", "maj", "min", "dim"],
  menor: ["min", "dim", "maj", "min", "min", "maj", "maj"],
};

const ROMANOS = ["I", "II", "III", "IV", "V", "VI", "VII"];

export type AcordeAnalizado = {
  /** 1 es el primero, como en la partitura. */
  compas: number;
  /** En qué tiempo entra, desde 1. Si no se dice, el compás entero. */
  tiempo?: number;
  /** Como en un papel, en inglés: "D7/F#". La barra es el bajo. */
  cifrado: string;
  /** Contra qué tonalidad se lee, si no es la de la frase: el acorde pivote. */
  en?: Tonalidad;
} & (
  | {
      /** Sobre qué grado de la tonalidad está, desde 0. */
      grado: number;
      dominanteDe?: never;
    }
  | {
      /** Es el dominante de otro grado: G7 → Cm en Si♭ es el V7 del grado 1. */
      dominanteDe: number;
      grado?: never;
    }
);

export interface FraseArmonica {
  desde: number;
  hasta: number;
  /** En qué tonalidad está la frase: cuando se va de casa, cambia. */
  en: Tonalidad;
  /** Un nombre corto, para leer de un vistazo: "La pregunta". */
  titulo: string;
  /** Lo que pasa, en castellano y sin un solo número romano. */
  simple: string;
  /** Lo mismo con nombres: grados, cadencias, pivotes. */
  tecnica: string;
  acordes: AcordeAnalizado[];
}

export interface ArmoniaDePieza {
  slug: string;
  /** El cuento entero de la pieza, en tres o cuatro renglones. */
  simple: string;
  tecnica: string;
  frases: FraseArmonica[];
  /** Lo que es interpretación y conviene preguntarle al profe. */
  revisar?: string;
}

/** Un acorde con todo lo que se deduce de él. */
export interface AcordeLeido {
  compas: number;
  /** En tiempos desde el arranque del compás: 0 es el primero. */
  desde: number;
  /** Cuántos tiempos dura. */
  dura: number;
  cifrado: string;
  /** El cifrado en castellano: "Re7/Fa♯". */
  nombre: string;
  romano: string;
  funcion: Funcion;
  secundario: boolean;
  root: number;
  quality: ChordQuality;
  /** La clase de altura del bajo. */
  bajo: number;
  en: Tonalidad;
}

const mismaTonalidad = (a: Tonalidad, b: Tonalidad) => a.tonica === b.tonica && a.modo === b.modo;

/** "Sol menor", "Si♭ mayor". */
export function nombreDeTonalidad(t: Tonalidad): string {
  return `${escribirNota(raizEscrita(t.tonica))} ${t.modo}`;
}

/** La fundamental del grado `g` en la tonalidad `t`. */
export const raizDeGrado = (t: Tonalidad, g: number) => mod12(t.tonica + ESCALA[t.modo][g]);

/** "IV", "IVm", "VII°", "V7": el grado con la calidad pegada, como lo escribe Quique. */
function romanoDe(grado: number, q: ChordQuality | string): string {
  const id = typeof q === "string" ? q : q.id;
  const r = ROMANOS[grado];
  const sufijo: Record<string, string> = {
    maj: "",
    min: "m",
    dim: "°",
    aug: "+",
    dom7: "7",
    min7: "m7",
    maj7: "maj7",
    m7b5: "ø",
    dim7: "°7",
  };
  return r + (sufijo[id] ?? "");
}

/** Un cifrado inglés a castellano: "D7/F#" → "Re7/Fa♯". */
function cifradoEnCastellano(root: number, q: ChordQuality, bajo: number, conBarra: boolean): string {
  const nombre = `${escribirNota(raizEscrita(root))}${q.suffix}`;
  return conBarra ? `${nombre}/${escribirNota(raizEscrita(bajo))}` : nombre;
}

/**
 * Lee un acorde del análisis contra su tonalidad. Tira si el cifrado no se
 * entiende o si su fundamental no es la del grado que dice ser: eso es un
 * error del dato, y mejor enterarse en el build que mostrarlo pintado mal.
 */
export function leerAcorde(a: AcordeAnalizado, frase: FraseArmonica): Omit<AcordeLeido, "desde" | "dura"> {
  const en = a.en ?? frase.en;
  const leido = parseCifradoConBajo(a.cifrado);
  if (!leido) throw new Error(`No entiendo el cifrado "${a.cifrado}" del compás ${a.compas}`);
  const { chord, inversion } = leido;
  const bajo = mod12(chord.root + intervalsOf(chord.quality)[inversion]);

  let romano: string;
  let funcion: Funcion;
  if (a.dominanteDe !== undefined) {
    const destino = raizDeGrado(en, a.dominanteDe);
    if (mod12(destino + 7) !== chord.root) {
      throw new Error(`${a.cifrado} (compás ${a.compas}) no es el dominante del grado ${a.dominanteDe} de ${nombreDeTonalidad(en)}`);
    }
    romano = `${romanoDe(4, chord.quality)}/${romanoDe(a.dominanteDe, TRIADAS[en.modo][a.dominanteDe])}`;
    funcion = "dominante";
  } else {
    if (raizDeGrado(en, a.grado) !== chord.root) {
      throw new Error(`${a.cifrado} (compás ${a.compas}) no está sobre el grado ${a.grado} de ${nombreDeTonalidad(en)}`);
    }
    romano = romanoDe(a.grado, chord.quality);
    funcion = FUNCION_DE_GRADO[a.grado];
  }

  return {
    compas: a.compas,
    cifrado: a.cifrado,
    nombre: cifradoEnCastellano(chord.root, chord.quality, bajo, inversion > 0),
    romano,
    funcion,
    secundario: a.dominanteDe !== undefined,
    root: chord.root,
    quality: chord.quality,
    bajo,
    en,
  };
}

/** Los acordes de una frase con su duración en tiempos: cada uno dura hasta que entra el siguiente. */
export function acordesDeFrase(frase: FraseArmonica, tiemposPorCompas: number): AcordeLeido[] {
  const absoluto = (a: AcordeAnalizado) => (a.compas - 1) * tiemposPorCompas + ((a.tiempo ?? 1) - 1);
  const fin = frase.hasta * tiemposPorCompas;
  return frase.acordes.map((a, i) => {
    const t = absoluto(a);
    const siguiente = frase.acordes[i + 1];
    const hasta = siguiente ? absoluto(siguiente) : fin;
    return { ...leerAcorde(a, frase), desde: (a.tiempo ?? 1) - 1, dura: hasta - t };
  });
}

export interface CadenciaLeida {
  nombre: string;
  /** La versión de una línea, sin términos. */
  simple: string;
  /** Si cierra (reposo) o deja abierto (pregunta). */
  cierra: boolean;
}

/**
 * Cómo termina una frase, mirando sus dos últimos acordes. Es la lista de la
 * clase 3 (`CADENCIAS_CON_NOMBRE`) más la que la clase todavía no nombró y
 * esta pieza usa todo el tiempo: terminar en el V, que es una pregunta.
 */
export function cadenciaDe(acordes: AcordeLeido[]): CadenciaLeida | null {
  const ultimo = acordes[acordes.length - 1];
  const penultimo = acordes[acordes.length - 2];
  if (!ultimo) return null;
  const grado = (a: AcordeLeido) =>
    a.secundario ? null : ESCALA[a.en.modo].indexOf(mod12(a.root - a.en.tonica));
  const g = grado(ultimo);
  const gp = penultimo && mismaTonalidad(penultimo.en, ultimo.en) ? grado(penultimo) : null;
  if (g === 4) return { nombre: "Semicadencia", simple: "Queda colgada en la tensión: una pregunta.", cierra: false };
  if (g === 0 && gp === 4) return { nombre: "Cadencia auténtica", simple: "Tensión y casa: un punto final.", cierra: true };
  if (g === 0 && gp === 3) return { nombre: "Cadencia plagal", simple: "Vuelve a casa sin pasar por la tensión.", cierra: true };
  if (g === 5 && gp === 4) return { nombre: "Cadencia rota", simple: "Prometió la casa y aterrizó en otra.", cierra: false };
  return null;
}

/** Dónde se lee cada compás de la pieza, para revisar que el análisis la cubra entera. */
export function compasesDePieza(derecha: Voces, izquierda: Voces, compas: Compas): number {
  const largo = (v: Voces) =>
    Math.max(...vocesDe(v).map((voz) => voz.reduce((s, e) => s + duracionDeEvento(e), 0)));
  return Math.round(Math.max(largo(derecha), largo(izquierda)) / duracionDeCompas(compas));
}

/**
 * La nota más grave que suena en un instante —atacada ahí o tenida de antes—
 * de las dos manos juntas. Es contra lo que se chequea el bajo del análisis.
 */
export function bajoEn(
  derecha: Voces,
  izquierda: Voces,
  compas: Compas,
  numero: number,
  tiempo = 1,
): number | null {
  const largo = duracionDeCompas(compas);
  const instante = (numero - 1) * largo + ((tiempo - 1) * largo) / compas.numerador;
  let grave: number | null = null;
  for (const voz of [...vocesDe(derecha), ...vocesDe(izquierda)]) {
    let t = 0;
    for (const e of voz) {
      const d = duracionDeEvento(e);
      if (t <= instante + 1e-6 && instante < t + d - 1e-6) {
        for (const m of e.midis) if (grave === null || m < grave) grave = m;
      }
      t += d;
    }
  }
  return grave;
}

/** Cuánta tensión es cada función, para la curva: 0 la casa, 2 lo que pide volver. */
export const NIVEL: Record<Funcion, number> = { reposo: 0, subdominante: 1, dominante: 2 };
