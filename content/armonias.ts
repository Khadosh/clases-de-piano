import type { ArmoniaDePieza } from "@/lib/armonia";
import type { Tonalidad } from "@/lib/pentagrama";

/**
 * La armonía de las partituras, analizada compás por compás.
 *
 * Va aparte de la pieza porque las de Mutopia se generan y no se tocan a mano,
 * y porque es otra cosa: la pieza son las notas, esto es una lectura de ellas.
 * Sumar la próxima es sumar una entrada acá con su `slug`; la página la
 * encuentra sola. Los acordes declaran el grado y no la función —el color de
 * tensión se deduce— y `test:armonia` verifica cada cifrado contra el bajo que
 * suena de verdad en la partitura.
 */

const SOL_MENOR: Tonalidad = { tonica: 7, modo: "menor" };
const SIB_MAYOR: Tonalidad = { tonica: 10, modo: "mayor" };
const RE_MAYOR: Tonalidad = { tonica: 2, modo: "mayor" };
const RE_MENOR: Tonalidad = { tonica: 2, modo: "menor" };

export const ARMONIAS: ArmoniaDePieza[] = [
  {
    slug: "minueto-en-sol-menor",
    simple:
      "Dos preguntas, una respuesta que se va a vivir a otra casa, y la vuelta. Las dos primeras frases arrancan en Sol menor y terminan colgadas en el Re, sin resolver. La tercera empieza igual y a mitad de camino dobla: se instala en Si♭ mayor, la casa de al lado —mismas notas en la armadura— y ahí sí cierra. La segunda parte se queda un rato en Si♭, vuelve a Sol menor por el mismo camino de antes, y la última frase cierra en casa con el Fa♯ empujando.",
    tecnica:
      "Forma binaria (A: compases 1–16, B: 17–32). A modula de la tónica a la relativa mayor (Si♭, III) con una cadencia auténtica en el 16, preparada por un acorde pivote: Cm es IVm de Sol menor y IIm de Si♭. B arranca en la relativa, tonicaliza su V (C7 → F, V7/V) y cierra en Si♭ en el 24; vuelve a la tónica por el V/IVm (G/B → Cm) y termina con una auténtica en Sol menor. El V de Sol menor es mayor (Re · Fa♯ · La): la sensible sale de la menor armónica, y es la única alteración que la armadura no trae.",
    revisar:
      "El análisis es nuestro. Los compases 5, 6, 22 y 30 tienen notas de paso que se pueden leer como acordes propios (el La del bajo en el 5, la bajada en décimas del 22); acá se leyeron como paso. El Rem/Fa del compás 2 también podría ser sólo un bajo que camina de Sol a Re.",
    frases: [
      {
        desde: 1,
        hasta: 4,
        en: SOL_MENOR,
        titulo: "La pregunta",
        simple:
          "Arranca en casa y el bajo baja un escalón por compás —Sol, Fa, Mi♭, Re— hasta quedar parado en el Re. Termina en tensión: es una pregunta, y la pieza se queda esperando la respuesta.",
        tecnica:
          "Im – Vm/Fa – VI – V. Bajo descendente por grado conjunto de la tónica a la dominante (el tetracordio del lamento, sin cromatismo). El Vm del 2 es un dominante débil: sin el Fa♯ no tiene sensible y no pide resolver, por eso el bajo sigue de largo. Semicadencia en el 4.",
        acordes: [
          { compas: 1, cifrado: "Gm", grado: 0 },
          { compas: 2, cifrado: "Dm/F", grado: 4 },
          { compas: 3, cifrado: "Eb", grado: 5 },
          { compas: 4, cifrado: "D", grado: 4 },
        ],
      },
      {
        desde: 5,
        hasta: 8,
        en: SOL_MENOR,
        titulo: "Otra vez la pregunta",
        simple:
          "La melodía baja en corcheas mientras el bajo sube, Sol, La, Si♭: se abren como un abanico. En el compás 7 aparece el Fa♯ en el bajo, la nota que más quiere ir a Sol, y la frase vuelve a terminar en el Re. Segunda pregunta sin contestar.",
        tecnica:
          "VI/Sol – III – II° – V/Fa♯ – Im – V. Movimiento contrario entre las voces extremas. El II° (La · Do · Mi♭) es la subdominante de la menor, y prepara el V en primera inversión: el Fa♯ en el bajo es la sensible, a un semitono de la tónica. Otra semicadencia.",
        acordes: [
          { compas: 5, cifrado: "Eb/G", grado: 5 },
          { compas: 6, cifrado: "Bb", grado: 2 },
          { compas: 7, cifrado: "Adim", grado: 1 },
          { compas: 7, tiempo: 2, cifrado: "D7/F#", grado: 4 },
          { compas: 7, tiempo: 3, cifrado: "Gm", grado: 0 },
          { compas: 8, cifrado: "D", grado: 4 },
        ],
      },
      {
        desde: 9,
        hasta: 12,
        en: SOL_MENOR,
        titulo: "Igual que al principio…",
        simple:
          "Los cuatro primeros compases otra vez, nota por nota. Lo único distinto está al final del 12: el bajo baja por Si natural en vez de Si♭. Es una sola nota, y avisa que lo que viene va a ir para otro lado.",
        tecnica:
          "Im – Vm/Fa – VI – V, igual que 1–4. En el bajo del 12 el Si♮ reemplaza al Si♭: es la tercera del G que viene, y prepara el V/IVm.",
        acordes: [
          { compas: 9, cifrado: "Gm", grado: 0 },
          { compas: 10, cifrado: "Dm/F", grado: 4 },
          { compas: 11, cifrado: "Eb", grado: 5 },
          { compas: 12, cifrado: "D", grado: 4 },
        ],
      },
      {
        desde: 13,
        hasta: 16,
        en: SIB_MAYOR,
        titulo: "…y la respuesta se muda",
        simple:
          "El Si natural arma un Sol mayor con séptima, que tira hacia Do menor. Pero ese Do menor tiene doble vida: es de Sol menor y también es de Si♭ mayor. La música lo aprovecha para cambiar de casa sin que se note, y en dos compases ya está cerrando con todas las letras en Si♭. La primera parte termina en reposo, pero en otra casa.",
        tecnica:
          "Modulación a la relativa mayor por acorde pivote. G7/Si es V7/IIm de Si♭ (y V7/IVm de Sol menor); Cm es el pivote, IIm de Si♭ y IVm de Sol menor. Después IIm – V7 – I – IV – V – I en Si♭: cadencia auténtica en el 16. La séptima del G7 (el Fa de la melodía) baja a Mi♭, como pide la resolución.",
        acordes: [
          { compas: 13, cifrado: "G7/B", dominanteDe: 1 },
          { compas: 14, cifrado: "Cm", grado: 1 },
          { compas: 14, tiempo: 2, cifrado: "F7/A", grado: 4 },
          { compas: 15, cifrado: "Bb", grado: 0 },
          { compas: 15, tiempo: 2, cifrado: "Eb", grado: 3 },
          { compas: 15, tiempo: 3, cifrado: "F", grado: 4 },
          { compas: 16, cifrado: "Bb", grado: 0 },
        ],
      },
      {
        desde: 17,
        hasta: 20,
        en: SIB_MAYOR,
        titulo: "En la casa nueva",
        simple:
          "La segunda parte arranca en Si♭, una octava más arriba y con la melodía más suelta. En el compás 19 aparece un Mi natural en el bajo: arma un Do con séptima que empuja hacia Fa, como un empujoncito al acorde de tensión de Si♭. La frase termina parada ahí, en el Fa. Otra pregunta, ahora en la casa nueva.",
        tecnica:
          "I – V/La – V7/V – V en Si♭. El Mi♮ (melodía del 17, bajo del 19) es la sensible de Fa: C7 es el V7/V, un dominante secundario que tonicaliza la dominante. Semicadencia en el 20.",
        acordes: [
          { compas: 17, cifrado: "Bb", grado: 0 },
          { compas: 18, cifrado: "F/A", grado: 4 },
          { compas: 19, cifrado: "C7/G", dominanteDe: 4 },
          { compas: 20, cifrado: "F", grado: 4 },
        ],
      },
      {
        desde: 21,
        hasta: 24,
        en: SIB_MAYOR,
        titulo: "Punto final de la mitad",
        simple:
          "La derecha sube una escala entera y después baja en espejo con el bajo, los dos de la mano. En el compás 23 pasan los tres acordes de Si♭ en fila —casa, media tensión, tensión— uno por tiempo, y el 24 aterriza en Si♭. Punto final de la mitad.",
        tecnica:
          "V/La – IV/Sol – I/Re – IV – V – I. Décimas paralelas descendentes entre la melodía y el bajo en el 22. Cadencia auténtica en el 24, con el IV como antepenúltimo: la cadencia completa de la clase 3.",
        acordes: [
          { compas: 21, cifrado: "F/A", grado: 4 },
          { compas: 22, cifrado: "Eb/G", grado: 3 },
          { compas: 23, cifrado: "Bb/D", grado: 0 },
          { compas: 23, tiempo: 2, cifrado: "Eb", grado: 3 },
          { compas: 23, tiempo: 3, cifrado: "F", grado: 4 },
          { compas: 24, cifrado: "Bb", grado: 0 },
        ],
      },
      {
        desde: 25,
        hasta: 28,
        en: SOL_MENOR,
        titulo: "Volver por donde se fue",
        simple:
          "Para volver a Sol menor usa la misma puerta que en la primera parte, al revés: el Si natural en el bajo arma un Sol mayor que cae en Do menor, y Do menor ya es de casa. Después aparece el Fa♯ en la melodía y la frase termina otra vez colgada en el Re, la pregunta del principio. Ya estamos en casa; falta cerrar.",
        tecnica:
          "V/IVm (G/Si) – IVm – Im/Si♭ – V/La – Im – V. El mismo pivote que en el 13–14, ahora para volver: Cm como IVm de Sol menor. Semicadencia en el 28, con el bajo bajando por la menor melódica (Re, La, Sol, Fa♯, Mi).",
        acordes: [
          { compas: 25, cifrado: "G/B", dominanteDe: 3 },
          { compas: 26, cifrado: "Cm", grado: 3 },
          { compas: 27, cifrado: "Gm/Bb", grado: 0 },
          { compas: 27, tiempo: 2, cifrado: "D7/A", grado: 4 },
          { compas: 27, tiempo: 3, cifrado: "Gm", grado: 0 },
          { compas: 28, cifrado: "D", grado: 4 },
        ],
      },
      {
        desde: 29,
        hasta: 32,
        en: SOL_MENOR,
        titulo: "La casa",
        simple:
          "El bajo se queda clavado en Re un compás entero mientras la melodía sube con Mi natural y Fa♯: la tensión más larga de la pieza. Después el bajo camina hacia arriba, Si♭, Do, Re, y la última nota que lo separa de casa es el Fa♯ de la derecha. Sol. Esta vez sí, la respuesta.",
        tecnica:
          "V (pedal de dominante, con la menor melódica ascendente arriba) – IVm/Mi♭ – Im/Re – II°/Do – Im/Si♭ – IVm – V – Im. El bajo sube Si♭ – Do – Re hacia la cadencia, el IVm prepara el V y la sensible resuelve en la tónica: cadencia auténtica en Sol menor.",
        acordes: [
          { compas: 29, cifrado: "D", grado: 4 },
          { compas: 30, cifrado: "Cm/Eb", grado: 3 },
          { compas: 30, tiempo: 2, cifrado: "Gm/D", grado: 0 },
          { compas: 30, tiempo: 3, cifrado: "Adim/C", grado: 1 },
          { compas: 31, cifrado: "Gm/Bb", grado: 0 },
          { compas: 31, tiempo: 2, cifrado: "Cm", grado: 3 },
          { compas: 31, tiempo: 3, cifrado: "D", grado: 4 },
          { compas: 32, cifrado: "Gm", grado: 0 },
        ],
      },
    ],
  },
  {
    slug: "gymnopedie-1",
    simple:
      "Una hamaca de dos acordes. Durante dieciséis compases la izquierda va y viene entre Sol y Re —media tensión y casa— sin pasar nunca por la tensión, y por eso la música no pide ir a ningún lado: flota. Después se corre de lugar, se queda un rato largo sobre un Re que no se mueve, y al final, en vez de cerrar en el Re mayor del principio, apaga la luz y cierra en Re menor. La tensión de verdad, la que empuja a casa, no aparece nunca: las tres veces que asoma el acorde de tensión viene menor, sin la nota que empuja, y casi no tira.",
    tecnica:
      "Leída en Re mayor (la armadura de dos sostenidos dice también Si menor, pero el centro es Re). A: vaivén IVmaj7 – Imaj7 sin dominante, un plagal que se repite en vez de cadenciar; la ambigüedad es tal que el Gmaj7 también se puede oír como tónica (Sol lidio, con el Do♯ de la melodía) y el Dmaj7 como su V. B: IIIm – VIm – IIm, el préstamo Im, y un pedal de tónica de nueve compases con el Do♮ de Re mixolidio (IIm7/Re – I7 – Im7). Final en Re menor sobre pedal de Mi y cadencia Vm7 – Im: el V es menor, sin sensible, una cadencia modal más que auténtica.",
    revisar:
      "El análisis es nuestro. El compás 33 es Re · Fa · La sobre el Mi del bajo (Rem/Mi): no tiene cifrado que lo deje con ese bajo, así que se leyó como parte del Mim del 32, con las voces de arriba bajando un escalón. Los compases 25 y 30 (Do · Mi · La sobre Re) se leyeron como Re7 sin tercera, con la novena arriba, y el 28 como el Rem7 del 27 sin el Fa.",
    frases: [
      {
        desde: 1,
        hasta: 4,
        en: RE_MAYOR,
        titulo: "La hamaca",
        simple:
          "Antes de la melodía, la izquierda sola: un bajo grave y un acorde arriba, Sol y Re, Sol y Re. Los dos tienen una nota de más que los hace sonar abiertos, como sin terminar, y ninguno de los dos empuja al otro. Va y viene.",
        tecnica:
          "IVmaj7 – Imaj7 dos veces. Las séptimas mayores (Fa♯ sobre Sol, Do♯ sobre Re) y el Fa♯ que se queda quieto arriba en los dos acordes: lo único que se mueve es el bajo, una quinta.",
        acordes: [
          { compas: 1, cifrado: "Gmaj7", grado: 3 },
          { compas: 2, cifrado: "Dmaj7", grado: 0 },
          { compas: 3, cifrado: "Gmaj7", grado: 3 },
          { compas: 4, cifrado: "Dmaj7", grado: 0 },
        ],
      },
      {
        desde: 5,
        hasta: 12,
        en: RE_MAYOR,
        titulo: "La melodía flota",
        simple:
          "Entra la melodía, que baja despacio, casi sin apoyarse, y se queda cuatro compases quieta en un Fa♯. Abajo la hamaca sigue igual, sin enterarse. Como nunca aparece el acorde de tensión, cada vuelta llega a casa sin haberse ido: no suena a punto final, suena a seguir meciéndose.",
        tecnica:
          "Ocho compases de IVmaj7 – Imaj7: cada vuelta es una cadencia plagal, la más blanda. La melodía (Fa♯ La Sol Fa♯ Do♯ Si Do♯ Re La Fa♯) se apoya en notas de color: sobre el Sol, el La es la novena y el Do♯ la cuarta aumentada, que es lo que le da el aire lidio. El Fa♯ largo es la nota común de los dos acordes, por eso puede quedarse quieta mientras el bajo cambia.",
        acordes: [
          { compas: 5, cifrado: "Gmaj7", grado: 3 },
          { compas: 6, cifrado: "Dmaj7", grado: 0 },
          { compas: 7, cifrado: "Gmaj7", grado: 3 },
          { compas: 8, cifrado: "Dmaj7", grado: 0 },
          { compas: 9, cifrado: "Gmaj7", grado: 3 },
          { compas: 10, cifrado: "Dmaj7", grado: 0 },
          { compas: 11, cifrado: "Gmaj7", grado: 3 },
          { compas: 12, cifrado: "Dmaj7", grado: 0 },
        ],
      },
      {
        desde: 13,
        hasta: 21,
        en: RE_MAYOR,
        titulo: "Se corre de lugar",
        simple:
          "La misma melodía otra vez, pero en el compás 17 la hamaca se rompe: el bajo empieza a bajar —Fa♯, Si, Mi— y los acordes se vuelven menores, más oscuros. La melodía se queda colgada en un Mi largo, y abajo aparece un Re menor: la casa, pero con la luz apagada. Es la primera vez que se oye lo que va a pasar al final.",
        tecnica:
          "IVmaj7 – Imaj7 dos veces y después IIIm – VIm – IIm – IIm7: el bajo baja por quintas (Fa♯ – Si – Mi), el camino de los acordes menores de la tonalidad. Cierra en Im, préstamo de Re menor (el Fa♮), con la melodía en Mi: la novena del acorde.",
        acordes: [
          { compas: 13, cifrado: "Gmaj7", grado: 3 },
          { compas: 14, cifrado: "Dmaj7", grado: 0 },
          { compas: 15, cifrado: "Gmaj7", grado: 3 },
          { compas: 16, cifrado: "Dmaj7", grado: 0 },
          { compas: 17, cifrado: "F#m", grado: 2 },
          { compas: 18, cifrado: "Bm", grado: 5 },
          { compas: 19, cifrado: "Em", grado: 1 },
          { compas: 20, cifrado: "Em7", grado: 1 },
          { compas: 21, cifrado: "Dm", grado: 0 },
        ],
      },
      {
        desde: 22,
        hasta: 26,
        en: RE_MAYOR,
        titulo: "Sobre un Re que no se mueve",
        simple:
          "Una melodía nueva, que sube y baja un poco más suelta. Arranca sobre un La menor —el acorde de tensión, pero menor: sin la nota que empuja, casi no tira— y enseguida el bajo se planta en Re y no se va más. Arriba vuelve la hamaca, ahora entre Mi menor y un Re con un Do natural adentro, que le da un color más antiguo, de modo viejo.",
        tecnica:
          "Vm (sin sensible: el Do♮) y pedal de tónica desde el 23. Arriba IIm7/Re – I7: el Do♮ es la séptima menor, Re mixolidio. El 25 es el I7 sin tercera (Do · Mi · La sobre Re, con la novena) y la tercera llega en el 26.",
        acordes: [
          { compas: 22, cifrado: "Am", grado: 4 },
          { compas: 23, cifrado: "Em7/D", grado: 1 },
          { compas: 25, cifrado: "D7", grado: 0 },
        ],
      },
      {
        desde: 27,
        hasta: 31,
        en: RE_MAYOR,
        titulo: "Todavía en Re",
        simple:
          "El bajo sigue clavado en Re y la melodía sube hasta el La agudo. Arriba los acordes se oscurecen un momento (un Re menor otra vez) y vuelven a la hamaca de Mi menor y Re. Es el pasaje más largo sin moverse del lugar: la tensión no aparece nunca, así que tampoco hay nada que resolver.",
        tecnica:
          "Sigue el pedal de tónica: Im7 (Fa♮, el préstamo de la menor) – IIm7/Re – I7. El 28 es el mismo Rem7 sin el Fa, y el 30 el I7 sin tercera, como el 25.",
        acordes: [
          { compas: 27, cifrado: "Dm7", grado: 0 },
          { compas: 29, cifrado: "Em7/D", grado: 1 },
          { compas: 30, cifrado: "D7", grado: 0 },
        ],
      },
      {
        desde: 32,
        hasta: 39,
        en: RE_MENOR,
        titulo: "Se apaga en Re menor",
        simple:
          "El bajo baja a Mi y se queda ahí seis compases, mientras arriba los acordes cambian despacio. Al final aparece por fin el acorde de tensión con el bajo en La, pero menor y suave, sin la nota que empuja. Y la casa a la que llega no es el Re mayor del principio: es Re menor. Termina en reposo, pero más triste de lo que empezó.",
        tecnica:
          "En Re menor, sobre pedal de Mi (el II): IIm – IIImaj7/Mi – Vm/Mi – IIImaj7/Mi – IIm7, y Vm7 – Im. La cadencia tiene la forma de la auténtica pero el V es menor (La · Do · Mi · Sol, sin el Do♯): una cadencia modal, que cierra sin empujar. Las quintas vacías del bajo en el último acorde (Re · La · Re) dejan la tercera sólo arriba.",
        acordes: [
          { compas: 32, cifrado: "Em", grado: 1 },
          { compas: 34, cifrado: "Fmaj7/E", grado: 2 },
          { compas: 35, cifrado: "Am/E", grado: 4 },
          { compas: 36, cifrado: "Fmaj7/E", grado: 2 },
          { compas: 37, cifrado: "Em7", grado: 1 },
          { compas: 38, cifrado: "Am7", grado: 4 },
          { compas: 39, cifrado: "Dm", grado: 0 },
        ],
      },
    ],
  },
];

export function armoniaDe(slug: string): ArmoniaDePieza | undefined {
  return ARMONIAS.find((a) => a.slug === slug);
}
