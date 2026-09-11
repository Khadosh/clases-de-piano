/**
 * De un archivo de LilyPond (`.ly`) a MusicXML, para poder importarlo.
 *
 *   node --experimental-strip-types scripts/lilypond-a-musicxml.mjs pieza.ly \
 *     -o pieza.musicxml
 *
 * Existe por una sola razón: la biblioteca de Mutopia —la más grande de
 * partituras de dominio público escritas como datos— guarda LilyPond y no
 * MusicXML, y el conversor automático que hay por ahí devolvía basura (perdía
 * puntillos, mezclaba las voces). Este lee **el subconjunto que usan esos
 * archivos** y nada más: alturas relativas, duraciones, acordes, ligaduras de
 * prolongación, repeticiones, tresillos, las dos voces con `<< \\ >>`,
 * variables, y los cambios de clave, compás y armadura. Todo lo demás
 * —matices, articulaciones, digitación, texto, adornos— se saltea, y lo que
 * se saltea con pérdida se avisa.
 *
 * No escribe nuestro modelo directamente sino MusicXML, a propósito: así el
 * importador de siempre hace el resto con sus reglas y sus tests, y hay un
 * solo lugar donde vive "cómo se parte una nota en figuras ligadas".
 *
 * Tres cosas de LilyPond que no son obvias y están resueltas acá:
 *
 * - **La duración por defecto es del texto, no de la música.** Una nota sin
 *   número dura lo que la última que *se escribió* antes, aunque esté en otra
 *   voz de un `<< >>`. Por eso se resuelve al parsear, en orden de lectura.
 * - **La octava relativa sí es de la música.** Cada nota se ubica a menos de
 *   una quinta de la anterior; adentro de un acorde, de la nota anterior del
 *   acorde, y después del acorde se sigue desde la primera. Y después de un
 *   `<< >>` se sigue desde la última nota de la *primera* rama. Los adornos
 *   y las repeticiones descartadas también mueven la referencia, así que se
 *   recorren igual aunque no suenen.
 * - **Las repeticiones no se desenrollan.** Una `\repeat volta` se escribe
 *   una vez, con la última `\alternative`: es como se toca sin repetir, y es
 *   lo que hacía el importador con las barras de repetición de MusicXML.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

// ---------------------------------------------------------------------------
// Fracciones: las duraciones son exactas o no son nada
// ---------------------------------------------------------------------------

const mcd = (a, b) => (b === 0 ? Math.abs(a) : mcd(b, a % b));
export const F = (n, d = 1) => {
  if (d < 0) { n = -n; d = -d; }
  const g = mcd(Math.abs(n), d) || 1;
  return { n: n / g, d: d / g };
};
const suma = (a, b) => F(a.n * b.d + b.n * a.d, a.d * b.d);
const resta = (a, b) => F(a.n * b.d - b.n * a.d, a.d * b.d);
const por = (a, b) => F(a.n * b.n, a.d * b.d);
const entre = (a, b) => F(a.n * b.d, a.d * b.n);
const cmp = (a, b) => a.n * b.d - b.n * a.d;
const num = (a) => a.n / a.d;
const CERO = F(0);

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

/**
 * Cada token sabe si venía pegado al anterior (`pegado`): en LilyPond la
 * diferencia entre `c'4` y `c '4` importa, y es lo único que hace falta para
 * saber si un número es la duración de la nota que lo precede.
 */
function tokenizar(texto) {
  const tokens = [];
  let i = 0;
  let linea = 1;
  let pegado = false;
  const push = (tipo, v) => tokens.push({ tipo, v, pegado, linea });
  const avanzar = (largo) => {
    for (let k = 0; k < largo; k++) if (texto[i + k] === "\n") linea++;
    i += largo;
  };
  const re = (r) => {
    r.lastIndex = i;
    const m = r.exec(texto);
    return m && m.index === i ? m[0] : null;
  };
  while (i < texto.length) {
    const c = texto[i];
    let m;
    if ((m = re(/\s+/y))) { avanzar(m.length); pegado = false; continue; }
    if ((m = re(/%\{[\s\S]*?%\}/y)) || (m = re(/%[^\n]*/y))) { avanzar(m.length); pegado = false; continue; }
    if ((m = re(/"(?:[^"\\]|\\.)*"/y))) {
      push("str", m.slice(1, -1).replace(/\\(.)/g, "$1"));
      avanzar(m.length); pegado = true; continue;
    }
    if (c === "#") {
      // Scheme: se saltea entero, balanceando paréntesis y respetando strings.
      let j = i + 1;
      if (texto[j] === "#") j++;
      if (texto[j] === "'") j++;
      if (texto[j] === "(") {
        let prof = 0;
        for (; j < texto.length; j++) {
          if (texto[j] === '"') { j++; while (j < texto.length && texto[j] !== '"') j += texto[j] === "\\" ? 2 : 1; continue; }
          if (texto[j] === "(") prof++;
          if (texto[j] === ")") { prof--; if (prof === 0) { j++; break; } }
        }
      } else if (texto[j] === '"') {
        j++; while (j < texto.length && texto[j] !== '"') j += texto[j] === "\\" ? 2 : 1; j++;
      } else {
        while (j < texto.length && !/[\s(){}<>\[\]"]/.test(texto[j])) j++;
      }
      push("scheme", texto.slice(i, j));
      avanzar(j - i); pegado = true; continue;
    }
    if ((m = re(/\\(?:[A-Za-z]+(?:-[A-Za-z]+)*|\\|[()\[\]<>!])/y))) {
      push("cmd", m.slice(1));
      avanzar(m.length); pegado = true; continue;
    }
    if ((m = re(/<<|>>/y))) { push(m, m); avanzar(2); pegado = true; continue; }
    if ((m = re(/[A-Za-z]+(?:\.[A-Za-z]+)+/y)) || (m = re(/[A-Za-z]+/y))) {
      push("palabra", m); avanzar(m.length); pegado = true; continue;
    }
    if ((m = re(/\d+/y))) { push("num", m); avanzar(m.length); pegado = true; continue; }
    push(c, c);
    avanzar(1); pegado = true;
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Nombres de notas
// ---------------------------------------------------------------------------

const LETRAS = ["c", "d", "e", "f", "g", "a", "b"];
const SEMITONOS = [0, 2, 4, 5, 7, 9, 11];

const SUFIJOS = {
  nederlands: { is: 1, isis: 2, es: -1, eses: -2, s: -1, ses: -2 },
  deutsch: { is: 1, isis: 2, es: -1, eses: -2, s: -1, ses: -2 },
  english: { s: 1, ss: 2, x: 2, f: -1, ff: -2, sharp: 1, flat: -1, sharpsharp: 2, flatflat: -2 },
};

/** "bes" → { letra: 6, alt: -1}, o null si la palabra no es una nota. */
function leerNota(palabra, idioma) {
  const sufijos = SUFIJOS[idioma] ?? SUFIJOS.nederlands;
  if (idioma === "deutsch") {
    if (palabra === "h") return { letra: 6, alt: 0 };
    if (palabra === "b") return { letra: 6, alt: -1 };
    if (palabra === "his") return { letra: 6, alt: 1 };
    if (palabra === "heses") return { letra: 6, alt: -2 };
  }
  const letra = LETRAS.indexOf(palabra[0]);
  if (letra < 0) return null;
  const resto = palabra.slice(1);
  if (resto === "") return { letra, alt: 0 };
  if (!(resto in sufijos)) return null;
  // En holandés "s" y "ses" sólo valen después de a y e (as, es, ases, eses).
  if (idioma !== "english" && (resto === "s" || resto === "ses") && !"ae".includes(palabra[0])) return null;
  return { letra, alt: sufijos[resto] };
}

// ---------------------------------------------------------------------------
// El parser: del texto a un árbol
// ---------------------------------------------------------------------------

/** Comandos que no cambian nada de lo que nos importa y no llevan argumentos. */
const SIN_EFECTO = new Set([
  "voiceOne", "voiceTwo", "voiceThree", "voiceFour", "oneVoice",
  "stemUp", "stemDown", "stemNeutral", "slurUp", "slurDown", "slurNeutral",
  "tieUp", "tieDown", "tieNeutral", "dynamicUp", "dynamicDown", "dynamicNeutral",
  "tupletUp", "tupletDown", "tupletNeutral", "dotsUp", "dotsDown", "dotsNeutral",
  "phrasingSlurUp", "phrasingSlurDown", "phrasingSlurNeutral",
  "textSpannerUp", "textSpannerDown", "textSpannerNeutral",
  "arpeggioArrowUp", "arpeggioArrowDown", "arpeggioNormal", "arpeggioBracket",
  "autoBeamOn", "autoBeamOff", "cadenzaOn", "cadenzaOff",
  "break", "noBreak", "pageBreak", "noPageBreak", "allowPageTurn", "noPageTurn",
  "mergeDifferentlyDottedOn", "mergeDifferentlyDottedOff",
  "mergeDifferentlyHeadedOn", "mergeDifferentlyHeadedOff",
  "shiftOn", "shiftOff", "shiftOnn", "shiftOnnn", "hideNotes", "unHideNotes",
  "numericTimeSignature", "defaultTimeSignature", "compressFullBarRests",
  "expandFullBarRests", "compressMMRests", "pointAndClickOff", "pointAndClickOn",
  "newSpacingSection", "easyHeadsOn", "easyHeadsOff", "improvisationOn",
  "improvisationOff", "textLengthOn", "textLengthOff", "breathe", "fine",
  "segno", "coda", "varcoda", "default", "fermataMarkup", "startStaff", "stopStaff",
  "bassFigureExtendersOn", "bassFigureExtendersOff", "harmonicsOn", "harmonicsOff",
  "sustainOn", "sustainOff", "unaCorda", "treCorde", "sostenutoOn", "sostenutoOff",
  "startTrillSpan", "stopTrillSpan", "startTextSpan", "stopTextSpan",
  "startGroup", "stopGroup", "cresc", "decresc", "dim", "endcresc", "enddecresc",
  "enddim", "crescHairpin", "crescTextCresc", "dimHairpin", "dimTextDecresc",
  "dimTextDecr", "dimTextDim", "cr", "decr", "endcr", "enddecr",
  "laissezVibrer", "repeatTie", "noBeam", "melisma", "melismaEnd", "glissando",
  "arpeggio", "harmonic", "espressivo", "staccato", "staccatissimo", "accent",
  "marcato", "tenuto", "portato", "prall", "mordent", "prallmordent", "upprall",
  "downprall", "upmordent", "downmordent", "pralldown", "prallup", "lineprall",
  "prallprall", "trill", "turn", "reverseturn", "fermata", "shortfermata",
  "longfermata", "verylongfermata", "upbow", "downbow", "open", "stopped",
  "flageolet", "thumb", "lheel", "rheel", "ltoe", "rtoe", "snappizzicato",
  "halfopen", "signumcongruentiae", "rfz", "sfp", "sffz", "fz", "sfff",
  "p", "pp", "ppp", "pppp", "ppppp", "f", "ff", "fff", "ffff", "fffff", "mp", "mf",
  "fp", "sf", "sff", "sfz", "sp", "spp", "rf", "n",
  "slurDashed", "slurDotted", "slurSolid", "tieDashed", "tieDotted", "tieSolid",
  "aikenHeads", "aikenHeadsMinor", "sacredHarpHeads", "xNotesOn", "xNotesOff",
  "italianoMusicGlyphs", "romanStringNumbers",
]);

/** Comandos que se saltean con N argumentos (tokens o expresiones simples). */
const CON_ARGUMENTOS = {
  ottava: 1, mark: 1, accidentalStyle: 1, hide: 1, omit: 1, undo: 1,
  transposition: 1, tweak: 2, shape: 2, offset: 3, "tag": 1, "keepWithTag": 1,
  "removeWithTag": 1, "pushToTag": 1, "appendToTag": 1, finger: 1, bendAfter: 1,
  textMark: 1, textEndMark: 1, language: 1, version: 1, "footnote": 3,
  "tempo": 0, // se maneja aparte
};

class Parser {
  constructor(tokens, idioma, variables, avisos, dir) {
    this.tokens = tokens;
    this.i = 0;
    this.idioma = idioma;
    this.variables = variables;
    this.avisos = avisos;
    this.dir = dir;
    /** La duración por defecto es del texto: la última escrita. */
    this.ultimaDuracion = { escrita: F(1, 4), puntos: 0 };
    this.header = {};
    this.tempo = null;
    this.partituras = [];
  }

  peek(k = 0) { return this.tokens[this.i + k]; }
  next() { return this.tokens[this.i++]; }
  es(tipo, v) {
    const t = this.peek();
    return Boolean(t && t.tipo === tipo && (v === undefined || t.v === v));
  }
  esCmd(...nombres) {
    const t = this.peek();
    return Boolean(t && t.tipo === "cmd" && nombres.includes(t.v));
  }
  avisar(msg) {
    const t = this.peek();
    this.avisos.push(`${msg} (línea ${t?.linea ?? "?"})`);
  }

  // --- nivel de archivo -----------------------------------------------------

  archivo() {
    while (this.peek()) {
      const t = this.peek();
      if (t.tipo === "cmd") {
        if (t.v === "header") { this.next(); this.leerHeader(); continue; }
        if (t.v === "score") { this.next(); this.leerScore(); continue; }
        if (t.v === "book" || t.v === "bookpart") {
          this.next(); this.saltearOpcional("with"); this.esperar("{");
          // Adentro de un \book se sigue leyendo como si fuera el archivo.
          const fin = this.buscarCierre("{", "}");
          const adentro = this.tokens.slice(this.i, fin);
          this.i = fin + 1;
          const sub = new Parser(adentro, this.idioma, this.variables, this.avisos, this.dir);
          sub.header = this.header; sub.tempo = this.tempo;
          sub.archivo();
          this.partituras.push(...sub.partituras);
          this.tempo ??= sub.tempo;
          continue;
        }
        if (t.v === "layout" || t.v === "paper") { this.next(); this.saltearBloque(); continue; }
        if (t.v === "midi") { this.next(); this.leerMidi(); continue; }
        if (t.v === "include") { this.next(); this.incluir(this.next()); continue; }
        if (t.v === "language" || t.v === "version") { this.next(); this.next(); continue; }
        if (t.v === "markup" || t.v === "markuplist") { this.next(); this.saltearMarkup(); continue; }
        if (SIN_EFECTO.has(t.v)) { this.next(); continue; }
      }
      if (t.tipo === "scheme") { this.next(); continue; }
      if (t.tipo === "palabra" && this.peek(1)?.tipo === "=") {
        // Una variable: nombre = expresión.
        this.next(); this.next();
        this.variables.set(t.v, this.expresion());
        continue;
      }
      if (t.tipo === "{" || t.tipo === "<<" || t.tipo === "cmd") {
        // Música suelta al nivel del archivo: es una partitura implícita.
        const m = this.musica();
        if (m && tieneNotas(m, this.variables)) this.partituras.push(m);
        continue;
      }
      this.next();
    }
  }

  /** El valor de una variable: música, un markup, un string, un número. */
  expresion() {
    const t = this.peek();
    if (!t) return { t: "nada" };
    if (t.tipo === "str") { this.next(); return { t: "texto", v: t.v }; }
    if (t.tipo === "num") { this.next(); return { t: "texto", v: t.v }; }
    if (t.tipo === "scheme") { this.next(); return { t: "nada" }; }
    if (t.tipo === "cmd" && (t.v === "markup" || t.v === "markuplist")) {
      this.next(); this.saltearMarkup(); return { t: "markup" };
    }
    if (t.tipo === "cmd" && (t.v === "layout" || t.v === "paper" || t.v === "with")) {
      this.next(); this.saltearBloque(); return { t: "nada" };
    }
    return this.musica() ?? { t: "nada" };
  }

  leerHeader() {
    this.esperar("{");
    while (this.peek() && !this.es("}")) {
      const t = this.next();
      if (t.tipo === "palabra" && this.es("=")) {
        this.next();
        const v = this.expresion();
        if (v.t === "texto") this.header[t.v] = v.v;
      }
    }
    this.esperar("}");
  }

  /** El bloque \midi sólo nos interesa por el \tempo que suele llevar. */
  leerMidi() {
    this.esperar("{");
    let prof = 1;
    while (this.peek() && prof > 0) {
      const t = this.next();
      if (t.tipo === "{") prof++;
      else if (t.tipo === "}") prof--;
      else if (t.tipo === "cmd" && t.v === "tempo") this.leerTempo();
    }
  }

  leerScore() {
    this.saltearOpcional("with");
    this.esperar("{");
    let musica = null;
    while (this.peek() && !this.es("}")) {
      if (this.esCmd("layout")) { this.next(); this.saltearBloque(); continue; }
      if (this.esCmd("midi")) { this.next(); this.leerMidi(); continue; }
      if (this.esCmd("header")) { this.next(); this.leerHeader(); continue; }
      const m = this.musica();
      if (m && !musica) musica = m;
      else if (!m) this.next();
    }
    this.esperar("}");
    if (musica) this.partituras.push(musica);
  }

  incluir(token) {
    if (!token || token.tipo !== "str") return;
    const nombre = token.v;
    if (/^(nederlands|english|deutsch|italiano|espanol|francais|svenska|norsk|suomi|catalan|portugues|vlaams)\.ly$/.test(nombre)) return;
    const ruta = join(this.dir, nombre);
    if (!existsSync(ruta)) return; // articulate.ly y compañía: no nos hacen falta
    const sub = new Parser(tokenizar(readFileSync(ruta, "utf8")), this.idioma, this.variables, this.avisos, dirname(ruta));
    sub.archivo();
    Object.assign(this.header, sub.header);
    this.tempo ??= sub.tempo;
  }

  // --- saltear ----------------------------------------------------------------

  esperar(tipo) {
    if (this.es(tipo)) { this.next(); return true; }
    this.avisar(`Se esperaba "${tipo}" y hay "${this.peek()?.v ?? "fin"}"`);
    return false;
  }

  buscarCierre(abre, cierra) {
    let prof = 0;
    for (let k = this.i; k < this.tokens.length; k++) {
      if (this.tokens[k].tipo === abre) prof++;
      else if (this.tokens[k].tipo === cierra) { prof--; if (prof === 0) return k; }
    }
    return this.tokens.length;
  }

  /** `{ ... }` balanceado, sin mirar adentro. */
  saltearBloque() {
    if (!this.es("{")) { this.next(); return; }
    this.i = this.buscarCierre("{", "}") + 1;
  }

  saltearOpcional(cmd) {
    if (this.esCmd(cmd)) { this.next(); this.saltearBloque(); }
  }

  /**
   * Un markup: `\markup { ... }`, `\markup \bold "x"`, `\markup \italic \bold { }`.
   * Los comandos de markup van encadenados hasta llegar al texto o al bloque.
   */
  saltearMarkup() {
    for (;;) {
      const t = this.peek();
      if (!t) return;
      if (t.tipo === "{") { this.saltearBloque(); return; }
      if (t.tipo === "str" || t.tipo === "num" || t.tipo === "scheme" || t.tipo === "palabra") { this.next(); return; }
      if (t.tipo === "cmd") {
        this.next();
        // \override #'(a . b) adentro de un markup lleva su valor.
        if (t.v === "override" && this.es("scheme")) this.next();
        continue;
      }
      this.next();
      return;
    }
  }

  /** Un valor después de un `=`: scheme, número, string, markup, o una palabra. */
  saltearValor() {
    const t = this.peek();
    if (!t) return;
    if (t.tipo === "cmd" && (t.v === "markup" || t.v === "markuplist")) { this.next(); this.saltearMarkup(); return; }
    if (t.tipo === "cmd") { this.next(); return; }
    this.next();
  }

  /** `\override A.B.c = valor`, `\override A #'b = valor`, `\set A.b = valor`. */
  saltearAsignacion() {
    while (this.peek() && !this.es("=")) {
      const t = this.peek();
      if (t.tipo === "palabra" || t.tipo === "scheme" || t.tipo === ".") { this.next(); continue; }
      break;
    }
    if (this.es("=")) { this.next(); this.saltearValor(); }
  }

  saltearRuta() {
    if (this.es("palabra")) this.next();
    while (this.es("scheme")) this.next();
  }

  // --- música ---------------------------------------------------------------

  /** Una expresión musical, o null si lo que viene no es música. */
  musica() {
    const t = this.peek();
    if (!t) return null;
    if (t.tipo === "{") {
      this.next();
      const items = [];
      while (this.peek() && !this.es("}")) {
        const m = this.elemento();
        if (m) items.push(m);
      }
      this.esperar("}");
      return { t: "seq", items };
    }
    if (t.tipo === "<<") {
      this.next();
      // Cada elemento de un << >> es una rama simultánea; el \\ sólo dice
      // que además son voces distintas, y para nosotros da lo mismo.
      const ramas = [];
      while (this.peek() && !this.es(">>")) {
        if (this.esCmd("\\")) { this.next(); continue; }
        const m = this.elemento();
        if (m) ramas.push(m);
      }
      this.esperar(">>");
      return { t: "sim", ramas };
    }
    if (t.tipo === "<") return this.acorde();
    if (t.tipo === "palabra") return this.notaSuelta();
    if (t.tipo === "cmd") return this.comando();
    return null;
  }

  /** Un elemento adentro de una secuencia: música, o algo que se ignora. */
  elemento() {
    const t = this.peek();
    const antes = this.i;
    const m = this.musica();
    if (m) return m;
    if (this.i !== antes) return null;
    // La barra de compás del archivo: no suena, pero dice dónde el autor
    // creía que caía la barra, y eso se verifica contra nuestra grilla.
    if (t.tipo === "|") { this.next(); return { t: "barra" }; }
    // Lo que no es música: post-eventos sueltos, scheme…
    if (t.tipo === "^" || t.tipo === "_" || t.tipo === "-") { this.next(); this.postEventoItem(); return null; }
    this.next();
    return null;
  }

  duracion(pegado = true) {
    const t = this.peek();
    let escrita = null;
    if (t && (t.pegado || !pegado) && t.tipo === "num") {
      this.next();
      escrita = F(1, Number(t.v));
    } else if (t && (t.pegado || !pegado) && t.tipo === "cmd" && (t.v === "breve" || t.v === "longa")) {
      this.next();
      escrita = F(t.v === "breve" ? 2 : 4);
    }
    if (!escrita) return null;
    let puntos = 0;
    while (this.es(".") && this.peek().pegado) { this.next(); puntos++; }
    let mult = null;
    if (this.es("*") && this.peek().pegado) {
      this.next();
      const n = Number(this.next().v);
      let d = 1;
      if (this.es("/")) { this.next(); d = Number(this.next().v); }
      mult = F(n, d);
    }
    return { escrita, puntos, mult };
  }

  /** La duración que le toca a una nota: la escrita, o la última escrita. */
  duracionEfectiva() {
    const d = this.duracion();
    if (d) {
      this.ultimaDuracion = { escrita: d.escrita, puntos: d.puntos };
      return d;
    }
    return { ...this.ultimaDuracion, mult: null };
  }

  altura(palabra) {
    const base = leerNota(palabra, this.idioma);
    if (!base) return null;
    let oct = 0;
    while ((this.es("'") || this.es(",")) && this.peek().pegado) oct += this.next().tipo === "'" ? 1 : -1;
    while ((this.es("!") || this.es("?")) && this.peek().pegado) this.next();
    return { letra: base.letra, alt: base.alt, oct };
  }

  notaSuelta() {
    const t = this.next();
    if (t.v === "r" || t.v === "s" || t.v === "R") {
      const dur = this.duracionEfectiva();
      const nota = { t: "nota", alturas: [], silencio: t.v, dur, lig: false };
      this.postEventos(nota);
      return nota;
    }
    if (t.v === "q") {
      const dur = this.duracionEfectiva();
      const nota = { t: "nota", alturas: [], repite: true, dur, lig: false };
      this.postEventos(nota);
      return nota;
    }
    const a = this.altura(t.v);
    if (!a) {
      this.avisos.push(`"${t.v}" no es una nota ni un comando que conozcamos (línea ${t.linea}). Se salteó.`);
      return null;
    }
    const dur = this.duracionEfectiva();
    const nota = { t: "nota", alturas: [a], dur, lig: false };
    this.postEventos(nota);
    return nota;
  }

  acorde() {
    this.esperar("<");
    const alturas = [];
    while (this.peek() && !this.es(">")) {
      const t = this.next();
      if (t.tipo === "palabra") {
        const a = this.altura(t.v);
        if (a) {
          alturas.push(a);
          // Adentro del acorde cada nota puede llevar sus propios post-eventos.
          const falsa = { lig: false };
          this.postEventos(falsa);
          a.lig = falsa.lig;
        } else {
          this.avisos.push(`"${t.v}" adentro de un acorde no es una nota (línea ${t.linea}).`);
        }
      }
    }
    this.esperar(">");
    const dur = this.duracionEfectiva();
    // `<c~ e>` liga sólo el Do; `<c e>~` liga las dos. Cada altura guarda la
    // suya y el acorde entero la del `~` de afuera.
    const nota = { t: "nota", alturas, dur, lig: false };
    this.postEventos(nota);
    return nota;
  }

  /** Lo que cuelga de una nota: ligaduras, articulaciones, digitación, texto. */
  postEventos(nota) {
    for (;;) {
      const t = this.peek();
      if (!t) return;
      if (t.tipo === "~") { this.next(); nota.lig = true; continue; }
      if (t.tipo === "(" || t.tipo === ")" || t.tipo === "[" || t.tipo === "]") { this.next(); continue; }
      if (t.tipo === "^" || t.tipo === "_" || t.tipo === "-") { this.next(); this.postEventoItem(); continue; }
      if (t.tipo === "cmd") {
        if (["(", ")", "[", "]", "<", ">", "!"].includes(t.v)) { this.next(); continue; }
        if (t.v === "tweak") { this.next(); this.next(); this.saltearValor(); continue; }
        if (SIN_EFECTO.has(t.v)) { this.next(); continue; }
        const variable = this.variables.get(t.v);
        if (variable && (variable.t === "markup" || variable.t === "texto")) { this.next(); continue; }
        return;
      }
      return;
    }
  }

  /** Lo que sigue a `^`, `_` o `-`. */
  postEventoItem() {
    const t = this.peek();
    if (!t) return;
    if (t.tipo === "cmd" && (t.v === "markup" || t.v === "markuplist")) { this.next(); this.saltearMarkup(); return; }
    if (t.tipo === "cmd" && t.v === "tweak") { this.next(); this.next(); this.saltearValor(); return; }
    this.next();
  }

  comando() {
    const t = this.next();
    const c = t.v;
    if (c === "relative") {
      let ref = null;
      if (this.es("palabra") && leerNota(this.peek().v, this.idioma)) ref = this.altura(this.next().v);
      const m = this.musica();
      return { t: "relative", ref, musica: m ?? { t: "nada" } };
    }
    if (c === "fixed") {
      const ref = this.altura(this.next().v);
      const m = this.musica();
      return { t: "fixed", ref, musica: m ?? { t: "nada" } };
    }
    if (c === "absolute" || c === "unfoldRepeats" || c === "articulate") {
      return this.musica() ?? { t: "nada" };
    }
    if (c === "transpose") {
      const de = this.altura(this.next().v);
      const a = this.altura(this.next().v);
      const m = this.musica();
      return { t: "transpose", de, a, musica: m ?? { t: "nada" } };
    }
    if (c === "repeat") {
      const tipo = this.next().v;
      const veces = Number(this.next().v);
      const m = this.musica() ?? { t: "nada" };
      const alternativas = [];
      if (this.esCmd("alternative")) {
        this.next();
        this.esperar("{");
        while (this.peek() && !this.es("}")) {
          const alt = this.musica();
          if (alt) alternativas.push(alt); else this.next();
        }
        this.esperar("}");
      }
      return { t: "repeat", tipo, veces, musica: m, alternativas };
    }
    if (c === "alternative") {
      // Una \alternative suelta (sin \repeat adelante): se toma la última.
      this.esperar("{");
      const alts = [];
      while (this.peek() && !this.es("}")) { const a = this.musica(); if (a) alts.push(a); else this.next(); }
      this.esperar("}");
      return alts[alts.length - 1] ?? { t: "nada" };
    }
    if (c === "times" || c === "tuplet") {
      const n = Number(this.next().v);
      this.esperar("/");
      const d = Number(this.next().v);
      // \tuplet 3/2 4 { }: la duración del grupo, que no cambia nada acá.
      if (this.es("num") && !this.peek().pegado) { this.duracion(false); }
      const m = this.musica() ?? { t: "nada" };
      // \times 2/3 escala por 2/3; \tuplet 3/2 es lo mismo dado vuelta.
      const factor = c === "times" ? F(n, d) : F(d, n);
      return { t: "tuplet", factor, musica: m };
    }
    if (c === "grace" || c === "acciaccatura" || c === "appoggiatura" || c === "slashedGrace") {
      return { t: "grace", musica: this.musica() ?? { t: "nada" } };
    }
    if (c === "afterGrace") {
      if (this.es("scheme") || this.es("num")) { this.next(); if (this.es("/")) { this.next(); this.next(); } }
      const principal = this.musica() ?? { t: "nada" };
      const adorno = this.musica() ?? { t: "nada" };
      return { t: "seq", items: [principal, { t: "grace", musica: adorno }] };
    }
    if (c === "new" || c === "context") {
      const tipo = this.next().v;
      let nombre = null;
      if (this.es("=")) { this.next(); nombre = this.next().v; }
      this.saltearOpcional("with");
      const m = this.musica();
      return { t: "contexto", tipo, nombre, nuevo: c === "new", musica: m ?? { t: "nada" } };
    }
    if (c === "clef") {
      const v = this.next().v;
      return { t: "clef", v: String(v).replace(/[_^]\d+$/, "") };
    }
    if (c === "key") {
      const tonica = this.altura(this.next().v);
      let modo = "major";
      if (this.es("cmd") && this.peek().v in MODOS) modo = this.next().v;
      return { t: "key", tonica, modo };
    }
    if (c === "time") {
      if (this.es("scheme")) this.next();
      const n = Number(this.next().v);
      this.esperar("/");
      const d = Number(this.next().v);
      return { t: "time", n, d };
    }
    if (c === "partial") {
      const d = this.duracion(false);
      return d ? { t: "partial", dur: d } : { t: "nada" };
    }
    if (c === "skip") {
      const d = this.duracion(false);
      const nota = { t: "nota", alturas: [], silencio: "s", dur: d ?? { ...this.ultimaDuracion, mult: null }, lig: false };
      this.postEventos(nota);
      return nota;
    }
    if (c === "tempo") { this.leerTempo(); return { t: "nada" }; }
    if (c === "change") {
      this.next(); // Staff
      this.esperar("=");
      return { t: "change", staff: String(this.next().v) };
    }
    if (c === "bar") { this.next(); return { t: "nada" }; }
    if (c === "override" || c === "set") { this.saltearAsignacion(); return { t: "nada" }; }
    if (c === "revert" || c === "unset") { this.saltearRuta(); return { t: "nada" }; }
    if (c === "once") return { t: "nada" };
    if (c === "markup" || c === "markuplist") { this.saltearMarkup(); return { t: "nada" }; }
    if (c === "with" || c === "layout" || c === "midi") { this.saltearBloque(); return { t: "nada" }; }
    if (c === "lyricmode" || c === "lyrics" || c === "addlyrics" || c === "chordmode" || c === "chords" || c === "figuremode" || c === "figures" || c === "drummode" || c === "drums") {
      this.saltearBloque(); return { t: "nada" };
    }
    if (c === "lyricsto") { this.next(); this.saltearBloque(); return { t: "nada" }; }
    if (c === "parenthesize") return this.musica() ?? { t: "nada" };
    if (c === "include") { this.incluir(this.next()); return { t: "nada" }; }
    if (c === "tag" || c === "keepWithTag" || c === "removeWithTag" || c === "pushToTag" || c === "appendToTag") {
      this.next();
      return this.musica() ?? { t: "nada" };
    }
    if (c in CON_ARGUMENTOS) {
      for (let k = 0; k < CON_ARGUMENTOS[c]; k++) this.saltearValor();
      return { t: "nada" };
    }
    if (SIN_EFECTO.has(c)) return { t: "nada" };
    if (["(", ")", "[", "]", "<", ">", "!", "\\"].includes(c)) return { t: "nada" };
    const variable = this.variables.get(c);
    if (variable) return variable.t === "markup" || variable.t === "texto" || variable.t === "nada" ? { t: "nada" } : variable;
    this.avisos.push(`El comando \\${c} no se conoce (línea ${t.linea}). Se salteó.`);
    return { t: "nada" };
  }

  /** `\tempo 4 = 120`, `\tempo "Allegro" 4 = 120`, `\tempo \markup {..}`. */
  leerTempo() {
    if (this.es("str")) this.next();
    else if (this.esCmd("markup")) { this.next(); this.saltearMarkup(); }
    if (this.es("num") && this.peek(1)?.tipo === "=" ) {
      const unidad = Number(this.next().v);
      let puntos = 0;
      while (this.es(".")) { this.next(); puntos++; }
      this.esperar("=");
      const bpm = Number(this.next().v);
      if (this.es("~") || this.es("-")) { this.next(); this.next(); }
      if (!this.tempo && bpm) this.tempo = { unidad, puntos, bpm };
    } else if (this.es("num")) {
      // \tempo 4. = 60 con el puntillo pegado al número
      const unidad = Number(this.next().v);
      let puntos = 0;
      while (this.es(".")) { this.next(); puntos++; }
      if (this.es("=")) {
        this.next();
        const bpm = Number(this.next().v);
        if (!this.tempo && bpm) this.tempo = { unidad, puntos, bpm };
      }
    }
  }
}

// ---------------------------------------------------------------------------
// El recorrido: del árbol a eventos con instante
// ---------------------------------------------------------------------------

/** ¿Este subárbol tiene notas? Para saber qué ramas de un << >> son voces. */
function tieneNotas(nodo, variables, vistos = new Set()) {
  if (!nodo || vistos.has(nodo)) return false;
  vistos.add(nodo);
  switch (nodo.t) {
    case "nota": return true;
    case "seq": return nodo.items.some((i) => tieneNotas(i, variables, vistos));
    case "sim": return nodo.ramas.some((r) => tieneNotas(r, variables, vistos));
    case "relative": case "fixed": case "transpose": case "tuplet": case "contexto":
      return tieneNotas(nodo.musica, variables, vistos);
    case "repeat":
      return tieneNotas(nodo.musica, variables, vistos) || nodo.alternativas.some((a) => tieneNotas(a, variables, vistos));
    default: return false;
  }
}

function tieneStaff(nodo) {
  if (!nodo) return false;
  switch (nodo.t) {
    case "contexto": return nodo.tipo === "Staff" || nodo.tipo === "RhythmicStaff" || nodo.tipo === "TabStaff" || tieneStaff(nodo.musica);
    case "seq": return nodo.items.some(tieneStaff);
    case "sim": return nodo.ramas.some(tieneStaff);
    case "relative": case "fixed": case "transpose": case "tuplet": case "repeat":
      return tieneStaff(nodo.musica);
    default: return false;
  }
}

const CONTEXTOS_MUDOS = new Set(["Lyrics", "Dynamics", "ChordNames", "FiguredBass", "NoteNames", "Devnull"]);

class Recorrido {
  constructor(variables, avisos) {
    this.variables = variables;
    this.avisos = avisos;
    /** Pentagramas en orden de aparición: { nombre, voces: Map<voz, eventos[]>, claves: [] } */
    this.staffs = [];
    this.porNombre = new Map();
    this.compases = []; // { t, n, d }
    this.armaduras = []; // { t, tonica, modo }
    this.partials = []; // { t, dur }
    this.barras = [];
    this.adornos = 0;
    this.repeticiones = 0;
    this.autoStaff = 0;
    this.autoVoz = 0;
  }

  staffLlamado(nombre) {
    if (nombre !== null && this.porNombre.has(nombre)) return this.porNombre.get(nombre);
    const s = { nombre: nombre ?? `#${++this.autoStaff}`, id: this.staffs.length + 1, voces: new Map(), claves: [] };
    this.staffs.push(s);
    this.porNombre.set(s.nombre, s);
    return s;
  }

  emitir(st, evento) {
    if (st.mudo) return;
    const staff = st.staff ?? this.staffLlamado(null);
    st.staff = staff;
    const voz = st.voz ?? "1";
    if (!staff.voces.has(voz)) staff.voces.set(voz, []);
    staff.voces.get(voz).push({ ...evento, voz });
  }

  /**
   * Recorre `nodo` desde el instante `t` con el estado `st`, y devuelve el
   * instante en que termina. `st` se comparte a lo largo de una secuencia
   * (la referencia de octava sigue) y se copia para cada rama de un << >>.
   */
  recorrer(nodo, st, t) {
    if (!nodo) return t;
    switch (nodo.t) {
      case "nada": case "texto": case "markup": return t;
      case "seq": {
        for (const item of nodo.items) t = this.recorrer(item, st, t);
        return t;
      }
      case "sim": return this.simultaneo(nodo, st, t);
      case "nota": return this.nota(nodo, st, t);
      case "relative": {
        const interno = { ...st, rel: nodo.ref ? { ...nodo.ref } : { letra: 3, alt: 0, oct: 0 } };
        const fin = this.recorrer(nodo.musica, interno, t);
        this.heredar(st, interno);
        return fin;
      }
      case "fixed": {
        const interno = { ...st, rel: null, fijo: nodo.ref.oct };
        const fin = this.recorrer(nodo.musica, interno, t);
        this.heredar(st, interno);
        return fin;
      }
      case "transpose": {
        const interno = {
          ...st,
          transpone: {
            letras: (nodo.a.letra + nodo.a.oct * 7) - (nodo.de.letra + nodo.de.oct * 7),
            semitonos: alturaAbsoluta(nodo.a) - alturaAbsoluta(nodo.de),
          },
        };
        const fin = this.recorrer(nodo.musica, interno, t);
        this.heredar(st, interno);
        return fin;
      }
      case "tuplet": {
        const interno = { ...st, factor: por(st.factor, nodo.factor), tuplets: [...st.tuplets, nodo.factor] };
        const fin = this.recorrer(nodo.musica, interno, t);
        this.heredar(st, interno);
        return fin;
      }
      case "grace": {
        this.adornos++;
        const interno = { ...st, mudo: true };
        this.recorrer(nodo.musica, interno, t);
        this.heredar(st, interno);
        return t;
      }
      case "repeat": {
        if (nodo.tipo === "unfold" || nodo.tipo === "percent") {
          for (let k = 0; k < nodo.veces; k++) {
            t = this.recorrer(nodo.musica, st, t);
            const alt = nodo.alternativas[Math.min(k, nodo.alternativas.length - 1)];
            if (alt) t = this.recorrer(alt, st, t);
          }
          return t;
        }
        if (nodo.tipo === "volta") this.repeticiones++;
        t = this.recorrer(nodo.musica, st, t);
        // Las alternativas que no se escriben igual mueven la referencia de octava.
        nodo.alternativas.forEach((alt, k) => {
          if (k < nodo.alternativas.length - 1) {
            const interno = { ...st, mudo: true };
            this.recorrer(alt, interno, t);
            this.heredar(st, interno);
          } else {
            t = this.recorrer(alt, st, t);
          }
        });
        return t;
      }
      case "contexto": {
        if (CONTEXTOS_MUDOS.has(nodo.tipo)) {
          const interno = { ...st, mudo: true };
          this.recorrer(nodo.musica, interno, t);
          return t;
        }
        const interno = { ...st };
        if (nodo.tipo === "Staff" || nodo.tipo === "RhythmicStaff" || nodo.tipo === "TabStaff") {
          interno.staff = nodo.nuevo && !nodo.nombre ? this.staffLlamado(null) : this.staffLlamado(nodo.nombre);
          // La voz lleva el nombre de su pentagrama: si un \change la manda a
          // la otra mano por un rato, sigue siendo otra voz que la de esa mano
          // y no se pisan.
          interno.voz = `s${interno.staff.id}`;
        } else if (nodo.tipo === "Voice" || nodo.tipo === "CueVoice") {
          interno.voz = nodo.nombre ?? `v${++this.autoVoz}`;
        }
        const fin = this.recorrer(nodo.musica, interno, t);
        this.heredar(st, interno, { staff: interno.staff === st.staff });
        return fin;
      }
      case "change": {
        st.staff = this.staffLlamado(nodo.staff);
        return t;
      }
      case "clef": {
        if (!st.mudo) {
          const staff = st.staff ?? this.staffLlamado(null);
          st.staff = staff;
          staff.claves.push({ t, v: nodo.v });
        }
        return t;
      }
      case "key": {
        if (!st.mudo) this.armaduras.push({ t, tonica: nodo.tonica, modo: nodo.modo });
        return t;
      }
      case "time": {
        if (!st.mudo) this.compases.push({ t, n: nodo.n, d: nodo.d });
        return t;
      }
      case "partial": {
        if (!st.mudo) this.partials.push({ t, dur: duracionReal(nodo.dur, F(1)) });
        return t;
      }
      case "barra": {
        if (!st.mudo) this.barras.push(t);
        return t;
      }
      default:
        return t;
    }
  }

  /** Lo que una rama interna deja atrás: la referencia de octava y el último acorde. */
  heredar(st, interno, { staff = true } = {}) {
    if (st.rel !== null && interno.rel !== null) st.rel = interno.rel;
    st.ultimoAcorde = interno.ultimoAcorde;
    // Un \change adentro de una variable o de un grupo también vale afuera;
    // un \new Staff, no: ése es de la rama.
    if (staff && interno.staff !== st.staff && interno.staff) st.staff = interno.staff;
  }

  simultaneo(nodo, st, t) {
    const conNotas = nodo.ramas.map((r) => tieneNotas(r, this.variables));
    const cuantas = conNotas.filter(Boolean).length;
    // Un << >> con varias ramas con notas y ningún pentagrama declarado, al
    // principio de todo: cada rama es un pentagrama (el caso "sin \new Staff").
    const comoStaffs = !st.staff && cuantas >= 2 && !nodo.ramas.some(tieneStaff) && this.staffs.length === 0;
    let fin = t;
    let primera = null;
    let k = 0;
    nodo.ramas.forEach((rama, i) => {
      const interno = { ...st };
      if (comoStaffs) {
        if (conNotas[i]) interno.staff = this.staffLlamado(null);
      } else if (conNotas[i]) {
        // La primera rama con notas sigue en la voz de afuera; las demás son
        // voces nuevas. Con \\ o sin \\, es lo mismo para nosotros.
        if (k > 0 && cuantas > 1) interno.voz = `${st.voz ?? "1"}/${k + 1}`;
        k++;
      }
      const finRama = this.recorrer(rama, interno, t);
      if (cmp(finRama, fin) > 0) fin = finRama;
      if (primera === null && conNotas[i]) primera = interno;
      else if (primera === null && !conNotas[i]) this.heredar(st, interno);
    });
    // La octava sigue desde la última nota de la primera rama.
    if (primera) this.heredar(st, primera);
    return fin;
  }

  nota(nodo, st, t) {
    const real = duracionReal(nodo.dur, st.factor);
    if (nodo.repite) {
      if (!st.ultimoAcorde) return suma(t, real);
      this.emitir(st, {
        t, dur: real, escrita: nodo.dur, tuplets: st.tuplets,
        alturas: st.ultimoAcorde.map((a) => ({ ...a, lig: nodo.lig })), tipo: "nota",
      });
      return suma(t, real);
    }
    if (nodo.silencio) {
      this.emitir(st, {
        t, dur: real, escrita: nodo.dur, tuplets: st.tuplets, alturas: [],
        tipo: nodo.silencio === "s" ? "espacio" : "silencio",
      });
      return suma(t, real);
    }
    // Las alturas: relativas a la anterior, y adentro del acorde a la anterior
    // del acorde. La referencia que queda es la primera nota del acorde.
    const alturas = [];
    let ref = st.rel;
    let primeraRef = null;
    for (const a of nodo.alturas) {
      let abs;
      if (st.rel === null) {
        abs = { letra: a.letra, alt: a.alt, oct: a.oct + (st.fijo ?? 0) };
      } else {
        abs = relativa(a, ref);
        ref = abs;
        primeraRef ??= abs;
      }
      alturas.push({ ...abs, lig: Boolean(a.lig || nodo.lig) });
    }
    if (st.rel !== null && primeraRef) st.rel = primeraRef;
    const sonando = alturas.map((a) => (st.transpone ? transponer(a, st.transpone) : a));
    st.ultimoAcorde = sonando.map(({ letra, alt, oct }) => ({ letra, alt, oct }));
    this.emitir(st, { t, dur: real, escrita: nodo.dur, tuplets: st.tuplets, alturas: sonando, tipo: "nota" });
    return suma(t, real);
  }
}

/** La octava de `a` a menos de una quinta de `ref`, más las comillas. */
function relativa(a, ref) {
  const nr = ref.oct * 7 + ref.letra;
  let n = ref.oct * 7 + a.letra;
  while (n - nr > 3) n -= 7;
  while (nr - n > 3) n += 7;
  n += a.oct * 7;
  return { letra: a.letra, alt: a.alt, oct: Math.floor(n / 7) };
}

function transponer(a, { letras, semitonos }) {
  const n = a.oct * 7 + a.letra + letras;
  const letra = ((n % 7) + 7) % 7;
  const oct = Math.floor(n / 7);
  const alt = alturaAbsoluta(a) + semitonos - (oct * 12 + SEMITONOS[letra]);
  return { letra, alt, oct, lig: a.lig };
}

/** Semitonos desde el Do de la octava 0 (c = 48 en MIDI, así que sumamos 48). */
const alturaAbsoluta = (a) => a.oct * 12 + SEMITONOS[a.letra] + a.alt;

function duracionReal(dur, factor) {
  let d = dur.escrita;
  // Un puntillo suma la mitad, dos suman la mitad y el cuarto.
  let extra = dur.escrita;
  for (let k = 0; k < dur.puntos; k++) { extra = por(extra, F(1, 2)); d = suma(d, extra); }
  if (dur.mult) d = por(d, dur.mult);
  return por(d, factor);
}

// ---------------------------------------------------------------------------
// De eventos a MusicXML
// ---------------------------------------------------------------------------

const TIPOS = [
  [F(4), "long"], [F(2), "breve"], [F(1), "whole"], [F(1, 2), "half"], [F(1, 4), "quarter"],
  [F(1, 8), "eighth"], [F(1, 16), "16th"], [F(1, 32), "32nd"], [F(1, 64), "64th"],
  [F(1, 128), "128th"], [F(1, 256), "256th"],
];

/**
 * Una duración escrita (ya sin el factor del tresillo) en figuras con
 * puntillo: la figura justa si existe, y si no, de la más larga a la más
 * corta, ligadas. Devuelve null si no cierra ni así.
 */
function figuras(escrita) {
  const opciones = [];
  for (const [base, tipo] of TIPOS) {
    opciones.push({ tipo, puntos: 0, dur: base });
    opciones.push({ tipo, puntos: 1, dur: por(base, F(3, 2)) });
    opciones.push({ tipo, puntos: 2, dur: por(base, F(7, 4)) });
  }
  const justa = opciones.find((o) => cmp(o.dur, escrita) === 0);
  if (justa) return [justa];
  opciones.sort((a, b) => cmp(b.dur, a.dur));
  const partes = [];
  let falta = escrita;
  for (const o of opciones) {
    if (o.puntos === 2) continue;
    while (cmp(falta, o.dur) >= 0) { partes.push(o); falta = resta(falta, o.dur); }
  }
  return falta.n === 0 ? partes : null;
}

const CLAVES = {
  treble: ["G", 2], violin: ["G", 2], G: ["G", 2], bass: ["F", 4], F: ["F", 4],
  alto: ["C", 3], tenor: ["C", 4], soprano: ["C", 1], mezzosoprano: ["C", 2], baritone: ["C", 5],
  subbass: ["F", 5], varbaritone: ["F", 3], percussion: ["percussion", 2],
};

const MODOS = { major: 0, ionian: 0, minor: -3, aeolian: -3, dorian: -2, phrygian: -4, lydian: 1, mixolydian: -1, locrian: -5 };

/** La armadura como cantidad de alteraciones, por el círculo de quintas. */
function fifthsDe(tonica, modo) {
  // Do=0, Sol=1, Re=2, La=3, Mi=4, Si=5, Fa=-1; cada sostenido suma 7, cada bemol resta 7.
  const porLetra = [0, 2, 4, -1, 1, 3, 5];
  return porLetra[tonica.letra] + tonica.alt * 7 + (MODOS[modo] ?? 0);
}

function escapar(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function aMusicXml({ staffs, compases, armaduras, partials = [], barras = [], header, tempo, avisos }) {
  // Dos pentagramas como mucho: la derecha y la izquierda.
  if (staffs.length > 2) avisos.push(`La partitura tiene ${staffs.length} pentagramas y sólo entran dos. Se tomaron los dos primeros.`);
  let pentagramas = staffs.slice(0, 2);
  // Si el primero está en clave de Fa y el segundo en clave de Sol, están al revés.
  if (pentagramas.length === 2) {
    const clave = (s) => s.claves[0]?.v;
    if (/^(bass|F)$/.test(clave(pentagramas[0]) ?? "") && /^(treble|violin|G)$/.test(clave(pentagramas[1]) ?? "")) {
      pentagramas = [pentagramas[1], pentagramas[0]];
      avisos.push("El pentagrama de arriba estaba en clave de Fa: se dieron vuelta las manos.");
    }
  }

  // Todos los eventos, con su pentagrama y su voz numerada de corrido.
  const eventos = [];
  let numeroVoz = 0;
  pentagramas.forEach((s, i) => {
    for (const [, lista] of s.voces) {
      numeroVoz++;
      for (const e of lista) eventos.push({ ...e, staff: i + 1, voz: numeroVoz });
    }
  });
  const fin = eventos.reduce((m, e) => (cmp(suma(e.t, e.dur), m) > 0 ? suma(e.t, e.dur) : m), CERO);

  // La grilla de compases: el primero puede ser una anacrusa.
  const cambios = [...compases].sort((a, b) => cmp(a.t, b.t));
  const compasEn = (t) => {
    let actual = { n: 4, d: 4 };
    for (const c of cambios) if (cmp(c.t, t) <= 0) actual = c;
    return actual;
  };
  // Un \partial al principio es la anacrusa; uno en el medio (después de una
  // repetición, típicamente) acorta el compás que arranca ahí.
  const medidas = [];
  let t = CERO;
  const partial = partials.find((p) => p.t.n === 0);
  while ((cmp(t, fin) < 0 || (medidas.length === 0 && partial)) && medidas.length < 5000) {
    const c = compasEn(t);
    const p = partials.find((x) => cmp(x.t, t) === 0);
    const largo = p && p.dur.n > 0 ? p.dur : F(c.n, c.d);
    medidas.push({ desde: t, hasta: suma(t, largo), compas: c });
    t = suma(t, largo);
  }

  // Las barras que escribió el autor tienen que caer en las nuestras. Si no,
  // alguna duración se leyó mal, y ningún otro aviso lo diría.
  const bordes = new Set(medidas.map((m) => `${m.desde.n}/${m.desde.d}`));
  bordes.add(`${fin.n}/${fin.d}`);
  const sueltas = [...new Set(barras.map((b) => `${b.n}/${b.d}`))].filter((b) => !bordes.has(b));
  if (sueltas.length) {
    const [n, d] = sueltas[0].split("/").map(Number);
    const compasDe = medidas.findIndex((m) => cmp(m.hasta, F(n, d)) > 0) + 1;
    avisos.push(`${sueltas.length} barras de compás del archivo no caen donde caen las nuestras (la primera, en el compás ${compasDe || "?"}). Alguna duración se leyó mal.`);
  }

  // Divisiones por negra: el mínimo que hace enteras a todas las duraciones.
  let divisiones = 1;
  const mcm = (a, b) => (a * b) / mcd(a, b);
  for (const e of eventos) {
    divisiones = mcm(divisiones, por(e.dur, F(4)).d);
    divisiones = mcm(divisiones, por(e.t, F(4)).d);
  }
  for (const m of medidas) divisiones = mcm(divisiones, por(m.hasta, F(4)).d);
  const div = (dur) => Math.round(num(por(dur, F(4 * divisiones))));

  const armadura = [...armaduras].sort((a, b) => cmp(a.t, b.t))[0];
  const fifths = armadura ? fifthsDe(armadura.tonica, armadura.modo) : 0;
  const modo = armadura && (MODOS[armadura.modo] ?? 0) <= -3 ? "minor" : "major";
  if (armaduras.length > 1) {
    const distintas = new Set(armaduras.map((a) => `${fifthsDe(a.tonica, a.modo)}`));
    if (distintas.size > 1) avisos.push("La armadura cambia en el medio. Se escribió la primera; el importador va a avisar lo mismo.");
  }

  const lineas = [];
  const w = (s) => lineas.push(s);
  w('<?xml version="1.0" encoding="UTF-8"?>');
  w('<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">');
  w('<score-partwise version="4.0">');
  const titulo = header.title ?? header.mutopiatitle ?? "";
  w(`  <work><work-title>${escapar(titulo)}</work-title></work>`);
  w("  <identification>");
  if (header.composer) w(`    <creator type="composer">${escapar(header.composer)}</creator>`);
  if (header.copyright || header.license) w(`    <rights>${escapar(header.copyright ?? header.license)}</rights>`);
  w("    <encoding><software>clases-de-piano/lilypond-a-musicxml</software></encoding>");
  w("  </identification>");
  w('  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>');
  w('  <part id="P1">');

  // Ligaduras pendientes por voz: qué alturas esperan su "stop".
  const pendientes = new Map();
  const clave = (a) => `${a.letra}/${a.alt}/${a.oct}`;
  let compasActual = null;

  medidas.forEach((m, k) => {
    const numeroCompas = k + 1;
    const largo = div(resta(m.hasta, m.desde));
    w(`    <measure number="${numeroCompas}"${k === 0 && partial ? ' implicit="yes"' : ""}>`);
    const attrs = [];
    if (k === 0) {
      attrs.push(`<divisions>${divisiones}</divisions>`);
      attrs.push(`<key><fifths>${fifths}</fifths><mode>${modo}</mode></key>`);
    }
    if (!compasActual || compasActual.n !== m.compas.n || compasActual.d !== m.compas.d) {
      attrs.push(`<time><beats>${m.compas.n}</beats><beat-type>${m.compas.d}</beat-type></time>`);
      compasActual = m.compas;
    }
    if (k === 0) {
      attrs.push(`<staves>${pentagramas.length}</staves>`);
      pentagramas.forEach((s, i) => {
        const c = s.claves.find((x) => cmp(x.t, m.desde) <= 0) ?? s.claves[0];
        const [sign, line] = CLAVES[c?.v] ?? (i === 0 ? ["G", 2] : ["F", 4]);
        attrs.push(`<clef number="${i + 1}"><sign>${sign}</sign><line>${line}</line></clef>`);
      });
    } else {
      pentagramas.forEach((s, i) => {
        const aca = s.claves.filter((x) => cmp(x.t, m.desde) >= 0 && cmp(x.t, m.hasta) < 0);
        // Los cambios de clave del medio del compás se anotan al principio: a
        // nuestro importador le dan igual y a la vista completa le sirven.
        for (const c of aca) {
          const [sign, line] = CLAVES[c.v] ?? ["G", 2];
          attrs.push(`<clef number="${i + 1}"><sign>${sign}</sign><line>${line}</line></clef>`);
        }
      });
    }
    if (attrs.length) w(`      <attributes>${attrs.join("")}</attributes>`);
    if (k === 0 && tempo) {
      const unidad = TIPOS.find(([b]) => cmp(b, F(1, tempo.unidad)) === 0)?.[1] ?? "quarter";
      w(`      <direction placement="above"><direction-type><metronome><beat-unit>${unidad}</beat-unit>${"<beat-unit-dot/>".repeat(tempo.puntos)}<per-minute>${tempo.bpm}</per-minute></metronome></direction-type><sound tempo="${tempo.bpm}"/></direction>`);
    }

    // Las voces, una después de la otra, volviendo el reloj con <backup>.
    const voces = [...new Set(eventos.filter((e) => cmp(e.t, m.desde) >= 0 && cmp(e.t, m.hasta) < 0).map((e) => e.voz))].sort((a, b) => a - b);
    // Y las que entraron antes y siguen sonando en este compás (una nota
    // cruzando la barra): se parten acá.
    const cruzan = eventos.filter((e) => cmp(e.t, m.desde) < 0 && cmp(suma(e.t, e.dur), m.desde) > 0);
    for (const e of cruzan) if (!voces.includes(e.voz)) voces.push(e.voz);
    voces.sort((a, b) => a - b);

    voces.forEach((voz, idxVoz) => {
      let cursor = m.desde;
      const propios = eventos
        .filter((e) => e.voz === voz && cmp(suma(e.t, e.dur), m.desde) > 0 && cmp(e.t, m.hasta) < 0)
        .sort((a, b) => cmp(a.t, b.t));
      for (const e of propios) {
        const desde = cmp(e.t, m.desde) < 0 ? m.desde : e.t;
        const hastaReal = suma(e.t, e.dur);
        const hasta = cmp(hastaReal, m.hasta) > 0 ? m.hasta : hastaReal;
        if (cmp(desde, cursor) > 0) {
          w(`      <forward><duration>${div(resta(desde, cursor))}</duration></forward>`);
          cursor = desde;
        }
        if (cmp(desde, cursor) < 0) continue; // encimada: la deja pasar el importador con su aviso
        const partida = cmp(e.t, m.desde) < 0 || cmp(hastaReal, m.hasta) > 0;
        const dur = resta(hasta, desde);
        let factor = e.tuplets.reduce((f, x) => por(f, x), F(1));
        if (e.tipo === "espacio") {
          w(`      <forward><duration>${div(dur)}</duration></forward>`);
          cursor = hasta;
          continue;
        }
        // La figura escrita, si la nota no se partió; si no, se deduce.
        let piezas;
        if (!partida && e.escrita && !e.escrita.mult) {
          const tipo = TIPOS.find(([b]) => cmp(b, e.escrita.escrita) === 0)?.[1];
          piezas = tipo ? [{ tipo, puntos: e.escrita.puntos, dur: entre(dur, factor) }] : figuras(entre(dur, factor));
        } else {
          piezas = figuras(entre(dur, factor));
        }
        // `c4*2/3`, la forma vieja de escribir un tresillo: el multiplicador
        // hace de factor irregular si sin él la duración no es ninguna figura.
        if (!piezas && e.escrita?.mult) {
          factor = por(factor, e.escrita.mult);
          piezas = figuras(entre(dur, factor));
        }
        if (!piezas) {
          avisos.push(`Compás ${numeroCompas}: una duración de ${dur.n}/${dur.d} de redonda no es ninguna figura. Se salteó.`);
          w(`      <forward><duration>${div(dur)}</duration></forward>`);
          cursor = hasta;
          continue;
        }
        const ligaAlFinal = cmp(hastaReal, m.hasta) > 0;
        piezas.forEach((p, idxPieza) => {
          const durPieza = por(p.dur, factor);
          const ultima = idxPieza === piezas.length - 1;
          const tm = factor.n !== factor.d
            ? `<time-modification><actual-notes>${factor.d}</actual-notes><normal-notes>${factor.n}</normal-notes></time-modification>`
            : "";
          if (e.tipo === "silencio") {
            pendientes.set(voz, new Set());
            w(`      <note><rest/><duration>${div(durPieza)}</duration><voice>${voz}</voice><type>${p.tipo}</type>${"<dot/>".repeat(p.puntos)}${tm}<staff>${e.staff}</staff></note>`);
          } else {
            const pend = pendientes.get(voz) ?? new Set();
            e.alturas.forEach((a, idxAltura) => {
              const k2 = clave(a);
              const viene = pend.has(k2);
              const sigue = !ultima || a.lig || ligaAlFinal;
              const ties = `${viene ? '<tie type="stop"/>' : ""}${sigue ? '<tie type="start"/>' : ""}`;
              const tied = `${viene ? '<tied type="stop"/>' : ""}${sigue ? '<tied type="start"/>' : ""}`;
              w(
                `      <note>${idxAltura > 0 ? "<chord/>" : ""}<pitch><step>${LETRAS[a.letra].toUpperCase()}</step>${a.alt ? `<alter>${a.alt}</alter>` : ""}<octave>${a.oct + 3}</octave></pitch><duration>${div(durPieza)}</duration>${ties}<voice>${voz}</voice><type>${p.tipo}</type>${"<dot/>".repeat(p.puntos)}${tm}<staff>${e.staff}</staff>${tied ? `<notations>${tied}</notations>` : ""}</note>`,
              );
            });
            // Lo que queda esperando su "stop": las alturas de esta nota que ligan.
            const nuevas = new Set();
            e.alturas.forEach((a) => {
              const sigue = !ultima || a.lig || ligaAlFinal;
              if (sigue) nuevas.add(clave(a));
            });
            pendientes.set(voz, nuevas);
          }
        });
        cursor = hasta;
      }
      if (cmp(cursor, m.hasta) < 0) w(`      <forward><duration>${div(resta(m.hasta, cursor))}</duration></forward>`);
      if (idxVoz < voces.length - 1) w(`      <backup><duration>${largo}</duration></backup>`);
    });
    w("    </measure>");
  });
  w("  </part>");
  w("</score-partwise>");
  return lineas.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// Todo junto
// ---------------------------------------------------------------------------

export function convertir(texto, dir = ".") {
  const avisos = [];
  const idioma =
    /\\language\s+"english"|\\include\s+"english\.ly"/.test(texto) ? "english"
    : /\\language\s+"deutsch"|\\include\s+"deutsch\.ly"/.test(texto) ? "deutsch"
    : "nederlands";
  if (/\\language\s+"(italiano|espanol|francais|svenska|norsk|suomi|catalan|portugues|vlaams)"/.test(texto)) {
    avisos.push("El archivo usa nombres de notas que no leemos (ni holandés, ni inglés, ni alemán).");
  }
  const variables = new Map();
  const parser = new Parser(tokenizar(texto), idioma, variables, avisos, dir);
  parser.archivo();
  if (!parser.partituras.length) throw new Error("No se encontró ningún \\score ni música suelta en el archivo.");
  if (parser.partituras.length > 1) avisos.push(`Hay ${parser.partituras.length} \\score en el archivo. Se tomó el primero.`);

  const recorrido = new Recorrido(variables, avisos);
  const estado = { staff: null, voz: "1", rel: null, factor: F(1), tuplets: [], mudo: false, transpone: null, ultimoAcorde: null };
  recorrido.recorrer(parser.partituras[0], estado, CERO);
  if (recorrido.adornos) avisos.push(`Hay ${recorrido.adornos} grupos de notas de adorno y se saltearon.`);
  if (recorrido.repeticiones) {
    avisos.push(`Hay ${recorrido.repeticiones} repeticiones (\\repeat volta) y no se escribieron: cada sección va una vez, con su última alternativa.`);
  }
  if (recorrido.staffs.length < 2) avisos.push("Se encontró un solo pentagrama.");
  const xml = aMusicXml({
    staffs: recorrido.staffs,
    compases: recorrido.compases,
    armaduras: recorrido.armaduras,
    partials: recorrido.partials,
    barras: recorrido.barras,
    header: parser.header,
    tempo: parser.tempo,
    avisos,
  });
  return { xml, avisos: [...new Set(avisos)], header: parser.header, compases: (xml.match(/<measure /g) ?? []).length };
}

function principal() {
  const args = process.argv.slice(2);
  const archivo = args.find((a) => !a.startsWith("-"));
  if (!archivo) {
    console.error("Uso: node --experimental-strip-types scripts/lilypond-a-musicxml.mjs pieza.ly [-o pieza.musicxml]");
    process.exit(1);
  }
  const i = args.indexOf("-o");
  const salida = i >= 0 ? args[i + 1] : archivo.replace(/\.ly$/, "") + ".musicxml";
  const { xml, avisos, compases } = convertir(readFileSync(archivo, "utf8"), dirname(archivo));
  writeFileSync(salida, xml);
  console.error(`// ${salida}: ${compases} compases`);
  if (avisos.length) {
    console.error("// Lo que se perdió o se supuso:");
    for (const a of avisos) console.error(`//   · ${a}`);
  } else {
    console.error("// Entró todo.");
  }
}

if (process.argv[1]?.endsWith("lilypond-a-musicxml.mjs")) principal();
