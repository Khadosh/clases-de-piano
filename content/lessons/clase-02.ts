import type { Lesson } from "@/content/types";

const lesson: Lesson = {
  n: 2,
  date: "2026-08-12",
  title: "El tiempo y las cuatro notas",
  summary:
    "De dónde salen los números del compás, por qué la chacarera no se cuenta como un vals, y qué pasa cuando a cada tríada le apilás una séptima más.",
  tags: [
    "figuras",
    "compases",
    "subdivisión",
    "cuatriadas",
    "séptimas",
    "cifrado inglés",
  ],
  blocks: [
    {
      kind: "prose",
      title: "Segundo miércoles",
      text: "La clase se partió en dos mitades que no se parecen en nada. Primero *el tiempo*: qué son las figuras, de dónde salen los dos números del compás y por qué hay músicas que se cuentan de a dos y otras de a tres. Después volvimos a los acordes, pero agregando una nota más arriba.\n\nLo del tiempo es lo primero que en este cuaderno no se podía escribir todavía: hasta ahora la app sabía qué notas suenan y nunca cuánto duran.",
    },

    // -----------------------------------------------------------------------
    {
      kind: "section",
      title: "Las figuras",
      emoji: "⏱️",
      intro:
        "Una figura no se define por cuánto dura en segundos —eso depende del tempo— sino por *en cuántas partes divide a la redonda*. La negra es 4 porque la redonda entra cuatro veces.",
    },
    {
      kind: "figuras",
      title: "El árbol",
      intro:
        "Cada fila es la de arriba partida al medio. Lo que hay que escuchar es que *las cuatro filas duran lo mismo*: no se acelera nada, se corta más fino el mismo tiempo.",
    },
    {
      kind: "prose",
      text: "La lista sigue para abajo con la misma lógica y siempre duplicando: semicorchea 16, fusa 32, semifusa 64. Nadie toca semifusas todo el tiempo, pero el número importa igual, porque es el que después aparece abajo en el compás.",
    },

    // -----------------------------------------------------------------------
    {
      kind: "section",
      title: "El compás",
      emoji: "🧮",
      intro:
        "Los dos números no son una fracción, son dos preguntas distintas: *cuántos tiempos entran en un compás* y *qué figura vale un tiempo*.",
    },
    {
      kind: "prose",
      title: "La fórmula",
      text: "Arriba, la cantidad de tiempos que tiene el compás. Abajo, la cantidad de veces en que se divide la redonda — o sea, *cuál* de las figuras del árbol es la que vale un tiempo.\n\nAsí que el 4 de 3/4 no es \"cuatro\" de nada: es *la negra*, porque la negra es la figura que entra cuatro veces en una redonda. Con eso se lee cualquier compás sin memorizar ninguna tabla.",
    },
    {
      kind: "compases",
      title: "Simples y compuestos",
      intro:
        "Los simples llevan 2, 3 o 4 arriba. Los compuestos salen de multiplicar un simple por *3/2*: el numerador por 3 y el denominador por 2. Así 2/4 se convierte en 6/8. Apretá el botón de la constante y escuchá qué cambia — y qué no.",
    },
    {
      kind: "prose",
      title: "Lo que cambia es dónde caen los golpes",
      text: "3/4 y 6/8 tienen las *mismas seis corcheas*. No se parecen en nada igual, porque en 3/4 los golpes caen cada dos y en 6/8 cada tres. Eso es la subdivisión: binaria si cada tiempo se parte en dos, ternaria si se parte en tres.\n\nY ahí está lo bueno: en un compás compuesto el pulso lleva *puntillo*. En 6/8 no se cuentan seis tiempos, se cuentan dos negras con puntillo. El número de abajo dice en qué se subdivide, no qué se cuenta.",
    },
    {
      kind: "prose",
      title: "Europa y África",
      text: "Quique lo ubicó con un mapa, que es la parte que se queda: la música europea suele ir en compases simples, y la que está llena de tresillos —la africana, y de este lado del mundo el folclore— va en compuestos. La *chacarera* es el ejemplo de acá: se cuenta de a tres adentro de cada tiempo, y por eso no se puede contar como un vals aunque tenga la misma cantidad de notas.",
    },

    // -----------------------------------------------------------------------
    {
      kind: "section",
      title: "Cuatriadas",
      emoji: "🍀",
      intro:
        "La segunda mitad de la clase: agarrar las tríadas de la clase 1 y apilarles una nota más arriba. Con eso el acorde deja de ser un color y pasa a ser una *situación* — algo que quiere ir a algún lado.",
    },
    {
      kind: "prose",
      title: "Qué séptima admite cada una",
      text: "No todas las tríadas aceptan las dos séptimas. La regla que dio Quique, tríada por tríada:\n\n*Mayor*: puede llevar séptima mayor o menor. Las dos de la clase 1 — el triangulito y la de dominante.\n\n*Menor*: también las dos. La menor con séptima menor es la cómoda; la menor con séptima mayor es el bicho raro.\n\n*Aumentada*: sólo la menor. Es el 7+5.\n\n*Suspendidas*: sólo la menor. Es el 7sus4.\n\n*Disminuida*: acá hay dos, y la de arriba ya no es una séptima menor sino *disminuida*. Con la menor da la semidisminuida (m7♭5, el ∅); con la disminuida da la disminuida entera (°).",
    },
    {
      kind: "chord-lab",
      title: "Las cuatriadas nuevas",
      intro:
        "Las cuatro que aparecieron hoy, con las de la clase 1 al lado para comparar. Fijate en la *receta*: las cuatriadas siguen siendo un apilado de saltos, sólo que ahora son tres saltos y no dos.",
      qualities: [
        "maj7",
        "dom7",
        "min7",
        "minmaj7",
        "aug7",
        "7sus4",
        "m7b5",
        "dim7",
      ],
      dictation: true,
      inversiones: true,
    },
    {
      kind: "prose",
      title: "Dos que conviene mirar de cerca",
      text: "*C7+5* es Do · Mi · Sol♯ · Si♭. La aumentada empujando para arriba y la séptima tirando para abajo, las dos a la vez: no hay forma de que se quede quieta.\n\n*C7sus4* es Do · Fa · Sol · Si♭. Ni alegre ni triste, y encima con la séptima pidiendo resolver. Es todo pregunta.\n\nY la *disminuida entera* tiene una gracia aparte: son tres saltos de 3 semitonos, todos iguales, así que la girás y da el mismo acorde. No tiene fundamental — o tiene cuatro, según cómo lo mires.",
    },
    {
      kind: "nomenclature",
      title: "Los cifrados nuevos",
      intro:
        "Cuatro símbolos más para leer. El *∅* de la semidisminuida y el *°* de la disminuida son los que más cuesta reconocer al principio porque se parecen.",
      examples: ["C7+5", "C7sus4", "Cm7b5", "Cdim7", "Cmaj7", "Cm(maj7)"],
    },
  ],

  homework: [
    "Contar en voz alta un 3/4 y un 6/8 con el metrónomo de la clase, hasta poder pasar de uno al otro sin pensarlo.",
    "Armar las cuatro cuatriadas nuevas desde tres fundamentales distintas, diciendo la receta en voz alta antes de apoyar la mano.",
    "Dictado con las cuatriadas nuevas prendidas: el ∅ y el ° son los que más cuesta distinguir de oído.",
    "Escuchar una chacarera contando de a tres adentro de cada tiempo, y después un vals contando de a dos.",
  ],

  openQuestions: [
    "¿La regla de las suspendidas vale también para sus2? Cargué sólo 7sus4, que es el que quedó escrito en el cuaderno.",
    "En la hoja aparecen C6 y Cm6, que no llegamos a hablar. ¿Son para la clase que viene o me los perdí?",
    "El ° del final, ¿es la disminuida de cuatro notas o la tríada disminuida a secas? Lo cargué como la de cuatro (Do · Mi♭ · Sol♭ · La), que es la que cierra la regla de las séptimas.",
    "Quedó anotada la progresión C | Dm7 | G7 | Em7 | Am | Bm7♭5 | (E7) | Am. No la puse todavía porque el cuaderno no tiene un bloque para progresiones: ¿la armamos para la próxima?",
  ],
};

export default lesson;
