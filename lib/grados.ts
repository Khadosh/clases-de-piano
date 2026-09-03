/**
 * Los grados de una tonalidad.
 *
 * Es el paso que sigue a saber armar acordes sueltos: en un tema no se piensa
 * "Sol séptima", se piensa "el quinto grado", y por eso la misma progresión se
 * puede mudar de tono sin volver a aprenderla. Todo sale de una sola tabla —
 * qué nota de la escala es cada grado y qué calidad le toca— y de ahí el cifrado
 * se calcula, no se escribe.
 *
 * Sin dependencias de React ni de nada: se prueba con `npm run test:grados`.
 */

import { ESCALAS, cuatriadasDeEscala, escalaPorId, triadasDeEscala } from "./escalas.ts";
import {
  LETRAS_PC,
  chordSymbol,
  escribirNota,
  identificarAcorde,
  mod12,
  qualityById,
  raizEscrita,
  type NotaEscrita,
} from "./music.ts";

/** Semitonos desde la tónica hasta cada grado de la escala mayor. */
export const GRADOS_MAYOR = [0, 2, 4, 5, 7, 9, 11] as const;

export interface Grado {
  /** Cómo se escribe. Minúscula = menor, el ° y el ø son los disminuidos. */
  cifra: string;
  /** El id de `CHORD_QUALITIES` para la tríada de ese grado. */
  triada: string;
  /** Y para la cuatriada, que es lo que se vio en la clase 2. */
  cuatriada: string;
  /** Para poder decir en una pista de qué se trata. */
  papel: string;
}

/**
 * Los siete grados de una tonalidad mayor.
 *
 * Las calidades no son un capricho: salen de apilar terceras de la propia
 * escala. Por eso el V es el único con séptima menor sobre tríada mayor —el
 * acorde dominante— y el VII sale disminuido.
 */
export const TONALIDAD_MAYOR: Grado[] = [
  { cifra: "I", triada: "maj", cuatriada: "maj7", papel: "la casa" },
  { cifra: "ii", triada: "min", cuatriada: "min7", papel: "el que prepara al V" },
  { cifra: "iii", triada: "min", cuatriada: "min7", papel: "el primo del I" },
  { cifra: "IV", triada: "maj", cuatriada: "maj7", papel: "el que se aleja" },
  { cifra: "V", triada: "maj", cuatriada: "dom7", papel: "el que pide volver" },
  { cifra: "vi", triada: "min", cuatriada: "min7", papel: "el relativo menor" },
  { cifra: "vii", triada: "dim", cuatriada: "m7b5", papel: "el inestable" },
];

/** La fundamental de un grado, en clase de altura. */
export function raizDelGrado(tonica: number, grado: number): number {
  return (((tonica + GRADOS_MAYOR[grado]) % 12) + 12) % 12;
}

export interface Progresion {
  nombre: string;
  /** Índices en `TONALIDAD_MAYOR`, o sea 0 = I. */
  grados: number[];
  porQue: string;
}

/**
 * Las progresiones que se practican.
 *
 * Son las que aparecen en todos lados, y están puestas en orden de utilidad y
 * no de dificultad: la ii-V-I es la primera porque es la que hay que tener en
 * los dedos en las doce tonalidades.
 */
export const PROGRESIONES: Progresion[] = [
  {
    nombre: "ii – V – I",
    grados: [1, 4, 0],
    porQue: "La cadencia de todo el jazz y de media música popular. Si vas a tener una sola en los dedos, es ésta.",
  },
  {
    nombre: "I – vi – ii – V",
    grados: [0, 5, 1, 4],
    porQue: "El giro que da vueltas sobre sí mismo: termina pidiendo el I y podés volver a empezar sin cortar.",
  },
  {
    nombre: "I – IV – V – I",
    grados: [0, 3, 4, 0],
    porQue: "La cadencia clásica. Salir de casa, alejarse, y el V trayéndote de vuelta.",
  },
  {
    nombre: "vi – IV – I – V",
    grados: [5, 3, 0, 4],
    porQue: "La de las canciones de guitarra alrededor del fogón —Zombie, de los Cranberries, es ésta—. Los mismos cuatro acordes de arriba, empezando por el menor: por eso suena oscura.",
  },
  {
    nombre: "I – V – vi – IV",
    grados: [0, 4, 5, 3],
    porQue: "La misma vuelta que la anterior corrida de lugar, y suena completamente distinta —Let It Go, de Frozen, es ésta—. Arranca en la casa y suena a puerta que se abre. De ahí que el orden importe.",
  },
  {
    nombre: "iii – vi – ii – V – I",
    grados: [2, 5, 1, 4, 0],
    porQue: "La cadena de quintas: cada acorde cae una quinta del siguiente. Es la ii-V-I con más pista de despegue.",
  },
];

// ---------------------------------------------------------------------------
// Las funciones armónicas (clase 3)
// ---------------------------------------------------------------------------

export type Funcion = "reposo" | "subdominante" | "dominante";

/**
 * Qué función cumple cada grado, como lo dio el profe: REPOSO es la casa
 * adonde se tiende a volver (I, IIIm, VIm), TENSIÓN o dominante son los que
 * piden volver (V, VII°), y MEDIA TENSIÓN o subdominantes son los intermedios
 * (IIm, IV).
 */
export const FUNCION_DE_GRADO: Funcion[] = [
  "reposo", // I
  "subdominante", // IIm
  "reposo", // IIIm
  "subdominante", // IV
  "dominante", // V
  "reposo", // VIm
  "dominante", // VII°
];

export const FUNCIONES: Record<
  Funcion,
  { nombre: string; alias: string; grados: number[]; papel: string }
> = {
  reposo: {
    nombre: "Reposo",
    alias: "tónica",
    grados: [0, 2, 5],
    papel: "La casa. Adonde se tiende a volver.",
  },
  subdominante: {
    nombre: "Media tensión",
    alias: "subdominante",
    grados: [1, 3],
    papel: "Los intermedios. Salen de casa sin apurar la vuelta.",
  },
  dominante: {
    nombre: "Tensión",
    alias: "dominante",
    grados: [4, 6],
    papel: "Piden volver a la casa. No se pueden quedar ahí.",
  },
};

/**
 * La regla de oro del profe: en una secuencia de acordes nunca hay que repetir
 * cuatro funciones iguales seguidas — siempre hay que variar entre las tres.
 * Devuelve la racha más larga de la misma función, para poder avisar justo
 * cuando aparece la cuarta.
 */
export function rachaDeFuncion(grados: number[]): number {
  let mejor = 0;
  let racha = 0;
  let previa: Funcion | null = null;
  for (const g of grados) {
    const f = FUNCION_DE_GRADO[g];
    racha = f === previa ? racha + 1 : 1;
    previa = f;
    mejor = Math.max(mejor, racha);
  }
  return mejor;
}

export const violaLaReglaDeOro = (grados: number[]) => rachaDeFuncion(grados) >= 4;

/**
 * Las cadencias de la clase, mirando el final de la secuencia. La plagal va
 * como la dio el profe (V → IV → I); en la clase 4 ese nombre se completó:
 * ésa es la *compuesta* plagal, y la IV → I a secas es la subdominante
 * auténtica.
 */
export function cadenciaAlFinal(
  grados: number[],
): "autentica" | "rota" | "plagal" | null {
  const n = grados.length;
  const cola = (cuantos: number) => grados.slice(n - cuantos).join(",");
  if (n >= 3 && cola(3) === "4,3,0") return "plagal";
  if (n >= 2 && cola(2) === "4,0") return "autentica";
  if (n >= 2 && cola(2) === "4,5") return "rota";
  return null;
}

// ---------------------------------------------------------------------------
// Los préstamos melódicos (clase 4)
// ---------------------------------------------------------------------------

/**
 * Un acorde de una secuencia: un grado del campo mayor (el número pelado, como
 * siempre), o el mismo grado vestido distinto — como préstamo de una de las
 * escalas menores paralelas (`deEscala`), o como cuatriada (`septima`, la de
 * la clase 2: el V se vuelve G7, el ii se vuelve Dm7).
 *
 * El préstamo no se muda de tonalidad: se toma el acorde, se lo usa, y se
 * devuelve. Y **la función la pone el grado, no la calidad**: el Fm sigue
 * siendo el IV —subdominante— aunque venga de la menor, y el G7 sigue siendo
 * el V. Por eso la regla de oro y las cadencias miran `gradoDe()` y no se
 * enteran ni del préstamo ni de la séptima.
 */
export type AcordeDeLaSecuencia =
  | number
  | { grado: number; deEscala?: string; septima?: boolean };

export const gradoDe = (a: AcordeDeLaSecuencia): number =>
  typeof a === "number" ? a : a.grado;

export const esPrestado = (a: AcordeDeLaSecuencia): boolean =>
  typeof a !== "number" && a.deEscala !== undefined;

export const conSeptima = (a: AcordeDeLaSecuencia): boolean =>
  typeof a !== "number" && !!a.septima;

const escalaDelAcorde = (a: AcordeDeLaSecuencia) =>
  escalaPorId(typeof a === "number" || !a.deEscala ? "mayor" : a.deEscala)!;

/**
 * La fundamental del acorde sobre Do, en semitonos desde la tónica.
 *
 * Es donde el préstamo se nota: el grado es el mismo pero la fundamental
 * puede correrse — el bIII prestado vive en Mi♭ (3), no en Mi (4). Sale de la
 * escala del acorde, no de la mayor.
 */
export function raizDelAcorde(a: AcordeDeLaSecuencia): number {
  return mod12(escalaDelAcorde(a).grados[gradoDe(a)]);
}

/**
 * Los intervalos del acorde desde su fundamental, en semitonos.
 *
 * Para los diatónicos es la receta de la tríada del grado; para los prestados
 * sale de apilar nota-sí-nota-no en la escala menor que corresponda — la misma
 * cuenta de `triadasDeEscala`, mirada desde la fundamental. Con `septima` se
 * apila una tercera más y la calidad sale sola: dominante en el V, maj7 en el
 * I, sin tabla.
 */
export function intervalosDelAcorde(a: AcordeDeLaSecuencia): number[] {
  const apilar = conSeptima(a) ? cuatriadasDeEscala : triadasDeEscala;
  const notas = apilar(0, escalaDelAcorde(a))[gradoDe(a)];
  return notas.map((s) => s - notas[0]);
}

/** Las teclas del acorde, desde la fundamental (en MIDI) que se le pida. */
export function midisDelAcorde(a: AcordeDeLaSecuencia, fundamental: number): number[] {
  return intervalosDelAcorde(a).map((iv) => fundamental + iv);
}

/** Las clases de altura del acorde, sobre la tónica Do. */
export function clasesDelAcorde(a: AcordeDeLaSecuencia): Set<number> {
  return new Set(midisDelAcorde(a, raizDelAcorde(a)).map(mod12));
}

/** El cifrado del acorde en Do: "F" el diatónico, "Fm" el prestado. */
export function cifradoDelAcorde(a: AcordeDeLaSecuencia): string {
  const id = identificarAcorde(midisDelAcorde(a, 48 + raizDelAcorde(a)));
  return id ? chordSymbol(id.root, id.quality) : "?";
}

export interface Prestamo {
  grado: number;
  deEscala: string;
  cifrado: string;
  /** De qué escala se pide, para la etiqueta de la paleta. */
  origen: string;
}

/**
 * El catálogo de préstamos: los acordes de las tres menores paralelas que NO
 * están en el campo mayor, sin repetir (el Cm de la natural y el de la
 * armónica son el mismo acorde: se ofrece una vez, con el origen más simple).
 * El Fm va primero porque es el recomendado de la clase; el resto en orden de
 * grado. No es una tabla escrita a mano: sale de la misma cuenta que el
 * bloque de paralelas, así que no puede discrepar de lo que la clase muestra.
 */
export const PRESTAMOS: Prestamo[] = (() => {
  const mayor = escalaPorId("mayor")!;
  const camposMayor = triadasDeEscala(0, mayor).map((t) =>
    [...t.map(mod12)].sort((x, y) => x - y).join(","),
  );
  const out: Prestamo[] = [];
  const vistos = new Set<string>(camposMayor);
  for (const escala of ESCALAS) {
    if (escala.id === "mayor") continue;
    triadasDeEscala(0, escala).forEach((t, grado) => {
      const clave = [...t.map(mod12)].sort((x, y) => x - y).join(",");
      if (vistos.has(clave)) return;
      vistos.add(clave);
      out.push({
        grado,
        deEscala: escala.id,
        cifrado: cifradoDelAcorde({ grado, deEscala: escala.id }),
        origen: escala.nombre.toLowerCase(),
      });
    });
  }
  return out.sort((a, b) => {
    const estrella = (p: Prestamo) => (p.cifrado === "Fm" ? -1 : 0);
    return estrella(a) - estrella(b) || a.grado - b.grado;
  });
})();

// ---------------------------------------------------------------------------
// Las cadencias con nombre y apellido (clase 4)
// ---------------------------------------------------------------------------

export interface Cadencia {
  /** Índices en `TONALIDAD_MAYOR`: [4, 0] es V → I. */
  grados: number[];
  nombre: string;
  /** El porqué del nombre, para la pista y la explicación del examen. */
  detalle: string;
}

/**
 * El sistema de nombres del profe: **el apellido lo pone la función del
 * acorde que llega a la tónica**. Si llega el V es dominante, si llega el IV
 * es subdominante; si el que llega no es el principal de su familia (el IIm
 * en lugar del IV) es una *sustitución*; y si son tres acordes, la cadencia
 * es *compuesta*.
 *
 * La rota va como quedó anotada en clase — V → IIIm — con la duda registrada
 * en la clase 4: la rota de la clase 3 era V → VIm, y el IIIm es el otro
 * primo del I. Hasta preguntar, acá viven las dos.
 */
export const CADENCIAS_CON_NOMBRE: Cadencia[] = [
  {
    grados: [4, 0],
    nombre: "Dominante auténtica",
    detalle: "V → I. La tensión resuelve derecho a la casa: la más famosa de todas.",
  },
  {
    grados: [3, 0],
    nombre: "Subdominante auténtica (plagal)",
    detalle: "IV → I. La media tensión llega a la casa sin pasar por el V: la llegada blanda.",
  },
  {
    grados: [1, 0],
    nombre: "Subdominante con sustitución",
    detalle:
      "IIm → I. Llega un subdominante, pero no el principal: el IIm sustituye al IV — misma familia, otro color.",
  },
  {
    grados: [4, 2],
    nombre: "Rota",
    detalle:
      "V → IIIm. El V promete la casa y cae en un primo del reposo. En la clase 3 la rota caía en el VIm; el IIIm es el otro primo.",
  },
  {
    grados: [4, 5],
    nombre: "Rota (al VIm)",
    detalle:
      "V → VIm. La rota de la clase 3: promete el I y aterriza en el relativo menor.",
  },
  {
    grados: [1, 4, 0],
    nombre: "Compuesta auténtica",
    detalle:
      "IIm → V → I. Tres acordes, las tres funciones: media tensión, tensión, casa. La del jazz.",
  },
  {
    grados: [4, 3, 0],
    nombre: "Compuesta plagal",
    detalle:
      "V → IV → I. La plagal de la clase 3, ahora con nombre completo: el V no resuelve, se ablanda pasando por el IV.",
  },
];

// ---------------------------------------------------------------------------
// Los dominantes secundarios (clase 5)
// ---------------------------------------------------------------------------

export interface Dominante {
  /** Sobre qué grado de la escala está construido el X7: 0 = C7 en Do. */
  grado: number;
  /** La fundamental del X7, en clase de altura desde la tónica. */
  raiz: number;
  /** El cifrado del X7: "A7". */
  cifrado: string;
  /**
   * Adónde lleva. Es siempre el acorde a cinco semitonos de la fundamental
   * —la misma distancia que va de G a C— y es un grado de la escala o no lo
   * es: cuando lo es, `destino` dice cuál y `cifradoDestino` es su tríada
   * del campo (Dm, Em…); cuando no, `destino` es null y el cifrado es la
   * tríada mayor que está afuera (Bb).
   */
  destino: number | null;
  raizDestino: number;
  cifradoDestino: string;
  /** La calidad de la tríada de llegada (id de `CHORD_QUALITIES`). */
  calidadDestino: string;
  /**
   * principal: el V7 de siempre, G7 → C. secundario: lleva a otro grado del
   * campo. efectivo: lleva a un acorde que no está en la escala — a otro
   * campo armónico, como dijo el profe.
   */
  tipo: "principal" | "secundario" | "efectivo";
  /** Las notas del X7 que la escala mayor no tiene: el Fa♯ del D7. */
  ajenas: number[];
}

/** El X7 apilado sobre una fundamental, en clases de altura. */
const clasesDeDominante = (raiz: number) => [0, 4, 7, 10].map((iv) => mod12(raiz + iv));

/** Adónde lleva un X7: cinco semitonos arriba de su fundamental. */
export const destinoDeDominante = (raiz: number) => mod12(raiz + 5);

/**
 * La tabla de la clase 5, deducida y no escrita: sobre cada nota de Do mayor
 * se apila la fórmula del dominante —mayor con séptima menor, X7— y se mira
 * adónde cae, a cinco semitonos, como el G7 cae en Do. Seis de los siete caen
 * en un acorde del campo (C7 → F, D7 → G, E7 → Am, G7 → C, A7 → Dm, B7 → Em);
 * el F7 cae en Si♭, que no está, y por eso el profe lo dejó afuera de la
 * lista: ése ya lleva a otro campo armónico.
 *
 * Es la misma lógica de la clase 2 —del V sale el único dominante del campo—
 * mirada al revés: cualquier grado puede tener *su* dominante, prestado de la
 * tonalidad de ese grado. Y por eso cada X7 trae una nota ajena (`ajenas`):
 * el Fa♯ del D7 es el Fa♯ de Sol mayor, que es adonde el D7 apunta.
 */
export const DOMINANTES: Dominante[] = TONALIDAD_MAYOR.map((_, grado) => {
  const raiz = raizDelGrado(0, grado);
  const raizDestino = destinoDeDominante(raiz);
  const destino = GRADOS_MAYOR.indexOf(raizDestino as (typeof GRADOS_MAYOR)[number]);
  const escala = new Set<number>(GRADOS_MAYOR);
  const enElCampo = destino >= 0;
  const calidadDestino = enElCampo ? TONALIDAD_MAYOR[destino].triada : "maj";
  return {
    grado,
    raiz,
    cifrado: chordSymbol(raiz, qualityById("dom7")!),
    destino: enElCampo ? destino : null,
    raizDestino,
    cifradoDestino: chordSymbol(raizDestino, qualityById(calidadDestino)!),
    calidadDestino,
    tipo: destino === 0 ? "principal" : enElCampo ? "secundario" : "efectivo",
    ajenas: clasesDeDominante(raiz).filter((pc) => !escala.has(pc)),
  };
});

/** El dominante que lleva a un grado del campo: el A7 para el ii. */
export function dominanteDelGrado(grado: number): Dominante | null {
  return DOMINANTES.find((d) => d.destino === grado) ?? null;
}

/**
 * El destino dado vuelta: si el X7 caía en un menor del campo, la tríada
 * mayor sobre la misma nota, y al revés. Es lo que el profe dejó nombrado sin
 * entrar en detalle: cambiando el mayor por menor (o viceversa) el acorde de
 * llegada se sale de la escala y el secundario pasa a ser *efectivo*.
 */
export function destinoDadoVuelta(d: Dominante): { cifrado: string; calidad: string } {
  const calidad = d.calidadDestino === "min" ? "maj" : "min";
  return { cifrado: chordSymbol(d.raizDestino, qualityById(calidad)!), calidad };
}

// ---------------------------------------------------------------------------
// Los disminuidos de paso (clase 5)
// ---------------------------------------------------------------------------

export interface Disminuido {
  /** La fundamental del X°, en clase de altura: un semitono abajo de adonde llega. */
  raiz: number;
  /**
   * Cómo se escribe esa fundamental. No sale de la tabla de siempre: el que
   * lleva a Mi es Re♯dim y no Mi♭dim, porque es el séptimo grado de Mi — la
   * letra es la de abajo de la llegada, y el signo el que haga falta.
   */
  base: NotaEscrita;
  cifrado: string;
  destino: number | null;
  raizDestino: number;
  cifradoDestino: string;
  calidadDestino: string;
  /** Las notas del X° que Do mayor no tiene. */
  ajenas: number[];
}

/**
 * La segunda opción de acorde de paso, como quedó en el papel: **X°, el VII°
 * del acorde adonde se llega**. Es el mismo movimiento que el Bdim → C de la
 * escala, mudado: para llegar a Sol se pone el séptimo grado de Sol (Fa♯dim),
 * para llegar a Do el de Do (Bdim). Un semitono abajo y resuelve para arriba.
 *
 * Se deduce del dominante del mismo destino, así las dos tablas apuntan a los
 * mismos lugares y no pueden discrepar.
 */
export function disminuidoDePaso(d: Dominante): Disminuido {
  const llegada = raizEscrita(d.raizDestino);
  const letra = (llegada.letra + 6) % 7;
  const raiz = mod12(d.raizDestino - 1);
  let alter = mod12(raiz - LETRAS_PC[letra]);
  if (alter > 6) alter -= 12;
  const base: NotaEscrita = { letra, alter, pc: raiz };
  const escala = new Set<number>(GRADOS_MAYOR);
  return {
    raiz,
    base,
    cifrado: `${escribirNota(base, "en")}dim`,
    destino: d.destino,
    raizDestino: d.raizDestino,
    cifradoDestino: d.cifradoDestino,
    calidadDestino: d.calidadDestino,
    ajenas: [0, 3, 6].map((iv) => mod12(raiz + iv)).filter((pc) => !escala.has(pc)),
  };
}

/** Uno por cada destino de `DOMINANTES`, en el mismo orden. */
export const DISMINUIDOS: Disminuido[] = DOMINANTES.map(disminuidoDePaso);

/** El disminuido que lleva a un grado del campo: el Fa♯dim para el V. */
export function disminuidoDelGrado(grado: number): Disminuido | null {
  return DISMINUIDOS.find((x) => x.destino === grado) ?? null;
}
