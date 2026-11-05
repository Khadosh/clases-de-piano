/**
 * Analizar una canción con la lista del profe, en su orden: tonalidad, campo
 * armónico, armadura, quintas mayores (¿dominante o secundaria?), si lleva a
 * otro campo (modulación) y si hubo préstamo modal.
 *
 * Las preguntas viven acá una sola vez; las respuestas son datos de cada
 * canción (`analisis` en `content/canciones.ts`), y el tipo exige las seis.
 * Lo que se puede deducir no se escribe: el campo armónico y la armadura
 * salen de `lib/tonalidades.ts`, el grado de cada dominante de adónde cae
 * (`DOMINANTES`), y el préstamo de qué campo trae el acorde. La canción sólo
 * dice qué acordes mirar y lo explica.
 */

import { CHORD_QUALITIES, chordSymbol, escribirNota, mod12, type NotaEscrita } from "./music.ts";
import { armaduraDeTono, notasDeTono, signosDeArmadura, TONALIDADES, type Tono } from "./tonalidades.ts";
import { DOMINANTES, FUNCION_DE_GRADO, TONALIDAD_MAYOR, type Funcion } from "./grados.ts";
import { gradoEnMayor, identificarVoicing, teclasDeVoicing, type Voicing } from "./capas.ts";

export const PASOS_DEL_ANALISIS = [
  { clave: "tonalidad", pregunta: "Tonalidad" },
  { clave: "campo", pregunta: "Campo armónico" },
  { clave: "armadura", pregunta: "Armadura de clave" },
  {
    clave: "dominantes",
    pregunta: "Quintas mayores: ¿dominante o dominante secundaria?",
  },
  { clave: "otroCampo", pregunta: "¿Me lleva a otro campo armónico?" },
  { clave: "prestamo", pregunta: "¿Fue préstamo modal?" },
] as const;

export type ClaveDePaso = (typeof PASOS_DEL_ANALISIS)[number]["clave"];

export interface PasoDeAnalisis {
  /** La respuesta en una línea. */
  respuesta: string;
  /** En simple. Acepta *asteriscos*. */
  simple: string[];
  /** Detrás del botón, como la armonía de las partituras. */
  tecnica: string[];
  /** Si es la tarea de la clase: se destaca. */
  tarea?: boolean;
}

/** Las seis respuestas, todas obligatorias; tres traen además los acordes que miran. */
export type Analisis = { [K in ClaveDePaso]: PasoDeAnalisis } & {
  /** Los X7 de la canción: cada uno se lee por adónde cae. */
  dominantes: { acordes: Voicing[] };
  /** Lo que se afirma; `test:canciones` lo cruza con los destinos de los dominantes. */
  otroCampo: { modula: boolean };
  /** Los acordes que no son del campo. */
  prestamo: { acordes: Voicing[] };
};

/** La tonalidad mayor de una tónica, escrita con la armadura de menos signos (Re♭ y no Do♯). */
export function tonoMayorDe(tonica: number): Tono {
  const t = TONALIDADES.filter((x) => x.mayor.tonica.pc === mod12(tonica)).sort(
    (a, b) => Math.abs(a.armadura) - Math.abs(b.armadura),
  )[0];
  return t.mayor;
}

export interface AcordeDelCampo {
  /** El grado: ii, vii°. */
  romano: string;
  /** Como se dice: "Do♯m", "Sol♯°". */
  nombre: string;
  funcion: Funcion;
  /** Las tres teclas de la tríada arriba del La central, para que suene. */
  teclas: number[];
}

const SUFIJO: Record<string, string> = {
  maj: "",
  min: "m",
  dim: "°",
  aug: "+",
};

/**
 * El campo armónico: las tríadas apiladas con las notas de la propia escala.
 * La calidad sale de los intervalos, no de una tabla — por eso el séptimo
 * sale disminuido solo.
 */
export function campoArmonico(t: Tono): AcordeDelCampo[] {
  const notas = notasDeTono(t);
  return notas.map((raiz, i) => {
    const tercera = notas[(i + 2) % 7];
    const quinta = notas[(i + 4) % 7];
    const stack = [mod12(tercera.pc - raiz.pc), mod12(quinta.pc - tercera.pc)];
    const q = CHORD_QUALITIES.find((c) => c.stack.length === 2 && c.stack[0] === stack[0] && c.stack[1] === stack[1]);
    if (!q) throw new Error(`el grado ${i + 1} de ${escribirNota(t.tonica)} no apila una tríada conocida`);
    const grave = 57 + mod12(raiz.pc - 57);
    const romano = t.modo === "mayor" ? `${TONALIDAD_MAYOR[i].cifra}${q.id === "dim" ? "°" : ""}` : String(i + 1);
    return {
      romano,
      nombre: `${escribirNota(raiz)}${SUFIJO[q.id] ?? q.suffix}`,
      funcion: FUNCION_DE_GRADO[i],
      teclas: [grave, grave + stack[0], grave + stack[0] + stack[1]],
    };
  });
}

/** Los signos de la armadura, escritos y en el orden en que se dibujan. */
export function armaduraEscrita(t: Tono): NotaEscrita[] {
  return signosDeArmadura(armaduraDeTono(t));
}

export interface DominanteLeido {
  /** "V7" o "V7/V". */
  romano: string;
  /** El acorde, como se dice: "Si7". */
  nombre: string;
  /** Adónde cae: "Mi". */
  va: string;
  tipo: "principal" | "secundario" | "efectivo";
}

/**
 * Una quinta mayor (el X7, o la tríada mayor que hace de V) leída por adónde cae, cinco semitonos arriba: si cae en el I es el
 * dominante; si cae en otro grado del campo, secundario (V7 de ese grado);
 * si cae afuera, efectivo — lleva a otro campo armónico. Es la tabla de la
 * clase 5 (`DOMINANTES`, en Do) corrida a la tónica de la canción.
 */
export function leerDominante(v: Voicing, t: Tono): DominanteLeido {
  const a = identificarVoicing(v);
  if (a.quality.id !== "dom7" && a.quality.id !== "maj") throw new Error(`${a.quality.id} no es una quinta mayor`);
  // La tríada mayor hace de dominante igual (el La del Canon, el Sol de la Oda): se lee igual, sin el 7.
  const siete = a.quality.id === "dom7" ? "7" : "";
  const d = DOMINANTES.find((x) => x.raiz === mod12(a.root - t.tonica.pc));
  const notas = notasDeTono(t);
  const escrita = (pc: number) => notas.find((n) => n.pc === pc);
  const nombreRaiz = escrita(a.root);
  const destino = mod12(a.root + 5);
  const nombreDestino = escrita(destino);
  if (!d || !nombreRaiz || !nombreDestino) {
    // El X7 sobre una nota que la escala no tiene: lleva afuera.
    return {
      romano: `V${siete}/afuera`,
      nombre: chordSymbol(a.root, a.quality),
      va: chordSymbol(destino, a.quality),
      tipo: "efectivo",
    };
  }
  const romano =
    d.tipo === "principal" ? `V${siete}` : d.destino === null ? `V${siete}/afuera` : `V${siete}/${TONALIDAD_MAYOR[d.destino].cifra}`;
  return {
    romano,
    nombre: `${escribirNota(nombreRaiz)}${siete}`,
    va: escribirNota(nombreDestino),
    tipo: d.tipo,
  };
}

export interface PrestamoLeido {
  /** "♭III". */
  romano: string;
  /** "Do". */
  nombre: string;
  /** De qué campo viene: la menor paralela si sus tríadas lo tienen, si no null. */
  de: Tono | null;
}

/** La menor que comparte la tónica: el campo de donde salen los préstamos más comunes. */
export const menorParalela = (t: Tono): Tono => ({
  tonica: t.tonica,
  modo: "menor",
});

/**
 * Un acorde de afuera, con su grado (la función la pone el grado) y de qué
 * campo viene: se busca entre las tríadas de la menor paralela, apiladas
 * igual que las del campo propio.
 */
export function leerPrestamo(v: Voicing, t: Tono): PrestamoLeido {
  const a = identificarVoicing(v);
  const g = gradoEnMayor(v, t.tonica.pc);
  const paralela = menorParalela(t);
  const notas = notasDeTono(paralela);
  const i = notas.findIndex((n) => n.pc === mod12(a.root));
  const campo = campoArmonico(paralela);
  const clases = (ps: number[]) => [...new Set(ps.map(mod12))].sort((x, y) => x - y).join();
  const mismo = i >= 0 && clases(campo[i].teclas) === clases(teclasDeVoicing(v));
  const nombre =
    i >= 0 ? `${escribirNota(notas[i])}${SUFIJO[a.quality.id] ?? a.quality.suffix}` : chordSymbol(a.root, a.quality);
  return { romano: g.romano, nombre, de: mismo ? paralela : null };
}
