import type { Lesson } from "@/content/types";

const lesson: Lesson = {
  n: 1,
  date: "2026-08-05",
  title: "Las manos primero",
  summary:
    "Cómo se para la mano en el teclado, de dónde salen los acordes contando semitonos, y el primer ejercicio que se desplaza solo.",
  tags: ["postura", "acordes", "cifrado inglés", "ejercicio de posiciones"],
  blocks: [
    {
      kind: "prose",
      title: "Primer miércoles",
      text: "Clase uno con Quique Yance. Casi todo el tiempo se fue en dos cosas: *cómo se apoya la mano* y *cómo se arma un acorde contando*. Nada de partituras todavía — primero el cuerpo, después el mapa.",
    },
    {
      kind: "correction",
      title: "Falanges curvas, no estiradas",
      problem:
        "Apoyo los dedos estirados, con las falanges planas sobre la tecla.",
      fix: "Las falanges tienen que estar dobladas, con la mano armando una cúpula. El dedo cae desde el nudillo, no se aplasta.",
      analogy:
        "Tocar con los dedos estirados es como intentar correr con las rodillas estiradas.",
      emoji: "🖐️",
    },
    {
      kind: "correction",
      title: "Los dedos no se despegan",
      problem:
        "Cuando un dedo no está tocando, se me levanta y se va lejos del teclado.",
      fix: "Los cinco dedos quedan apoyados sobre sus teclas aunque no suenen. El que no toca espera ahí, sin despegarse. Menos viaje, menos error.",
      emoji: "🧲",
    },
    {
      kind: "chord-lab",
      title: "Los acordes salen de contar",
      intro:
        "No hay que memorizar doce acordes mayores: hay que memorizar *una receta*. Se cuenta en semitonos (teclas, blancas y negras juntas) desde un dedo al siguiente. Cambiar de fundamental es la misma receta empezando en otra tecla.",
      qualities: [
        "maj",
        "min",
        "aug",
        "dim",
        "sus2",
        "sus4",
        "maj7",
        "dom7",
        "min7",
        "minmaj7",
      ],
      dictation: true,
    },
    {
      kind: "quote",
      text: "Sus2 y sus4 son el mismo acorde con el dedo del medio corrido un lugar: para abajo o para arriba.",
      by: "Quique",
    },
    {
      kind: "exercise",
      title: "El ejercicio que se desplaza",
      intro:
        "Do – mi – fa – sol – la, y de ahí para abajo: sol – fa – mi – *re*. Ese re ya es la mano corrida un lugar, así que el ciclo nunca vuelve al dedo que arrancó ni se corta: sigue derecho hasta completar una octava.",
      variants: [
        {
          label: "Izquierda, hueco abajo",
          hand: "izquierda",
          gap: "abajo",
          note: "La versión original. El dedo 5 arranca y se saltea un grado; el hueco queda entre el 5 y el 4.",
        },
        {
          label: "Izquierda, hueco arriba",
          hand: "izquierda",
          gap: "arriba",
          note: "El invertido: arranca el dedo 1, baja hasta el 5, vuelve, y el 1 se corre un lugar.",
        },
        {
          label: "Derecha, hueco abajo",
          hand: "derecha",
          gap: "abajo",
          note: "Las mismas notas que la izquierda, pero con la digitación al revés: acá el 1 es el que arranca. Ojo con el pulgar, que tiende a hundirse.",
        },
        {
          label: "Derecha, hueco arriba",
          hand: "derecha",
          gap: "arriba",
        },
        {
          label: "Las dos manos",
          hand: "ambas",
          gap: "abajo",
          note: "El objetivo final de la semana. Primero lentísimo, en espejo.",
        },
      ],
    },
    {
      kind: "hands",
      title: "El Sol repartido entre las dos manos",
      intro:
        "Un acorde no vive en una sola mano. Acá el Sol se abre: la izquierda toma el esqueleto y la derecha completa arriba. Después se invierte todo de golpe, en simultáneo, sin parar el pulso.",
      positions: [
        {
          label: "Posición A",
          izquierda: [43, 47, 50], // Sol2 – Si2 – Re3
          derecha: [57, 60], // La3 – Do4
          note: "Izquierda: sol – si – re. Derecha: la – do.",
        },
        {
          label: "Posición B (invertida)",
          izquierda: [45, 48], // La2 – Do3
          derecha: [55, 59, 62], // Sol3 – Si3 – Re4
          note: "Las manos intercambian el rol de golpe, las dos al mismo tiempo.",
        },
      ],
    },
    {
      kind: "nomenclature",
      title: "Cifrado inglés",
      intro:
        "La letra es la fundamental, lo que viene después es la receta. Una vez que entendés que el sufijo *es* la fórmula, leer un cifrado deja de ser traducir y pasa a ser tocar.",
      examples: ["E", "Em", "E7", "Emaj7", "Esus2", "Esus4", "Em7", "Edim"],
    },
  ],
  homework: [
    "El ejercicio de posiciones, una mano por vez, lentísimo, mirando que ningún dedo se despegue.",
    "Armar los cuatro tipos de tríada desde las doce fundamentales, contando en voz alta la fórmula.",
    "Dictado de acordes: que alguien tire un cifrado raro y ponerlo sin pensar demasiado.",
  ],
  openQuestions: [
    "En las variantes de la mano derecha, ¿el hueco va del mismo lado del teclado que en la izquierda (mismas notas, otra digitación) o del mismo lado de la mano (el dedo 5 saltea igual, y entonces son otras notas)? Están las dos para probar.",
    "Al llegar a la octava, ¿se vuelve bajando con la misma figura o se corta ahí?",
    "En el Sol repartido, ¿la inversión sube la izquierda una octava o cruza las manos?",
  ],
};

export default lesson;
