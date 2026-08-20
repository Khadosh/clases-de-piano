import {
  CHORD_QUALITIES,
  LETRAS_ES,
  LETRAS_PC,
  NOMBRES_INVERSION,
  bajoDeInversion,
  cantidadDeInversiones,
  chordNameEs,
  chordPitches,
  deletrearAcorde,
  escribirNota,
  invertir,
  notasDeAcorde,
  notasDeInversion,
  pickRandom,
  shuffle,
  simboloConBajo,
  stackLabel,
  type ChordQuality,
  type Pitch,
} from "./music";
import {
  FIGURAS,
  aCompuesto,
  compasTexto,
  esCompuesto,
  partesPorTiempo,
  subdivisionDe,
  tiemposDe,
  type Compas,
} from "./ritmo";
import {
  enPalabras,
  nombreDeOpcion,
  rondaCompletar,
  rondaNumero,
} from "./compasQuiz.ts";
import { FUNCIONES, FUNCION_DE_GRADO, TONALIDAD_MAYOR } from "./grados.ts";

/**
 * Las preguntas del examen de cada clase.
 *
 * No están escritas a mano: se generan a partir de lo que la clase tocó. Eso
 * hace dos cosas que importan. Una, que agregar una clase nueva traiga su
 * examen sin escribir nada. Dos, que el examen sea distinto cada vez, así se
 * aprende la receta en vez de memorizar las respuestas.
 */

export type Pregunta =
  | {
      tipo: "opciones";
      consigna: string;
      /** Se muestra grande arriba, tipo el cifrado del dictado. */
      destacado?: string;
      opciones: string[];
      correcta: number;
      explicacion: string;
    }
  | {
      tipo: "armar";
      consigna: string;
      destacado: string;
      /** Las notas que hay que apretar, con su octava de referencia. */
      pitches: Pitch[];
      /** Las mismas, escritas como se llaman en este acorde ("Sol♭", no "Fa♯"). */
      notas: string[];
      explicacion: string;
    };

const BASE = 48; // Do3, para que entren las inversiones sin irse del teclado

/** Tres recetas distintas de la correcta, para las opciones equivocadas. */
function recetasDistractoras(q: ChordQuality, pozo: ChordQuality[]): string[] {
  const otras = pozo.filter((o) => stackLabel(o) !== stackLabel(q));
  const vistas = new Set<string>();
  const out: string[] = [];
  for (const o of shuffle(otras)) {
    const s = stackLabel(o);
    if (vistas.has(s)) continue;
    vistas.add(s);
    out.push(s);
    if (out.length === 3) break;
  }
  // Si la clase tiene pocos acordes, se inventan recetas plausibles.
  while (out.length < 3) {
    const falsa = q.stack.map((n) => n + (Math.random() < 0.5 ? 1 : -1)).join(" + ");
    if (!vistas.has(falsa) && falsa !== stackLabel(q)) {
      vistas.add(falsa);
      out.push(falsa);
    }
  }
  return out;
}

function conOpciones(
  consigna: string,
  correcta: string,
  distractoras: string[],
  explicacion: string,
  destacado?: string,
): Pregunta {
  const opciones = shuffle([correcta, ...distractoras]);
  return {
    tipo: "opciones",
    consigna,
    destacado,
    opciones,
    correcta: opciones.indexOf(correcta),
    explicacion,
  };
}

// ---------------------------------------------------------------------------
// Las preguntas, una fábrica por tipo
// ---------------------------------------------------------------------------

function preguntaReceta(pozo: ChordQuality[]): Pregunta {
  const q = pickRandom(pozo);
  return conOpciones(
    `¿Cuál es la receta de un acorde ${q.name.toLowerCase()}?`,
    stackLabel(q),
    recetasDistractoras(q, pozo),
    `${q.name}: ${stackLabel(q)} semitonos. ${q.vibe}`,
  );
}

function preguntaCifrado(pozo: ChordQuality[]): Pregunta {
  const q = pickRandom(pozo);
  const root = Math.floor(Math.random() * 12);
  const notas = notasDeAcorde(root, q).join(" · ");
  const distractoras = new Set<string>();
  let guard = 0;
  while (distractoras.size < 3 && guard++ < 100) {
    const otra = pickRandom(pozo);
    const otroRoot =
      Math.random() < 0.5 ? root : Math.floor(Math.random() * 12);
    const cand = notasDeAcorde(otroRoot, otra).join(" · ");
    if (cand !== notas) distractoras.add(cand);
  }
  return conOpciones(
    "¿Qué notas tiene este acorde?",
    notas,
    [...distractoras],
    `${chordNameEs(root, q)} se arma contando ${stackLabel(q)} desde ${notasDeAcorde(root, q)[0]}.`,
    simboloConBajo(root, q, 0),
  );
}

function preguntaArmar(pozo: ChordQuality[], conInversiones: boolean): Pregunta {
  const q = pickRandom(pozo);
  const root = Math.floor(Math.random() * 12);
  const inv = conInversiones
    ? Math.floor(Math.random() * (cantidadDeInversiones(q) + 1))
    : 0;
  const pitches = invertir(chordPitches(BASE + root, q), inv);
  return {
    tipo: "armar",
    consigna:
      inv === 0
        ? "Armalo en el teclado."
        : "Armalo en el teclado, con el bajo que pide.",
    destacado: simboloConBajo(root, q, inv),
    pitches,
    notas: notasDeInversion(root, q, inv),
    explicacion:
      inv === 0
        ? `${chordNameEs(root, q)}: ${stackLabel(q)} desde ${notasDeAcorde(root, q)[0]}.`
        : `Es ${chordNameEs(root, q)} en ${NOMBRES_INVERSION[inv]}: las mismas notas, pero con ${bajoDeInversion(root, q, inv)} abajo de todo.`,
  };
}

/** Los dos lugares del teclado sin tecla negra en el medio. */
function preguntaSemitonos(): Pregunta {
  const pares: [string, string, number][] = [
    ["mi", "fa", 1],
    ["si", "do", 1],
    ["do", "re", 2],
    ["re", "mi", 2],
    ["fa", "sol", 2],
    ["sol", "la", 2],
    ["la", "si", 2],
  ];
  const [a, b, n] = pickRandom(pares);
  return conOpciones(
    `¿Cuántos semitonos hay de ${a} a ${b}?`,
    String(n),
    [String(n === 1 ? 2 : 1), String(n + 2), "medio"],
    n === 1
      ? `Uno solo: entre ${a} y ${b} no hay tecla negra en el medio. Por eso ${a}♯ es ${b}.`
      : `Dos: entre ${a} y ${b} hay una tecla negra en el medio.`,
  );
}

function preguntaInversion(pozo: ChordQuality[]): Pregunta {
  const q = pickRandom(pozo.filter((x) => cantidadDeInversiones(x) >= 2) ?? pozo);
  const root = Math.floor(Math.random() * 12);
  const inv = 1 + Math.floor(Math.random() * cantidadDeInversiones(q));
  const escritas = deletrearAcorde(root, q);
  const correcta = escribirNota(escritas[inv]);
  // Las trampas son las otras notas del mismo acorde: la pregunta es si leíste
  // la barra, no si sabés notas sueltas. Si falta, se completa con letras de
  // afuera, y se descartan por tecla y no por nombre: Sol♭ y Fa♯ se escriben
  // distinto y son la misma respuesta.
  const teclasUsadas = new Set(escritas.map((n) => n.pc));
  const otras = escritas.filter((_, i) => i !== inv).map((n) => escribirNota(n));
  for (const i of shuffle([0, 1, 2, 3, 4, 5, 6])) {
    if (otras.length >= 3) break;
    if (teclasUsadas.has(LETRAS_PC[i])) continue;
    teclasUsadas.add(LETRAS_PC[i]);
    otras.push(LETRAS_ES[i]);
  }
  return conOpciones(
    `¿Qué nota queda abajo de todo?`,
    correcta,
    shuffle(otras).slice(0, 3),
    `La barra dice cuál va en el bajo. ${simboloConBajo(root, q, inv)} es ${chordNameEs(root, q)} con ${correcta} abajo.`,
    simboloConBajo(root, q, inv),
  );
}

/** ¿Cuántas veces entra esta figura en una redonda? */
function preguntaFigura(): Pregunta {
  const f = pickRandom(FIGURAS.filter((x) => x.divide > 1));
  const otras = FIGURAS.filter((x) => x.divide !== f.divide).map((x) =>
    String(x.divide),
  );
  return conOpciones(
    `¿Cuántas veces entra una ${f.nombre} en una redonda?`,
    String(f.divide),
    shuffle(otras).slice(0, 3),
    `${f.divide}. Y por eso el ${f.divide} de un compás quiere decir "la ${f.nombre}": el número de abajo no cuenta nada, dice en cuántas partes se corta la redonda.`,
  );
}

/** Simple o compuesto, y qué se cuenta en cada uno. */
function preguntaCompas(): Pregunta {
  const compases: Compas[] = [
    { numerador: 2, denominador: 4 },
    { numerador: 3, denominador: 4 },
    { numerador: 4, denominador: 4 },
    { numerador: 6, denominador: 8 },
    { numerador: 9, denominador: 8 },
    { numerador: 12, denominador: 8 },
  ];
  const c = pickRandom(compases);
  // Dos formas de preguntar lo mismo, para que no se aprenda la lista de
  // memoria: cuántos tiempos se cuentan, o en cuánto se parte cada uno.
  if (Math.random() < 0.5) {
    return conOpciones(
      `En ${compasTexto(c)}, ¿cuántos tiempos se cuentan?`,
      String(tiemposDe(c)),
      shuffle(
        [1, 2, 3, 4, 6, 9, 12]
          .filter((n) => n !== tiemposDe(c))
          .map(String),
      ).slice(0, 3),
      esCompuesto(c)
        ? `${tiemposDe(c)}. Es compuesto: el ${c.numerador} son corcheas escritas, y se agrupan de a tres. El pulso es la negra con puntillo, no la corchea.`
        : `${tiemposDe(c)}, que es justo lo que dice el numerador. En los simples es directo; en los compuestos no.`,
    );
  }
  return conOpciones(
    `En ${compasTexto(c)}, ¿en cuántas partes se divide cada tiempo?`,
    String(partesPorTiempo(c)),
    shuffle(["1", "2", "3", "4"].filter((n) => n !== String(partesPorTiempo(c)))).slice(0, 3),
    `En ${compasTexto(c)} la subdivisión es ${subdivisionDe(c)}: cada tiempo se parte en ${partesPorTiempo(c)}.`,
  );
}

/** La constante del profe: de simple a compuesto. */
function preguntaConstante(): Pregunta {
  const simple = pickRandom<Compas>([
    { numerador: 2, denominador: 4 },
    { numerador: 3, denominador: 4 },
    { numerador: 4, denominador: 4 },
  ]);
  const correcto = compasTexto(aCompuesto(simple));
  const trampas = [
    // Las trampas son los errores plausibles: multiplicar los dos por lo
    // mismo, o sólo uno de los dos.
    `${simple.numerador * 3}/${simple.denominador}`,
    `${simple.numerador * 2}/${simple.denominador * 2}`,
    `${simple.numerador}/${simple.denominador * 2}`,
  ].filter((t) => t !== correcto);
  return conOpciones(
    `¿En qué compás compuesto se convierte ${compasTexto(simple)}?`,
    correcto,
    trampas.slice(0, 3),
    `Se multiplica por 3/2: el numerador por 3 y el denominador por 2. ${compasTexto(simple)} → ${correcto}.`,
    compasTexto(simple),
  );
}

// ---------------------------------------------------------------------------

/**
 * El presupuesto del compás, en las dos direcciones: del contenido al número y
 * del número a la figura que falta. Son las mismas rondas de la sala
 * (`lib/compasQuiz.ts`), contadas en texto.
 */
function preguntaPresupuesto(): Pregunta {
  if (Math.random() < 0.5) {
    const r = rondaNumero(Math.random);
    return conOpciones(
      `Un compás tiene ${enPalabras(r.figuras)} y cierra justo. ¿Qué compás es?`,
      nombreDeOpcion(r.compas),
      r.opciones
        .filter((o) => o !== r.compas)
        .map(nombreDeOpcion)
        .slice(0, 3),
      `${enPalabras(r.figuras)} llenan justo el presupuesto de ${nombreDeOpcion(r.compas)}. Es la segunda lectura de los dos números: cuánto entra.`,
    );
  }
  const r = rondaCompletar(Math.random);
  const nombreDe = (f: (typeof r.opciones)[number]) =>
    `${f.figura.nombre}${f.puntillo ? " con puntillo" : ""}`;
  return conOpciones(
    `Un compás de ${nombreDeOpcion(r.compas)} ya tiene ${enPalabras(r.figuras)}. ¿Qué figura lo cierra justo?`,
    nombreDe(r.falta),
    r.opciones.filter((o) => o !== r.falta).map(nombreDe).slice(0, 3),
    `Faltaba ${nombreDe(r.falta)}: lo puesto no llega a llenar el presupuesto de ${nombreDeOpcion(r.compas)}.`,
  );
}

/**
 * Las funciones armónicas de la clase 3: qué familia es cada grado, y las
 * cadencias con su nombre.
 */
function preguntaFuncion(): Pregunta {
  if (Math.random() < 0.5) {
    const g = Math.floor(Math.random() * 7);
    const f = FUNCION_DE_GRADO[g];
    const nombres = {
      reposo: "reposo (tónica)",
      subdominante: "media tensión (subdominante)",
      dominante: "tensión (dominante)",
    } as const;
    const correcta = nombres[f];
    return conOpciones(
      `En el campo armónico mayor, ¿qué función cumple el ${TONALIDAD_MAYOR[g].cifra}?`,
      correcta,
      Object.values(nombres).filter((n) => n !== correcta),
      `${TONALIDAD_MAYOR[g].cifra}: ${FUNCIONES[f].papel} Reposo son I, IIIm y VIm; tensión son V y VII°; media tensión son IIm y IV.`,
    );
  }
  const cadencias = [
    { nombre: "Auténtica", forma: "V → I" },
    { nombre: "Rota o de engaño", forma: "V → VIm" },
    { nombre: "Plagal", forma: "V → IV → I" },
  ];
  const c = pickRandom(cadencias);
  return conOpciones(
    `¿Cómo se llama la cadencia ${c.forma}?`,
    c.nombre,
    cadencias.filter((o) => o.nombre !== c.nombre).map((o) => o.nombre),
    `${c.forma} es la ${c.nombre.toLowerCase()}. Auténtica V→I, rota V→VIm (promete el I y aterriza en el relativo), plagal V→IV→I con la subdominante en el medio.`,
  );
}

export interface OpcionesExamen {
  /** Ids de acordes que la clase tocó. Si está vacío, no hay examen. */
  qualityIds: string[];
  /** ¿La clase vio inversiones? */
  inversiones: boolean;
  /** ¿La clase vio lo de los semitonos? */
  semitonos: boolean;
  /** ¿Vio las figuras y el árbol de división? */
  figuras?: boolean;
  /** ¿Vio compases simples y compuestos? */
  compases?: boolean;
  /** ¿Vio las funciones armónicas? */
  funciones?: boolean;
  cantidad?: number;
}

/**
 * Arma un examen mezclando los tipos de pregunta que la clase habilita.
 * Siempre hay al menos una de armar en el teclado: es la única que no se puede
 * contestar de casualidad.
 */
export function generarExamen({
  qualityIds,
  inversiones,
  semitonos,
  figuras,
  compases,
  funciones,
  cantidad = 8,
}: OpcionesExamen): Pregunta[] {
  const pozo = qualityIds
    .map((id) => CHORD_QUALITIES.find((q) => q.id === id))
    .filter((q): q is ChordQuality => Boolean(q));
  if (pozo.length === 0) return [];

  const fabricas: (() => Pregunta)[] = [
    () => preguntaReceta(pozo),
    () => preguntaCifrado(pozo),
    () => preguntaArmar(pozo, false),
    () => preguntaArmar(pozo, inversiones),
  ];
  if (semitonos) fabricas.push(preguntaSemitonos);
  if (inversiones) {
    fabricas.push(() => preguntaInversion(pozo));
    fabricas.push(() => preguntaArmar(pozo, true));
  }
  if (figuras) fabricas.push(preguntaFigura);
  if (compases) {
    fabricas.push(preguntaCompas);
    fabricas.push(preguntaConstante);
    fabricas.push(preguntaPresupuesto);
  }
  if (funciones) fabricas.push(preguntaFuncion);

  const preguntas: Pregunta[] = [];
  // Se garantiza una de armar y después se completa mezclando.
  preguntas.push(preguntaArmar(pozo, false));
  while (preguntas.length < cantidad) {
    preguntas.push(pickRandom(fabricas)());
  }
  return shuffle(preguntas);
}
