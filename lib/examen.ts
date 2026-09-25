import {
  mod12,
  CHORD_QUALITIES,
  LETRAS_ES,
  LETRAS_PC,
  NOMBRES_INVERSION,
  bajoDeInversion,
  cantidadDeInversiones,
  chordNameEs,
  chordPitches,
  chordSymbol,
  deletrearAcorde,
  identificarAcorde,
  escribirNota,
  invertir,
  notasDeAcorde,
  notasDeInversion,
  pickRandom,
  qualityById,
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
import {
  CADENCIAS_CON_NOMBRE,
  DISMINUIDOS,
  DOMINANTES,
  SUSTITUTOS_TRITONALES,
  FUNCIONES,
  FUNCION_DE_GRADO,
  TONALIDAD_MAYOR,
  destinoDadoVuelta,
} from "./grados.ts";
import { ESCALAS, triadasDeEscala } from "./escalas.ts";
import {
  TONALIDADES,
  armadurasConfundiblesCon,
  confundiblesCon,
  leerArmadura,
  nombreDeTono,
  notasDeTono,
  signosDeArmadura,
} from "./tonalidades.ts";

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

/** Las cadencias con nombre y apellido de la clase 4. */
function preguntaCadenciaNombre(): Pregunta {
  const c = pickRandom(CADENCIAS_CON_NOMBRE);
  const forma = c.grados.map((g) => TONALIDAD_MAYOR[g].cifra).join(" → ");
  const otras = shuffle(
    CADENCIAS_CON_NOMBRE.filter((o) => o.nombre !== c.nombre).map((o) => o.nombre),
  ).slice(0, 3);
  return conOpciones(
    "¿Cómo se llama esta cadencia?",
    c.nombre,
    otras,
    `${forma}: ${c.detalle} El apellido lo pone la función del acorde que llega a la tónica; si son tres acordes es compuesta, y si llega el suplente de la familia es una sustitución.`,
    forma,
  );
}

/** El campo armónico de las escalas menores sobre Do (clase 4). */
function preguntaEscalaMenor(): Pregunta {
  const escala = pickRandom(ESCALAS.filter((e) => e.id !== "mayor"));
  const grado = Math.floor(Math.random() * 7);
  const triadas = triadasDeEscala(0, escala);
  const nombreDe = (midis: number[]) => {
    const id = identificarAcorde(midis);
    return id ? chordSymbol(id.root, id.quality) : "?";
  };
  const correcta = nombreDe(triadas[grado]);
  // Las trampas son acordes del mismo grado en las otras escalas y de grados
  // vecinos: la pregunta es si sabés qué escala arma qué, no si adivinás.
  const trampas = new Set<string>();
  for (const otra of shuffle(ESCALAS)) {
    const cand = nombreDe(triadasDeEscala(0, otra)[grado]);
    if (cand !== correcta) trampas.add(cand);
  }
  for (const vecino of shuffle([0, 1, 2, 3, 4, 5, 6])) {
    if (trampas.size >= 3) break;
    const cand = nombreDe(triadas[vecino]);
    if (cand !== correcta) trampas.add(cand);
  }
  const romano = ["I", "II", "III", "IV", "V", "VI", "VII"][grado];
  return conOpciones(
    `En Do ${escala.nombre.toLowerCase()}, ¿qué acorde sale del grado ${romano}?`,
    correcta,
    [...trampas].slice(0, 3),
    `Nota sí, nota no dentro de la propia escala (${escala.receta}): del grado ${romano} sale ${correcta}. Las calidades no se eligen, salen solas.`,
  );
}

/**
 * Los dominantes secundarios de la clase 5, en las dos direcciones: qué X7
 * lleva a tal acorde, y adónde lleva tal X7. La segunda mete entre las
 * trampas el destino dado vuelta (el D en vez del Dm), que es justo la
 * diferencia entre secundario y efectivo.
 */
function preguntaDominante(): Pregunta {
  const d = pickRandom(DOMINANTES);
  const otros = DOMINANTES.filter((o) => o.cifrado !== d.cifrado);
  const dado = Math.random();
  if (dado < 0.3) {
    // La otra opción de acorde de paso: el X°, que es el VII° de la llegada.
    const x = pickRandom(DISMINUIDOS.filter((o) => o.destino !== null));
    return conOpciones(
      `En Do mayor, ¿qué disminuido de paso lleva al ${x.cifradoDestino}?`,
      x.cifrado,
      shuffle(DISMINUIDOS.filter((o) => o.cifrado !== x.cifrado).map((o) => o.cifrado)).slice(0, 3),
      `${x.cifrado} → ${x.cifradoDestino}. El disminuido de paso es el VII° del acorde adonde se llega: un semitono abajo, y resuelve para arriba — como el Bdim de la escala resuelve en Do.`,
    );
  }
  if (dado < 0.65) {
    return conOpciones(
      `En Do mayor, ¿qué dominante lleva al ${d.cifradoDestino}?`,
      d.cifrado,
      shuffle(otros.map((o) => o.cifrado)).slice(0, 3),
      `${d.cifrado} → ${d.cifradoDestino}. La misma lógica del G7 → C: el dominante está cinco semitonos abajo de adonde llega, mayor y con séptima menor.${
        d.tipo === "principal"
          ? " Éste es el principal, el V7 de la tonalidad."
          : d.tipo === "efectivo"
            ? " El Si♭ no está en Do mayor: por eso el F7 no entra en la lista de los secundarios — lleva a otro campo armónico, es efectivo."
            : ""
      }`,
    );
  }
  const trampas = new Set<string>([destinoDadoVuelta(d).cifrado]);
  for (const o of shuffle(otros)) {
    if (trampas.size >= 3) break;
    trampas.add(o.cifradoDestino);
  }
  return conOpciones(
    `En Do mayor, ¿adónde lleva el ${d.cifrado}?`,
    d.cifradoDestino,
    [...trampas],
    `${d.cifrado} → ${d.cifradoDestino}: cinco semitonos arriba de la fundamental, con la calidad que ese grado tiene en la escala.${
      d.tipo === "efectivo"
        ? " Y no es un grado de Do mayor: el F7 se va del campo, por eso es efectivo y no secundario."
        : ` Si llevara al ${destinoDadoVuelta(d).cifrado} se saldría del campo: ahí sería efectivo.`
    }`,
    d.cifrado,
  );
}

/**
 * La sustitución tritonal de la clase 7: qué acorde reemplaza a cuál, y por
 * qué se puede — las dos notas que comparten.
 */
function preguntaSustituto(): Pregunta {
  const s = pickRandom(SUSTITUTOS_TRITONALES);
  const otros = SUSTITUTOS_TRITONALES.filter((o) => o.cifrado !== s.cifrado);
  const dado = Math.random();
  const notaEs = (pc: number) => escribirNota(deletrearAcorde(s.original.raiz, qualityById("dom7")!).find((n) => n.pc === pc)!);
  if (dado < 0.45) {
    return conOpciones(
      `¿Qué acorde sustituye por tritono al ${s.original.cifrado}?`,
      s.cifrado,
      shuffle(otros.map((o) => o.cifrado)).slice(0, 3),
      `${s.original.cifrado} → ${s.cifrado}: la fundamental se corre seis semitonos, un tritono, y da lo mismo para qué lado porque es la mitad justa de la octava. Los dos son dominantes y los dos llevan al ${s.original.cifradoDestino}.`,
      s.original.cifrado,
    );
  }
  if (dado < 0.75) {
    const correcta = s.compartidas.map(notaEs).join(" y ");
    const notas = deletrearAcorde(s.original.raiz, qualityById("dom7")!);
    const pares = [
      [0, 2],
      [0, 1],
      [1, 2],
      [0, 3],
    ].map(([a, b]) => `${escribirNota(notas[a])} y ${escribirNota(notas[b])}`).filter((p) => p !== correcta);
    return conOpciones(
      `¿Qué dos notas comparten el ${s.original.cifrado} y su sustituto, el ${s.cifrado}?`,
      correcta,
      shuffle(pares).slice(0, 3),
      `La tercera y la séptima del ${s.original.cifrado} son la séptima y la tercera del ${s.cifrado}: el mismo tritono adentro, la misma tensión. Por eso se pueden cambiar.`,
    );
  }
  return conOpciones(
    `¿A cuántos semitonos está el sustituto tritonal de un dominante?`,
    "6",
    ["5", "7", "3"],
    "Un tritono son seis semitonos, la mitad justa de la octava: por eso da lo mismo subir que bajar, se llega al mismo acorde.",
  );
}

const TEXTURAS_EXAMEN: { nombre: string; pista: string }[] = [
  { nombre: "Plaqué", pista: "El acorde entero, planchado, y se deja sonando hasta el que viene." },
  { nombre: "Pum-chá", pista: "El bajo en la fundamental y después el acorde en la derecha, girado." },
  { nombre: "Arpegio", pista: "Las notas del acorde de a una: 1 · 5 · 3 · 7." },
  { nombre: "Monofonía", pista: "Una sola línea melódica; si hay más instrumentos, todos hacen lo mismo." },
  { nombre: "Melodía acompañada", pista: "Una melodía y, debajo, acordes que la sostienen." },
  { nombre: "Homofonía", pista: "Varias líneas que se mueven a la vez con el mismo ritmo; manda la más aguda." },
  { nombre: "Polifonía", pista: "Varias líneas independientes a la vez, cada una con su propio ritmo." },
];

/** Las texturas de la clase 7: de la descripción al nombre. */
function preguntaTextura(): Pregunta {
  const t = pickRandom(TEXTURAS_EXAMEN);
  return conOpciones(
    `¿Cómo se llama esta textura?`,
    t.nombre,
    shuffle(TEXTURAS_EXAMEN.filter((o) => o.nombre !== t.nombre).map((o) => o.nombre)).slice(0, 3),
    `${t.nombre}: ${t.pista.toLowerCase()}`,
    t.pista,
  );
}

/** El voicing de la clase 7: qué va en cada mano y por qué. */
function preguntaVoicing(): Pregunta {
  const dado = Math.random();
  if (dado < 0.4) {
    return conOpciones(
      "En el voicing abierto a dos manos, ¿qué nota del acorde suele no tocar la mano izquierda?",
      "La tercera",
      ["La fundamental", "La quinta", "La séptima"],
      "La tercera es la que dice si el acorde es mayor o menor, y abajo, pegada a la fundamental, ensucia: se muda a la derecha. La izquierda pone 1 y 5, o 1 y 7.",
    );
  }
  if (dado < 0.7) {
    return conOpciones(
      "¿Cuál de estos repartos es un voicing abierto a dos manos?",
      "1 y 5 en la izquierda, 3 y 7 en la derecha",
      [
        "1, 3 y 5 en la izquierda, nada en la derecha",
        "1 y 3 en la izquierda, 5 y 7 en la derecha",
        "3 y 5 en la izquierda, 1 y 7 en la derecha",
      ],
      "Los dos repartos de la clase son 1-5 / 3-7 y 1-7 / 3-5: la fundamental abajo, la tercera arriba, y entre nota y nota cuartas, quintas y sextas.",
    );
  }
  return conOpciones(
    "¿Cómo suena la posición cerrada, 1-3-5 apilado y grave?",
    "Densa y oscura, como un día nublado",
    ["Abierta y liviana", "Igual que la abierta: son las mismas notas", "Más aguda"],
    "Las notas son las mismas, pero pegadas y graves se cargan. Abrir el acorde es repartir esas mismas notas para que ninguna tape a otra — como en una orquesta.",
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
  /** ¿Vio las cadencias con nombre y apellido? */
  cadencias?: boolean;
  /** ¿Vio las armonías paralelas y sus escalas menores? */
  paralelas?: boolean;
  /** ¿Vio los dominantes secundarios? */
  dominantes?: boolean;
  /** ¿Vio las tonalidades, las armaduras y el círculo de quintas? */
  tonalidades?: boolean;
  /** ¿Vio el voicing, el reparto del acorde entre las manos? */
  voicing?: boolean;
  /** ¿Vio las texturas? */
  texturas?: boolean;
  /** ¿Vio la sustitución tritonal? */
  tritonal?: boolean;
  cantidad?: number;
}


/** Cómo se dice una armadura: "3 sostenidos (fa♯ do♯ sol♯)", "un bemol (si♭)". */
function armaduraEnPalabras(n: number): string {
  if (n === 0) return "ninguna alteración";
  const cuantos = Math.abs(n);
  const signos = signosDeArmadura(n)
    .map((x) => escribirNota(x).toLowerCase())
    .join(" ");
  const nombre = n > 0 ? "sostenido" : "bemol";
  return cuantos === 1
    ? `un ${nombre} (${signos})`
    : `${cuantos} ${nombre}${n > 0 ? "s" : "es"} (${signos})`;
}

/** Lo mismo con el verbo puesto, que en castellano no sale de pegar strings. */
const armaduraQueLleva = (n: number) =>
  n === 0 ? "no lleva ninguna alteración" : `lleva ${armaduraEnPalabras(n)}`;

/**
 * De la armadura a la tonalidad, que es lo que se hace abriendo una
 * partitura. Las opciones equivocadas son las que de verdad se confunden: la
 * relativa, la vecina de un signo, la del signo opuesto.
 */
function preguntaArmadura(): Pregunta {
  const t = pickRandom(TONALIDADES.filter((x) => Math.abs(x.armadura) <= 5));
  const modo = Math.random() < 0.5 ? "mayor" : "menor";
  const correcto = modo === "mayor" ? t.mayor : t.menor;
  const opciones = shuffle([correcto, ...confundiblesCon(correcto, 3)]);
  return {
    tipo: "opciones",
    consigna: `Una partitura ${armaduraQueLleva(t.armadura)}. Si la pieza es ${modo}, ¿en qué tonalidad está?`,
    destacado: t.armadura === 0 ? "—" : `${Math.abs(t.armadura)}${t.armadura > 0 ? "♯" : "♭"}`,
    opciones: opciones.map((o) => nombreDeTono(o)),
    correcta: opciones.indexOf(correcto),
    // La regla del papel da siempre la mayor, así que cuando la pregunta es
    // por la menor hay que decir el paso que falta: si no, la explicación
    // nombra una tónica que no es la de la respuesta.
    explicacion:
      modo === "mayor"
        ? `${leerArmadura(t.armadura).regla} Es ${nombreDeTono(t.mayor)}. Su relativa menor, ${nombreDeTono(t.menor)}, lleva los mismos signos.`
        : `${leerArmadura(t.armadura).regla} Esa es la mayor, ${nombreDeTono(t.mayor)}; la menor que comparte su armadura es la del sexto grado: ${nombreDeTono(t.menor)}.`,
  };
}

/** Y al revés: de la tonalidad a los signos, que es lo que se hace escribiendo. */
function preguntaCuantasAlteraciones(): Pregunta {
  const t = pickRandom(TONALIDADES.filter((x) => Math.abs(x.armadura) <= 5));
  const modo = Math.random() < 0.5 ? "mayor" : "menor";
  const tono = modo === "mayor" ? t.mayor : t.menor;
  const opciones = shuffle([t.armadura, ...armadurasConfundiblesCon(t.armadura, 3)]);
  return {
    tipo: "opciones",
    consigna: `¿Con qué armadura se escribe ${nombreDeTono(tono)}?`,
    destacado: nombreDeTono(tono, "en"),
    opciones: opciones.map((n) => (n === 0 ? "ninguna" : armaduraEnPalabras(n))),
    correcta: opciones.indexOf(t.armadura),
    explicacion: `${nombreDeTono(tono)} ${armaduraQueLleva(t.armadura)}: ${notasDeTono(tono).map((x) => escribirNota(x)).join(" · ")}.`,
  };
}

/** La relativa: la misma armadura, otra casa. Es el error clásico. */
function preguntaRelativa(): Pregunta {
  const t = pickRandom(TONALIDADES.filter((x) => Math.abs(x.armadura) <= 5));
  const deMayor = Math.random() < 0.5;
  const dada = deMayor ? t.mayor : t.menor;
  const correcto = deMayor ? t.menor : t.mayor;
  const otras = TONALIDADES.filter((o) => o !== t)
    .map((o) => (deMayor ? o.menor : o.mayor));
  const opciones = shuffle([correcto, ...shuffle(otras).slice(0, 3)]);
  return {
    tipo: "opciones",
    consigna: `¿Cuál es la relativa ${deMayor ? "menor" : "mayor"} de ${nombreDeTono(dada)}?`,
    destacado: nombreDeTono(dada, "en"),
    opciones: opciones.map((o) => nombreDeTono(o)),
    correcta: opciones.indexOf(correcto),
    explicacion: deMayor
      ? `El sexto grado de ${nombreDeTono(dada)} es ${escribirNota(correcto.tonica)}: las mismas siete notas empezadas ahí dan ${nombreDeTono(correcto)}, con la misma armadura.`
      : `El tercer grado de ${nombreDeTono(dada)} es ${escribirNota(correcto.tonica)}: ésa es su relativa mayor, con la misma armadura.`,
  };
}

/**
 * De la armadura al teclado: la única de tonalidades que no se puede acertar
 * de casualidad. Encadena las dos cosas de la clase —leer los signos y saber
 * qué tonalidad anuncian— con lo de todas las anteriores, que es armar el
 * acorde.
 */
function preguntaTonica(): Pregunta {
  const t = pickRandom(TONALIDADES.filter((x) => Math.abs(x.armadura) <= 5));
  const modo = Math.random() < 0.5 ? "mayor" : "menor";
  const tono = modo === "mayor" ? t.mayor : t.menor;
  const q = qualityById(modo === "mayor" ? "maj" : "min")!;
  const root = mod12(tono.tonica.pc);
  return {
    tipo: "armar",
    consigna: `Una pieza ${modo} ${armaduraQueLleva(t.armadura)}. Armá su acorde de tónica en el teclado.`,
    destacado:
      t.armadura === 0
        ? `— · ${modo}`
        : `${Math.abs(t.armadura)}${t.armadura > 0 ? "♯" : "♭"} · ${modo}`,
    pitches: chordPitches(BASE + root, q),
    notas: notasDeAcorde(root, q),
    explicacion: `${leerArmadura(t.armadura).regla} La ${modo} de esa armadura es ${nombreDeTono(tono)}, y su tónica es ${chordSymbol(root, q)}.`,
  };
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
  cadencias,
  paralelas,
  dominantes,
  voicing,
  texturas,
  tritonal,
  tonalidades,
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
  if (cadencias) fabricas.push(preguntaCadenciaNombre);
  if (paralelas) fabricas.push(preguntaEscalaMenor);
  if (dominantes) fabricas.push(preguntaDominante);
  if (voicing) fabricas.push(preguntaVoicing);
  if (texturas) fabricas.push(preguntaTextura);
  if (tritonal) fabricas.push(preguntaSustituto);
  if (tonalidades) {
    fabricas.push(preguntaArmadura);
    fabricas.push(preguntaCuantasAlteraciones);
    fabricas.push(preguntaRelativa);
    fabricas.push(preguntaTonica);
  }

  const preguntas: Pregunta[] = [];
  // Se garantiza una de armar y después se completa mezclando.
  preguntas.push(preguntaArmar(pozo, false));
  while (preguntas.length < cantidad) {
    preguntas.push(pickRandom(fabricas)());
  }
  return shuffle(preguntas);
}
