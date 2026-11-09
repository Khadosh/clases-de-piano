/**
 * Blackbird, por capas (#13).
 *
 * Como Here Comes the Sun, es una canción con copyright: lo que vive acá son
 * **los acordes, los voicings y el análisis**, nunca la melodía, la letra ni
 * la grabación. Los compases se escriben acá porque no hay partitura de la
 * que sacarlos.
 *
 * Lo que la hace Blackbird en el piano es lo que hace la guitarra de
 * McCartney: el bajo camina por semitonos, la nota de arriba del bajo va a
 * una décima (bajan y suben juntos, en paralelo) y el Sol de la cuerda al
 * aire se queda sonando arriba de casi todo. Las capas son esas tres cosas.
 *
 * Los acordes son los de la versión que se conoce en Sol (la simplificada de
 * Cifra Club está en Sol). **No están comparados contra esa página**: daba
 * 403. Está en `revisar`.
 */

import { cifradoDeVoicing, corcheasDe, type CompasDeCapa, type Evento, type Voicing } from "@/lib/capas";
import type { Acento } from "@/lib/ritmo";
import type { Aprendizaje } from "./tipos";

// ---------------------------------------------------------------------------
// Los voicings: la izquierda en el bajo, la derecha empieza en la décima
// ---------------------------------------------------------------------------

/**
 * La derecha arranca siempre en la décima del bajo (una octava más una
 * tercera arriba) y, donde el acorde lo tiene, termina en el Sol4: es la
 * cuerda al aire que la guitarra deja sonar. Así de Sol a Do♯° la mano no
 * suelta el Sol, y del Do al Do menor lo único que se mueve es el Mi.
 */
const SOL: Voicing = { izquierda: [43], derecha: [59, 62, 67] };
const LAm7: Voicing = { izquierda: [45], derecha: [60, 64, 67] };
const SOL_SI: Voicing = { izquierda: [47], derecha: [62, 67] };
const DO: Voicing = { izquierda: [48], derecha: [64, 67] };
/** El A7 sin el La: Do♯ · Mi · Sol. Lleva al Re como el A7. */
const DOs_DIS: Voicing = { izquierda: [49], derecha: [64, 67] };
/** El Re es el único de la subida que no tiene Sol: el Sol sube al La. */
const RE: Voicing = { izquierda: [50], derecha: [66, 69] };
/** El B7 sin el Si: Re♯ · Fa♯ · La. Del Re se quedan las dos de la derecha. */
const REs_DIS: Voicing = { izquierda: [51], derecha: [66, 69], cifrado: "D#dim" };
const MIm: Voicing = { izquierda: [52], derecha: [67, 71] };
/** Del Do sólo baja el Mi al Mi♭: es el color del préstamo. */
const DOm: Voicing = { izquierda: [48], derecha: [63, 67] };
const LA7: Voicing = { izquierda: [45], derecha: [61, 64, 67] };
const RE7: Voicing = { izquierda: [50], derecha: [66, 69, 72] };

/** El puente: el bajo baja por la escala de Fa, y la décima con él. */
const FA: Voicing = { izquierda: [53], derecha: [69, 72] };
const DO_MI: Voicing = { izquierda: [52], derecha: [67, 72] };
const REm: Voicing = { izquierda: [50], derecha: [65, 69] };
const SIb: Voicing = { izquierda: [46], derecha: [62, 65] };

/**
 * La estrofa, en el orden en que suena: la primera línea, la subida
 * (Do · Do♯ · Re · Re♯ · Mi), la bajada (Re · Do♯ · Do, con el Do menor) y el
 * cierre (Si · La · Re · Sol). El bajo camina de a semitono casi siempre.
 */
export const LINEA_1 = [SOL, LAm7, SOL_SI, SOL];
export const ESTROFA = [...LINEA_1, DO, DOs_DIS, RE, REs_DIS, MIm, RE, DOs_DIS, DO, DOm, SOL_SI, LA7, RE7, SOL];
export const PUENTE = [FA, DO_MI, REm, DO, SIb, LA7, RE7, SOL];

// ---------------------------------------------------------------------------
// Los compases: dos tiempos por acorde, en 4/4
// ---------------------------------------------------------------------------

const DOS_TIEMPOS = [2, 2];
/**
 * El segundo acorde de cada compás de 4/4 entra en el tiempo 3: medio, no
 * fuerte (#12). El último, que dura el compás entero, es su propio compás.
 */
const EN_EL_TRES: Acento[] = ["medio", "debil", "medio", "debil"];

/** Los acentos de la vuelta: de a pares, el primero arranca el compás y el segundo es el tiempo 3. */
function enCuatro(compases: CompasDeCapa[]): CompasDeCapa[] {
  return compases.map((c, i) => (i % 2 === 1 && corcheasDe(c.grupos) === 4 ? { ...c, acentos: EN_EL_TRES } : c));
}

/** El último acorde de una vuelta dura el compás entero; los otros, dos tiempos. */
const gruposDe = (i: number, total: number) => (i === total - 1 && total % 2 === 1 ? [2, 2, 2, 2] : DOS_TIEMPOS);

/**
 * Sólo el bajo, golpeado en cada tiempo. La derecha queda apagada en el
 * teclado, como en el bajo del Canon: es lo que viene en la capa siguiente,
 * y sin ella el teclado eran seis blancas estiradas a todo el ancho.
 */
function bajo(v: Voicing, grupos: number[]): CompasDeCapa {
  const eventos: Evento[] = [];
  for (let t = 0; t < corcheasDe(grupos); t += 2) eventos.push({ t, dur: 2, teclas: v.izquierda, mano: "izq" });
  return { grupos, eventos, voicing: v, etiqueta: cifradoDeVoicing(v) };
}

/** El acorde plantado en cada tiempo, con la izquierda sostenida. */
function plantado(v: Voicing, grupos: number[]): CompasDeCapa {
  const largo = corcheasDe(grupos);
  const eventos: Evento[] = [{ t: 0, dur: largo, teclas: v.izquierda, mano: "izq" }];
  for (let t = 0; t < largo; t += 2) eventos.push({ t, dur: 2, teclas: v.derecha, mano: "der" });
  return { grupos, eventos, voicing: v, etiqueta: cifradoDeVoicing(v) };
}

/**
 * El punteo de la guitarra pasado al piano: en cada tiempo el bajo y la
 * décima juntos (el pellizco del pulgar y el índice), y en el «y» lo de
 * arriba solo, con el Sol que se queda.
 */
function pellizco(v: Voicing, grupos: number[]): CompasDeCapa {
  const [decima, ...arriba] = v.derecha;
  const eventos: Evento[] = [];
  for (let t = 0; t < corcheasDe(grupos); t += 2) {
    eventos.push({ t, dur: 2, teclas: v.izquierda, mano: "izq" });
    eventos.push({ t, dur: 2, teclas: [decima], mano: "der" });
    eventos.push({ t: t + 1, dur: 1, teclas: arriba, mano: "der" });
  }
  return { grupos, eventos, voicing: v, etiqueta: cifradoDeVoicing(v) };
}

const vuelta = (acordes: Voicing[], compas: (v: Voicing, grupos: number[]) => CompasDeCapa) =>
  enCuatro(acordes.map((v, i) => compas(v, gruposDe(i, acordes.length))));

const ESTROFA_PUNTEADA = vuelta(ESTROFA, pellizco);
const PUENTE_PUNTEADO = vuelta(PUENTE, pellizco);

export const BLACKBIRD: Aprendizaje = {
  slug: "blackbird",
  titulo: "Blackbird",
  autor: "Paul McCartney",
  origen: "The Beatles, el Álbum Blanco (1968)",
  tonalidad: "Sol mayor",
  tonica: 7,
  tempo: 94,
  bajada:
    "En Sol mayor. Es una guitarra sola, y lo que la hace Blackbird son tres cosas: el bajo que camina por semitonos, la décima que va pegada al bajo y el Sol que se queda sonando arriba. Cinco capas: el bajo, los acordes con el Sol arriba, el punteo de la derecha, el puente y todo junto.",
  capas: [
    {
      tipo: "riff",
      titulo: "El bajo que camina",
      bajada: "La izquierda sola: sube de a semitono de Do a Mi, vuelve a bajar y cierra Si · La · Re · Sol.",
      como: [
        "*Primero la primera línea*, Sol · La · Si · Sol: es la escala, de a tono.",
        "*Después la subida*: Do · Do♯ · Re · Re♯ · Mi, una tecla por acorde, sin saltear ninguna. Las teclas negras son los acordes de paso.",
        "*Y la bajada*: Re · Do♯ · Do, el Do dos veces (la segunda es el Do menor), Si · La, y el Re que te deja en Sol.",
        "*Las teclas apagadas son la derecha* que viene en la capa siguiente: por ahora suena sólo la de abajo.",
        "*Dos tiempos por tecla.* En la grabación el compás cambia (3/4, 4/4, 2/4); acá va parejo para que el dedo aprenda el camino. Al 50 % hasta que salga sin mirar.",
      ],
      previo: {
        titulo: "Paso previo: la primera línea",
        como: "Sol, La, Si y Sol: la izquierda sube por la escala y vuelve. Es la frase que abre la canción y la que vuelve en cada estrofa.",
        compases: vuelta(LINEA_1, bajo),
      },
      nombreDelLoop: "La estrofa entera, sólo el bajo",
      compases: vuelta(ESTROFA, bajo),
    },
    {
      tipo: "acordes",
      titulo: "Los acordes con el Sol arriba",
      bajada: "La derecha arranca en la décima del bajo y deja el Sol4 quieto arriba: la cuerda al aire de la guitarra.",
      como: [
        "*La nota de abajo de la derecha es la décima del bajo*: la misma letra que la tercera del acorde, una octava más arriba. Cuando el bajo sube un semitono, ella también: van en paralelo.",
        "*El Sol4 no se suelta* de Sol a Do♯°, y vuelve en el Mi menor y en toda la bajada. Es la tecla que el teclado marca como «se queda».",
        "*El Re y el Re♯° son los únicos sin Sol*: el meñique sube al La y vuelve.",
        "*Del Do al Do menor se mueve un solo dedo*: el Mi baja al Mi♭. Ese medio tono es todo el color del préstamo (paso 6 del análisis).",
        "*La vuelta en loop*, al 50 %, con los acordes plantados en cada tiempo.",
      ],
      acordes: [SOL, LAm7, SOL_SI, DO, DOs_DIS, RE, REs_DIS, MIm, DOm, LA7, RE7],
      vuelta: vuelta(ESTROFA, plantado),
    },
    {
      tipo: "riff",
      titulo: "La derecha: la décima y el Sol",
      bajada: "El punteo: en cada tiempo bajo y décima juntos, en el «y» lo de arriba solo.",
      como: [
        "*En el tiempo, dos dedos a la vez*: la izquierda en el bajo y el pulgar de la derecha en la décima. Es el pellizco de la guitarra.",
        "*En el «y», lo de arriba solo*: el Sol (o lo que tenga el acorde arriba de la décima), más liviano.",
        "*Contá «1 y 2 y»* por cada acorde. El 1 cae con el bajo; el «y» nunca.",
        "*Primero la primera línea, después la estrofa entera.* Al 50 % hasta que el «y» salga parejo.",
      ],
      previo: {
        titulo: "Paso previo: la primera línea",
        como: "Sol, Lam7, Sol/Si y Sol con el punteo. La derecha casi no se mueve: el Sol4 está en los cuatro.",
        compases: vuelta(LINEA_1, pellizco),
      },
      nombreDelLoop: "La estrofa con el punteo",
      compases: ESTROFA_PUNTEADA,
    },
    {
      tipo: "progresion",
      titulo: "El puente",
      bajada: "Fa · Do/Mi · Rem · Do · Si♭ · La7 · Re7 · Sol: el bajo baja por la escala de Fa y la décima con él.",
      como: [
        "*El bajo baja de a una tecla*: Fa, Mi, Re, Do, Si♭, La. Después salta al Re y cae en Sol.",
        "*La décima baja pegada*, igual que en la estrofa subía.",
        "*El mismo punteo* de la capa anterior.",
      ],
      acordes: PUENTE,
      compases: PUENTE_PUNTEADO,
      simple: [
        "*Fa, Rem y Si♭ no son de Sol mayor.* Vienen prestados de Sol menor, la hermana que comparte la tónica: por eso el puente suena a que se oscurece.",
        "*Por un rato parece estar en Fa*: Fa, Do, Rem, Do, Si♭ son todos de Fa mayor. Pero nadie lo prepara como casa, y el La7 y el Re7 te devuelven a Sol.",
        "*El La7 y el Re7 son la tensión*: el La7 empuja al Re7 y el Re7 a Sol. Una escalera de dos quintas que baja a casa.",
      ],
      tecnica: [
        "Fa es el ♭VII, Rem el v y Si♭ el ♭III de Sol: préstamo modal de Sol menor (ahí son el VII, el v y el III). El Do/Mi es el IV de Sol.",
        "El La7 es el V7/V: la tercera mayor (Do♯) sobre el II, que en Sol es menor. Cae en Re, que está en el campo: dominante secundario, no modulación.",
        "Re7 → Sol es la cadencia auténtica que cierra la vuelta. En la guitarra el Re7 se toca con el Sol al aire arriba, que lo vuelve un Re7sus4; acá va sin, para que el teclado lo nombre.",
      ],
    },
    {
      tipo: "todo",
      titulo: "Todo junto",
      bajada: "La estrofa y el puente con el punteo: el bajo que camina, la décima pegada y el Sol arriba.",
      como: [
        "*Primero al 50 %* y con el click; después sin el click, que la canción respira.",
        "*Se puede tocar encima de la grabación* poniéndola desde donde la escuches; el cuaderno no la trae. Ojo que ahí el compás cambia: escuchala antes de tocar encima.",
      ],
      secciones: [
        { nombre: "Estrofa", caracter: "íntima", compases: ESTROFA_PUNTEADA },
        { nombre: "Puente", caracter: "se oscurece", compases: PUENTE_PUNTEADO },
      ],
      notas: [
        "*Poco peso.* Es una guitarra sola: el bajo y la décima apoyan, el Sol de arriba apenas se toca.",
        "*El bajo canta.* Lo que se escucha moverse es la línea de abajo; los acordes salen de ella.",
        "*El puente un poco más oscuro*, sin apurarse: los prestados piden que se los deje sonar.",
      ],
    },
  ],
  analisis: {
    tonalidad: {
      respuesta: "Sol mayor.",
      simple: [
        "*La canción vuelve siempre a Sol*: arranca ahí, cada estrofa cierra ahí, y el Re7 la empuja ahí al final de la estrofa y del puente.",
      ],
      tecnica: ["La tónica es el acorde al que resuelve el V7 (Re7 → Sol) en la cadencia de cada vuelta."],
    },
    campo: {
      respuesta: "Los siete acordes que salen de la escala de Sol mayor.",
      simple: [
        "*Se apilan terceras sobre cada nota de la escala*, usando sólo notas de Sol mayor: tres mayores (Sol, Do, Re), tres menores (Lam, Sim, Mim) y un disminuido (Fa♯°).",
        "*La estrofa usa casi sólo los de casa*: Sol, Lam, Do, Re y Mim. Los que no están en la lista —Do♯°, Re♯°, Do menor y La7 en la estrofa; Fa, Rem y Si♭ en el puente— son los que hay que preguntarse de dónde salen (pasos 4 y 6).",
      ],
      tecnica: [
        "I, ii, iii, IV, V, vi, vii°: la misma receta que en Do mayor, corrida a Sol. El Lam7 es el ii con séptima; el Sol/Si, el I con la tercera en el bajo.",
      ],
    },
    armadura: {
      respuesta: "Un sostenido: Fa♯.",
      simple: [
        "*Es la única tecla negra de la escala de Sol mayor.* Va al principio de cada renglón y vale para toda la canción.",
        "*Para leerla en un papel*: el último sostenido es Fa♯, y medio tono arriba está Sol. Ésa es la tónica.",
      ],
      tecnica: ["El primero de la lista de los sostenidos. La relativa menor, con la misma armadura, es Mi menor: el Mim de la estrofa."],
    },
    dominantes: {
      respuesta: "Dos: el Re7 es el dominante y el La7 es dominante secundario. Y los dos disminuidos son dominantes disfrazados.",
      simple: [
        "*El Re7 es el V7 de Sol*: el que pide volver a casa. Es de la tonalidad.",
        "*El La7 no es de Sol mayor* (sobre La, Sol mayor tiene Lam). Es el dominante *del Re7*: el V del V. La, Re, Sol: cada uno baja una quinta hasta casa.",
        "*El Do♯° es el La7 sin el La*, y el Re♯° es el Si7 sin el Si. Por eso cada uno empuja al acorde de arriba: el Do♯° al Re, el Re♯° al Mim. Son los acordes de paso de la clase 5.",
      ],
      tecnica: [
        "Se lee por adónde cae, cinco semitonos arriba: Re7 → Sol (el I) es principal; La7 → Re (el V, que está en el campo) es secundario.",
        "El X° es el VII° de adonde va: Do♯° → Re (vii°/V) y Re♯° → Mim (vii°/vi). Con el bajo que sube un semitono, la sensible de cada llegada está en el bajo.",
      ],
      acordes: [RE7, LA7],
    },
    otroCampo: {
      tarea: true,
      respuesta: "No: los dominantes caen todos en acordes de Sol mayor, y el puente vuelve a Sol.",
      simple: [
        "*La prueba es adónde llega cada dominante.* El La7 y el Do♯° caen en Re, el Re♯° en Mim, el Re7 en Sol: todos de Sol mayor.",
        "*El puente se apoya en Fa un rato* (Fa, Do, Rem, Do, Si♭ son de Fa mayor), pero ningún Do7 lo prepara como casa nueva y el La7–Re7 lo trae de vuelta. Es color, no mudanza.",
      ],
      tecnica: [
        "Para que hubiera modulación haría falta un dominante efectivo —uno que caiga fuera del campo— o una tónica nueva confirmada por cadencia. En el puente no hay ninguna: Fa no tiene su V7, y la cadencia es Re7 → Sol.",
        "El Re♯° → Mim es una tonicización del vi de un tiempo, no un cambio de tonalidad.",
      ],
      modula: false,
    },
    prestamo: {
      tarea: true,
      respuesta: "Sí: el Do menor de la estrofa, y Fa, Rem y Si♭ del puente, vienen de Sol menor.",
      simple: [
        "*El Do menor es el Do con el Mi bajado a Mi♭*, y en Sol mayor no hay Mi♭: lo presta Sol menor. Es el «all your life» que se entristece un instante.",
        "*En el puente*, Fa, Rem y Si♭ traen el Fa natural y el Si♭, que Sol mayor no tiene y Sol menor sí. Sol sigue siendo la casa.",
      ],
      tecnica: [
        "Cm es el iv, F el ♭VII, Dm el v y B♭ el ♭III de Sol: los cuatro son tríadas de Sol menor natural (iv, VII, v, III). La función la pone el grado: el iv sigue siendo subdominante.",
        "El Cm después del C (IV → iv) es el préstamo más común de todos: una sola nota que baja medio tono.",
      ],
      acordes: [DOm, FA, REm, SIb],
    },
  },
  revisar: [
    "Los acordes no están comparados contra la página de Cifra Club que pasó Joaquín (cifraclub.com/the-beatles/blackbird/simplificada.html, para teclado): devolvía 403. Son los que se conocen en Sol. Si Joaquín pega la cifra, se compara acorde por acorde.",
    "La bajada después del Mim (Re · Do♯° · Do · Do menor): hay versiones que ponen Mim/Re♯ o La7/Do♯ en vez de Do♯°. Es el mismo bajo; chequealo de oído.",
    "El compás: en la grabación cambia entre 3/4, 4/4 y 2/4. Acá cada acorde dura dos tiempos en 4/4, para practicar el camino del bajo y no la forma exacta. Contalo con la grabación.",
    "El puente acá va una vez y termina en La7 · Re7 · Sol; en la grabación la primera vuelta cierra en Do y la segunda sigue. El Re7 en la guitarra suena con el Sol al aire (Re7sus4).",
  ],
};
