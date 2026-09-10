import type { Lesson } from "@/content/types";

const lesson: Lesson = {
  n: 6,
  date: "2026-09-09",
  title: "Una vuelta que se va y vuelve: acordes de paso con inversiones",
  summary:
    "La clase 5 puesta a trabajar en una sola vuelta: dominantes secundarios y efectivos, un disminuido de cuatro notas, y cada acorde girado para que el bajo baje de a semitonos. Paso 1 es armar la armonía; la melodía sobre las cordales es la tarea.",
  tags: [
    "acordes de paso",
    "dominantes efectivos",
    "disminuido con séptima",
    "inversiones",
    "bajo cromático",
    "notas guía",
    "notas cordales",
    "armonía formal",
  ],
  blocks: [
    {
      kind: "prose",
      title: "Sexto miércoles",
      text: "Casi toda la clase fue una sola vuelta, escrita en el cuaderno con las tres filas de siempre: la guía arriba, el cifrado en el medio y las notas del acorde abajo, de arriba para abajo como se apoyan los dedos. Es lo de la clase pasada pero más complejo: los acordes de paso ya no son un paréntesis entre dos acordes del campo, sino que la vuelta se va de Do mayor y vuelve, y cada acorde está *girado* a propósito. Quique le puso *Paso 1* a esto de armar la armonía; la melodía viene después y quedó de tarea.",
    },

    // -----------------------------------------------------------------------
    {
      kind: "section",
      title: "La vuelta de la clase",
      emoji: "🧲",
      intro:
        "Once acordes en siete compases. Tres se van del campo de Do mayor —Solm, Mi° y Fa♯°7— y ninguno de los tres cae de sorpresa: cada uno está ahí para llevar al siguiente.",
    },
    {
      kind: "notas-guia",
      title: "El renglón de la clase",
      intro:
        "Tal como quedó en el papel: la guía arriba, el acorde abajo con la barra diciendo qué nota va en el bajo. Tocá las columnas de a una y después el renglón entero. Fijate que la guía casi no salta: Si♭ · Si♭ · Do, Mi · Mi♭ · Re.",
      columnas: [
        { guia: "C", acorde: "C" },
        { guia: "E", acorde: "Am/C" },
        { guia: "A", acorde: "D7/C" },
        { guia: "Bb", acorde: "Gm/Bb" },
        { guia: "Bb", acorde: "Edim/Bb" },
        { guia: "C", acorde: "Fmaj7/A" },
        { guia: "E", acorde: "Am" },
        { guia: "Eb", acorde: "F#dim7/A" },
        { guia: "D", acorde: "G/B" },
        { guia: "D", acorde: "G7/B" },
        { guia: "C", acorde: "C" },
      ],
    },
    {
      kind: "prose",
      title: "Leerla de a un compás",
      text: "*| C | Am D7 | Gm E° | Fmaj7 | Am F♯°7 | G G7 | C |*\n\nEl D7 es el de la tabla de la clase 5, pero no llega a Sol: llega a *Solm*. Es uno de los efectivos que quedaron anotados la vez pasada (D7 → Gm), y acá está usado de verdad: al ir a Solm *le pedimos prestado el dominante*, el D7 hace de dominante de un acorde que Do mayor no tiene. Después el Mi° lleva al Fa como un disminuido de paso —es el séptimo grado de Fa, un semitono abajo—, y de paso Solm y Mi° son los dos vecinos del Fa en su propio campo: por un compás la vuelta está en Fa mayor. El Fmaj7 devuelve al campo de Do. El Fa♯°7 prepara al Sol igual que el Fa♯° de la clase pasada, y el G7 cierra a casa.",
    },
    {
      kind: "prose",
      title: "El disminuido con las cuatro notas",
      text: "La duda que había quedado de la clase 5 —si el disminuido de paso va con tríada o con séptima— se contestó sola en el cuaderno: el que lleva a Sol está escrito *Fa♯ · La · Do · Mi♭*, el disminuido de cuatro notas de la clase 2. Arriba de la columna quedó la flecha que explica para qué sirve la cuarta nota: *Mi♭ → Re*. Las dos notas que Do mayor no tiene resuelven de a un semitono, el Fa♯ subiendo al Sol y el Mi♭ bajando al Re. Un disminuido no es un acorde para quedarse: es dos notas que empujan.",
    },

    // -----------------------------------------------------------------------
    {
      kind: "section",
      title: "El bajo que baja de a semitonos",
      emoji: "🪜",
      intro:
        "En la clase 4 el bajo bajaba por la escala. Acá baja por semitonos, y son las inversiones las que lo consiguen: ningún acorde está en el estado en que se arma.",
    },
    {
      kind: "prose",
      text: "Leé la nota de abajo de cada columna: *Do · Do · Do · Si♭ · Si♭ · La · La · La · Si · Si · Do*. El Am va con el Do abajo, el D7 con el Do abajo —la séptima en el bajo, la tercera inversión de una cuatriada—, el Solm y el Mi° con el Si♭, el Fmaj7 y el Fa♯°7 con el La, el G y el G7 con el Si. Cada bajo se queda quieto dos o tres acordes y después baja un semitono: Do, Si♭, La, y de ahí Si, Do para volver. Las inversiones de la clase 2 y el bajo que baja de la clase 4, juntos.\n\nY arriba pasa lo mismo con la guía: Si♭ que se queda para el Mi°, Mi que baja a Mi♭ y a Re. Dos líneas que caminan de a poco, y en el medio los acordes cambian de nombre.",
    },
    {
      kind: "chord-lab",
      title: "Girar las cuatriadas",
      intro:
        "Las dos cuatriadas que el renglón usa giradas: el D7 con la séptima abajo y el Fa♯°7 con la tercera abajo. Con cuatro notas hay tres inversiones y no dos, y la tercera —la séptima en el bajo— es la que hace que el D7 pueda quedarse sobre el mismo Do que el Am.",
      qualities: ["dom7", "dim7"],
      dictation: true,
      inversiones: true,
    },

    // -----------------------------------------------------------------------
    {
      kind: "section",
      title: "Armonía formal",
      emoji: "🏠",
      intro:
        "Al costado del cuaderno quedó la lista de lo que entra bajo ese nombre, que es lo visto en estas dos clases.",
    },
    {
      kind: "prose",
      text: "*Armonía formal*: dominantes secundarios —el X7 y el X°—, dominantes efectivos e inversión de acordes. Son tres herramientas y una sola idea: entre dos acordes de una secuencia se puede meter uno que empuje al que viene, y girarlo para que las voces caminen en vez de saltar. La vuelta de hoy usa las tres a la vez.",
    },
  ],

  homework: [
    "Hacer melodía sobre las notas cordales de la vuelta de la clase: la guía de cada columna sí o sí en el cambio, y entre una y otra un puente por grado conjunto. Es el paso 2 de lo que hoy fue el paso 1.",
    "Tocar la vuelta con las inversiones del cuaderno hasta que el bajo se escuche bajar solo: Do, Si♭, La, Si, Do.",
  ],

  openQuestions: [
    "La frase del cuaderno es \"al ir al Solm le pedimos préstamo el dom\". La leímos como \"le pedimos prestado el dominante\" —el D7 usado como dominante de Solm, el efectivo de la clase 5—. Otra lectura: el Solm es un préstamo de Do menor. Confirmar cuál.",
    "Las guías de las dos últimas columnas (G7 y el C final) no entraron en la foto. Pusimos Re y Do, siguiendo la bajada Mi · Mi♭ · Re; puede que en el papel diga otra cosa.",
    "Arriba del renglón hay unas anotaciones tachadas (un par de \"D°\" y una nota en un cuadrito) que no se entienden en la foto. ¿Eran alternativas de acordes de paso que se descartaron?",
    "\"Paso 1\" quedó escrito al pie de la vuelta. Interpretamos que el paso 1 es armar la armonía con sus inversiones y el paso 2 la melodía sobre las cordales, que es la tarea. Confirmar.",
    "El Mi° antes del Fmaj7: ¿es un disminuido de paso más (el VII° de Fa), o vino como parte del compás en Fa mayor junto con el Solm? Las dos lecturas dan las mismas notas.",
  ],
};

export default lesson;
