import type { Lesson } from "@/content/types";

const lesson: Lesson = {
  n: 1,
  date: "2026-08-05",
  title: "Las manos primero",
  summary:
    "Cómo se para la mano en el teclado, de dónde salen los acordes contando semitonos, qué es invertir uno, y el primer ejercicio que se desplaza solo.",
  tags: [
    "postura",
    "acordes",
    "inversiones",
    "cifrado inglés",
    "ejercicio de posiciones",
  ],
  blocks: [
    {
      kind: "prose",
      title: "Primer miércoles",
      text: "Clase uno con Quique Yance. Casi todo el tiempo se fue en dos cosas: *cómo se apoya la mano* y *cómo se arma un acorde contando*. Nada de partituras todavía — primero el cuerpo, después el mapa.",
    },

    // -----------------------------------------------------------------------
    {
      kind: "section",
      title: "La mano",
      emoji: "🖐️",
      intro:
        "Antes que cualquier nota, cómo se para la mano. Las dos correcciones de la clase fueron sobre esto, y las dos son sobre *no gastar movimiento*.",
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

    // -----------------------------------------------------------------------
    {
      kind: "section",
      title: "Los acordes",
      emoji: "🎹",
      intro:
        "Toda la teoría de la clase entra en una idea: un acorde es una *receta de distancias*, y la fundamental es sólo desde dónde empezás a contar.",
    },
    {
      kind: "quote",
      text: "En la escala de do, el fa en realidad es un mi sostenido.",
      by: "Quique",
    },
    {
      kind: "semitonos",
      title: "Las dos grietas del teclado",
      intro:
        "Dicho así suena a chicana, y es la cosa más importante de la clase. Las notas tienen nombre de letra, pero *las letras mienten sobre las distancias*: de do a re hay dos semitonos y de mi a fa hay uno solo. La diferencia está a la vista — entre mi y fa no hay tecla negra donde caer, así que el sostenido de mi no tiene más remedio que ser fa. Lo mismo pasa entre si y do.",
    },
    {
      kind: "prose",
      text: "Ahora, *escribir* la escala de do con un mi♯ adentro sería raro, y hay una razón: en una escala cada letra se usa una sola vez. Do re mi fa sol la si — siete notas, siete letras. Si pusieras mi♯ te quedarías sin fa y tendrías dos mi.\n\nPero hay escalas donde no te queda otra. En fa♯ mayor la séptima *se escribe* mi♯, no fa, porque la efe ya está ocupada por la tónica. Ahí el dato deja de ser un juego mental y se vuelve la única forma correcta de escribirlo.",
    },
    {
      kind: "prose",
      title: "Por eso se cuenta en semitonos",
      text: "Si las letras no dicen la distancia, hay que contar teclas. Y ahí se acaba el problema: no hay que memorizar doce acordes mayores, hay que memorizar *una receta* en semitonos. Cambiar de fundamental es la misma receta empezando en otra tecla.\n\nSus2 y sus4, por ejemplo, son el mismo acorde con el dedo del medio corrido un lugar: para abajo o para arriba.",
    },
    {
      kind: "prose",
      title: "Después: girarlo",
      text: "Un acorde tampoco está obligado a tener su fundamental abajo. Si agarrás la nota más grave y la subís una octava, seguís teniendo *el mismo acorde* —las mismas notas, la misma receta— pero cambia cuál queda en el bajo, y con eso cambia el color y, sobre todo, cuánto tenés que mover la mano para llegar al acorde siguiente. Uno de tres notas tiene dos inversiones; uno de cuatro, tres.",
    },
    {
      kind: "chord-lab",
      title: "El laboratorio",
      intro:
        "Elegís la fundamental, la receta y la inversión, y las tres cosas se ven en el teclado a la vez. El *dictado* es el juego del profe: sale un cifrado, ponés las manos y después mirás — y se le puede pedir que incluya inversiones, que es la versión difícil.",
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
      inversiones: true,
    },
    {
      kind: "nomenclature",
      title: "Cifrado inglés",
      intro:
        "La letra es la fundamental, lo que viene después es la receta. Una vez que entendés que el sufijo *es* la fórmula, leer un cifrado deja de ser traducir y pasa a ser tocar.",
      examples: ["E", "Em", "E7", "Emaj7", "Esus2", "Esus4", "Em7", "Edim"],
    },

    // -----------------------------------------------------------------------
    {
      kind: "section",
      title: "Los ejercicios",
      emoji: "🏃",
      intro:
        "Dos: uno de dedos que recorre el teclado entero, y uno de reparto entre las dos manos.",
    },
    {
      kind: "exercise",
      title: "El ejercicio que se desplaza",
      intro:
        "Do – mi – fa – sol – la, y de ahí para abajo: sol – fa – mi – *re*. Ese re ya es la mano corrida un lugar, así que el ciclo nunca vuelve al dedo que arrancó. Se sube así una octava entera, y al llegar arriba *el hueco cambia de lado*: ahora el que saltea es el dedo más agudo, y con la misma figura al revés se baja la octava. La mano no se mueve del lugar en el pivote, sólo se reacomoda por dentro.",
      variants: [
        {
          label: "Izquierda, completo",
          hand: "izquierda",
          recorrido: "completo",
          note: "Sube con el hueco entre el 5 y el 4, y baja con el hueco entre el 1 y el 2. Fijate en el pivote de arriba: el dedo 1 se queda donde está y los del medio se corren.",
        },
        {
          label: "Sólo la subida",
          hand: "izquierda",
          recorrido: "sube",
          note: "El tramo de ida suelto, para machacarlo aparte.",
        },
        {
          label: "Sólo la bajada",
          hand: "izquierda",
          recorrido: "baja",
          note: "El tramo de vuelta suelto: arranca arriba, el dedo 1 saltea y se desplaza.",
        },
        {
          label: "Derecha, completo",
          hand: "derecha",
          recorrido: "completo",
          note: "Las mismas notas, la digitación al revés: acá el 1 es el que está abajo. Ojo con el pulgar, que tiende a hundirse.",
        },
        {
          label: "Las dos manos",
          hand: "ambas",
          recorrido: "completo",
          note: "El objetivo final de la semana. Primero lentísimo.",
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
  ],
  homework: [
    "El ejercicio completo, una mano por vez, lentísimo: subir la octava y bajarla sin cortar, mirando que ningún dedo se despegue.",
    "Armar los cuatro tipos de tríada desde las doce fundamentales, contando en voz alta la fórmula.",
    "Cada acorde en sus tres posiciones (fundamental, 1ª y 2ª), y las séptimas también en la 3ª.",
    "Dictado de acordes: que alguien tire un cifrado raro y ponerlo sin pensar demasiado.",
  ],
};

export default lesson;
