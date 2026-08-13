/**
 * Las figuras y los compases.
 *
 * Es la primera vez que el proyecto tiene noción de *cuánto dura* algo: hasta
 * la clase 1 sólo sabía qué notas suenan, nunca por cuánto tiempo.
 *
 * Todo sale de una sola idea, que es como lo explicó el profe: **una figura se
 * define por en cuántas partes divide a la redonda**. La negra es 4 porque la
 * redonda entra cuatro veces. Y ese mismo número es el denominador del compás,
 * así que el 4 de 3/4 no es "cuatro" de nada: es "la negra".
 *
 * No sabe nada de React ni de audio: se prueba con `npm run test:ritmo`.
 */

export interface Figura {
  id: string;
  nombre: string;
  plural: string;
  /** En cuántas partes se divide la redonda para llegar a ésta. */
  divide: number;
}

export const FIGURAS: readonly Figura[] = [
  { id: "redonda", nombre: "redonda", plural: "redondas", divide: 1 },
  { id: "blanca", nombre: "blanca", plural: "blancas", divide: 2 },
  { id: "negra", nombre: "negra", plural: "negras", divide: 4 },
  { id: "corchea", nombre: "corchea", plural: "corcheas", divide: 8 },
  {
    id: "semicorchea",
    nombre: "semicorchea",
    plural: "semicorcheas",
    divide: 16,
  },
  { id: "fusa", nombre: "fusa", plural: "fusas", divide: 32 },
  { id: "semifusa", nombre: "semifusa", plural: "semifusas", divide: 64 },
];

export const figuraQueDivide = (n: number): Figura | null =>
  FIGURAS.find((f) => f.divide === n) ?? null;

/**
 * Cómo se dibuja cada figura. Sale todo del mismo número, sin tabla de casos:
 * la redonda no tiene plica, de la negra para abajo la cabeza es llena, y las
 * banderas son los pasos que hay de la negra hasta ella.
 */
export const tienePlica = (f: Figura) => f.divide >= 2;
export const cabezaLlena = (f: Figura) => f.divide >= 4;
export const banderasDe = (f: Figura) =>
  Math.max(0, Math.round(Math.log2(f.divide)) - 2);

/** Cuánto dura, medido en redondas. Una negra son 0.25. */
export const duracionDe = (f: Figura, conPuntillo = false) =>
  (1 / f.divide) * (conPuntillo ? 1.5 : 1);

// ---------------------------------------------------------------------------
// Compases
// ---------------------------------------------------------------------------

export interface Compas {
  /** Cuántos tiempos entran en un compás. */
  numerador: number;
  /** En cuántas partes se divide la redonda: qué figura vale un tiempo. */
  denominador: number;
}

export type Subdivision = "binaria" | "ternaria";

/**
 * ¿Es compuesto?
 *
 * Un compás compuesto es un simple al que se le aplicó la constante del profe:
 * numerador por 3 y denominador por 2. Por eso el numerador siempre queda
 * múltiplo de 3 y nunca menor que 6 — 3/8 no es compuesto, es un simple de tres
 * tiempos, y la diferencia es justamente en cuánto se parte cada tiempo.
 */
export const esCompuesto = (c: Compas) =>
  c.numerador >= 6 && c.numerador % 3 === 0;

/** Los tiempos que se sienten de verdad. En 6/8 son dos, no seis. */
export const tiemposDe = (c: Compas) =>
  esCompuesto(c) ? c.numerador / 3 : c.numerador;

/** En cuántas partes se parte cada tiempo. Es toda la diferencia entre los dos. */
export const partesPorTiempo = (c: Compas) => (esCompuesto(c) ? 3 : 2);

export const subdivisionDe = (c: Compas): Subdivision =>
  esCompuesto(c) ? "ternaria" : "binaria";

/** La constante: ×3 arriba, ×2 abajo. 2/4 se vuelve 6/8. */
export const aCompuesto = (c: Compas): Compas => ({
  numerador: c.numerador * 3,
  denominador: c.denominador * 2,
});

export const aSimple = (c: Compas): Compas => ({
  numerador: c.numerador / 3,
  denominador: c.denominador / 2,
});

/**
 * Qué figura vale un tiempo.
 *
 * Acá está la cosa que más cuesta y que no se ve en el número: en un compás
 * compuesto **el pulso lleva puntillo**. En 6/8 el tiempo no es la corchea
 * —son tres corcheas— sino la negra con puntillo. El denominador dice en qué
 * se subdivide, no qué se cuenta.
 */
export function pulsoDe(c: Compas): { figura: Figura | null; conPuntillo: boolean } {
  if (!esCompuesto(c)) {
    return { figura: figuraQueDivide(c.denominador), conPuntillo: false };
  }
  return { figura: figuraQueDivide(c.denominador / 2), conPuntillo: true };
}

/** En qué figura se parte cada tiempo. */
export function figuraDeSubdivision(c: Compas): Figura | null {
  return figuraQueDivide(esCompuesto(c) ? c.denominador : c.denominador * 2);
}

export type Acento = "fuerte" | "medio" | "debil";

/**
 * El compás entero, subdivisión por subdivisión, con su acento.
 *
 * El primero de todos es fuerte, el primero de cada tiempo es medio y el resto
 * es débil. Es lo que hace que 6/8 y 3/4 —que tienen las mismas seis corcheas—
 * suenen a cosas distintas: cambia dónde caen los golpes.
 */
export function patronDe(c: Compas): Acento[] {
  const porTiempo = partesPorTiempo(c);
  const out: Acento[] = [];
  for (let t = 0; t < tiemposDe(c); t++) {
    for (let p = 0; p < porTiempo; p++) {
      out.push(t === 0 && p === 0 ? "fuerte" : p === 0 ? "medio" : "debil");
    }
  }
  return out;
}

/** "3/4", para mostrar. */
export const compasTexto = (c: Compas) => `${c.numerador}/${c.denominador}`;

// ---------------------------------------------------------------------------
// Cuánto entra en un compás
// ---------------------------------------------------------------------------

/**
 * Lo que dura un compás, medido en redondas.
 *
 * Es la otra cara del compás y la que más se olvida: los dos números no dicen
 * sólo cómo se cuenta, dicen **cuánto entra**. Un 3/4 son tres negras de
 * presupuesto y las gastás como quieras — tres negras, o una blanca y una
 * negra, o una negra y cuatro corcheas. Todas llenan el mismo compás.
 */
export const duracionDeCompas = (c: Compas) => c.numerador / c.denominador;

/** Una figura puesta en un compás, con su puntillo si lo lleva. */
export interface Puesta {
  figura: Figura;
  conPuntillo?: boolean;
}

export interface Relleno {
  nombre: string;
  puestas: Puesta[];
}

const puesta = (divide: number, conPuntillo = false): Puesta | null => {
  const figura = figuraQueDivide(divide);
  return figura ? { figura, conPuntillo } : null;
};

/**
 * Tres maneras distintas de llenar el mismo compás.
 *
 * No son todas las que hay —son infinitas— sino tres formas *características*:
 * una figura por tiempo, una figura que se come dos tiempos, y un tiempo
 * partido al medio. Con esas tres se entiende que el compás es un presupuesto y
 * no una grilla.
 */
export function rellenosDe(c: Compas): Relleno[] {
  const compuesto = esCompuesto(c);
  const tiempos = tiemposDe(c);
  // En un compuesto el pulso lleva puntillo, así que todo se cuenta en pulsos
  // con puntillo y no en la figura del denominador.
  const divPulso = compuesto ? c.denominador / 2 : c.denominador;
  const unPulso = puesta(divPulso, compuesto);
  if (!unPulso) return [];

  const out: Relleno[] = [];

  out.push({
    nombre: `${tiempos} ${tiempos === 1 ? "tiempo" : "tiempos"}`,
    puestas: Array.from({ length: tiempos }, () => unPulso),
  });

  // Una figura que vale dos tiempos: la del doble de duración.
  if (tiempos >= 2) {
    const doble = puesta(divPulso / 2, compuesto);
    if (doble) {
      out.push({
        nombre: "una que vale dos",
        puestas: [
          doble,
          ...Array.from({ length: tiempos - 2 }, () => unPulso),
        ],
      });
    }
  }

  // Un tiempo partido en sus subdivisiones.
  const parte = puesta(compuesto ? c.denominador : c.denominador * 2);
  if (parte) {
    out.push({
      nombre: "un tiempo partido",
      puestas: [
        ...Array.from({ length: tiempos - 1 }, () => unPulso),
        ...Array.from({ length: partesPorTiempo(c) }, () => parte),
      ],
    });
  }

  return out;
}

/** Lo que dura un relleno, para poder comprobar que llena justo el compás. */
export const duracionDeRelleno = (r: Relleno) =>
  r.puestas.reduce((s, p) => s + duracionDe(p.figura, p.conPuntillo), 0);

/**
 * Compases con el mismo total pero distinto acento.
 *
 * Acá está lo que más cuesta: 2/4 y 4/8 duran **exactamente lo mismo** y no son
 * lo mismo. En 2/4 se cuentan dos tiempos y el golpe cae cada dos corcheas; en
 * 4/8 se cuentan cuatro y cae en cada una. Misma cantidad de música, otro
 * esqueleto.
 *
 * Es el mismo fenómeno que 3/4 contra 6/8, y por eso conviene verlos juntos:
 * no son dos rarezas sueltas, es una sola idea.
 */
const USUALES: Compas[] = [
  { numerador: 2, denominador: 2 },
  { numerador: 3, denominador: 2 },
  { numerador: 2, denominador: 4 },
  { numerador: 3, denominador: 4 },
  { numerador: 4, denominador: 4 },
  { numerador: 6, denominador: 4 },
  { numerador: 3, denominador: 8 },
  { numerador: 4, denominador: 8 },
  { numerador: 6, denominador: 8 },
  { numerador: 9, denominador: 8 },
  { numerador: 12, denominador: 8 },
];

export function hermanosDe(c: Compas): Compas[] {
  return USUALES.filter(
    (o) =>
      duracionDeCompas(o) === duracionDeCompas(c) &&
      compasTexto(o) !== compasTexto(c),
  );
}
