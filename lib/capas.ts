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
  /**
   * Las teclas con que se nombra el acorde, si las manos no lo tocan entero:
   * la izquierda de la Oda toca Do y Sol, y el Mi lo pone la melodía. Sólo
   * para nombrarlo; lo que suena y se dibuja son las dos manos.
   */
  acorde?: Pitch[];
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
  /**
   * Los acentos corchea por corchea, si no son los de `grupos`: un tramo que
   * arranca en el medio del compás de la partitura (el segundo acorde de un
   * compás del Canon cae en el tiempo 3) no arranca fuerte (#12).
   */
  acentos?: Acento[];
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

/** Los acentos con que suena y se dibuja un compás de capa: los suyos, o los de sus grupos. */
export const acentosDeCompas = (c: CompasDeCapa): Acento[] => c.acentos ?? acentosDeGrupos(c.grupos);

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
  const a = identificarAcorde(v.acorde ?? teclasDeVoicing(v));
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
  const k = compasAnterior(compases, i);
  return k === null ? null : compases[k].voicing!;
}

/** El índice del compás de `voicingAnterior`: el último con otro acorde, dando la vuelta. */
function compasAnterior(compases: readonly CompasDeCapa[], i: number): number | null {
  const actual = compases[i]?.voicing;
  if (!actual) return null;
  for (let k = 1; k < compases.length; k++) {
    const j = (i - k + compases.length) % compases.length;
    const v = compases[j].voicing;
    if (v && v !== actual) return j;
  }
  return null;
}

/** Lo que una mano tiene apretado en la corchea `c` del compás. */
const manoEn = (compas: CompasDeCapa, c: number, mano: Mano) =>
  sonandoEn(compas, c).filter((e) => e.mano === mano).flatMap((e) => e.teclas);

/**
 * Las teclas que se quedan al entrar al compás `i`: las que la mano tenía
 * apretadas al terminar el compás anterior y vuelve a apretar al empezar éste.
 * Mirando sólo los voicings alcanzaba mientras la derecha tocaba su acorde;
 * la escalera no tiene acorde en la derecha (lo sostiene la izquierda), así
 * que del Mi7 entra por el Mi5 y al Re le deja el La4, y comparando voicings
 * no se marcaba ninguna de las dos (#9).
 *
 * La izquierda cuenta sólo cuando toca acordes de los dos lados: en Here
 * Comes the Sun va a las fundamentales y salta igual, pero en la Oda deja el
 * Sol quieto de Do a Sol, y eso es lo que hay que ver (#11).
 */
function quedanAlEntrar(compases: readonly CompasDeCapa[], i: number, mano: Mano): Pitch[] {
  const k = compasAnterior(compases, i);
  if (k === null) return [];
  const antes = compases[k];
  if (mano === "izq" && [antes, compases[i]].some((c) => (c.voicing?.izquierda.length ?? 0) < 2)) return [];
  const alTerminar = manoEn(antes, corcheasDe(antes.grupos) - 1, mano);
  return manoEn(compases[i], 0, mano).filter((p) => alTerminar.includes(p));
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
 * teclas que se quedan al llegar del compás anterior. Vive acá y no en el
 * componente para que `test:canciones` lo pruebe contra la vuelta.
 */
export function teclasDelCompas(compases: readonly CompasDeCapa[], i: number, corchea: number | null): TeclaDeCapa[] {
  const actual = compases[i];
  const v = actual?.voicing;
  if (!v) return [];
  const quedan = quedanAlEntrar(compases, i, "der");
  const quedanIzq = quedanAlEntrar(compases, i, "izq");
  const suenan = new Set(corchea === null ? teclasDeVoicing(v) : sonandoEn(actual, corchea).flatMap((e) => e.teclas));
  const out: TeclaDeCapa[] = v.izquierda.map((p) => ({ pitch: p, mano: "izq", suena: suenan.has(p), queda: quedanIzq.includes(p) }));
  // Lo que la derecha va a tocar en el compás también se ve apagado: la escalera entera, las vecinas de la tercera.
  const camino = actual.eventos.filter((e) => e.mano === "der").flatMap((e) => e.teclas);
  const derecha = new Set([...v.derecha, ...camino, ...[...suenan].filter((p) => !v.izquierda.includes(p))]);
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

/** Un grado de la escala mayor (1 a 8, el 8 es la tónica de arriba) y cuántas corcheas dura. */
export type PasoDeEscalera = [grado: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, corcheas: number];

/** La tecla del grado en la escala mayor que arranca en `tonica`: el 5 de La4 es Mi5. */
export const notaDeLaEscala = (tonica: Pitch, grado: PasoDeEscalera[0]): Pitch =>
  grado === 8 ? tonica + 12 : tonica + MAYOR[grado - 1];

/**
 * Un compás de la escalera: la izquierda sostiene el acorde entero todo el
 * compás y la derecha baja (o sube) por los grados de la escala mayor de
 * `tonica`, una tecla por paso. Es la respuesta del riff: por grados conjuntos
 * hasta caer en la tónica, con el acorde quieto abajo.
 */
export function compasDeEscalera(v: Voicing, tonica: Pitch, pasos: PasoDeEscalera[], etiqueta?: string): CompasDeCapa {
  const total = pasos.reduce((s, [, d]) => s + d, 0);
  const eventos: Evento[] = [{ t: 0, dur: total, teclas: v.izquierda, mano: "izq" }];
  let t = 0;
  for (const [grado, dur] of pasos) {
    eventos.push({ t, dur, teclas: [notaDeLaEscala(tonica, grado)], mano: "der" });
    t += dur;
  }
  const grupos = Array.from({ length: Math.round(total / 2) }, () => 2);
  return { grupos, eventos, voicing: v, etiqueta: etiqueta ?? cifradoDeVoicing(v) };
}

/** Las manos que tienen alguna tecla en los compases, derecha primero (como se dibujan en el celular). */
export const manosDeCompases = (compases: CompasDeCapa[]): Mano[] =>
  (["der", "izq"] as const).filter((m) =>
    compases.some((c) => c.eventos.some((e) => e.mano === m && e.teclas.length) || (m === "izq" ? c.voicing?.izquierda : c.voicing?.derecha)?.length),
  );

/**
 * En el celular cada mano va en su teclado, y tiene que entrar entera: 390 px
 * de pantalla dejan ~292 de teclado. Con blancas de 18 px entran 16, que es
 * lo que pide el arpegio del Canon (15) y sobra para Here Comes the Sun
 * (11). Es un teclado de mirar —las capas no se tocan en la pantalla—, así
 * que puede ser más angosto que el de apretar (#6, #11).
 */
export const ANCHO_DE_TECLADO_EN_CELULAR = 292;
export const BLANCA_MINIMA_EN_CELULAR = 18;

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
