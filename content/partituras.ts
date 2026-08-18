import type { Compas } from "@/lib/ritmo";
import type { Evento, Tonalidad } from "@/lib/pentagrama";

/**
 * Las partituras, escritas como datos.
 *
 * Igual que las clases: no hay PDF, no hay imagen y no se baja nada. La pieza
 * es una lista de notas con su figura, y el pentagrama se dibuja de eso — así
 * que la app *sabe* qué está sonando y puede tocarlo, seguirte por MIDI y
 * marcarte dónde vas. Con un PDF nada de eso se puede.
 *
 * **Están transcriptas de memoria y son un pedazo.** Las obras son de dominio
 * público (Bach y Beethoven hace bastante que no cobran), pero la transcripción
 * es nuestra y puede tener errores: sale bien el arranque de las conocidas y se
 * pone dudosa en las voces internas. Por eso cada pieza dice hasta qué compás
 * llega y `revisar` marca lo que hay que chequear con el profe. Es la misma
 * regla que `openQuestions` en las clases: mejor la duda anotada que el invento
 * en silencio.
 */

export interface Pieza {
  slug: string;
  titulo: string;
  compositor: string;
  anio: string;
  compas: Compas;
  tonalidad: Tonalidad;
  /** Negras por minuto para el reproductor. */
  bpm: number;
  /** Qué mano va en cada pentagrama. */
  derecha: Evento[];
  izquierda: Evento[];
  /** De 1 a 5, para ordenar la lista por lo que se puede intentar hoy. */
  dificultad: number;
  /** Por qué está acá y qué mirar. */
  sobre: string;
  /** Hasta dónde llega lo transcripto. */
  hasta: string;
  /** Lo que habría que chequear. Se muestra al pie, sin culpa. */
  revisar?: string;
}

/** Atajos para que las piezas se lean como música y no como JSON. */
const n = (midis: number | number[], divide: number, extra: Partial<Evento> = {}): Evento => ({
  midis: Array.isArray(midis) ? midis : [midis],
  divide,
  ...extra,
});
const silencio = (divide: number): Evento => ({ midis: [], divide });

// Las teclas por nombre, para poder escribir la música leyéndola en vez de
// contar números MIDI. Do central = Do4 = 60.
const Sol2 = 43, Si2 = 47;
const Do3 = 48, Re3 = 50, Mi3 = 52, Sol3 = 55, La3 = 57;
const Do4 = 60, Re4 = 62, Mi4 = 64, Fa4 = 65, Sol4 = 67;

// Las del Claro de luna, en Do♯ menor.
const Fas1 = 30, La1 = 33, Dos2 = 37, Fas2 = 42, La2 = 45, Dos3 = 49;
const Fas3 = 54, Sols3 = 56, Dos4b = 61;

export const PIEZAS: Pieza[] = [
  {
    slug: "oda-a-la-alegria",
    titulo: "Oda a la alegría",
    compositor: "Beethoven",
    anio: "1824",
    compas: { numerador: 4, denominador: 4 },
    tonalidad: { tonica: 0, modo: "mayor" },
    bpm: 100,
    dificultad: 1,
    sobre:
      "Ocho compases, todo por grados conjuntos y sin una sola tecla negra. Es la que se puede tocar hoy: la derecha no se mueve de la posición de cinco dedos y la izquierda son dos acordes que ya sabés armar.",
    hasta: "El tema completo, ocho compases.",
    derecha: [
      // Mi mi fa sol | sol fa mi re | do do re mi | mi. re re
      n(Mi4, 4), n(Mi4, 4), n(Fa4, 4), n(Sol4, 4),
      n(Sol4, 4), n(Fa4, 4), n(Mi4, 4), n(Re4, 4),
      n(Do4, 4), n(Do4, 4), n(Re4, 4), n(Mi4, 4),
      n(Mi4, 4, { puntillo: true }), n(Re4, 8), n(Re4, 2),
      // y otra vez, con el final resuelto en Do
      n(Mi4, 4), n(Mi4, 4), n(Fa4, 4), n(Sol4, 4),
      n(Sol4, 4), n(Fa4, 4), n(Mi4, 4), n(Re4, 4),
      n(Do4, 4), n(Do4, 4), n(Re4, 4), n(Mi4, 4),
      n(Re4, 4, { puntillo: true }), n(Do4, 8), n(Do4, 2),
    ],
    izquierda: [
      n([Do3, Sol3], 1),
      n([Si2, Sol3], 1),
      n([Do3, Sol3], 1),
      n([Sol2, Re3], 1),
      n([Do3, Sol3], 1),
      n([Si2, Sol3], 1),
      n([Do3, Mi3], 1),
      n([Sol2, Re3], 2), n([Do3, Sol3], 2),
    ],
  },

  {
    slug: "preludio-en-do",
    titulo: "Preludio nº 1 en Do mayor",
    compositor: "Bach",
    anio: "1722",
    compas: { numerador: 4, denominador: 4 },
    tonalidad: { tonica: 0, modo: "mayor" },
    bpm: 66,
    dificultad: 2,
    sobre:
      "Cuatro compases y son exactamente lo que estás estudiando: cada uno es un acorde desarmado nota por nota, y lo único que pasa entre compás y compás es que una o dos notas se mueven. Es el enlace de acordes, escrito.",
    hasta: "Los primeros cuatro compases, de un preludio de treinta y cinco.",
    revisar:
      "Bach escribe cada compás como una figura de ocho semicorcheas repetida dos veces, y las dos notas graves quedan sonando. Acá están repartidas entre las dos manos como se toca; en el original la escritura de las voces es otra.",
    derecha: [
      // Arranca con silencio de corchea: las dos graves de la izquierda van
      // primero. El grupo entero se repite dos veces por compás.
      ...repetir([silencio(8), n(Sol3, 16), n(Do4, 16), n(Mi4, 16), n(Sol3, 16), n(Do4, 16), n(Mi4, 16)], 2),
      ...repetir([silencio(8), n(La3, 16), n(Re4, 16), n(Fa4, 16), n(La3, 16), n(Re4, 16), n(Fa4, 16)], 2),
      ...repetir([silencio(8), n(Sol3, 16), n(Re4, 16), n(Fa4, 16), n(Sol3, 16), n(Re4, 16), n(Fa4, 16)], 2),
      ...repetir([silencio(8), n(Sol3, 16), n(Do4, 16), n(Mi4, 16), n(Sol3, 16), n(Do4, 16), n(Mi4, 16)], 2),
    ],
    izquierda: [
      ...repetir([n(Do3, 16), n(Mi3, 16), silencio(4), silencio(8)], 2),
      ...repetir([n(Do3, 16), n(Re3, 16), silencio(4), silencio(8)], 2),
      ...repetir([n(Si2, 16), n(Re3, 16), silencio(4), silencio(8)], 2),
      ...repetir([n(Do3, 16), n(Mi3, 16), silencio(4), silencio(8)], 2),
    ],
  },

  {
    slug: "claro-de-luna",
    titulo: "Claro de luna",
    compositor: "Beethoven",
    anio: "1801",
    compas: { numerador: 12, denominador: 8 },
    tonalidad: { tonica: 1, modo: "menor" },
    bpm: 52,
    dificultad: 3,
    sobre:
      "El arranque de la sonata Op. 27 nº 2. La derecha son tres notas que giran sin parar y la izquierda son octavas quietas: toda la música pasa en el acorde que sostiene abajo, y cambia cada dos compases. Mirá la armadura — cuatro sostenidos, es Do♯ menor.",
    hasta: "Los primeros cuatro compases, sin la melodía (que entra después).",
    revisar:
      "Beethoven lo escribe en compasillo con tresillos de corchea. Acá está en 12/8, que son las mismas doce corcheas por compás y el mismo pulso con puntillo, pero sin tener que dibujar tresillos. Los dos primeros compases son seguros; los acordes del tercero y el cuarto los saqué de memoria y hay que confirmarlos.",
    derecha: [
      ...repetir([n(Sols3, 8), n(Dos4b, 8), n(Mi4, 8)], 4),
      ...repetir([n(Sols3, 8), n(Dos4b, 8), n(Mi4, 8)], 4),
      ...repetir([n(La3, 8), n(Dos4b, 8), n(Mi4, 8)], 4),
      ...repetir([n(Fas3, 8), n(La3, 8), n(Re4, 8)], 4),
    ],
    izquierda: [
      n([Dos2, Dos3], 1, { puntillo: true }),
      n([Dos2, Dos3], 1, { puntillo: true }),
      n([La1, La2], 1, { puntillo: true }),
      n([Fas1, Fas2], 1, { puntillo: true }),
    ],
  },
];

/** Repite un grupo de eventos, que es como está escrita la música de verdad. */
function repetir(grupo: Evento[], veces: number): Evento[] {
  return Array.from({ length: veces }, () => grupo.map((e) => ({ ...e }))).flat();
}

export function piezaPorSlug(slug: string): Pieza | undefined {
  return PIEZAS.find((p) => p.slug === slug);
}

