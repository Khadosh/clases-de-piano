/**
 * Las texturas: cómo se entrelazan las notas de un acorde en el tiempo.
 *
 * La clase 7 dio dos listas. Los cuatro tipos de textura de la música en
 * general —monofonía, melodía acompañada, homofonía, polifonía—, que acá se
 * escuchan sobre **la misma frase** vestida de las cuatro maneras, y las tres
 * texturas del piano —plaqué, pum-chá, arpegios—, que son tres formas de tocar
 * el mismo acorde a lo largo de un compás.
 *
 * Todo se calcula de la receta del acorde: no hay un patrón grabado por
 * acorde ni por tonalidad. Sin React ni audio: `npm run test:texturas`.
 */

import { chordPitches, intervalsOf, mod12, qualityById, type ChordQuality, type Pitch, type PitchClass } from "./music.ts";

export type Mano = "izquierda" | "derecha";

/** Una cosa que suena: en qué pulso arranca (0 = el primero del compás), cuánto dura, y qué teclas. */
export interface Evento {
  t: number;
  dur: number;
  pitches: Pitch[];
  mano: Mano;
}

// ---------------------------------------------------------------------------
// Las texturas del piano: el mismo acorde, un compás, tres maneras
// ---------------------------------------------------------------------------

export type TexturaPiano = "plaque" | "pum-cha" | "arpegio" | "arpegio-intercalado";

export const TEXTURAS_PIANO: { id: TexturaPiano; nombre: string; bajada: string }[] = [
  {
    id: "plaque",
    nombre: "Plaqué",
    bajada: "El acorde planchado: se toca entero y se deja sonando hasta el que viene.",
  },
  {
    id: "pum-cha",
    nombre: "Pum-chá",
    bajada: "El bajo en la fundamental —pum— y el acorde en la derecha, girado y a contratiempo —chá.",
  },
  {
    id: "arpegio",
    nombre: "Arpegio",
    bajada: "Las notas del acorde de a una, 1 · 5 · 3 · 7 (u 8, si no hay séptima), subiendo de una mano a la otra.",
  },
  {
    id: "arpegio-intercalado",
    nombre: "Arpegio intercalado",
    bajada: "El mismo 1 · 5 · 3 · 7 pero alternando las manos: la izquierda pone una, la derecha la que sigue.",
  },
];

/** El acorde repartido para tocarlo: el bajo solo, y el resto en la derecha. */
export interface AcordeRepartido {
  root: PitchClass;
  quality: ChordQuality;
  /** La fundamental sola, grave: lo que hace "pum". */
  bajo: Pitch;
  /** El acorde girado para caer cerca del Do central: lo que hace "chá". */
  derecha: Pitch[];
}

/**
 * Reparte un acorde para las texturas: el bajo entre Do2 y Sol2 (la
 * fundamental que le toca, grave), y arriba el acorde completo girado hasta
 * que su nota más grave caiga entre Sol3 y Fa4, que es donde la derecha
 * suena llena sin tapar al bajo.
 */
export function repartir(root: PitchClass, quality: ChordQuality): AcordeRepartido {
  const bajo = 36 + (root <= 7 ? root : root - 12);
  let derecha = chordPitches(48 + root, quality);
  while (Math.min(...derecha) < 55) derecha = [...derecha.slice(1), derecha[0] + 12];
  while (Math.min(...derecha) > 65) derecha = [derecha[derecha.length - 1] - 12, ...derecha.slice(0, -1)];
  return { root, quality, bajo, derecha };
}

/** Los grados del arpegio de la clase, en orden: 1, 5, 3 y la 7 — o la octava si no hay séptima. */
export function gradosDelArpegio(quality: ChordQuality): Pitch[] {
  const ivs = intervalsOf(quality);
  const septima = ivs.length >= 4 ? ivs[3] : 12;
  return [ivs[0], ivs[2], ivs[1], septima];
}

/**
 * Un compás de una textura sobre un acorde, en pulsos de negra.
 *
 * - **plaqué**: todo junto en el primer pulso y hasta el final del compás.
 * - **pum-chá**: en los pulsos impares el bajo, en los pares el acorde de la
 *   derecha. Cuatro pulsos son pum chá pum chá.
 * - **arpegio**: corcheas 1 · 5 · 3 · 7 en la izquierda desde el bajo, y el
 *   mismo dibujo una octava arriba en la derecha; sube de una mano a la otra.
 * - **arpegio intercalado**: las mismas corcheas alternando las manos: 1 en
 *   la izquierda, 5 en la derecha (una octava arriba), 3 en la izquierda…
 */
export function compasDe(textura: TexturaPiano, acorde: AcordeRepartido, pulsos = 4): Evento[] {
  const { bajo, derecha, quality } = acorde;
  switch (textura) {
    case "plaque":
      return [
        { t: 0, dur: pulsos, pitches: [bajo], mano: "izquierda" },
        { t: 0, dur: pulsos, pitches: derecha, mano: "derecha" },
      ];
    case "pum-cha": {
      const out: Evento[] = [];
      for (let p = 0; p < pulsos; p++) {
        out.push(
          p % 2 === 0
            ? { t: p, dur: 1, pitches: [bajo], mano: "izquierda" }
            : { t: p, dur: 1, pitches: derecha, mano: "derecha" },
        );
      }
      return out;
    }
    case "arpegio": {
      const grados = gradosDelArpegio(quality);
      const corchea = pulsos / 8;
      const out: Evento[] = [];
      // La mitad de abajo, desde el bajo mismo; la de arriba, una octava más.
      grados.forEach((iv, i) => {
        out.push({ t: i * corchea, dur: corchea, pitches: [bajo + iv], mano: "izquierda" });
      });
      grados.forEach((iv, i) => {
        out.push({ t: (4 + i) * corchea, dur: corchea, pitches: [bajo + 12 + iv], mano: "derecha" });
      });
      return out;
    }
    case "arpegio-intercalado": {
      const grados = gradosDelArpegio(quality);
      const corchea = pulsos / 8;
      const out: Evento[] = [];
      for (let i = 0; i < 8; i++) {
        const iv = grados[i % 4];
        const izquierda = i % 2 === 0;
        out.push({
          t: i * corchea,
          dur: corchea,
          pitches: [bajo + iv + (izquierda ? 0 : 12)],
          mano: izquierda ? "izquierda" : "derecha",
        });
      }
      return out;
    }
    default: {
      const _agotado: never = textura;
      return _agotado;
    }
  }
}

// ---------------------------------------------------------------------------
// Los cuatro tipos de textura: una frase, cuatro maneras de vestirla
// ---------------------------------------------------------------------------

export type TipoDeTextura = "monofonia" | "melodia-acompanada" | "homofonia" | "polifonia";

export const TIPOS_DE_TEXTURA: { id: TipoDeTextura; nombre: string; bajada: string; quien: string }[] = [
  {
    id: "monofonia",
    nombre: "Monofonía",
    bajada: "Una sola línea melódica, sin acompañamiento. Si hay más instrumentos, hacen todos lo mismo.",
    quien: "El canto llano, un coro al unísono, una guitarra sola tocando la melodía.",
  },
  {
    id: "melodia-acompanada",
    nombre: "Melodía acompañada",
    bajada: "Una melodía y, debajo, acordes que la sostienen. Es lo que se escucha casi siempre.",
    quien: "Cualquier canción: la voz arriba y la guitarra o el piano abajo.",
  },
  {
    id: "homofonia",
    nombre: "Homofonía",
    bajada: "Dos o más líneas que se mueven a la vez, con el mismo ritmo. La de arriba es la principal.",
    quien: "Un coral, un himno a cuatro voces: todos cambian de nota al mismo tiempo.",
  },
  {
    id: "polifonia",
    nombre: "Polifonía",
    bajada: "Varias líneas melódicas independientes que suenan a la vez, cada una con su ritmo.",
    quien: "Bach, y Chopin cuando la izquierda canta lo suyo mientras la derecha canta otra cosa.",
  },
];

/** Una nota de la frase: pulso desde el arranque de su compás, duración y tecla. */
export interface NotaDeFrase {
  compas: number;
  t: number;
  dur: number;
  pitch: Pitch;
}

/** Un compás de la frase: qué acorde lo sostiene. */
export interface CompasDeFrase {
  root: PitchClass;
  quality: ChordQuality;
}

/**
 * La frase de ejemplo: cuatro compases en Do mayor sobre C · F · G7 · C. Es
 * nuestra, escrita para esto, y sencilla a propósito: en los pulsos fuertes
 * cae una nota del acorde y las demás caminan por grado conjunto, que son las
 * reglas de las clases 3 y 4.
 */
export const FRASE_ACORDES: CompasDeFrase[] = [
  { root: 0, quality: qualityById("maj")! },
  { root: 5, quality: qualityById("maj")! },
  { root: 7, quality: qualityById("dom7")! },
  { root: 0, quality: qualityById("maj")! },
];

export const FRASE_MELODIA: NotaDeFrase[] = [
  { compas: 0, t: 0, dur: 1, pitch: 64 },
  { compas: 0, t: 1, dur: 1, pitch: 62 },
  { compas: 0, t: 2, dur: 1, pitch: 60 },
  { compas: 0, t: 3, dur: 1, pitch: 62 },
  { compas: 1, t: 0, dur: 1, pitch: 65 },
  { compas: 1, t: 1, dur: 1, pitch: 69 },
  { compas: 1, t: 2, dur: 2, pitch: 65 },
  { compas: 2, t: 0, dur: 1, pitch: 62 },
  { compas: 2, t: 1, dur: 1, pitch: 64 },
  { compas: 2, t: 2, dur: 1, pitch: 65 },
  { compas: 2, t: 3, dur: 1, pitch: 62 },
  { compas: 3, t: 0, dur: 2, pitch: 64 },
  { compas: 3, t: 2, dur: 2, pitch: 60 },
];

/**
 * La segunda voz de la polifonía: una línea de la izquierda con su propio
 * ritmo, escrita a mano. En los pulsos 1 y 3 cae una nota del acorde del
 * compás (`test:texturas` lo clava) y en el medio camina.
 */
export const FRASE_CONTRAVOZ: NotaDeFrase[] = [
  { compas: 0, t: 0, dur: 1, pitch: 48 },
  { compas: 0, t: 1, dur: 0.5, pitch: 52 },
  { compas: 0, t: 1.5, dur: 0.5, pitch: 55 },
  { compas: 0, t: 2, dur: 1, pitch: 52 },
  { compas: 0, t: 3, dur: 0.5, pitch: 50 },
  { compas: 0, t: 3.5, dur: 0.5, pitch: 52 },
  { compas: 1, t: 0, dur: 0.5, pitch: 53 },
  { compas: 1, t: 0.5, dur: 0.5, pitch: 57 },
  { compas: 1, t: 1, dur: 1, pitch: 60 },
  { compas: 1, t: 2, dur: 0.5, pitch: 57 },
  { compas: 1, t: 2.5, dur: 0.5, pitch: 53 },
  { compas: 1, t: 3, dur: 1, pitch: 55 },
  { compas: 2, t: 0, dur: 1, pitch: 55 },
  { compas: 2, t: 1, dur: 0.5, pitch: 59 },
  { compas: 2, t: 1.5, dur: 0.5, pitch: 62 },
  { compas: 2, t: 2, dur: 1, pitch: 65 },
  { compas: 2, t: 3, dur: 0.5, pitch: 62 },
  { compas: 2, t: 3.5, dur: 0.5, pitch: 59 },
  { compas: 3, t: 0, dur: 0.5, pitch: 48 },
  { compas: 3, t: 0.5, dur: 0.5, pitch: 52 },
  { compas: 3, t: 1, dur: 1, pitch: 55 },
  { compas: 3, t: 2, dur: 2, pitch: 60 },
];

export const PULSOS_DE_FRASE = 4;

/** Las clases de altura de un acorde de la frase. */
const clasesDe = (c: CompasDeFrase) => new Set(chordPitches(c.root, c.quality).map(mod12));

/**
 * Las `n` notas del acorde que caen justo debajo de una tecla, de la más
 * cercana para abajo. Es con lo que la homofonía arma cada columna: la
 * melodía arriba y, pegadas, las voces que se mueven con ella.
 */
export function vocesDebajo(pitch: Pitch, acorde: CompasDeFrase, n: number): Pitch[] {
  const clases = clasesDe(acorde);
  const out: Pitch[] = [];
  for (let p = pitch - 1; out.length < n && p > pitch - 24; p--) {
    if (clases.has(mod12(p))) out.push(p);
  }
  return out;
}

/** Un evento por nota, con el compás sumado al tiempo para que sea una sola lista. */
const eventosDe = (notas: NotaDeFrase[], mano: Mano, corrimiento = 0): Evento[] =>
  notas.map((n) => ({
    t: n.compas * PULSOS_DE_FRASE + n.t,
    dur: n.dur,
    pitches: [n.pitch + corrimiento],
    mano,
  }));

/**
 * La frase vestida de cada textura. En las cuatro la melodía está tal cual,
 * en la derecha: lo que cambia es todo lo demás.
 */
export function vestir(tipo: TipoDeTextura): Evento[] {
  const melodia = eventosDe(FRASE_MELODIA, "derecha");
  switch (tipo) {
    case "monofonia":
      // La misma línea, una octava abajo: dos manos haciendo lo mismo.
      return [...melodia, ...eventosDe(FRASE_MELODIA, "izquierda", -12)];
    case "melodia-acompanada":
      return [
        ...melodia,
        ...FRASE_ACORDES.map((c, i) => ({
          t: i * PULSOS_DE_FRASE,
          dur: PULSOS_DE_FRASE,
          pitches: chordPitches(48 + (c.root <= 7 ? c.root : c.root - 12), c.quality),
          mano: "izquierda" as const,
        })),
      ];
    case "homofonia":
      // Cada nota de la melodía baja con dos voces pegadas que se mueven igual.
      return FRASE_MELODIA.flatMap((n) => {
        const debajo = vocesDebajo(n.pitch, FRASE_ACORDES[n.compas], 2);
        const t = n.compas * PULSOS_DE_FRASE + n.t;
        return [
          { t, dur: n.dur, pitches: [n.pitch], mano: "derecha" as const },
          { t, dur: n.dur, pitches: debajo, mano: "izquierda" as const },
        ];
      });
    case "polifonia":
      return [...melodia, ...eventosDe(FRASE_CONTRAVOZ, "izquierda")];
    default: {
      const _agotado: never = tipo;
      return _agotado;
    }
  }
}
