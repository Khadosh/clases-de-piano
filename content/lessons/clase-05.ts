import type { Lesson } from "@/content/types";

const lesson: Lesson = {
  n: 5,
  date: "2026-09-02",
  title: "Acordes de paso: los dominantes secundarios",
  summary:
    "La lógica del G7 → C aplicada a cada acorde de la escala: los dominantes secundarios y los disminuidos como acordes de paso, los efectivos que se van del campo, y la melodía que hace puentes por grado conjunto entre las cordales.",
  tags: [
    "dominantes secundarios",
    "acordes de paso",
    "dominantes efectivos",
    "disminuidos de paso",
    "campo armónico",
    "notas cordales",
    "grado conjunto",
    "cantabile",
  ],
  blocks: [
    {
      kind: "prose",
      title: "Quinto miércoles",
      text: "Arranqué mostrando lo que había hecho con la tarea: melodías sobre secuencias de acordes, con las notas guía primero y la frase después. Quique dijo que iba bien, y de ahí salieron varios tips en dos frentes: cómo dar *conexión entre los acordes* y cómo mejorar las melodías. El grueso de la clase fue el primero.",
    },

    // -----------------------------------------------------------------------
    {
      kind: "section",
      title: "Conectar los acordes",
      emoji: "🧲",
      intro:
        "Entre dos acordes de una secuencia se puede meter un tercero que no es de la secuencia: un *acorde de paso*. Hay dos opciones — los dominantes secundarios (X7) y los acordes disminuidos (X°) — y las dos apuntan al mismo lugar: al acorde que viene.",
    },
    {
      kind: "prose",
      title: "La misma lógica del G7",
      text: "Todo parte de lo que ya sabíamos: el G7 es el dominante principal de Do mayor y lleva *indefectiblemente* a C. La fórmula del dominante es *X7*: un acorde mayor con séptima menor. Y la pregunta de la clase fue: ¿por qué sólo el G7? Si la fórmula funciona sobre Sol, funciona sobre cualquier nota.\n\nSe construye igual: sobre una nota de la escala se arma el X7, y ese acorde lleva a lo que está *cinco semitonos arriba* — la misma distancia que hay de Sol a Do. Arrancando por Do: el C7 lleva a Fa, que en nuestra escala es mayor. El D7 lleva a Sol. El E7 lleva a La, que en la escala es menor, así que lleva a *Am*. Y así hasta cerrar la vuelta.",
    },
    {
      kind: "dominantes-secundarios",
      title: "La tabla de Do mayor",
      intro:
        "Cada X7 con el acorde adonde lleva, para escuchar la llegada de a una — fijate en la nota pintada, que es la que Do mayor no tiene. El interruptor pasa a la otra opción, los disminuidos, que llegan a los mismos lugares desde un semitono abajo. Después, la vuelta: arranca con la del cuaderno tal cual, y cualquier otra se puede llenar de a uno, con y sin, que es donde se entiende para qué están.",
    },
    {
      kind: "prose",
      title: "Los que llevan a otro campo: los efectivos",
      text: "En la lista de la clase faltaba uno. El F7 se arma igual que los demás, pero cae en *Si♭*, que no está en Do mayor: lleva indefectiblemente a otro campo armónico. A ésos Quique los llamó *dominantes efectivos*: toda dominante que te saca del campo es efectiva. En el cuaderno quedaron tres: F7 → B♭, G7 → Cm, D7 → Gm.\n\nY una vuelta de tuerca, nombrada sin entrar en detalle: los secundarios se convierten en efectivos *cambiando el mayor por menor y viceversa* en el acorde de llegada. E7 → A, A7 → D, B7 → E, C7 → Fm: el mismo X7 de la tabla, pero llegando a un acorde que Do mayor no tiene. En la tabla está el botón para oír las dos llegadas y comparar.",
    },
    {
      kind: "prose",
      title: "La otra opción: los disminuidos",
      text: "El acorde disminuido es la segunda manera de conectar, y la regla es una sola: el *X° es el VII° del acorde adonde se llega*. Es el Bdim → C de la escala, mudado a cualquier destino: para llegar a Sol se pone el séptimo grado de Sol, que es Fa♯°; para llegar a Do, el Si°. Un semitono abajo, y resuelve para arriba.\n\nEl ejemplo de la clase junta las dos opciones, con el acorde de paso entre paréntesis adentro del compás anterior:\n\n*| C | Em (C7) | F | Dm (F♯°) | G | Am (A7) | Dm | G (B°) | C |*\n\nEl C7 prepara al F, el Fa♯° al G, el A7 al Dm y el B° al C. Está armado en la vuelta de arriba para escucharlo con y sin.",
    },

    // -----------------------------------------------------------------------
    {
      kind: "section",
      title: "La melodía, otra vez",
      emoji: "🎼",
      intro:
        "Sobre lo que llevé, dos ideas: cómo ir de una nota cordal a la siguiente, y qué mirar cuando algo te gusta. Y un renglón nuevo, con un dominante secundario y un préstamo adentro.",
    },
    {
      kind: "prose",
      title: "Las cordales, sí o sí",
      text: "Las notas escritas arriba de cada acorde son *notas cordales*: notas del acorde, y sí o sí hay que tocarlas cuando cambia el acorde. Es el método de la clase 4 dicho más fuerte — la guía no es una sugerencia, es el lugar donde la melodía tiene que estar en el cambio.",
    },
    {
      kind: "notas-guia",
      title: "El renglón de la clase",
      intro:
        "El renglón que quedó en el cuaderno: la guía arriba, el acorde abajo. Fijate en el E7 antes del Am —un dominante secundario en el medio de la vuelta— y en el Fm del final, el préstamo de la clase 4, recibido por su La♭.",
      columnas: [
        { guia: "E", acorde: "C" },
        { guia: "E", acorde: "Em/B" },
        { guia: "G", acorde: "Am7" },
        { guia: "F", acorde: "Bdim" },
        { guia: "G", acorde: "C" },
        { guia: "C", acorde: "F" },
        { guia: "B", acorde: "E7" },
        { guia: "A", acorde: "Am" },
        { guia: "Ab", acorde: "Fm" },
        { guia: "C", acorde: "C" },
      ],
    },
    {
      kind: "prose",
      title: "Puentes por grado conjunto",
      text: "Para ir de una nota cordal a la siguiente, la melodía hace una *melodía de conexión*, un *puente* entre las dos: caminar por grado conjunto —de a un escalón de la escala— en vez de saltar directo. No es que los saltos estén prohibidos, pero son los menos. La idea de fondo sigue siendo la de la clase 4: pensar siempre una melodía *cantabile*, que se pueda cantar — y lo que se canta, en general, camina.",
    },
    {
      kind: "prose",
      title: "Lo que caracteriza a un artista",
      text: "Y un comentario para adelante: haciendo esto voy a ir encontrando pedacitos que me gustan — un giro de acordes, una manera de armar una frase. Esos fragmentos tienen nombre (no me lo acordé al salir) y son lo que *caracteriza a un artista*: a veces es cómo arma los acordes y otras veces cómo fabrica las melodías. Vale la pena anotarlos cuando aparecen.",
    },
  ],

  homework: [
    "Seguir con las melodías sobre secuencias, ahora metiendo acordes de paso entre los acordes: antes de un acorde, su X7 o su X°, como en la vuelta del cuaderno.",
    "En la melodía, las cordales sí o sí en cada cambio, y entre una y otra un puente por grado conjunto — y que siga siendo cantabile: frases, respiraciones, figuras distintas.",
  ],

  openQuestions: [
    "El X° de paso está escrito como tríada (Fa♯°, B°). ¿Vale igual con séptima —el disminuido de cuatro notas de la clase 2— o la tríada alcanza?",
    "Los dominantes efectivos quedaron con ejemplos (F7 → B♭, G7 → Cm, D7 → Gm) y la regla de dar vuelta el mayor/menor. ¿\"Efectivo\" es exactamente \"el que se va del campo\", o nombra algo más?",
    "En la tabla no aparece un dominante para el VII (Bdim). Interpretamos que es porque el X7 que le tocaría, Fa♯7, no se arma sobre ninguna nota de la escala — y porque a un disminuido no se llega. Confirmar.",
    "Los fragmentos que caracterizan a un artista —el giro de acordes o de melodía que uno se apropia—: ¿cómo se llamaban?",
    "La tarea no quedó dicha con todas las letras; la de arriba es lo que se desprende de la clase.",
  ],
};

export default lesson;
