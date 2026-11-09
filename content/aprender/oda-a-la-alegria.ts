/**
 * La Oda a la alegría por capas: la de ocho compases en Do de las partituras.
 *
 * Las capas no copian notas: salen de la partitura (`tramosDePieza`) partidas
 * con la armonía de abajo, que es lo único que se escribe acá. La izquierda
 * de la partitura toca dos notas por acorde (Do y Sol, Si y Sol, Sol y Re) y
 * la melodía completa el resto, así que cada tramo se nombra con la tríada
 * entera.
 */

import type { Voicing } from "@/lib/capas";
import { tramosDePieza, type OpcionesDeTramos, type TramoDeArmonia } from "@/lib/tramos";
import { piezaPorSlug } from "@/content/partituras";
import type { Aprendizaje } from "./tipos";

const PIEZA = piezaPorSlug("oda-a-la-alegria")!;

/** Las dos del análisis, para nombrar y para que suenen en la ficha. */
const DO: Voicing = { izquierda: [48], derecha: [60, 64, 67] };
const SOL: Voicing = { izquierda: [43], derecha: [59, 62, 67] };

/** Un acorde por compás, y en el último el Sol y el Do de a dos tiempos: la cadencia. */
const ARMONIA: TramoDeArmonia[] = [
  [DO, 8], [SOL, 8], [DO, 8], [SOL, 8],
  [DO, 8], [SOL, 8], [DO, 8], [SOL, 4], [DO, 4],
];
const tramos = (op: OpcionesDeTramos) => tramosDePieza(PIEZA, ARMONIA, op);

export const ODA_A_LA_ALEGRIA: Aprendizaje = {
  slug: "oda-a-la-alegria",
  titulo: "Oda a la alegría",
  autor: "Beethoven",
  origen: "Novena sinfonía (1824), el tema",
  tonalidad: "Do mayor",
  tonica: 0,
  tempo: PIEZA.bpm,
  bajada:
    "Ocho compases con dos acordes: una frase que pregunta y otra que contesta. Tres capas: la izquierda sola, la derecha sola y las dos juntas.",
  armonia: ARMONIA,
  // El Mi del compás 4 cae sobre el Sol y baja a Re: la apoyatura (paso 4, técnica).
  apoyaturas: [3],
  capas: [
    {
      tipo: "acordes",
      titulo: "La izquierda: dos acordes",
      bajada: "Do y Sol, como los escribe la partitura: dos notas por acorde y una que se queda.",
      como: [
        "*Dos notas, no tres.* La izquierda toca Do y Sol, sin el Mi: la melodía completa el acorde.",
        "*Del Do al Sol, el pulgar no se mueve*: se queda en el Sol de arriba y el meñique baja del Do al Si. Es la tecla en amarillo con «=».",
        "*En el compás 4 la mano baja entera* a Sol y Re, y en el 8 el Sol y el Do van de a dos tiempos: es la cadencia.",
        "*Al 50 % en loop*, una redonda por compás, hasta que el cambio salga sin mirar.",
      ],
      acordes: [DO, SOL],
      vuelta: tramos({ manos: ["izq"] }),
    },
    {
      tipo: "riff",
      titulo: "La derecha: cinco dedos",
      bajada: "La melodía entera vive entre Do y Sol, una tecla por dedo: la mano no se mueve en toda la pieza.",
      como: [
        "*El pulgar en el Do y cada dedo en su tecla*: Do 1, Re 2, Mi 3, Fa 4, Sol 5. Nada se cruza.",
        "*Todo por grados conjuntos*: a la tecla de al lado o a la misma otra vez.",
        "*El 4 y el 8 son los que cambian*: negra con puntillo y corchea. El 4 termina en Re y el 8 en Do.",
        "*Primero la primera frase sola*, después las dos.",
      ],
      previo: {
        titulo: "Paso previo: la primera frase",
        como: "Los compases 1 a 4, que terminan colgados en Re: la pregunta. En loop hasta que salgan sin mirar.",
        compases: tramos({ manos: ["der"], a: 4 }),
      },
      nombreDelLoop: "Las dos frases",
      compases: tramos({ manos: ["der"] }),
    },
    {
      tipo: "todo",
      titulo: "Todo junto",
      bajada: "La pregunta y la respuesta, con las dos manos: la misma melodía con otro final.",
      como: [
        "*Primero al 50 %* y con el click; después sin el click.",
        "*La izquierda apoya y se queda*: una redonda por compás, debajo de cuatro negras.",
      ],
      secciones: [
        { nombre: "Pregunta", caracter: "queda colgada", compases: tramos({ manos: ["izq", "der"], a: 4 }) },
        { nombre: "Respuesta", caracter: "descansa", compases: tramos({ manos: ["izq", "der"], de: 4 }) },
      ],
      notas: [
        "*La pregunta termina en Re y la respuesta en Do.* Que se escuche: la primera queda en el aire sobre el Sol, la segunda cae en casa.",
        "*En el compás 4 el Mi cae sobre el Sol* y baja a Re: es una apoyatura, la nota que tensa antes de resolver. Dale un poco más de peso y soltá el Re.",
        "*La melodía canta, la izquierda acompaña*: las negras de arriba un poco más fuerte que la redonda de abajo.",
      ],
    },
  ],
  deAfuera: {},
  analisis: {
    tonalidad: {
      respuesta: "Do mayor.",
      simple: [
        "*Arranca en Mi pero la casa es Do*: la izquierda abre con Do, y la segunda frase termina en Do.",
      ],
      tecnica: [
        "La primera frase cierra en el V (Re sobre Sol): semicadencia, una pregunta. La segunda cierra Sol → Do: cadencia perfecta, la respuesta. La melodía arranca en la tercera del I.",
      ],
    },
    campo: {
      respuesta: "Los siete acordes que salen de la escala de Do mayor.",
      simple: [
        "*Se apilan terceras sobre cada nota de la escala*, usando sólo notas de Do mayor. Salen tres mayores (Do, Fa, Sol), tres menores (Rem, Mim, Lam) y un disminuido (Si°).",
        "*La Oda usa dos de los siete*: Do y Sol. Con reposo y tensión alcanza para preguntar y contestar.",
      ],
      tecnica: [
        "Sólo el I y el V: el mínimo para que haya cadencia. No hay subdominante (ni IV ni ii), así que no hay media tensión.",
      ],
    },
    armadura: {
      respuesta: "Ninguna: ni sostenidos ni bemoles.",
      simple: [
        "*Do mayor es la única mayor sin signos*: por eso la Oda no toca ni una tecla negra.",
        "*Sin signos no hay último sostenido para leer*: se sabe de memoria. Sin armadura es Do mayor, o su relativa, La menor; acá es Do porque cae en Do.",
      ],
      tecnica: [
        "Es el cero del círculo de quintas: a la derecha se suman sostenidos (Sol, un Fa♯) y a la izquierda bemoles (Fa, un Si♭).",
      ],
    },
    dominantes: {
      respuesta: "Una sola: el Sol, que es el V de Do. No hay dominante secundaria.",
      simple: [
        "*El Sol pide volver a Do*: es la tensión de toda la pieza. En el compás 2 la melodía le pone el Fa encima, su séptima, y por un momento suena a Sol7.",
        "*No aparece ningún otro acorde mayor*, así que no hay ninguno al que preguntarle si es secundario.",
      ],
      tecnica: [
        "Sol → Do cae cinco semitonos arriba, en el I: dominante principal. En el compás 2 va con el Si en el bajo (primera inversión), y el Si es la sensible: sube a Do en el compás 3.",
        "En el compás 4 la melodía cae en Mi sobre el Sol: una apoyatura, ajena al acorde en el tiempo fuerte, que baja por grado a Re, que sí es del acorde.",
      ],
      acordes: [SOL],
    },
    otroCampo: {
      tarea: true,
      respuesta: "No: es Do mayor de punta a punta.",
      simple: [
        "*El Sol siempre vuelve a Do*, que es la casa. Para llevarte a otro campo tendría que aparecer una nota de afuera —un Fa♯ que te dejara en Sol— y la Oda no tiene ninguna tecla negra.",
        "*La primera frase termina en el Sol*, pero no se queda: la segunda arranca otra vez en Do.",
      ],
      tecnica: [
        "La semicadencia del compás 4 se detiene en el V de Do, no se instala en Sol: sin Fa♯ no hay ni tonicización.",
      ],
      modula: false,
    },
    prestamo: {
      tarea: true,
      respuesta: "No: los dos acordes son de Do mayor.",
      simple: [
        "*Un préstamo sería un acorde de Do menor* metido en Do mayor: un Fa menor, un La♭. Acá no hay ni una nota de afuera.",
      ],
      tecnica: ["Los dos acordes coinciden con el I y el V del campo de Do mayor (paso 2), en fundamental y en calidad."],
      acordes: [],
    },
  },
  revisar: [
    "La izquierda de esta versión es nuestra (dos notas por compás) y no la de una edición: la armonía de I y V es la de siempre, pero el reparto exacto puede variar con el arreglo.",
  ],
};
