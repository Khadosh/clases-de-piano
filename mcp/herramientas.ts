/**
 * Las herramientas del MCP de composición, sin MCP.
 *
 * Son funciones puras que envuelven el motor de `lib/` —el mismo que usa la
 * app— y devuelven objetos listos para serializar. Viven aparte del servidor
 * por la misma razón que `lib/` vive aparte de los componentes: se prueban
 * con `npm run test:mcp` sin levantar nada, y el día que el servidor sea
 * remoto en vez de stdio, esto no cambia.
 *
 * Todo lo musical se calcula acá adentro con `lib/`: ningún acorde, escala ni
 * tabla está escrito a mano en este archivo. Si el motor aprende algo, el MCP
 * lo aprende solo.
 */

import {
  CHORD_QUALITIES,
  LETRAS_EN,
  LETRAS_ES,
  LETRAS_PC,
  NOMBRES_INVERSION,
  cantidadDeInversiones,
  chordNameEs,
  chordPitches,
  chordSymbol,
  escribirNota,
  identificarAcorde,
  intervalsOf,
  invertir,
  mod12,
  nombreEnAcorde,
  noteNameWithOctave,
  notasDeAcorde,
  parseCifradoConBajo,
  qualityById,
  simboloConBajo,
  stackLabel,
  type Chord,
  type ChordQuality,
  type NotaEscrita,
  type Pitch,
  type PitchClass,
} from "../lib/music.ts";
import {
  CADENCIAS_CON_NOMBRE,
  DOMINANTES,
  FUNCIONES,
  FUNCION_DE_GRADO,
  GRADOS_MAYOR,
  PROGRESIONES,
  SUSTITUTOS_TRITONALES,
  TONALIDAD_MAYOR,
  cadenciaAlFinal,
  gradoDe,
  midisDelAcorde,
  rachaDeFuncion,
  raizDelAcorde,
  type AcordeDeLaSecuencia,
  type Funcion,
} from "../lib/grados.ts";
import { ESCALAS, escalaPorId, notasDeEscala, triadasDeEscala, cuatriadasDeEscala } from "../lib/escalas.ts";
import { recorridoOptimo, totalDelRecorrido, type Criterio } from "../lib/enlace.ts";
import { DISPOSICIONES, saltosEntreVecinas, nombreDeIntervalo, voicingModelo, type Disposicion } from "../lib/voicing.ts";
import { TEXTURAS_PIANO, compasDe, repartir, type Evento as EventoDeTextura, type TexturaPiano } from "../lib/texturas.ts";
import { componerMelodia, midiDeNota, sugerirGuias } from "../lib/melodia.ts";
import {
  TONALIDADES,
  armaduraDeTono,
  nombreDeTono,
  notasDeTono,
  relativaMayor,
  relativaMenor,
  signosDeArmadura,
  type Modo,
  type Tono,
} from "../lib/tonalidades.ts";
import type { Evento as EventoEscrito } from "../lib/pentagrama.ts";

// ---------------------------------------------------------------------------
// Leer lo que escribe el que pide: tónicas, cifrados, grados romanos
// ---------------------------------------------------------------------------

export class PedidoInvalido extends Error {}

const ALTERACIONES: Record<string, number> = { "#": 1, "♯": 1, s: 1, b: -1, "♭": -1 };

/**
 * "C", "F#", "Bb", "Do", "Fa♯", "Sib", "sol": una tónica escrita, con su
 * letra y su alteración, porque Fa♯ y Sol♭ no son la misma tonalidad aunque
 * sean la misma tecla.
 */
export function leerTonica(texto: string): NotaEscrita {
  const t = texto.trim();
  const m = /^(do|re|mi|fa|sol|la|si|[a-g])\s*([#♯sb♭]?)$/i.exec(t);
  if (!m) throw new PedidoInvalido(`No entiendo la tónica "${texto}". Probá con "C", "F#", "Bb", "Do", "Fa♯" o "Si♭".`);
  const nombre = m[1].toLowerCase();
  const letra =
    nombre.length === 1
      ? LETRAS_EN.findIndex((l) => l.toLowerCase() === nombre)
      : LETRAS_ES.findIndex((l) => l.toLowerCase() === nombre);
  // Una "b" suelta después de una letra inglesa es bemol ("Bb"); después de
  // una nota en castellano también ("Sib"). No hay ambigüedad: la letra ya
  // se consumió.
  const alter = m[2] ? ALTERACIONES[m[2]] ?? ALTERACIONES[m[2].toLowerCase()] ?? 0 : 0;
  return { letra, alter, pc: mod12(LETRAS_PC[letra] + alter) };
}

/** El tono escrito que pide una tónica y un modo, si existe sin dobles signos. */
export function leerTono(tonica: string, modo: Modo = "mayor"): Tono {
  const n = leerTonica(tonica);
  for (const t of TONALIDADES) {
    const tono = modo === "mayor" ? t.mayor : t.menor;
    if (tono.tonica.letra === n.letra && tono.tonica.alter === n.alter) return tono;
  }
  throw new PedidoInvalido(
    `${escribirNota(n)} ${modo} pediría dobles alteraciones y no está entre las quince tonalidades. Usá la enarmónica.`,
  );
}

export function leerCifrado(texto: string): { chord: Chord; inversion: number } {
  const r = parseCifradoConBajo(texto);
  if (!r) {
    throw new PedidoInvalido(
      `No entiendo el cifrado "${texto}". Van en cifrado inglés: C, Dm7, G7, F#maj7, Bbm7b5, Em/B. Sufijos que conozco: ${CHORD_QUALITIES.map((q) => q.suffix || "(mayor)").join(", ")}.`,
    );
  }
  return r;
}

const ROMANOS = ["i", "ii", "iii", "iv", "v", "vi", "vii"];

/**
 * Un grado escrito como en el papel —"ii", "V7", "bVI", "iv", "vii°"— llevado
 * al modelo de la sala de práctica (`AcordeDeLaSecuencia`).
 *
 * La calidad la pone la escala, no la mayúscula: en Do mayor "II" y "ii" son
 * el mismo Re menor, y se avisa si lo escrito no coincide. Lo que sí cambia
 * el acorde es el préstamo: "bVI" y "iv" en mayor salen de la menor paralela,
 * y en menor el "V" mayúsculo sale de la armónica (el V que pide volver) y el
 * "v" minúsculo de la natural.
 */
export function leerGrado(texto: string, modo: Modo): { acorde: AcordeDeLaSecuencia; aviso?: string } {
  const m = /^([b♭]?)(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)\s*(.*)$/.exec(texto.trim());
  if (!m) {
    throw new PedidoInvalido(`No entiendo el grado "${texto}". Van en romanos: I, ii, V7, bVI, iv, vii°.`);
  }
  const [, bemol, romano, sufijo] = m;
  const grado = ROMANOS.indexOf(romano.toLowerCase());
  const mayuscula = romano === romano.toUpperCase();
  const septima = /7/.test(sufijo);
  const resto = sufijo.replace(/maj7|7|°|º|o|ø|dim|m7b5/g, "").trim();
  if (resto) throw new PedidoInvalido(`No sé qué hacer con "${resto}" en "${texto}".`);

  if (modo === "mayor") {
    const prestado = bemol !== "" || (grado === 3 && !mayuscula);
    const acorde: AcordeDeLaSecuencia = prestado
      ? { grado, deEscala: "menor-natural", septima }
      : septima
        ? { grado, septima }
        : grado;
    const natural = /^[IV]/.test(TONALIDAD_MAYOR[grado].cifra);
    const aviso =
      !prestado && natural !== mayuscula
        ? `En mayor el grado ${TONALIDAD_MAYOR[grado].cifra} es ${natural ? "mayor" : "menor"}; se usó así aunque escribiste "${texto}".`
        : undefined;
    return { acorde, aviso };
  }

  // Menor: la natural salvo el V y el vii°, que vienen de la armónica.
  const armonica = (grado === 4 && mayuscula) || (grado === 6 && !mayuscula);
  return { acorde: { grado, deEscala: armonica ? "menor-armonica" : "menor-natural", septima } };
}

// ---------------------------------------------------------------------------
// Transportar lo que el motor calcula sobre Do a la tonalidad pedida
// ---------------------------------------------------------------------------

interface AcordeArmado {
  /** Cómo se escribió el pedido. */
  pedido: string;
  cifrado: string;
  nombre: string;
  grado: number;
  cifra: string;
  funcion: Funcion;
  /** Las teclas en estado fundamental, desde Do3. */
  teclas: Pitch[];
  notas: string[];
  prestado: boolean;
}

function armarEnTono(a: AcordeDeLaSecuencia, pedido: string, tonica: PitchClass): AcordeArmado {
  const raiz = mod12(tonica + raizDelAcorde(a));
  const midis = midisDelAcorde(a, 48 + raiz);
  const id = identificarAcorde(midis);
  if (!id) throw new PedidoInvalido(`El motor no reconoce el acorde que sale de "${pedido}".`);
  const grado = gradoDe(a);
  return {
    pedido,
    cifrado: chordSymbol(id.root, id.quality),
    nombre: chordNameEs(id.root, id.quality),
    grado: grado + 1,
    cifra: TONALIDAD_MAYOR[grado].cifra,
    funcion: FUNCION_DE_GRADO[grado],
    teclas: midis,
    notas: notasDeAcorde(id.root, id.quality),
    prestado: typeof a !== "number" && a.deEscala !== undefined,
  };
}

const conNombre = (p: Pitch) => `${noteNameWithOctave(p)} (${p})`;

// ---------------------------------------------------------------------------
// Las herramientas
// ---------------------------------------------------------------------------

export interface PedidoDeProgresion {
  tonalidad: string;
  modo?: Modo;
  grados: string[];
}

/** Una progresión por grados, llevada a cifrados y teclas en la tonalidad. */
export function progresion({ tonalidad, modo = "mayor", grados }: PedidoDeProgresion) {
  if (grados.length === 0) throw new PedidoInvalido("Pasá al menos un grado.");
  const tono = leerTono(tonalidad, modo);
  const leidos = grados.map((g) => leerGrado(g, modo));
  const acordes = leidos.map((l, i) => armarEnTono(l.acorde, grados[i], tono.tonica.pc));
  const indices = leidos.map((l) => gradoDe(l.acorde));
  const avisos = leidos.flatMap((l) => (l.aviso ? [l.aviso] : []));
  const racha = rachaDeFuncion(indices);
  if (racha >= 4) {
    avisos.push(
      `Viola la regla de oro del profe: ${racha} acordes seguidos con la misma función. Hay que variar entre reposo, media tensión y tensión.`,
    );
  }
  const cadencia = cadenciaAlFinal(indices);
  return {
    tonalidad: nombreDeTono(tono),
    cifrados: acordes.map((a) => a.cifrado),
    acordes,
    cadenciaAlFinal: cadencia,
    avisos,
  };
}

/** Las progresiones y cadencias con nombre que se practican en la sala. */
export function progresionesConocidas() {
  return {
    progresiones: PROGRESIONES.map((p) => ({
      nombre: p.nombre,
      grados: p.grados.map((g) => TONALIDAD_MAYOR[g].cifra),
      porQue: p.porQue,
    })),
    cadencias: CADENCIAS_CON_NOMBRE.map((c) => ({
      nombre: c.nombre,
      grados: c.grados.map((g) => TONALIDAD_MAYOR[g].cifra),
      detalle: c.detalle,
    })),
    funciones: Object.entries(FUNCIONES).map(([id, f]) => ({
      id,
      nombre: f.nombre,
      alias: f.alias,
      grados: f.grados.map((g) => TONALIDAD_MAYOR[g].cifra),
      papel: f.papel,
    })),
    texturas: TEXTURAS_PIANO,
    disposiciones: DISPOSICIONES,
  };
}

export interface PedidoDeAcorde {
  cifrado?: string;
  teclas?: number[];
}

/** Un acorde, por cifrado o por las teclas que suenan: notas, receta e inversiones. */
export function acorde({ cifrado, teclas }: PedidoDeAcorde) {
  let chord: Chord;
  let bajo: string | undefined;
  if (cifrado) {
    chord = leerCifrado(cifrado).chord;
  } else if (teclas && teclas.length >= 3) {
    const id = identificarAcorde(teclas);
    if (!id) {
      return { reconocido: false, teclas: teclas.map(conNombre), mensaje: "Esas teclas no arman ningún acorde que el cuaderno conozca." };
    }
    chord = { root: id.root, quality: id.quality };
    const grave = Math.min(...teclas);
    bajo = id.bajo === id.root ? undefined : `el bajo es ${nombreEnAcorde(grave, id.root, id.quality)}: está invertido`;
  } else {
    throw new PedidoInvalido("Pasá un cifrado o al menos tres teclas MIDI.");
  }
  const { root, quality } = chord;
  const fundamental = chordPitches(48 + root, quality);
  return {
    reconocido: true,
    cifrado: chordSymbol(root, quality),
    nombre: chordNameEs(root, quality),
    notas: notasDeAcorde(root, quality),
    receta: stackLabel(quality),
    intervalos: intervalsOf(quality),
    familia: quality.family,
    porQueSuenaAsi: quality.vibe,
    vistoEnClase: quality.learnedIn,
    inversiones: Array.from({ length: cantidadDeInversiones(quality) + 1 }, (_, i) => {
      const pitches = invertir(fundamental, i);
      return {
        nombre: NOMBRES_INVERSION[i],
        cifrado: simboloConBajo(root, quality, i),
        teclas: pitches.map((p) => `${nombreEnAcorde(p, root, quality)} (${p})`),
      };
    }),
    ...(bajo ? { observacion: bajo } : {}),
  };
}

export interface PedidoDeEnlace {
  acordes: string[];
  criterio?: Criterio;
  base?: number;
}

/** El recorrido óptimo por inversiones de una progresión escrita en cifrados. */
export function enlazar({ acordes, criterio = "bajo", base = 48 }: PedidoDeEnlace) {
  if (acordes.length === 0) throw new PedidoInvalido("Pasá al menos un acorde.");
  const chords = acordes.map((a) => leerCifrado(a).chord);
  const { pasos } = recorridoOptimo(chords, criterio, base);
  return {
    criterio,
    explicacion:
      criterio === "bajo"
        ? "Que la nota de abajo se mueva poco: el criterio del profe, para tocar con una mano sola."
        : "Que se mueva poco toda la mano, reteniendo notas comunes: el enlace de manual, para cuando otro hace el bajo.",
    pasos: pasos.map((d, i) => ({
      cifrado: simboloConBajo(chords[i].root, chords[i].quality, d.inversion),
      inversion: NOMBRES_INVERSION[d.inversion],
      teclas: d.pitches,
      notas: d.pitches.map((p) => nombreEnAcorde(p, chords[i].root, chords[i].quality)),
    })),
    movimientoTotalEnSemitonos: totalDelRecorrido(pasos, criterio),
  };
}

export interface PedidoDeVoicingMcp {
  cifrado: string;
  disposicion?: Disposicion;
}

/** Cómo repartir un acorde entre las manos: cerrado, abierto, a una mano. */
export function voicing({ cifrado, disposicion = "15-37" }: PedidoDeVoicingMcp) {
  const { chord } = leerCifrado(cifrado);
  const d = DISPOSICIONES.find((x) => x.id === disposicion);
  if (!d) throw new PedidoInvalido(`Disposición desconocida "${disposicion}". Hay: ${DISPOSICIONES.map((x) => x.id).join(", ")}.`);
  if (d.soloCuatriadas && intervalsOf(chord.quality).length < 4) {
    throw new PedidoInvalido(`"${d.nombre}" sólo tiene sentido con séptima; ${chordSymbol(chord.root, chord.quality)} es una tríada.`);
  }
  const v = voicingModelo({ root: chord.root, q: chord.quality, disposicion });
  const todas = [...v.izquierda, ...v.derecha].sort((a, b) => a - b);
  const nombre = (p: Pitch) => `${nombreEnAcorde(p, chord.root, chord.quality)} (${p})`;
  return {
    cifrado: chordSymbol(chord.root, chord.quality),
    disposicion: d.nombre,
    enunciado: d.enunciado,
    izquierda: v.izquierda.map(nombre),
    derecha: v.derecha.map(nombre),
    teclas: todas,
    intervalosEntreVecinas: saltosEntreVecinas(todas).map(nombreDeIntervalo),
  };
}

// ---------------------------------------------------------------------------
// Componer: acordes + textura (+ melodía) → una pieza del cuaderno
// ---------------------------------------------------------------------------

export interface PedidoDeComposicion {
  tonalidad: string;
  modo?: Modo;
  grados: string[];
  textura?: TexturaPiano;
  melodia?: boolean;
  semilla?: number;
  bpm?: number;
  titulo?: string;
  slug?: string;
}

/** Lo que devuelve `componer`, además del resumen: la pieza como la escribe el cuaderno. */
export interface PiezaCompuesta {
  slug: string;
  titulo: string;
  compas: { numerador: number; denominador: number };
  tonalidad: { tonica: PitchClass; modo: Modo };
  bpm: number;
  derecha: EventoEscrito[];
  izquierda: EventoEscrito[];
}

const PULSOS = 4;

/** De un pulso de negra a la figura que divide a la redonda: 1 → 4, 0.5 → 8, 4 → 1. */
function figuraDe(dur: number): number {
  const divide = PULSOS / dur;
  if (!Number.isInteger(divide)) throw new Error(`Duración ${dur} que no es una figura binaria.`);
  return divide;
}

/**
 * De los eventos de una textura (en pulsos, por mano, un compás) a la fila de
 * una mano como la lee el pentagrama: cada evento con su figura, y los huecos
 * escritos como silencios. Dos eventos en el mismo pulso se juntan en un solo
 * acorde; uno que pisa al siguiente se acorta hasta donde el otro entra.
 */
export function escribirMano(eventos: EventoDeTextura[], compases: number): EventoEscrito[] {
  const porInstante = new Map<number, { t: number; dur: number; pitches: Set<number> }>();
  for (const e of eventos) {
    const previo = porInstante.get(e.t);
    if (previo) {
      e.pitches.forEach((p) => previo.pitches.add(p));
      previo.dur = Math.max(previo.dur, e.dur);
    } else {
      porInstante.set(e.t, { t: e.t, dur: e.dur, pitches: new Set(e.pitches) });
    }
  }
  const instantes = [...porInstante.values()].sort((a, b) => a.t - b.t);
  const fila: EventoEscrito[] = [];
  let cursor = 0;
  const fin = compases * PULSOS;
  const rellenar = (hasta: number) => {
    while (cursor < hasta - 1e-9) {
      // Silencios de la figura más grande que entre sin pasarse ni cruzar la barra.
      const barra = Math.floor(cursor / PULSOS + 1e-9) * PULSOS + PULSOS;
      const limite = Math.min(hasta, barra);
      let dur = PULSOS;
      while (dur > limite - cursor + 1e-9 || (cursor % dur !== 0 && dur > 0.5)) dur /= 2;
      fila.push({ midis: [], divide: figuraDe(dur) });
      cursor += dur;
    }
  };
  instantes.forEach((inst, i) => {
    rellenar(inst.t);
    const siguiente = instantes[i + 1]?.t ?? fin;
    const dur = Math.min(inst.dur, siguiente - inst.t);
    fila.push({ midis: [...inst.pitches].sort((a, b) => a - b), divide: figuraDe(dur) });
    cursor = inst.t + dur;
  });
  rellenar(fin);
  return fila;
}

function slugDe(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Compone una vuelta: la progresión en la tonalidad, vestida con una textura
 * del piano y, si se pide, con una melodía arriba escrita con las reglas de
 * las clases 3 y 4, que termina con una nota larga sobre el último acorde.
 */
export function componer(pedido: PedidoDeComposicion) {
  const { tonalidad, modo = "mayor", grados, textura = "pum-cha", melodia = false, semilla = 1, bpm = 80 } = pedido;
  if (grados.length === 0) throw new PedidoInvalido("Pasá al menos un grado.");
  if (!TEXTURAS_PIANO.some((t) => t.id === textura)) {
    throw new PedidoInvalido(`Textura desconocida "${textura}". Hay: ${TEXTURAS_PIANO.map((t) => t.id).join(", ")}.`);
  }
  const tono = leerTono(tonalidad, modo);
  const tonica = tono.tonica.pc;
  const leidos = grados.map((g) => leerGrado(g, modo));
  const secuencia = leidos.map((l) => l.acorde);
  const armados = leidos.map((l, i) => armarEnTono(l.acorde, grados[i], tonica));
  const avisos = leidos.flatMap((l) => (l.aviso ? [l.aviso] : []));

  // El acompañamiento: un compás de textura por acorde. El último compás es
  // donde la melodía, si la hay, apoya su nota larga sobre el último acorde.
  const repartidos = armados.map((a) => {
    const id = identificarAcorde(a.teclas)!;
    return repartir(id.root, id.quality);
  });
  const compases = repartidos.length;
  const porMano: Record<"izquierda" | "derecha", EventoDeTextura[]> = { izquierda: [], derecha: [] };
  repartidos.forEach((r, i) => {
    for (const e of compasDe(textura, r, PULSOS)) porMano[e.mano].push({ ...e, t: e.t + i * PULSOS });
  });

  let derecha: EventoEscrito[];
  let izquierda: EventoEscrito[];
  let guias: string[] | undefined;
  if (melodia) {
    // La melodía sale sobre Do y se transporta; se la corre para el lado que
    // la deje más cerca del Do central, como haría una cantante.
    const corrimiento = tonica > 6 ? tonica - 12 : tonica;
    derecha = componerMelodia(secuencia, semilla).map((e) => ({ ...e, midis: e.midis.map((m) => m + corrimiento) }));
    // La nota con la que la melodía recibe a cada acorde (el método de la clase 4).
    guias = sugerirGuias(secuencia, semilla).map((g) => noteNameWithOctave(midiDeNota(g) + corrimiento));
    // Las dos manos de la textura pasan a la izquierda, que es como se toca un
    // pum-chá o un arpegio cuando la derecha está ocupada cantando.
    izquierda = escribirMano([...porMano.izquierda, ...porMano.derecha], compases);
    if (modo === "menor") {
      avisos.push("La melodía camina por la escala mayor entre acorde y acorde; en menor las notas de paso pueden pedir un bemol que no está. Revisá los compases con oído.");
    }
  } else {
    derecha = escribirMano(porMano.derecha, compases);
    izquierda = escribirMano(porMano.izquierda, compases);
  }

  const titulo = pedido.titulo ?? `${grados.join(" – ")} en ${nombreDeTono(tono)}`;
  const slug = pedido.slug ?? slugDe(titulo);
  const pieza: PiezaCompuesta = {
    slug,
    titulo,
    compas: { numerador: 4, denominador: 4 },
    tonalidad: { tonica, modo },
    bpm,
    derecha,
    izquierda,
  };
  return {
    tonalidad: nombreDeTono(tono),
    cifrados: armados.map((a) => a.cifrado),
    textura: TEXTURAS_PIANO.find((t) => t.id === textura)!.nombre,
    melodia,
    semilla,
    ...(guias ? { notasGuia: guias } : {}),
    compases,
    avisos,
    pieza,
  };
}

// ---------------------------------------------------------------------------
// Analizar: de cifrados a grados, funciones y nombres
// ---------------------------------------------------------------------------

export interface PedidoDeAnalisis {
  acordes: string[];
  tonalidad?: string;
}

interface AcordeAnalizado {
  cifrado: string;
  notas: string[];
  grado: string;
  funcion: Funcion | null;
  comentario: string;
}

/** Cuántos de los acordes caben en la escala mayor de una tónica. */
function diatonicos(chords: Chord[], tonica: PitchClass): number {
  const escala = new Set(notasDeEscala(tonica, escalaPorId("mayor")!).map(mod12));
  return chords.filter((c) => intervalsOf(c.quality).every((iv) => escala.has(mod12(c.root + iv)))).length;
}

/**
 * Una progresión en cifrados, leída como la leería el profe: en qué tonalidad
 * está (si no se dice, se adivina), qué grado es cada acorde, qué función
 * cumple, y cuáles son dominantes secundarios, sustitutos tritonales o
 * préstamos de la menor.
 */
export function analizar({ acordes, tonalidad }: PedidoDeAnalisis) {
  if (acordes.length === 0) throw new PedidoInvalido("Pasá al menos un acorde.");
  const chords = acordes.map((a) => leerCifrado(a).chord);

  let tonica: PitchClass;
  let comoSeSupo: string;
  if (tonalidad) {
    tonica = leerTonica(tonalidad).pc;
    comoSeSupo = "la que pediste";
  } else {
    // La tónica con más acordes adentro; en empate, la del último acorde y
    // después la del primero, que es donde una progresión suele estar en casa.
    const candidatas = Array.from({ length: 12 }, (_, pc) => pc)
      .map((pc) => ({ pc, n: diatonicos(chords, pc) }))
      .sort((a, b) => b.n - a.n);
    const mejor = candidatas[0].n;
    const empatadas = candidatas.filter((c) => c.n === mejor).map((c) => c.pc);
    tonica =
      empatadas.find((pc) => pc === chords[chords.length - 1].root) ??
      empatadas.find((pc) => pc === chords[0].root) ??
      empatadas[0];
    comoSeSupo = `adivinada: ${mejor} de ${chords.length} acordes son de su campo armónico`;
  }
  const escala = new Set(notasDeEscala(tonica, escalaPorId("mayor")!).map(mod12));
  const menor = new Set(notasDeEscala(tonica, escalaPorId("menor-natural")!).map(mod12));

  const gradosDiatonicos: number[] = [];
  const analizados: AcordeAnalizado[] = chords.map((c) => {
    const notas = notasDeAcorde(c.root, c.quality);
    const cifrado = chordSymbol(c.root, c.quality);
    const pcs = intervalsOf(c.quality).map((iv) => mod12(c.root + iv));
    const g = GRADOS_MAYOR.findIndex((semis) => mod12(tonica + semis) === c.root);
    const esDiatonico = pcs.every((pc) => escala.has(pc));
    if (g >= 0 && esDiatonico) {
      gradosDiatonicos.push(g);
      const cifra = TONALIDAD_MAYOR[g].cifra + (pcs.length >= 4 ? "7" : "");
      return { cifrado, notas, grado: cifra, funcion: FUNCION_DE_GRADO[g], comentario: TONALIDAD_MAYOR[g].papel };
    }
    const dominante = DOMINANTES.find((d) => mod12(tonica + d.raiz) === c.root && c.quality.id === "dom7");
    if (dominante) {
      const destino = chordSymbol(mod12(tonica + dominante.raizDestino), qualityById(dominante.calidadDestino)!);
      const grado = dominante.destino === null ? `V7/(${destino})` : `V7/${TONALIDAD_MAYOR[dominante.destino].cifra}`;
      return {
        cifrado,
        notas,
        grado,
        funcion: "dominante",
        comentario: `Dominante ${dominante.tipo}: lleva a ${destino}.`,
      };
    }
    const sustituto = SUSTITUTOS_TRITONALES.find((s) => mod12(tonica + s.raiz) === c.root && c.quality.id === "dom7");
    if (sustituto) {
      const destino = chordSymbol(mod12(tonica + sustituto.original.raizDestino), qualityById(sustituto.original.calidadDestino)!);
      return {
        cifrado,
        notas,
        grado: `subV7/(${destino})`,
        funcion: "dominante",
        comentario: `Sustituto tritonal de ${chordSymbol(mod12(tonica + sustituto.original.raiz), qualityById("dom7")!)}: comparten la tercera y la séptima, y el bajo baja un semitono a ${destino}.`,
      };
    }
    const gMenor = escalaPorId("menor-natural")!.grados.findIndex((semis) => mod12(tonica + semis) === c.root);
    if (gMenor >= 0 && pcs.every((pc) => menor.has(pc))) {
      gradosDiatonicos.push(gMenor);
      const cifra = ["i", "ii°", "bIII", "iv", "v", "bVI", "bVII"][gMenor];
      return {
        cifrado,
        notas,
        grado: cifra,
        funcion: FUNCION_DE_GRADO[gMenor],
        comentario: "Préstamo de la menor paralela: el grado es el mismo, el color es otro.",
      };
    }
    return { cifrado, notas, grado: "?", funcion: null, comentario: "No es del campo armónico ni de las vueltas que vimos en clase." };
  });

  const racha = rachaDeFuncion(gradosDiatonicos);
  const avisos: string[] = [];
  if (racha >= 4) avisos.push(`Hay ${racha} funciones iguales seguidas: viola la regla de oro.`);
  const cadencia = cadenciaAlFinal(gradosDiatonicos);
  const conNombre = CADENCIAS_CON_NOMBRE.find((c) => {
    const cola = gradosDiatonicos.slice(-c.grados.length);
    return cola.length === c.grados.length && cola.every((g, i) => g === c.grados[i]);
  });
  return {
    tonalidad: { nombre: `${escribirNota(leerTonicaDePc(tonica))} mayor`, comoSeSupo },
    acordes: analizados,
    cadenciaAlFinal: cadencia,
    cadenciaConNombre: conNombre ? { nombre: conNombre.nombre, detalle: conNombre.detalle } : null,
    avisos,
  };
}

function leerTonicaDePc(pc: PitchClass): NotaEscrita {
  const t = TONALIDADES.find((t) => t.mayor.tonica.pc === pc);
  return t ? t.mayor.tonica : { letra: 0, alter: 0, pc };
}

// ---------------------------------------------------------------------------
// Tonalidad: la ficha completa de una
// ---------------------------------------------------------------------------

export interface PedidoDeTonalidad {
  tonalidad: string;
  modo?: Modo;
}

/** La escala, la armadura, la relativa, el campo armónico y los dominantes de una tonalidad. */
export function tonalidad({ tonalidad, modo = "mayor" }: PedidoDeTonalidad) {
  const tono = leerTono(tonalidad, modo);
  const tonica = tono.tonica.pc;
  const armadura = armaduraDeTono(tono);
  const escala = escalaPorId(modo === "mayor" ? "mayor" : "menor-natural")!;
  const nombrar = (midis: number[]) => {
    const id = identificarAcorde(midis);
    return id ? chordSymbol(id.root, id.quality) : "?";
  };
  const triadas = triadasDeEscala(48 + tonica, escala).map(nombrar);
  const cuatriadas = cuatriadasDeEscala(48 + tonica, escala).map(nombrar);
  const cifras = modo === "mayor" ? TONALIDAD_MAYOR.map((g) => g.cifra) : ["i", "ii°", "III", "iv", "v", "VI", "VII"];
  const dominantes = modo === "mayor"
    ? DOMINANTES.map((d) => ({
        cifrado: chordSymbol(mod12(tonica + d.raiz), qualityById("dom7")!),
        tipo: d.tipo,
        llevaA: chordSymbol(mod12(tonica + d.raizDestino), qualityById(d.calidadDestino)!),
        sustitutoTritonal: chordSymbol(mod12(tonica + SUSTITUTOS_TRITONALES[d.grado].raiz), qualityById("dom7")!),
      }))
    : undefined;
  return {
    nombre: nombreDeTono(tono),
    cifradoIngles: nombreDeTono(tono, "en"),
    escala: { nombre: escala.nombre, receta: escala.receta, notas: notasDeTono(tono).map((n) => escribirNota(n)) },
    armadura: {
      cantidad: Math.abs(armadura),
      signo: armadura === 0 ? null : armadura > 0 ? "sostenidos" : "bemoles",
      notas: signosDeArmadura(armadura).map((n) => escribirNota(n)),
    },
    relativa: nombreDeTono(modo === "mayor" ? relativaMenor(tono) : relativaMayor(tono)),
    campoArmonico: cifras.map((cifra, i) => ({
      grado: cifra,
      triada: triadas[i],
      cuatriada: cuatriadas[i],
      funcion: FUNCION_DE_GRADO[i],
      ...(modo === "mayor" ? { papel: TONALIDAD_MAYOR[i].papel } : {}),
    })),
    ...(dominantes ? { dominantes } : {}),
    ...(modo === "menor"
      ? { nota: "El V mayor y el vii° vienen de la menor armónica, que no está en esta tabla: usá la herramienta progresion con V o vii° en menor." }
      : {}),
    otrasEscalas: ESCALAS.filter((e) => e.id !== escala.id).map((e) => ({ id: e.id, nombre: e.nombre, receta: e.receta })),
  };
}

/** Las texturas del piano con su explicación, para que el que pide sepa qué elegir. */
export function texturas() {
  return TEXTURAS_PIANO;
}
