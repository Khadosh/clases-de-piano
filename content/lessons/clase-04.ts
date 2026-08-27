import type { Lesson } from "@/content/types";

const lesson: Lesson = {
  n: 4,
  date: "2026-08-26",
  title: "Cantar encima: melodía, cadencias y préstamos",
  summary:
    "Por qué arpegiar no es hacer una melodía, las notas guía que reciben a cada acorde, los nombres completos de las cadencias, y las tres escalas menores con sus préstamos.",
  tags: [
    "melodía",
    "notas guía",
    "cantabile",
    "cadencias",
    "sustituciones",
    "armonías paralelas",
    "préstamos melódicos",
    "escalas menores",
  ],
  blocks: [
    {
      kind: "prose",
      title: "Cuarto miércoles",
      text: "La clase más densa hasta ahora, lejos. Arrancó con la tarea corregida —lo que yo creía que era una melodía no lo era— y de ahí salió un método para construir melodías de verdad, un sistema de nombres para las cadencias, y al final tres escalas nuevas sobre Do con todo un mundo adentro: los *préstamos melódicos*. Es más de lo de la clase 3, pero a una profundidad que cambia el juego.",
    },

    // -----------------------------------------------------------------------
    {
      kind: "section",
      title: "Arpegiar no es cantar",
      emoji: "🔁",
      intro:
        "La tarea era armar cadencias y ponerles una melodía. Yo arpegiaba los acordes en la derecha y variaba el acompañamiento en la izquierda — y eso no es una melodía.",
    },
    {
      kind: "correction",
      title: "Lo que la tarea no era",
      emoji: "🔁",
      problem:
        "Arpegiaba los acordes en la derecha —un Em con inversión en Si, por ejemplo— y tocaba el acorde completo en la izquierda, pensando que con eso ya había una melodía.",
      fix:
        "Una melodía es una voz que canta encima de la armonía: frases con ritmo propio, silencios para respirar, y una nota elegida para recibir a cada acorde. El arpegio es el acorde desplegado en el tiempo — es armonía, no canto.",
    },
    {
      kind: "prose",
      title: "Cantabile",
      text: "Para que una melodía suene *cantabile* —que se pueda cantar— hacen falta la *figura* y la *rítmica*: notas de duraciones distintas y silencios entre las frases. Algo que no corta nunca no respira, y lo que no respira no se puede cantar.\n\nQuedó dicho en clase, de paso, que los temas enteramente arpegiados existen y tienen su lugar: se usan para las películas, de fondo. Para la música que se canta, no.",
    },

    // -----------------------------------------------------------------------
    {
      kind: "section",
      title: "Las notas que reciben al acorde",
      emoji: "✍️",
      intro:
        "El ejercicio que destrabó todo: antes de inventar nada, escribir arriba de cada acorde la nota con la que la melodía lo va a recibir.",
    },
    {
      kind: "prose",
      text: "Sobre una secuencia de acordes, el método es en dos pasadas. Primero se elige, para cada acorde, *la nota con la que la melodía va a estar sonando cuando ese acorde empiece o cambie* — una nota del acorde, escrita arriba, como una segunda línea del cuaderno. Recién después se juega: la melodía se mueve alrededor de esas guías, pero cada cambio de acorde la encuentra donde se había prometido.\n\nEs la ley de las cordales de la clase 3, dada vuelta: en vez de chequear al final que las notas largas caigan en el acorde, se *planifican* primero los aterrizajes y se improvisa lo demás.",
    },
    {
      kind: "notas-guia",
      title: "El renglón de la clase",
      intro:
        "La secuencia que trabajamos, tal como quedó en el papel: la guía arriba, el acorde abajo. Tocá cada columna, y después el renglón entero — la fila de arriba, sola, ya es casi una melodía.",
      columnas: [
        { guia: "E", acorde: "C" },
        { guia: "B", acorde: "Em/B" },
        { guia: "A", acorde: "Dm/A" },
        { guia: "B", acorde: "G" },
        { guia: "C", acorde: "Am" },
        { guia: "B", acorde: "G" },
        { guia: "A", acorde: "Am" },
      ],
    },
    {
      kind: "prose",
      title: "El bajo que baja",
      text: "Mirá el bajo de la progresión: *Do, Si, La, Sol* — baja por la escala de a un escalón, gracias a las inversiones de la clase 2 (el Em girado para que el Si quede abajo, el Dm girado para el La). Las inversiones dejaron de ser un ejercicio de giro y pasaron a estar al servicio de la música: el bajo camina para un lado mientras la guía se queda cerca, cada uno con su propia línea.",
    },
    {
      kind: "prose",
      title: "Frase, estrofa, tema",
      text: "Y un mapa de cómo se organiza una melodía, que es el mismo de una letra de canción: la *frase musical* (el motivo — el pedacito que se repite y se reconoce), el *fin de estrofa*, y el *fin de tema*. Las cadencias son las que marcan esos finales: cerrar una estrofa y cerrar el tema entero no piden la misma llegada. El detalle fino de qué cadencia va con cada cierre quedó para la próxima — abajo está anotada la duda.",
    },

    // -----------------------------------------------------------------------
    {
      kind: "section",
      title: "Las cadencias, con nombre y apellido",
      emoji: "🏠",
      intro:
        "El juego de la clase: Quique ponía una cadencia y había que nombrarla. Y en el juego aparecieron los nombres completos — y las sustituciones.",
    },
    {
      kind: "prose",
      text: "El sistema de nombres se arma solo una vez que se ve la lógica: *el apellido lo pone la función del acorde que llega a la tónica*. Si llega el V, la cadencia es *dominante*; si llega el IV, es *subdominante*. Si la llegada es directa a la casa, es *auténtica*. Y dos vueltas más:\n\n*Sustitución*: cuando el que llega no es el principal de su familia. El IIm → I es una cadencia subdominante igual que el IV → I — el IIm y el IV son de la misma familia — pero como el principal de los subdominantes es el IV, el IIm entra *sustituyéndolo*.\n\n*Compuesta*: cuando la cadencia son tres acordes y no dos. La IIm → V → I es la compuesta auténtica — las tres funciones en fila. Y la V → IV → I es la compuesta plagal: con esto quedó contestada la duda de la clase 3, donde la plagal había quedado anotada con el V adelante. Ésa era la compuesta; la IV → I a secas es la subdominante auténtica.",
    },
    {
      kind: "cadencias",
      title: "El mapa y el juego",
      intro:
        "Primero el mapa: cada cadencia con su nombre, para escucharla las veces que haga falta. Después el juego de la clase: suena una y hay que nombrarla — con los grados a la vista, o a oído solo.",
    },
    {
      kind: "prose",
      title: "La rota, otra vez",
      text: "En el juego apareció una rota distinta de la de la clase 3: *V → IIIm*. El V promete la casa y aterriza en un primo del reposo — en la clase 3 el engaño caía en el VIm, acá en el IIIm, que es el otro primo. La lógica es la misma: el oído espera el I y recibe un acorde que descansa parecido pero no es la casa. El nombre exacto quedó anotado con dudas (abajo), así que por ahora conviven las dos rotas.",
    },

    // -----------------------------------------------------------------------
    {
      kind: "section",
      title: "Tres maneras de ser menor",
      emoji: "🪜",
      intro:
        "Sobre el mismo Do de siempre, tres escalas nuevas. Y con la regla de la clase 3 —nota sí, nota no— los acordes de cada una salen solos.",
    },
    {
      kind: "prose",
      text: "Las *armonías paralelas* son las escalas construidas sobre la misma tónica. Sobre Do ya conocíamos la mayor; ahora se sumaron las tres menores, y la manera de recordarlas es por qué notas se corren:\n\n*Menor antigua* (la natural): Mi♭, La♭ y Si♭. Tres bemoles.\n\n*Menor armónica*: Mi♭ y La♭ — el Si vuelve a natural, para que el V vuelva a ser mayor y pida volver a casa.\n\n*Menor melódica*: sólo Mi♭. La más parecida a la mayor: apenas la tercera se oscurece.\n\nY acá la sorpresa: aplicando la regla de siempre, en la armónica y la melódica el acorde del tercer grado sale *aumentado* — Mi♭ aumentado, el acorde de la clase 1 que nunca aparecía en el campo mayor, por fin tiene una casa donde vive naturalmente.",
    },
    {
      kind: "paralelas",
      title: "Las cuatro escalas, con sus acordes",
      intro:
        "Cada escala con sus notas —marcadas las que se corren respecto de la mayor— y los siete acordes que le salen solos. Abrí una, subí la escala, tocá sus acordes.",
    },
    {
      kind: "prose",
      title: "Los préstamos melódicos",
      text: "¿Y para qué sirven las paralelas, si uno está tocando en Do mayor? Para *pedir prestado*. Un préstamo melódico es usar, en una secuencia mayor, un acorde de la paralela menor — sin mudarse de tonalidad: se toma el acorde, se lo usa, y se devuelve.\n\nEl préstamo estrella es el *Fm*: el IV de Do menor metido en una secuencia de Do mayor. Oscurece el medio de la frase sin irse de casa — es ese momento agridulce que aparece en mil canciones. El Gm (el V de la menor antigua) ya casi no se usa: quedó recomendado quedarse con el Fm.",
    },
  ],

  homework: [
    "Armar cadencias y ponerles melodía con el método de las notas guía: primero elegir la nota que recibe a cada acorde, después jugar alrededor — con frases que respiren: figura, ritmo y silencios.",
    "Meter al menos un préstamo melódico de una escala menor en esas secuencias. Recomendado: el Fm (el IV de Do menor) dentro de Do mayor. El Gm casi no se usa.",
  ],

  openQuestions: [
    "La IV → I quedó anotada como \"subdominante auténtica o plagal\": ¿son dos nombres para la misma cadencia, o \"plagal\" nombra otra cosa (la compuesta V → IV → I)? Va con los dos nombres hasta preguntar.",
    "La rota del juego quedó anotada como V → IIIm y con \"subdominante\" en el nombre — pero el IIIm es familia del reposo, no subdominante, y la rota de la clase 3 era V → VIm. ¿\"Rota\" es cualquier V que cae en un primo del I, y el nombre completo cuál es?",
    "Frase musical (motivo), fin de estrofa y fin de tema: quedó la idea general de que las cadencias marcan esos cierres, pero no el mapeo fino de qué cadencia va con cuál. Preguntar con un ejemplo concreto.",
    "El acorde del tercer grado de la armónica quedó anotado como \"Eb#\": lo interpretamos como Mi♭ aumentado (Mi♭-Sol-Si), que es lo que da la cuenta de apilar terceras — el test lo verifica. Confirmar la escritura con Quique.",
    "¿\"Menor antigua\" y \"menor natural\" son exactamente lo mismo? El cuaderno ya la llamaba natural; acá va como la nombró Quique.",
  ],
};

export default lesson;
