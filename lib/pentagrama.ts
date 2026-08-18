/**
 * Dónde va cada nota en el pentagrama.
 *
 * La idea que ordena todo: **la altura en el papel es diatónica, no
 * cromática**. Fa♯ y Sol♭ son la misma tecla pero renglones distintos, porque
 * el renglón lo decide la *letra* y no el sonido. Es exactamente la regla que
 * ya rige los acordes (`deletrearAcorde`), y por eso no hace falta inventar
 * nada nuevo: hay que saber con qué letra se escribe cada nota, y de ahí sale
 * la posición sola.
 *
 * De ahí sale también la armadura: si la tonalidad ya dice que todos los fa van
 * sostenidos, la nota no lleva ningún signo; sólo lo lleva la que se sale de la
 * tonalidad. Y una alteración vale hasta la barra de compás, así que el estado
 * se lleva por compás y no por nota.
 *
 * Es todo función pura, sin React ni SVG: se prueba con `npm run test:pentagrama`.
 */

import { LETRAS_PC, mod12, type PitchClass } from "./music.ts";
import { duracionDe, figuraQueDivide, type Compas, type Figura } from "./ritmo.ts";

// ---------------------------------------------------------------------------
// La armadura
// ---------------------------------------------------------------------------

export type Modo = "mayor" | "menor";

export interface Tonalidad {
  tonica: PitchClass;
  modo: Modo;
}

/** El orden en que aparecen los sostenidos: fa do sol re la mi si. */
export const ORDEN_SOSTENIDOS = [3, 0, 4, 1, 5, 2, 6] as const;
/** Y el de los bemoles, que es el mismo al revés: si mi la re sol do fa. */
export const ORDEN_BEMOLES = [6, 2, 5, 1, 4, 0, 3] as const;

/**
 * Cuántas alteraciones tiene la tonalidad. Positivo sostenidos, negativo
 * bemoles.
 *
 * La tabla es la que es: cada quinta que subís agrega un sostenido. Se escribe
 * a mano porque las enarmónicas se eligen por costumbre y no por cuenta — Fa♯
 * mayor y Sol♭ mayor son la misma tecla y la misma música, y cuál se usa lo
 * decide qué se lee más fácil.
 */
const ARMADURAS: Record<Modo, Record<number, number>> = {
  mayor: { 0: 0, 7: 1, 2: 2, 9: 3, 4: 4, 11: 5, 6: 6, 1: -5, 8: -4, 3: -3, 10: -2, 5: -1 },
  menor: { 9: 0, 4: 1, 11: 2, 6: 3, 1: 4, 8: 5, 3: 6, 10: -5, 5: -4, 0: -3, 7: -2, 2: -1 },
};

export function armaduraDe(t: Tonalidad): number {
  return ARMADURAS[t.modo][mod12(t.tonica)] ?? 0;
}

/** Qué alteración le pone la armadura a cada letra: `alterDeArmadura(2)[3]` = +1 (fa♯). */
export function alterDeArmadura(armadura: number): number[] {
  const alter = [0, 0, 0, 0, 0, 0, 0];
  const orden = armadura > 0 ? ORDEN_SOSTENIDOS : ORDEN_BEMOLES;
  for (let i = 0; i < Math.abs(armadura); i++) {
    alter[orden[i]] = armadura > 0 ? 1 : -1;
  }
  return alter;
}

// ---------------------------------------------------------------------------
// De una tecla a una nota escrita
// ---------------------------------------------------------------------------

export interface NotaEnPapel {
  /** 0 = Do, 6 = Si. */
  letra: number;
  /** -1 bemol, 0 natural, 1 sostenido. */
  alter: number;
  /** La octava científica de la *letra*: el Do central es 4. */
  octava: number;
  /** La tecla que suena. */
  midi: number;
}

/**
 * Con qué letra se escribe esta tecla en esta tonalidad.
 *
 * Primero se busca la letra a la que la armadura ya la deja sonando así — ésa
 * es la que no lleva ningún signo. Si ninguna sirve, la nota es ajena a la
 * tonalidad y se escribe con la letra más cercana, con su alteración: subiendo
 * se prefiere el sostenido y bajando el bemol, que es la costumbre.
 */
export function escribirEnPapel(midi: number, armadura: number): NotaEnPapel {
  const alterArmadura = alterDeArmadura(armadura);
  const pc = mod12(midi);

  for (let letra = 0; letra < 7; letra++) {
    if (mod12(LETRAS_PC[letra] + alterArmadura[letra]) === pc) {
      return { letra, alter: alterArmadura[letra], octava: octavaDe(midi, letra), midi };
    }
  }

  // Ajena a la tonalidad: se escribe con signo. En armaduras con bemoles se
  // baja la de arriba, en las de sostenidos se sube la de abajo.
  const haciaBemol = armadura < 0;
  for (let letra = 0; letra < 7; letra++) {
    const natural = LETRAS_PC[letra];
    const alter = haciaBemol ? -1 : 1;
    if (mod12(natural + alter) === pc) {
      return { letra, alter, octava: octavaDe(midi, letra), midi };
    }
  }
  // Una nota natural que la armadura alteraba: lleva becuadro.
  const letra = LETRAS_PC.indexOf(pc as (typeof LETRAS_PC)[number]);
  return { letra, alter: 0, octava: octavaDe(midi, letra), midi };
}

/**
 * La octava de la letra, que no siempre es la de la tecla.
 *
 * Un Si♯ suena como Do de la octava de arriba pero se escribe en el renglón del
 * Si, o sea una octava más abajo. Sin esto, esa nota saltaría una octava en el
 * papel.
 */
function octavaDe(midi: number, letra: number): number {
  const octavaTecla = Math.floor(midi / 12) - 1;
  const distancia = mod12(midi) - LETRAS_PC[letra];
  // Si la letra quedó del otro lado del Do, la octava se corre.
  if (distancia > 6) return octavaTecla + 1;
  if (distancia < -6) return octavaTecla - 1;
  return octavaTecla;
}

/**
 * El renglón: un número que crece de a uno por cada letra, sin importar los
 * semitonos. Es la coordenada vertical de la nota.
 */
export function pasoDe(n: NotaEnPapel): number {
  return n.octava * 7 + n.letra;
}

/** El paso del Do central, que es la referencia de las dos claves. */
export const PASO_DO_CENTRAL = 4 * 7 + 0; // 28

export type Clave = "sol" | "fa";

/**
 * El paso de la línea de abajo de cada pentagrama.
 *
 * En clave de sol es el Mi de la octava 4; en clave de fa, el Sol de la 2. Todo
 * lo demás se cuenta desde ahí.
 */
export const PASO_LINEA_INFERIOR: Record<Clave, number> = {
  sol: 4 * 7 + 2, // Mi4 = 30
  fa: 2 * 7 + 4, // Sol2 = 18
};

/**
 * A cuántos medios espacios de la línea de abajo está la nota. Sube con el
 * número, así que para dibujar hay que darlo vuelta.
 */
export function alturaEnPentagrama(n: NotaEnPapel, clave: Clave): number {
  return pasoDe(n) - PASO_LINEA_INFERIOR[clave];
}

// ---------------------------------------------------------------------------
// La música: eventos, compases
// ---------------------------------------------------------------------------

export interface Evento {
  /** Las teclas que suenan juntas. Vacío es un silencio. */
  midis: number[];
  /** En cuántas partes divide a la redonda: 4 es negra, 8 corchea. */
  divide: number;
  puntillo?: boolean;
  /** Se prolonga sobre la siguiente en vez de volver a atacarse. */
  ligada?: boolean;
}

/** Cuánto dura un evento, medido en redondas. */
export function duracionDeEvento(e: Evento): number {
  const f = figuraQueDivide(e.divide);
  if (!f) throw new Error(`No existe una figura que divida en ${e.divide}`);
  return duracionDe(f, e.puntillo);
}

export function figuraDeEvento(e: Evento): Figura {
  const f = figuraQueDivide(e.divide);
  if (!f) throw new Error(`No existe una figura que divida en ${e.divide}`);
  return f;
}

/** Cuánto dura un compás, en redondas. 3/4 son tres cuartos de redonda. */
export function duracionDeCompas(c: Compas): number {
  return c.numerador / c.denominador;
}

export interface NotaUbicada extends Evento {
  /** Desde el arranque de la pieza, en redondas. */
  t: number;
  /** En qué compás cae (0 es el primero). */
  compas: number;
  /** Y a qué distancia del arranque de ese compás. */
  dentro: number;
}

/**
 * Le pone tiempo a una fila de eventos y dice en qué compás cae cada uno.
 *
 * No parte las notas que cruzan la barra: si una lo hace, la pieza está mal
 * escrita y es mejor enterarse que taparlo. Sí se avisa.
 */
export function ubicar(eventos: Evento[], compas: Compas): NotaUbicada[] {
  const largo = duracionDeCompas(compas);
  let t = 0;
  return eventos.map((e) => {
    const ubicada: NotaUbicada = {
      ...e,
      t,
      compas: Math.floor(redondear(t) / largo + 1e-9),
      dentro: redondear(t) % largo,
    };
    t = redondear(t + duracionDeEvento(e));
    return ubicada;
  });
}

/** Las duraciones son fracciones binarias; redondear evita el ruido de coma flotante. */
const redondear = (x: number) => Math.round(x * 1e6) / 1e6;

/**
 * ¿Cierra cada compás con la cuenta justa?
 *
 * Es la verificación que más sirve al escribir una pieza a mano: un compás al
 * que le falta o le sobra una corchea se ve enseguida acá y es imposible de ver
 * mirando el dibujo.
 */
export function compasesIncompletos(
  eventos: Evento[],
  compas: Compas,
): { compas: number; suma: number; deberia: number }[] {
  const largo = duracionDeCompas(compas);
  const porCompas = new Map<number, number>();
  let t = 0;
  for (const e of eventos) {
    const n = Math.floor(redondear(t) / largo + 1e-9);
    porCompas.set(n, redondear((porCompas.get(n) ?? 0) + duracionDeEvento(e)));
    t = redondear(t + duracionDeEvento(e));
  }
  const total = redondear(t);
  const ultimoEntero = Math.floor(total / largo + 1e-9);
  return [...porCompas.entries()]
    .filter(([n, suma]) => {
      // El último puede estar a medias si la pieza corta ahí: eso no es error.
      if (n === ultimoEntero && redondear(total % largo) !== 0) return false;
      return Math.abs(suma - largo) > 1e-6;
    })
    .map(([n, suma]) => ({ compas: n, suma, deberia: largo }));
}

// ---------------------------------------------------------------------------
// Las alteraciones que se dibujan
// ---------------------------------------------------------------------------

/**
 * Qué signo lleva escrito cada nota.
 *
 * Una alteración vale **hasta la barra de compás** y para esa letra en esa
 * octava. Así que no alcanza con comparar contra la armadura: hay que llevar el
 * estado del compás, y por eso esto recibe la fila entera y no una nota. Cuando
 * una nota vuelve a lo que dice la armadura después de haber sido alterada,
 * lleva becuadro.
 */
export type Signo = "♯" | "♭" | "♮" | null;

export function signosDe(
  notas: { nota: NotaEnPapel; compas: number }[],
  armadura: number,
): Signo[] {
  const deLaArmadura = alterDeArmadura(armadura);
  let compasActual = -1;
  let estado = new Map<string, number>();
  return notas.map(({ nota, compas }) => {
    if (compas !== compasActual) {
      compasActual = compas;
      estado = new Map();
    }
    const clave = `${nota.letra}:${nota.octava}`;
    const vigente = estado.get(clave) ?? deLaArmadura[nota.letra];
    if (nota.alter === vigente) return null;
    estado.set(clave, nota.alter);
    return nota.alter === 1 ? "♯" : nota.alter === -1 ? "♭" : "♮";
  });
}
