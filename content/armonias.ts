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
];

export function armoniaDe(slug: string): ArmoniaDePieza | undefined {
  return ARMONIAS.find((a) => a.slug === slug);
}
