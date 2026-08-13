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
    "enlace de acordes",
  ],
  blocks: [
    {
      kind: "prose",
      title: "Segundo miércoles",
      text: "La clase se partió en dos mitades que no se parecen en nada. Primero *el tiempo*: qué son las figuras, de dónde salen los dos números del compás y por qué hay músicas que se cuentan de a dos y otras de a tres. Después volvimos a los acordes, pero agregando una nota más arriba.",
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
      text: "Arriba, la cantidad de tiempos que tiene el compás. Abajo, la cantidad de veces en que se divide la redonda — o sea, *cuál* de las figuras del árbol es la que vale un tiempo.\n\nAsí que el 4 de 3/4 no es \"cuatro\" de nada: es *la negra*, porque la negra es la figura que entra cuatro veces en una redonda. Con eso se lee cualquier compás sin memorizar ninguna tabla: en 3/2 el de abajo es *la blanca*, en 3/8 es *la corchea*.\n\nY hay una segunda lectura, que es la que se usa tocando: los dos números dicen *cuánto entra*. Un 3/4 son tres negras de presupuesto y las gastás como quieras — tres negras, o una blanca y una negra, o una negra y cuatro corcheas. Un 3/2 son tres blancas, así que ahí entra una redonda y una blanca. La figura no tiene por qué coincidir con el tiempo; lo único que no se puede es pasarse.",
    },
    {
      kind: "compases",
      title: "Simples y compuestos",
      intro:
        "Los simples llevan 2, 3 o 4 arriba. Los compuestos salen de multiplicar un simple por *3/2*: el numerador por 3 y el denominador por 2. Así 2/4 se convierte en 6/8. Apretá el botón de la constante y escuchá qué cambia — y qué no.",
    },
    {
      kind: "prose",
      title: "En un compuesto el pulso lleva puntillo",
      text: "Es lo que más cuesta y no se ve en el número: en 6/8 no se cuentan seis tiempos, se cuentan *dos negras con puntillo*. El número de abajo dice en qué se subdivide, no qué se cuenta. Por eso la subdivisión es binaria cuando cada tiempo se parte en dos y ternaria cuando se parte en tres.",
    },
    {
      kind: "prose",
      title: "Mismo total, distinto acento",
      text: "Dos compases pueden durar exactamente lo mismo y no ser el mismo compás. *2/4 y 4/8* tienen la misma cantidad de música —cuatro corcheas— pero en 2/4 se cuentan dos tiempos y el golpe cae cada dos corcheas, y en 4/8 se cuentan cuatro y cae en cada una. Mismo total, otro esqueleto.\n\n*3/4 y 6/8* son el mismo caso: las mismas seis corcheas, agrupadas de a dos o de a tres.\n\nY ojo con confundir esto con la constante, que es otra cosa: la constante conserva *los tiempos*, no la duración. 2/4 y 6/8 son los dos de dos tiempos, pero el de 6/8 tiene más escrito adentro, porque cada tiempo se partió en tres en vez de en dos.",
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
      kind: "section",
      title: "Enlazar",
      emoji: "🔗",
      intro:
        "Con las cuatriadas ya se puede tocar una progresión entera. Y ahí aparece el problema de verdad: tocarlas todas en estado fundamental hace saltar la mano por todo el teclado, y suena a ejercicio y no a música.",
    },
    {
      kind: "prose",
      text: "La progresión que quedó anotada es *C | Dm7 | G7 | Em7 | Am | Bm7♭5 | (E7) | Am*. Está toda en estado fundamental, que es como se escribe pero no como se toca.\n\nLa idea es: el primer acorde fija dónde está la mano, y a partir de ahí cada acorde se gira a la inversión que menos obligue a moverse. Las notas del acorde no cambian nunca — es exactamente la misma operación de la clase 1, sólo que ahora hay un motivo para elegir una inversión y no otra.",
    },
    {
      kind: "secuencia",
      title: "El ejercicio",
      intro:
        "Está el acorde anterior en gris para que veas de dónde venís. *No hay una única respuesta correcta*: seguido hay dos inversiones igual de buenas, así que en vez de corregirte te dice cuánto moviste y cuánto era el mínimo. El objetivo es bajar ese número.",
      acordes: ["C", "Dm7", "G7", "Em7", "Am", "Bm7b5", "E7", "Am"],
    },
    {
      kind: "prose",
      title: "Los dos criterios no son lo mismo",
      text: "El botón de arriba cambia qué se mide, y vale la pena hacer la progresión con los dos.\n\nQuique lo planteó sobre *el bajo*: que la nota de abajo se mueva poco. Y para piano solo es el criterio correcto, porque cuando tocás el acorde con una mano la nota más grave *es* el bajo, y el oído la sigue más que a ninguna otra: un bajo que salta suena mal aunque la mano casi no se haya movido.\n\nEl otro criterio es el enlace de manual: que se mueva poco *toda la mano*, reteniendo las notas comunes. Es el que sirve cuando alguien más hace el bajo.\n\nSobre esta progresión los dos recorridos coinciden en apenas *tres de los ocho* acordes, así que no son dos maneras de decir lo mismo. Mover el bajo cuesta 4 semitonos de bajo y 57 de mano; mover la mano cuesta 45 de mano pero 8 de bajo.\n\nY el de la mano hace algo que se escucha enseguida: encuentra una posición cómoda y no la suelta más, dejando un *Re* en el bajo de punta a punta. Eso ya no es un enlace, es un pedal. Probá los dos y vas a entender por qué Quique lo planteó sobre el bajo.",
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
    "La progresión enlazada de memoria, con los dos criterios, hasta que la mano vaya sola.",
  ],

  openQuestions: [
    "¿La regla de las suspendidas vale también para sus2? Cargué sólo 7sus4, que es el que quedó escrito en el cuaderno.",
    "En la hoja aparecen C6 y Cm6, que no llegamos a hablar. ¿Son para la clase que viene o me los perdí?",
    "El ° del final, ¿es la disminuida de cuatro notas o la tríada disminuida a secas? Lo cargué como la de cuatro (Do · Mi♭ · Sol♭ · La), que es la que cierra la regla de las séptimas.",
    "El E7 estaba entre paréntesis en el cuaderno. Lo puse como un acorde más de la progresión, pero si el paréntesis quería decir algo (que es opcional, o que es un dominante prestado) avisame y lo anoto.",
  ],
};

export default lesson;
