/**
 * El Canon en Re por capas: los ocho compases del arreglo fácil de las
 * partituras.
 *
 * Las capas salen de la partitura (`tramosDePieza`) partidas con la armonía
 * de abajo: un acorde cada dos tiempos, que es lo que dura cada arpegio de la
 * izquierda. Los acordes son las cuatro teclas de cada arpegio, tal cual.
 */

import type { Voicing } from "@/lib/capas";
import { tramosDePieza, type OpcionesDeTramos, type TramoDeArmonia } from "@/lib/tramos";
import { piezaPorSlug } from "@/content/partituras";
import type { Aprendizaje } from "./tipos";

const PIEZA = piezaPorSlug("canon-en-re")!;

/** Cada arpegio de la izquierda, plantado: fundamental, tercera, quinta y octava. */
const RE: Voicing = { izquierda: [50, 54, 57, 62], derecha: [] };
const LA: Voicing = { izquierda: [45, 49, 52, 57], derecha: [] };
const SIM: Voicing = { izquierda: [47, 50, 54, 59], derecha: [] };
const FASM: Voicing = { izquierda: [42, 45, 49, 54], derecha: [] };
const SOL: Voicing = { izquierda: [43, 47, 50, 55], derecha: [] };
const RE_GRAVE: Voicing = { izquierda: [38, 42, 45, 50], derecha: [] };

/** La vuelta: ocho acordes de dos tiempos, que en este arreglo son cuatro compases. Dos vueltas. */
const VUELTA = [RE, LA, SIM, FASM, SOL, RE_GRAVE, SOL, LA];
const ARMONIA: TramoDeArmonia[] = [...VUELTA, ...VUELTA].map((v) => [v, 4]);
const tramos = (op: OpcionesDeTramos) => tramosDePieza(PIEZA, ARMONIA, op);

export const CANON_EN_RE: Aprendizaje = {
  slug: "canon-en-re",
  titulo: "Canon en Re",
  autor: "Pachelbel",
  origen: "Canon y giga en Re (c. 1690), arreglo fácil",
  tonalidad: "Re mayor",
  tonica: 2,
  tempo: PIEZA.bpm,
  bajada:
    "Ocho acordes que dan vueltas, y arriba una línea que baja. Cinco capas: el bajo, los acordes pintados, el arpegio, la derecha y todo junto.",
  armonia: ARMONIA,
  capas: [
    {
      tipo: "riff",
      titulo: "El bajo",
      bajada: "Ocho notas, una cada dos tiempos: Re, La, Si, Fa♯, Sol, Re, Sol, La.",
      como: [
        "*Es lo que da vueltas toda la pieza*: el mismo bajo una y otra vez, y arriba se van sumando cosas.",
        "*Los tres primeros pares bajan una cuarta*: Re–La, Si–Fa♯, Sol–Re. Cada par arranca una tercera más abajo que el anterior. Después Sol y La suben a buscar el Re.",
        "*Cada nota dura dos tiempos*: el golpe fuerte del click es el cambio.",
        "*Las teclas apagadas son el acorde* que viene en la capa siguiente: por ahora, sólo la de abajo.",
      ],
      nombreDelLoop: "El bajo, una vuelta",
      compases: tramos({ manos: ["izq"], bajo: true, a: 8 }),
    },
    {
      tipo: "progresion",
      titulo: "Los ocho acordes",
      bajada: "Cada nota del bajo con su acorde, plantado: I V vi iii IV I IV V, pintados por tensión.",
      como: [
        "*Son las cuatro notas del arpegio tocadas juntas*: primero la forma, después el arpegio.",
        "*Mirá la tecla que se queda* (en amarillo, con «=»): de Re a La se queda el La, de Si menor a Fa♯ menor el Fa♯, entre el Sol y el Re grave el Re, y de La a Re otra vez el La.",
      ],
      acordes: VUELTA,
      compases: tramos({ manos: ["izq"], plaque: true, a: 8 }),
      simple: [
        "*Arranca en casa y termina pidiendo volver*: Re al principio, La al final. Por eso la vuelta no se termina nunca: cada final es un principio.",
        "*Casi todo es reposo*: Re, Si menor y Fa♯ menor son de la familia de la tónica. La media tensión es el Sol, y la tensión, el La.",
        "*De a pares, el bajo baja una cuarta*: Re–La, Si–Fa♯, Sol–Re. La misma idea tres veces, una tercera más abajo cada vez.",
      ],
      tecnica: [
        "I – V – vi – iii – IV – I – IV – V. Los tres primeros pares son la misma bajada de cuarta (I–V, vi–iii, IV–I) arrancando una tercera más abajo cada vez; el IV–V del final lleva al I de la vuelta siguiente.",
        "El V aparece dos veces y hace dos cosas: el primero va al vi (V–vi, el movimiento de la cadencia rota: se espera el I y llega su relativo) y el segundo vuelve al I al empezar la vuelta (cadencia perfecta).",
        "El iii y el vi son de reposo porque comparten dos notas con el I: Fa♯m tiene el Fa♯ y el La de Re, y Sim el Re y el Fa♯.",
      ],
    },
    {
      tipo: "riff",
      titulo: "El arpegio",
      bajada: "Lo que escribe la partitura: cada acorde abierto en cuatro corcheas, del bajo a la octava.",
      como: [
        "*Fundamental, tercera, quinta y octava*, siempre en ese orden: es la forma de la capa anterior, desarmada.",
        "*La mano se abre una octava*: meñique en el bajo, pulgar en la octava. De acorde a acorde viaja entera.",
        "*Parejo*: las cuatro corcheas iguales, sin acentuar la de arriba.",
      ],
      nombreDelLoop: "El arpegio, una vuelta",
      compases: tramos({ manos: ["izq"], a: 8 }),
    },
    {
      tipo: "riff",
      titulo: "La derecha",
      bajada: "Entra en el compás 5: una blanca por acorde, bajando de Fa♯ a La y subiendo a Do♯.",
      como: [
        "*Cada nota es del acorde de abajo*: Fa♯ sobre Re, Mi sobre La, Re sobre Si menor, Do♯ sobre Fa♯ menor, Si sobre Sol.",
        "*Baja por la escala de Re*: Fa♯, Mi, Re, Do♯, Si, La, y vuelve a subir Si, Do♯ para empalmar con la vuelta siguiente.",
        "*La izquierda está apagada en el teclado*: es la forma del acorde, para ver dónde cae cada nota.",
      ],
      nombreDelLoop: "La derecha, compases 5 a 8",
      compases: tramos({ manos: ["der"], de: 8 }),
    },
    {
      tipo: "todo",
      titulo: "Todo junto",
      bajada: "La vuelta sola y la vuelta con la derecha encima: la izquierda no cambia, se suma la otra.",
      como: [
        "*Primero al 50 %* y con el click; después sin el click.",
        "*Si la derecha te desarma la izquierda*, volvé a la capa del arpegio: la izquierda tiene que salir sola, sin pensarla.",
      ],
      secciones: [
        { nombre: "Izquierda", caracter: "sola", compases: tramos({ manos: ["izq", "der"], a: 8 }) },
        { nombre: "Dos manos", caracter: "entra la derecha", compases: tramos({ manos: ["izq", "der"], de: 8 }) },
      ],
      notas: [
        "*La izquierda no cambia* cuando entra la derecha: es la misma vuelta. Lo que cambia es que ahora hay que escuchar las dos.",
        "*La derecha canta, la izquierda acompaña*: las blancas un poco más fuerte que el arpegio.",
        "*Despacio suena bien*: es una pieza que no pide velocidad, pide que cada corchea caiga pareja.",
      ],
    },
  ],
  analisis: {
    tonalidad: {
      respuesta: "Re mayor.",
      simple: ["*Arranca en Re y cada vuelta vuelve a Re*: el La del final la empuja ahí."],
      tecnica: ["La tónica es el acorde de reposo al que resuelve el V (La → Re) al cerrar cada vuelta de ocho acordes."],
    },
    campo: {
      respuesta: "Los siete acordes que salen de la escala de Re mayor.",
      simple: [
        "*Se apilan terceras sobre cada nota de la escala*, usando sólo notas de Re mayor. Salen tres mayores (Re, Sol, La), tres menores (Mim, Fa♯m, Sim) y un disminuido (Do♯°).",
        "*El Canon usa cinco*: Re, La, Sim, Fa♯m y Sol. Faltan el Mim y el Do♯°, y todos los que usa son de casa.",
      ],
      tecnica: ["I, V, vi, iii y IV: los tres mayores y dos de los tres menores. Ni el ii ni el vii°."],
    },
    armadura: {
      respuesta: "Dos sostenidos: Fa♯ y Do♯.",
      simple: [
        "*Son las dos teclas negras de la escala de Re mayor*: el Fa♯ de Re, de Si menor y de Fa♯ menor; el Do♯ de La y de Fa♯ menor.",
        "*Para leerla en un papel*: el último sostenido es Do♯, y medio tono arriba está Re. Ésa es la tónica.",
      ],
      tecnica: [
        "Fa-do: los dos primeros del orden de los sostenidos. La relativa menor, con la misma armadura, es Si menor — el tercer acorde de la vuelta.",
      ],
    },
    dominantes: {
      respuesta: "Una sola, y es la de la tonalidad: el La, el V de Re. No hay dominante secundaria.",
      simple: [
        "*El La aparece dos veces*: el primero va a Si menor (se esperaba Re y llega su relativo, una sorpresa suave) y el segundo vuelve a Re y cierra la vuelta.",
        "*El Re que va al Sol no es dominante*: es la tónica. Para empujar al Sol como su V tendría que ser Re7, con un Do natural, y el Canon no lo trae.",
      ],
      tecnica: [
        "La → Re cae cinco semitonos arriba, en el I: dominante principal. Va sin séptima; la tríada alcanza para pedir volver porque trae el Do♯, la sensible, que sube a Re.",
        "Re → Sol (I → IV) es el mismo salto que V → I, pero sin el Do natural no hay V7/IV: la tónica no se va de casa.",
      ],
      acordes: [LA],
    },
    otroCampo: {
      tarea: true,
      respuesta: "No: el Canon entero está en Re mayor.",
      simple: [
        "*No hay ni una nota de afuera*: las únicas teclas negras son el Fa♯ y el Do♯ de la armadura.",
        "*Para cambiar de campo* tendría que aparecer una nota nueva —un Sol♯ que llevara a La, un Do natural que llevara a Sol— y quedarse ahí. No pasa: la vuelta siempre cae en Re.",
      ],
      tecnica: ["Sin dominantes secundarias ni alteraciones no hay ni tonicización: cada acorde se lee contra Re."],
      modula: false,
    },
    prestamo: {
      tarea: true,
      respuesta: "No: los cinco acordes son de Re mayor.",
      simple: [
        "*Un préstamo sería un acorde de Re menor* metido en Re mayor: un Sol menor, un Si♭. Acá no hay ninguno.",
      ],
      tecnica: ["Las cinco fundamentales y sus calidades coinciden con el campo de Re mayor (paso 2)."],
      acordes: [],
    },
  },
  revisar: [
    "Es un arreglo fácil: en el original de Pachelbel el bajo va en negras y la vuelta dura dos compases, no cuatro. La armonía es la misma.",
  ],
};
