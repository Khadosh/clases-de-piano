/**
 * Las semanas armadas: un plan de práctica día por día, para cuando no hubo
 * clase y la semana igual tiene que tener forma.
 *
 * No es una clase —no la dio nadie, no tiene examen ni cuenta para la racha—
 * así que no vive en `LESSONS`. Es la sala de práctica con un orden puesto:
 * cada tramo apunta a un ejercicio, una herramienta del taller, una
 * partitura o una clase, y el enlace se resuelve contra el catálogo
 * (`destinoDe`), nunca escrito a mano. `test:practica` clava que cada slug
 * exista: un plan que manda a una página que se mudó es peor que no tenerlo.
 *
 * Los minutos del día no se escriben: se suman de los tramos.
 */

import { latestLesson, slugOf, LESSONS } from "@/content";
import { buscar, rutaDe } from "@/content/practica";
import { PIEZAS } from "@/content/partituras";

export type Ir = { ejercicio: string } | { pieza: string } | { clase: number };

export interface Tramo {
  minutos: number;
  /** Qué se hace, en pocas palabras. */
  que: string;
  /** Cómo encararlo. Acepta *asteriscos*. */
  como: string;
  ir?: Ir;
}

export interface Dia {
  /** ISO. */
  fecha: string;
  /** El tema del día, en dos o tres palabras. */
  titulo: string;
  tramos: Tramo[];
}

export interface Semana {
  /** ISO del primer día. Sirve de identificador y decide si está vigente. */
  desde: string;
  titulo: string;
  bajada: string;
  /** Las reglas de cómo se practica, que valen para todos los días. */
  reglas: string[];
  dias: Dia[];
}

export const minutosDe = (d: Dia) => d.tramos.reduce((s, t) => s + t.minutos, 0);

/** Adónde lleva un tramo, resuelto contra el catálogo. Null si no existe. */
export function destinoDe(ir: Ir): { href: string; titulo: string } | null {
  if ("ejercicio" in ir) {
    const e = buscar(ir.ejercicio)?.entrada;
    return e ? { href: rutaDe(e), titulo: e.titulo } : null;
  }
  if ("pieza" in ir) {
    const p = PIEZAS.find((x) => x.slug === ir.pieza);
    return p ? { href: `/partituras/${p.slug}`, titulo: p.titulo } : null;
  }
  const l = LESSONS.find((x) => x.n === ir.clase);
  return l ? { href: `/clases/${slugOf(l)}`, titulo: `Clase ${l.n}` } : null;
}

export const SEMANAS: Semana[] = [
  {
    desde: "2026-10-01",
    titulo: "La semana sin clase",
    bajada:
      "El 30 de septiembre no hubo piano, así que la semana hasta el 7 de octubre va armada: un tema por día, con los minutos contados, y todo lo que se vino juntando en ocho clases repartido para que vuelva cada tanto. El hilo es el de la clase 8 —las tonalidades— y la pieza es el Minueto en Sol, que tiene justo un sostenido en la armadura.",
    reglas: [
      "*Lento antes que rápido.* Si algo sale tres veces seguidas limpio, recién ahí se sube el metrónomo. Si sale sucio, se baja.",
      "*Cada día tiene tres partes:* dedos para arrancar, el tema del día en el medio, y música para cerrar. Si un día hay poco tiempo, se hace el tramo del medio y nada más.",
      "*Si se saltea un día, no se recupera.* Se sigue con el que toca. Las cosas vuelven solas más adelante en la semana, que para eso están repartidas.",
      "*En voz alta.* Las escalas diciendo el nombre de cada nota, los acordes diciendo la receta antes de apoyar la mano. Es donde se ve si se está pensando la letra o la tecla.",
    ],
    dias: [
      {
        fecha: "2026-10-01",
        titulo: "Las letras",
        tramos: [
          {
            minutos: 5,
            que: "El ejercicio que se desplaza, mano derecha",
            como: "Lento, subiendo y bajando la octava sin cortar. Mirar que ningún dedo se despegue de su tecla mientras no le toca.",
            ir: { ejercicio: "posiciones" },
          },
          {
            minutos: 3,
            que: "Los dos órdenes, en voz alta",
            como: "*Fa do sol re la mi si*, y al revés para los bemoles: *si mi la re sol do fa*. Tres veces cada uno, sin mirar.",
          },
          {
            minutos: 10,
            que: "Escalas de Do y de Sol",
            como: "Una mano por vez, diciendo cada nota. En Sol la séptima se llama *Fa♯* —es la letra que toca—, no \"la negra de al lado\".",
            ir: { ejercicio: "escalas" },
          },
          {
            minutos: 7,
            que: "¿En qué tonalidad está?",
            como: "De la armadura al nombre, con la regla del profe: *el último sostenido, un semitono arriba*. Decir también la relativa menor antes de contestar.",
            ir: { ejercicio: "que-tonalidad" },
          },
          {
            minutos: 5,
            que: "Minueto en Sol: escucharlo",
            como: "Una pasada escuchando con la partitura adelante, siguiendo la derecha con el dedo. Buscar cada Fa: todos van sostenidos aunque no lo digan.",
            ir: { pieza: "minueto-en-sol" },
          },
        ],
      },
      {
        fecha: "2026-10-02",
        titulo: "La receta",
        tramos: [
          {
            minutos: 5,
            que: "Escalas de Sol y de Re",
            como: "Re suma el *Do♯*: fa y do, los dos primeros del orden. Decir las notas.",
            ir: { ejercicio: "escalas" },
          },
          {
            minutos: 10,
            que: "Dictado contrarreloj, con las cuatriadas",
            como: "Primero sin pistas. Antes de apoyar la mano, decir la receta en semitonos. El ∅ y el ° son los que se confunden: el ∅ tiene la séptima un semitono más arriba.",
            ir: { ejercicio: "contrarreloj" },
          },
          {
            minutos: 10,
            que: "Sacarlo de oído",
            como: "Sin mirar nada. Escuchar primero si el acorde *descansa o tira*, y recién después buscar las notas.",
            ir: { ejercicio: "oido" },
          },
          {
            minutos: 5,
            que: "Minueto en Sol: derecha, compases 1 a 4",
            como: "Sola, lenta, con el recorte de compases y el loop. Contar el 3/4 en voz alta.",
            ir: { pieza: "minueto-en-sol" },
          },
        ],
      },
      {
        fecha: "2026-10-03",
        titulo: "La vuelta vestida",
        tramos: [
          {
            minutos: 5,
            que: "El ejercicio que se desplaza, mano izquierda",
            como: "La que menos se practica. Igual que el jueves: lento y sin cortar.",
            ir: { ejercicio: "posiciones" },
          },
          {
            minutos: 10,
            que: "Dictado de voicing",
            como: "Abierto: izquierda en 1-5 o 1-7, *la tercera siempre arriba*. Si sale \"tercera abajo\", es justo el error de la clase 7: no pasar al siguiente hasta armarlo bien.",
            ir: { ejercicio: "dictado-voicing" },
          },
          {
            minutos: 20,
            que: "La vuelta de la clase 6, en tres texturas",
            como: "Primero escuchar cada textura en loop para tenerla en el oído, después sin pantalla. La vuelta con sus inversiones —el bajo Do, Si♭, La, Si, Do: se va y vuelve— y la izquierda abierta: *plaqué*, después *pum-chá*, después *arpegios*. Unos seis minutos cada una.",
            ir: { ejercicio: "texturas" },
          },
          {
            minutos: 10,
            que: "Minueto en Sol: derecha, compases 1 a 8",
            como: "Lo del viernes y cuatro más. Cuando el 1 a 4 salga tres veces limpio, recién ahí sumar el resto.",
            ir: { pieza: "minueto-en-sol" },
          },
        ],
      },
      {
        fecha: "2026-10-04",
        titulo: "Componer",
        tramos: [
          {
            minutos: 5,
            que: "Escala de Fa",
            como: "El primer bemol: *Si♭*. Es la única tonalidad que no se lee con la regla del anteúltimo bemol, porque no tiene anteúltimo — ésa se sabe suelta.",
            ir: { ejercicio: "escalas" },
          },
          {
            minutos: 10,
            que: "Inventar una secuencia",
            como: "Variar entre las tres familias, nunca cuatro funciones iguales seguidas, cerrar con cadencia. Meter *un Fm prestado* en algún lado. Tocarla hasta que suene sola.",
            ir: { ejercicio: "inventor" },
          },
          {
            minutos: 20,
            que: "Ponerle melodía",
            como: "Sobre esa misma secuencia. Primero las guías —la nota que recibe a cada acorde—, después el puente por grado conjunto, y que *respire*: figuras distintas y algún silencio en el pulso débil.",
            ir: { ejercicio: "melodia" },
          },
          {
            minutos: 10,
            que: "Tocarla encima",
            como: "La progresión en loop y la melodía la tocás vos. Primer compás de cada acorde: aterrizar en la guía.",
            ir: { ejercicio: "encima" },
          },
        ],
      },
      {
        fecha: "2026-10-05",
        titulo: "El tiempo",
        tramos: [
          {
            minutos: 5,
            que: "Escala de Si♭",
            como: "Dos bemoles, Si♭ y Mi♭. El anteúltimo bemol es Si♭: ahí está el nombre de la tonalidad.",
            ir: { ejercicio: "escalas" },
          },
          {
            minutos: 5,
            que: "Contar 3/4 y 6/8",
            como: "En voz alta con el metrónomo, pasando de uno al otro sin cortar. El 6/8 se cuenta *en dos*, con el pulso de negra con puntillo.",
            ir: { ejercicio: "compases" },
          },
          {
            minutos: 10,
            que: "¿Qué compás es? y Completá el compás",
            como: "Cinco minutos cada uno. Pensar el compás como presupuesto: cuánto entra, no cuánto se cuenta.",
            ir: { ejercicio: "que-compas" },
          },
          {
            minutos: 10,
            que: "Minueto en Sol: izquierda, compases 1 a 8",
            como: "Sola. Casi no se mueve, así que el trabajo es el tiempo: la blanca con puntillo dura el compás entero y hay que dejarla sonar.",
            ir: { pieza: "minueto-en-sol" },
          },
        ],
      },
      {
        fecha: "2026-10-06",
        titulo: "Todo mezclado",
        tramos: [
          {
            minutos: 5,
            que: "Las cinco escalas de corrido",
            como: "Do, Sol, Re, Fa, Si♭, sin parar entre una y otra. Si alguna tropieza, ésa va dos veces.",
            ir: { ejercicio: "escalas" },
          },
          {
            minutos: 10,
            que: "¿En qué tonalidad está?, las dos direcciones",
            como: "Ahora también del nombre a la armadura, y con bemoles. La relativa, siempre en voz alta.",
            ir: { ejercicio: "que-tonalidad" },
          },
          {
            minutos: 5,
            que: "Las cadencias, con nombre",
            como: "Un repaso rápido de la clase 4 para que no se oxide.",
            ir: { ejercicio: "cadencias" },
          },
          {
            minutos: 10,
            que: "Minueto en Sol: manos juntas, compases 1 a 4",
            como: "Muy lento, en *seguime* si está el teclado enchufado. Si no sale, volver a manos separadas: no es retroceder, es el orden.",
            ir: { pieza: "minueto-en-sol" },
          },
        ],
      },
      {
        fecha: "2026-10-07",
        titulo: "Día de clase",
        tramos: [
          {
            minutos: 5,
            que: "Calentar las dos manos",
            como: "El ejercicio que se desplaza, las dos juntas.",
            ir: { ejercicio: "posiciones" },
          },
          {
            minutos: 5,
            que: "El minueto, lo que salga",
            como: "Una pasada tranquila de lo que haya quedado, para mostrarlo.",
            ir: { pieza: "minueto-en-sol" },
          },
          {
            minutos: 5,
            que: "Las preguntas para Quique",
            como: "Releer las dudas de la clase 8. La primera de la lista: *la digitación de las escalas*, después de una semana tocándolas sin ella.",
            ir: { clase: 8 },
          },
        ],
      },
    ],
  },
];

/**
 * La semana que corresponde mostrar: la última armada después de la última
 * clase. Cuando se publica la clase siguiente, deja de estar vigente sola y la
 * sala vuelve a mostrar la tarea del miércoles.
 */
export function semanaVigente(): Semana | null {
  const ultima = SEMANAS[SEMANAS.length - 1];
  return ultima && ultima.desde > latestLesson().date ? ultima : null;
}
