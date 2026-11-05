/**
 * Las canciones para practicar por capas.
 *
 * No son partituras: son canciones con copyright, así que lo que vive acá es
 * **el análisis y los ejercicios que salen de él** —los acordes con sus
 * voicings, un ejercicio corto sobre el riff, el ritmo, la explicación— y
 * nunca la melodía entera, la letra ni la grabación. Para tocar encima de la
 * grabación, se la pone uno desde donde la escuche; el cuaderno no la trae.
 *
 * Agregar una canción es sumar una entrada a `CANCIONES`, como una clase: la
 * sala la muestra sola, la página `/practica/cancion/<slug>` también, y cada
 * capa se dibuja según su `tipo`. Las capas van en el orden en que se
 * practican: primero la base, después lo que se le pone encima, al final todo
 * junto. `test:canciones` clava los acordes, los acentos y el riff.
 */

import {
  compasDeRiff,
  compasVacio,
  plaque,
  type CompasDeCapa,
  type PasoDelRiff,
  type Voicing,
} from "@/lib/capas";

interface CapaComun {
  titulo: string;
  /** Una línea: qué se practica en esta capa. */
  bajada: string;
  /** Cómo encararla. Acepta *asteriscos*. */
  como: string[];
}

export type Capa = CapaComun &
  (
    | {
        /** Los acordes uno por uno y en vuelta, con las teclas que se quedan marcadas. */
        tipo: "acordes";
        acordes: Voicing[];
        vuelta: CompasDeCapa[];
      }
    | {
        /** Un pasaje corto en loop, con el tempo regulable. */
        tipo: "riff";
        compases: CompasDeCapa[];
      }
    | {
        /** Sólo el metrónomo, con los acentos por grupos y los compases para elegir. */
        tipo: "ritmo";
        compases: { nombre: string; grupos: number[] }[];
      }
    | {
        /** Una progresión con su explicación en simple y la técnica aparte, pintada por tensión. */
        tipo: "progresion";
        acordes: Voicing[];
        compases: CompasDeCapa[];
        simple: string[];
        tecnica: string[];
      }
    | {
        /** Todo junto, por secciones, con cómo se toca cada una. */
        tipo: "todo";
        secciones: { nombre: string; caracter: string; compases: CompasDeCapa[] }[];
        notas: string[];
      }
  );

export interface Cancion {
  slug: string;
  titulo: string;
  autor: string;
  /** De dónde es, en pocas palabras. */
  origen: string;
  /** La tonalidad en la que se practica, escrita. */
  tonalidad: string;
  /** La clase de la tónica (0 = Do): para leer los grados. */
  tonica: number;
  /** Negras por minuto al 100 %. */
  tempo: number;
  bajada: string;
  capas: Capa[];
  /** Lo que conviene chequear contra la grabación: la duda anotada antes que el invento. */
  revisar: string[];
}

// ---------------------------------------------------------------------------
// Here Comes the Sun
// ---------------------------------------------------------------------------

/**
 * Los tres de la estrofa, del análisis: la derecha arriba del La central con
 * notas comunes entre vecinos (La se queda de La a Re, Re de Re a Mi7, Mi de
 * Mi7 a La) y la izquierda en las fundamentales.
 */
const LA: Voicing = { izquierda: [45], derecha: [69, 73, 76] };
const RE: Voicing = { izquierda: [50], derecha: [69, 74, 78] };
const MI7: Voicing = { izquierda: [52], derecha: [68, 71, 74, 76] };

/**
 * Los cinco del puente, enlazados para que cada uno deje una tecla quieta:
 * de un acorde al que está una quinta arriba siempre hay una nota en común,
 * y el voicing la aprovecha (Sol, Re, La, Mi).
 */
const DO: Voicing = { izquierda: [48], derecha: [67, 72, 76] };
const SOL: Voicing = { izquierda: [43], derecha: [67, 71, 74] };
const RE_PUENTE: Voicing = { izquierda: [50], derecha: [66, 69, 74] };
const LA_PUENTE: Voicing = { izquierda: [45], derecha: [64, 69, 73] };
const MI7_PUENTE: Voicing = { izquierda: [40], derecha: [64, 68, 71, 74] };

/**
 * El ejercicio del riff: la tercera se va a la 2ª, vuelve, se va a la 4ª y
 * vuelve. No es la guitarra transcripta: es el gesto de la guitarra —el
 * acorde quieto y un dedo que se asoma a los costados— puesto en el piano.
 */
const VECINAS: PasoDelRiff[] = [
  [3, 2],
  [2, 1],
  [3, 1],
  [4, 2],
  [3, 2],
];
const RIFF: CompasDeCapa[] = [
  compasDeRiff(LA, VECINAS),
  compasDeRiff(LA, VECINAS),
  compasDeRiff(RE, VECINAS),
  compasDeRiff(MI7, VECINAS),
];

const TRES_TRES_DOS = [3, 3, 2];
const PUENTE: CompasDeCapa[] = [DO, SOL, RE_PUENTE, LA_PUENTE, MI7_PUENTE].map((v) => plaque(v, TRES_TRES_DOS));

const HERE_COMES_THE_SUN: Cancion = {
  slug: "here-comes-the-sun",
  titulo: "Here Comes the Sun",
  autor: "George Harrison",
  origen: "The Beatles, Abbey Road (1969)",
  tonalidad: "La mayor",
  tonica: 9,
  tempo: 128,
  bajada:
    "En La mayor, que es lo que suena (la guitarra la toca con cejilla en el 7 y formas de Re). Cinco capas, una arriba de la otra: los tres acordes de la estrofa, el riff, el ritmo del puente sin notas, el puente con sus acordes y todo junto.",
  capas: [
    {
      tipo: "acordes",
      titulo: "La base armónica",
      bajada: "La, Re y Mi7, con los voicings que dejan un dedo quieto entre acorde y acorde.",
      como: [
        "*Primero de a uno.* Tocá cada acorde y mirá cuál de las teclas de la derecha ya estaba apretada en el anterior: ésa no se mueve.",
        "*La izquierda va a las fundamentales* —La, Re, Mi— y la derecha casi no viaja.",
        "*Después la vuelta en loop*, al 50 %, hasta que el cambio salga sin mirar.",
      ],
      acordes: [LA, RE, MI7],
      vuelta: [LA, RE, MI7, LA].map((v) => plaque(v, [2, 2, 2, 2])),
    },
    {
      tipo: "riff",
      titulo: "El riff",
      bajada: "La izquierda quieta; en la derecha sólo se mueve la tercera: a la 2ª, a la 4ª, y vuelta.",
      como: [
        "*En La, la tercera es el Do♯.* Se va al Si (la 2ª), vuelve, se va al Re (la 4ª) y vuelve. El La y el Mi no se sueltan.",
        "*La vuelta es igual sobre Re y sobre Mi7*: cambia el acorde, el gesto es el mismo.",
        "*Al 50 % hasta que salga tres veces seguidas limpio*, recién ahí se sube. Es un ejercicio sobre el gesto del riff, no el riff de la guitarra nota por nota.",
      ],
      compases: RIFF,
    },
    {
      tipo: "ritmo",
      titulo: "El puente: el ritmo solo",
      bajada: "Ocho corcheas agrupadas 3+3+2, sin notas: primero que el cuerpo lo cuente.",
      como: [
        "*Contá en voz alta* lo que dice abajo: 1-2-3 1-2-3 1-2. El golpe fuerte es el primer 1; los otros dos 1 son medios.",
        "*Golpeá la mesa sólo en los 1*, sin tocar nada más. Cuando sale, aplaudí los tres golpes y dejá que el click cuente el resto.",
        "*Los compases largos* se arman sumando grupos: probá el 3+3+3+2 o escribí el tuyo en la caja (3+2+2, 2+2+3…).",
      ],
      compases: [
        { nombre: "3+3+2", grupos: [3, 3, 2] },
        { nombre: "el largo", grupos: [3, 3, 3, 2] },
        { nombre: "4/4 parejo", grupos: [2, 2, 2, 2] },
      ],
    },
    {
      tipo: "progresion",
      titulo: "El puente con acordes",
      bajada: "Do – Sol – Re – La – Mi7: dos acordes prestados y una escalera de quintas que te deja en casa.",
      como: [
        "*Un acorde por compás, golpeado en los tres grupos* del 3+3+2 que ya contaste.",
        "*Mirá la tecla que se queda* entre acorde y acorde: Sol, Re, La, Mi. Es la misma idea de la base.",
      ],
      acordes: [DO, SOL, RE_PUENTE, LA_PUENTE, MI7_PUENTE],
      compases: PUENTE,
      simple: [
        "*Do y Sol no son de La mayor.* Vienen prestados de La menor, la tonalidad hermana que comparte la tónica. Por eso el puente suena a que se nubla.",
        "*Cada acorde sube una quinta*: de Do a Sol, de Sol a Re, de Re a La. Al cuarto paso caés en casa sin haberla buscado.",
        "*El Mi7 es la tensión* que pide volver: devuelve a la estrofa.",
      ],
      tecnica: [
        "Do es el ♭III y Sol el ♭VII de La: préstamo modal de la menor paralela (en La menor son el III y el VII). La función la pone el grado, como siempre en el cuaderno.",
        "♭III → ♭VII → IV → I es una cadena de quintas ascendentes; cada enlace comparte una nota (la quinta del primero es la fundamental del segundo).",
        "Cierra con el V7 (Mi7), que no es parte de la cadena: es la dominante que resuelve en el I de la estrofa.",
      ],
    },
    {
      tipo: "todo",
      titulo: "Todo junto",
      bajada: "El riff dos vueltas, el puente, y de nuevo: lo que cambia es el peso de la mano.",
      como: [
        "*Primero al 50 %* y con el click; después sin el click.",
        "*Se puede tocar encima de la grabación* poniéndola desde donde la escuches; el cuaderno no la trae.",
      ],
      secciones: [
        { nombre: "Estrofa", caracter: "contenida", compases: [...RIFF, ...RIFF] },
        { nombre: "Puente", caracter: "abierto", compases: PUENTE },
      ],
      notas: [
        "*Registro agudo.* La derecha vive arriba del La central: es una canción de guitarra con cejilla, brillante y liviana.",
        "*Poco peso.* Los dedos apoyan y se van; el riff es un adorno, no un golpe.",
        "*La estrofa contenida, el puente abierto.* En el puente se puede apoyar más y dejar sonar los acordes: es donde la canción se abre.",
      ],
    },
  ],
  revisar: [
    "Cuántos compases de 3+3+2 y cuántos largos tiene el puente, y dónde van: acá el ejercicio pone un acorde por compás de 3+3+2, que es para practicar el agrupamiento y no la forma exacta. Contalo con la grabación.",
    "El riff es un ejercicio sobre el gesto (la tercera a sus vecinas), no la línea de la guitarra.",
  ],
};

export const CANCIONES: Cancion[] = [HERE_COMES_THE_SUN];

export const cancionPorSlug = (slug: string) => CANCIONES.find((c) => c.slug === slug) ?? null;
