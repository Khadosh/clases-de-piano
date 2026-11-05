/**
 * Una canción practicada por capas: lo que se puede deducir sin dibujar nada.
 *
 * Una capa es una lista de compases, y un compás es **sus grupos de corcheas**
 * (`[3, 3, 2]`) más lo que suena adentro. Con los grupos sale el metrónomo de
 * acentos irregulares —el primero del compás fuerte, el primero de cada grupo
 * medio, el resto débil—, que es `patronDe` de `lib/ritmo.ts` generalizado: un
 * 6/8 son los grupos `[3, 3]` y un 4/4 en corcheas son `[2, 2, 2, 2]`.
 *
 * Todo se cuenta en corcheas y nada en segundos: el tempo lo pone el
 * reproductor, y por eso bajar al 50 % no toca los datos.
 *
 * Puro a propósito, como el resto de `lib/`: `test:canciones` lo prueba sin
 * levantar nada.
 */

import { chordSymbol, identificarAcorde, mod12, type Pitch } from "./music.ts";
import { FUNCION_DE_GRADO, type Funcion } from "./grados.ts";
import type { Acento } from "./ritmo.ts";

export type Mano = "izq" | "der";

/** Un acorde tal como se apoya: la izquierda y la derecha por separado. */
export interface Voicing {
  izquierda: Pitch[];
  derecha: Pitch[];
}

/** Algo que suena: `t` y `dur` en corcheas desde el arranque del compás. */
export interface Evento {
  t: number;
  dur: number;
  teclas: Pitch[];
  mano: Mano;
}

export interface CompasDeCapa {
  grupos: number[];
  eventos: Evento[];
  /** El acorde de fondo: se dibuja apagado y decide qué teclas son "las que se quedan". */
  voicing?: Voicing;
  /** Para mostrar arriba del teclado: el cifrado, la sección. */
  etiqueta?: string;
}

// ---------------------------------------------------------------------------
// Los acentos
// ---------------------------------------------------------------------------

export const corcheasDe = (grupos: readonly number[]) => grupos.reduce((s, g) => s + g, 0);

/** El compás corchea por corchea: fuerte la primera, medio cada arranque de grupo, débil el resto. */
export function acentosDeGrupos(grupos: readonly number[]): Acento[] {
  const out: Acento[] = [];
  grupos.forEach((g, i) => {
    for (let p = 0; p < g; p++) out.push(p > 0 ? "debil" : i === 0 ? "fuerte" : "medio");
  });
  return out;
}

/** Lo que se dice en voz alta: 1 2 3 1 2 3 1 2. */
export const cuentaDeGrupos = (grupos: readonly number[]): number[] =>
  grupos.flatMap((g) => Array.from({ length: g }, (_, p) => p + 1));

/** "3+3+2". */
export const textoDeGrupos = (grupos: readonly number[]) => grupos.join("+");

/** Al revés, para el editor: "3+3+2" → [3, 3, 2]. Null si no es una lista de 1 a 9. */
export function leerGrupos(texto: string): number[] | null {
  const partes = texto.split("+").map((s) => s.trim());
  if (!partes.length || partes.some((p) => !/^[1-9]$/.test(p))) return null;
  return partes.map(Number);
}

/** Un compás de puro metrónomo, sin notas: lo que pide el puente antes de ponerle acordes. */
export const compasVacio = (grupos: number[]): CompasDeCapa => ({ grupos, eventos: [] });

// ---------------------------------------------------------------------------
// Los acordes
// ---------------------------------------------------------------------------

export const teclasDeVoicing = (v: Voicing) => [...v.izquierda, ...v.derecha];

export function identificarVoicing(v: Voicing) {
  const a = identificarAcorde(teclasDeVoicing(v));
  if (!a) throw new Error(`el voicing ${teclasDeVoicing(v).join(" ")} no es un acorde con nombre`);
  return a;
}

export const cifradoDeVoicing = (v: Voicing) => {
  const a = identificarVoicing(v);
  return chordSymbol(a.root, a.quality);
};

/**
 * Las teclas que el dedo no suelta al pasar de un acorde al siguiente.
 *
 * Es la misma tecla, no la misma nota en otra octava: lo que se marca es "este
 * dedo se queda", que es lo que hace que un voicing de notas comunes se toque
 * sin mover la mano. Sólo la derecha: la izquierda va a las fundamentales y
 * salta igual.
 */
export function teclasQueSeQuedan(antes: Voicing | null | undefined, ahora: Voicing): Pitch[] {
  if (!antes) return [];
  return ahora.derecha.filter((p) => antes.derecha.includes(p));
}

/**
 * El acorde contra el que se marcan las teclas que se quedan en el compás `i`:
 * el último *distinto* yendo para atrás, dando la vuelta. En la vuelta de la
 * estrofa (La · Re · Mi7 · La) el primer La viene del La del final, y
 * comparado con ése no se movía nada y no se marcaba nada: justo el acorde que
 * se ve parado y el primero del loop. Lo que importa es desde dónde llegó la
 * mano la última vez que cambió, y ése es el Mi7.
 */
export function voicingAnterior(compases: readonly CompasDeCapa[], i: number): Voicing | null {
  const actual = compases[i]?.voicing;
  if (!actual) return null;
  for (let k = 1; k < compases.length; k++) {
    const v = compases[(i - k + compases.length) % compases.length].voicing;
    if (v && v !== actual) return v;
  }
  return null;
}

/**
 * Lo que va pegado a la cuenta: el cifrado del acorde y nada más. No la
 * `etiqueta`, que en la capa de todo junto trae la sección («Estrofa
 * (contenida) · A») y en el celular aplastaba los casilleros de la cuenta.
 */
export const cifradoDeCompas = (c: CompasDeCapa): string | null => (c.voicing ? cifradoDeVoicing(c.voicing) : null);

/** Una tecla del teclado de una capa: de qué mano es, si suena ahora y si es la que se quedó del acorde anterior. */
export interface TeclaDeCapa {
  pitch: Pitch;
  mano: Mano;
  suena: boolean;
  queda: boolean;
}

/**
 * Lo que dibuja el teclado en el compás `i`: el acorde de fondo, lo que suena
 * en la corchea `corchea` (o todo el acorde si está parado, `null`) y las
 * teclas que se quedan contra `voicingAnterior`. Vive acá y no en el
 * componente para que `test:canciones` lo pruebe contra la vuelta.
 */
export function teclasDelCompas(compases: readonly CompasDeCapa[], i: number, corchea: number | null): TeclaDeCapa[] {
  const actual = compases[i];
  const v = actual?.voicing;
  if (!v) return [];
  const quedan = teclasQueSeQuedan(voicingAnterior(compases, i), v);
  const suenan = new Set(corchea === null ? teclasDeVoicing(v) : sonandoEn(actual, corchea).flatMap((e) => e.teclas));
  const out: TeclaDeCapa[] = v.izquierda.map((p) => ({ pitch: p, mano: "izq", suena: suenan.has(p), queda: false }));
  const derecha = new Set([...v.derecha, ...[...suenan].filter((p) => !v.izquierda.includes(p))]);
  for (const p of derecha) out.push({ pitch: p, mano: "der", suena: suenan.has(p), queda: quedan.includes(p) });
  return out;
}

/** Los grados con su bemol, como se escriben en un análisis: ♭III, ♭VII. */
const ROMANOS: Record<number, { grado: number; texto: string }> = {
  0: { grado: 0, texto: "I" },
  1: { grado: 1, texto: "♭II" },
  2: { grado: 1, texto: "II" },
  3: { grado: 2, texto: "♭III" },
  4: { grado: 2, texto: "III" },
  5: { grado: 3, texto: "IV" },
  6: { grado: 4, texto: "♭V" },
  7: { grado: 4, texto: "V" },
  8: { grado: 5, texto: "♭VI" },
  9: { grado: 5, texto: "VI" },
  10: { grado: 6, texto: "♭VII" },
  11: { grado: 6, texto: "VII" },
};
const MAYOR = [0, 2, 4, 5, 7, 9, 11];

export interface GradoLeido {
  romano: string;
  /** La función la pone el grado, no el préstamo: el ♭VII sigue siendo un VII. */
  funcion: Funcion;
  /** La fundamental no está en la escala mayor: viene de la menor paralela. */
  prestado: boolean;
}

/** Qué grado es un voicing en una tonalidad mayor, con su función y si es prestado. */
export function gradoEnMayor(v: Voicing, tonica: number): GradoLeido {
  const a = identificarVoicing(v);
  const dist = mod12(a.root - tonica);
  const { grado, texto } = ROMANOS[dist];
  const menor = a.quality.stack[0] === 3;
  const septima = a.quality.stack.length < 3 ? "" : a.quality.id === "dom7" ? "7" : a.quality.suffix.replace(/^m(?!aj)/, "");
  return {
    romano: `${menor ? texto.toLowerCase() : texto}${septima}`,
    funcion: FUNCION_DE_GRADO[grado],
    prestado: !MAYOR.includes(dist),
  };
}

/** Cuántos semitonos sube la fundamental de un acorde al siguiente (0 a 11). */
export const saltoDeFundamental = (a: Voicing, b: Voicing) =>
  mod12(identificarVoicing(b).root - identificarVoicing(a).root);

// ---------------------------------------------------------------------------
// Las capas
// ---------------------------------------------------------------------------

/** El acorde plantado en cada grupo: la izquierda tiene todo el compás, la derecha golpea en cada arranque. */
export function plaque(v: Voicing, grupos: number[], etiqueta?: string): CompasDeCapa {
  const eventos: Evento[] = [{ t: 0, dur: corcheasDe(grupos), teclas: v.izquierda, mano: "izq" }];
  let t = 0;
  for (const g of grupos) {
    eventos.push({ t, dur: g, teclas: v.derecha, mano: "der" });
    t += g;
  }
  return { grupos, eventos, voicing: v, etiqueta: etiqueta ?? cifradoDeVoicing(v) };
}

/** La tercera del acorde en la derecha: la voz que se mueve en el riff. */
export function terceraEnLaDerecha(v: Voicing): Pitch {
  const { root } = identificarVoicing(v);
  const t = v.derecha.find((p) => [3, 4].includes(mod12(p - root)));
  if (t === undefined) throw new Error("el voicing no tiene la tercera en la derecha");
  return t;
}

/**
 * La 2ª, la 3ª o la 4ª del acorde, en la tecla vecina de la tercera: la 2ª
 * justo abajo, la 4ª justo arriba. Es lo que hace la guitarra con el acorde
 * quieto: el dedo de la tercera se va a un costado y vuelve.
 */
export function vecinaDeLaTercera(v: Voicing, grado: 2 | 3 | 4): Pitch {
  const tercera = terceraEnLaDerecha(v);
  const { root } = identificarVoicing(v);
  if (grado === 3) return tercera;
  if (grado === 2) return tercera - mod12(tercera - (root + 2));
  return tercera + mod12(root + 5 - tercera);
}

export type PasoDelRiff = [grado: 2 | 3 | 4, corcheas: number];

/**
 * Un compás del riff: la izquierda quieta en la fundamental, la derecha apoya
 * el acorde, sostiene todo menos la tercera, y la tercera camina por los
 * pasos. El primer paso es siempre la tercera, apoyada con el acorde.
 */
export function compasDeRiff(v: Voicing, pasos: PasoDelRiff[], etiqueta?: string): CompasDeCapa {
  const total = pasos.reduce((s, [, d]) => s + d, 0);
  const tercera = terceraEnLaDerecha(v);
  const quietas = v.derecha.filter((p) => p !== tercera);
  const eventos: Evento[] = [
    { t: 0, dur: total, teclas: v.izquierda, mano: "izq" },
    { t: 0, dur: total, teclas: quietas, mano: "der" },
  ];
  let t = 0;
  for (const [grado, dur] of pasos) {
    eventos.push({ t, dur, teclas: [vecinaDeLaTercera(v, grado)], mano: "der" });
    t += dur;
  }
  const grupos = Array.from({ length: Math.round(total / 2) }, () => 2);
  return { grupos, eventos, voicing: v, etiqueta: etiqueta ?? cifradoDeVoicing(v) };
}

/** Lo que suena en la corchea `c` del compás: para pintar el teclado. */
export const sonandoEn = (compas: CompasDeCapa, c: number) =>
  compas.eventos.filter((e) => e.t <= c && c < e.t + e.dur);

/** Lo que arranca en la corchea `c`: para agendar el sonido. */
export const arrancanEn = (compas: CompasDeCapa, c: number) => compas.eventos.filter((e) => e.t === c);

/**
 * El rango de teclado que necesitan los compases, justo: de la blanca de la
 * más grave a la blanca de la más aguda. Con `mano`, sólo las teclas de esa
 * mano: en el celular el teclado entero no entra (la izquierda en La2 y la
 * derecha arriba del La4 son tres octavas) y el que lo usa ve la derecha
 * cortada; partido en dos, cada mano entra entera.
 */
export function rangoDeCompases(compases: CompasDeCapa[], mano?: Mano): { from: Pitch; to: Pitch } {
  const todas = compases.flatMap((c) => [
    ...c.eventos.filter((e) => !mano || e.mano === mano).flatMap((e) => e.teclas),
    ...(c.voicing ? (mano === "izq" ? c.voicing.izquierda : mano === "der" ? c.voicing.derecha : teclasDeVoicing(c.voicing)) : []),
  ]);
  if (!todas.length) return { from: 48, to: 72 };
  const negra = (p: number) => [1, 3, 6, 8, 10].includes(mod12(p));
  let from = Math.min(...todas);
  if (negra(from)) from--;
  let to = Math.max(...todas);
  if (negra(to)) to++;
  return { from, to };
}
