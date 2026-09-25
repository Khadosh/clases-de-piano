/**
 * Las tonalidades: la misma escala arrancando de cada nota, y qué signos pide
 * cada una.
 *
 * Es la clase 8 entera, y sale de una sola idea que ya está en todo el
 * proyecto: **una escala usa las siete letras, una por una**. Si la mayor
 * arranca en Sol, la séptima nota tiene que llamarse Fa —porque entre Mi y Sol
 * está la letra Fa— y como la tecla que va es un semitono más arriba, se llama
 * Fa♯. Nadie eligió el sostenido: lo pidió el abecedario. Es exactamente la
 * regla de `deletrearAcorde`, con grados seguidos en vez de terceras.
 *
 * De ahí sale todo lo demás sin una sola tabla escrita a mano:
 *
 * - **La armadura es una cuenta, no una lista para memorizar.** Se escribe la
 *   escala y se cuentan los signos. Que salgan siempre en el orden
 *   fa-do-sol-re-la-mi-si es una consecuencia, y por eso es un test y no un
 *   dato (`test:tonalidades`).
 * - **Las tonalidades que existen son las que se escriben sin doble signo.**
 *   Sol♯ mayor pediría Fa♯♯ y por eso nadie la escribe: se usa La♭, que es la
 *   misma tecla con nombres legibles. Filtrando por eso salen exactamente
 *   quince, de Do♭ (siete bemoles) a Do♯ (siete sostenidos) — la lista del
 *   cuaderno, deducida.
 * - **La relativa menor es el sexto grado**, así que tampoco se escribe: se
 *   calcula, y comparte la armadura porque son las mismas siete notas.
 *
 * Todo función pura, sin React: se prueba con `npm run test:tonalidades`.
 */

import { LETRAS_PC, escribirNota, mod12, raizEscrita, type NotaEscrita } from "./music.ts";
import { escalaPorId, type Escala } from "./escalas.ts";

export type Modo = "mayor" | "menor";

/** Una tonalidad es una tónica **escrita** y un modo: Fa♯ y Sol♭ no son lo mismo. */
export interface Tono {
  tonica: NotaEscrita;
  modo: Modo;
}

/**
 * El orden en que aparecen los sostenidos: fa do sol re la mi si.
 *
 * Está escrito porque es el que se dibuja en el papel, pero no es un dato que
 * haya que creer: `test:tonalidades` verifica que los signos que pide cada
 * escala salen justo en este orden, sin haberlo consultado.
 */
export const ORDEN_SOSTENIDOS = [3, 0, 4, 1, 5, 2, 6] as const;
/** Y el de los bemoles, que es el mismo al revés: si mi la re sol do fa. */
export const ORDEN_BEMOLES = [6, 2, 5, 1, 4, 0, 3] as const;

const MAYOR = escalaPorId("mayor")!;
const MENOR = escalaPorId("menor-natural")!;

/** La escala que le da la armadura a cada modo. */
export const escalaDeModo = (modo: Modo): Escala => (modo === "mayor" ? MAYOR : MENOR);

/** Una nota escrita a partir de su letra y su alteración. */
export function nota(letra: number, alter: number): NotaEscrita {
  const l = ((letra % 7) + 7) % 7;
  return { letra: l, alter, pc: mod12(LETRAS_PC[l] + alter) };
}

/**
 * La escala escrita: una letra por grado, y el signo que haga falta.
 *
 * Acá no se decide nada — la letra la pone el orden del abecedario y el signo
 * es la diferencia entre la tecla que va y la letra que toca. Por eso Do♯
 * mayor tiene Si♯ (no Do) y Do♭ mayor tiene Fa♭ (no Mi): la tecla es la misma,
 * el renglón no.
 */
export function escalaEscrita(tonica: NotaEscrita, escala: Escala): NotaEscrita[] {
  return escala.grados.map((g, i) => {
    const letra = (tonica.letra + i) % 7;
    const pc = mod12(tonica.pc + g);
    let alter = mod12(pc - LETRAS_PC[letra]);
    if (alter > 6) alter -= 12;
    return { letra, alter, pc };
  });
}

/** Las notas de la tonalidad, escritas. */
export const notasDeTono = (t: Tono): NotaEscrita[] =>
  escalaEscrita(t.tonica, escalaDeModo(t.modo));

/**
 * Cuántas alteraciones tiene: positivo sostenidos, negativo bemoles.
 *
 * Es la cuenta de los signos de su propia escala, y nada más. Una tonalidad de
 * verdad nunca mezcla —no existe la que tiene dos sostenidos y un bemol— así
 * que sumarlos con signo da el número de la armadura directo.
 */
export function armaduraDeTono(t: Tono): number {
  return notasDeTono(t).reduce((n, x) => n + x.alter, 0);
}

/** Si alguna nota pediría doble signo, esa tonalidad no se escribe. */
export const pideDobles = (t: Tono): boolean =>
  notasDeTono(t).some((n) => Math.abs(n.alter) > 1);

/** El grado (1 = tónica) de la tonalidad, escrito. */
export const gradoDeTono = (t: Tono, grado: number): NotaEscrita =>
  notasDeTono(t)[(grado - 1) % 7];

/** La relativa menor es el sexto grado de la mayor: las mismas siete notas. */
export const relativaMenor = (t: Tono): Tono => ({
  tonica: gradoDeTono({ ...t, modo: "mayor" }, 6),
  modo: "menor",
});

/** Y la relativa mayor es el tercero de la menor. */
export const relativaMayor = (t: Tono): Tono => ({
  tonica: gradoDeTono({ ...t, modo: "menor" }, 3),
  modo: "mayor",
});

export interface Tonalidad {
  /** De -7 (siete bemoles) a +7 (siete sostenidos). */
  armadura: number;
  mayor: Tono;
  menor: Tono;
}

/**
 * Las quince, deducidas: todas las tónicas posibles menos las que pedirían un
 * doble signo. No hay lista escrita a mano — si alguien duda de que sean
 * quince, que cuente.
 */
export const TONALIDADES: Tonalidad[] = (() => {
  const out: Tonalidad[] = [];
  for (let letra = 0; letra < 7; letra++) {
    for (const alter of [-1, 0, 1]) {
      const mayor: Tono = { tonica: nota(letra, alter), modo: "mayor" };
      if (pideDobles(mayor)) continue;
      const menor = relativaMenor(mayor);
      // La menor de la misma armadura también tiene que poder escribirse: son
      // las mismas notas, así que si la mayor entra, entra. Se verifica igual.
      if (pideDobles(menor)) continue;
      out.push({ armadura: armaduraDeTono(mayor), mayor, menor });
    }
  }
  return out.sort((a, b) => a.armadura - b.armadura);
})();

export const tonalidadPorArmadura = (armadura: number): Tonalidad | undefined =>
  TONALIDADES.find((t) => t.armadura === armadura);

/** El tono de una armadura y un modo: 3 sostenidos en mayor es La. */
export function tonoDeArmadura(armadura: number, modo: Modo): Tono | undefined {
  const t = tonalidadPorArmadura(armadura);
  return t && (modo === "mayor" ? t.mayor : t.menor);
}

/** Las notas que llevan signo, en el orden en que se dibujan. */
export function signosDeArmadura(armadura: number): NotaEscrita[] {
  const orden = armadura > 0 ? ORDEN_SOSTENIDOS : ORDEN_BEMOLES;
  return Array.from({ length: Math.abs(armadura) }, (_, i) =>
    nota(orden[i], armadura > 0 ? 1 : -1),
  );
}

/**
 * La regla del profe para leer una armadura, que es la que se usa mirando un
 * papel: **con sostenidos, la tónica es un semitono arriba del último; con
 * bemoles, es el anteúltimo**.
 *
 * Devuelve la tónica mayor y de dónde salió, para poder mostrarlo. Existe
 * aparte de `tonoDeArmadura` a propósito: ésa busca en la lista, ésta hace la
 * cuenta que uno hace de memoria. Que las dos coincidan siempre es un test, y
 * es la única forma honesta de afirmar que la regla funciona.
 */
export function leerArmadura(armadura: number): {
  tonica: NotaEscrita;
  /** El signo que decide, si hay uno. */
  pista: NotaEscrita | null;
  regla: string;
} {
  if (armadura === 0) {
    return { tonica: nota(0, 0), pista: null, regla: "Sin alteraciones: Do mayor." };
  }
  const signos = signosDeArmadura(armadura);
  if (armadura > 0) {
    const ultimo = signos[signos.length - 1];
    const letra = (ultimo.letra + 1) % 7;
    let alter = mod12(mod12(ultimo.pc + 1) - LETRAS_PC[letra]);
    if (alter > 6) alter -= 12;
    return {
      tonica: nota(letra, alter),
      pista: ultimo,
      regla: `El último sostenido es ${escribirNota(ultimo)}: un semitono más arriba está la tónica.`,
    };
  }
  // Con un solo bemol no hay anteúltimo, y la tonalidad es Fa. Es la única
  // excepción de la regla, y por eso se aprende suelta.
  if (armadura === -1) {
    return {
      tonica: nota(3, 0),
      pista: signos[0],
      regla: "Con un solo bemol no hay anteúltimo: ése es Fa mayor, y se aprende aparte.",
    };
  }
  const anteultimo = signos[signos.length - 2];
  return {
    tonica: anteultimo,
    pista: anteultimo,
    regla: `El anteúltimo bemol es ${escribirNota(anteultimo)}, y ésa es la tónica.`,
  };
}

/** "Mi♭ mayor", "Do♯ menor". En inglés: "E♭", "C♯m". */
export function nombreDeTono(t: Tono, lang: "es" | "en" = "es"): string {
  if (lang === "en") return `${escribirNota(t.tonica, "en")}${t.modo === "menor" ? "m" : ""}`;
  return `${escribirNota(t.tonica)} ${t.modo}`;
}

/**
 * Las notas de la tonalidad en MIDI, de la tónica a la octava, cerca de la
 * base que se le pida. La tecla sale del `pc` escrito, así que Do♭ suena Si —
 * el papel y el piano no siempre dicen lo mismo, y ésa es media clase.
 */
export function teclasDeTono(t: Tono, base = 60): number[] {
  const escala = escalaDeModo(t.modo);
  const tonica = base + mod12(t.tonica.pc - base);
  return [...escala.grados.map((g) => tonica + g), tonica + 12];
}

/**
 * Las tonalidades que suenan igual y se escriben distinto: Si y Do♭, Fa♯ y
 * Sol♭, Do♯ y Re♭. Son las tres de los extremos, y aparecen solas — cualquier
 * par de la lista cuya tónica es la misma tecla.
 */
export function enarmonicaDe(t: Tonalidad): Tonalidad | undefined {
  return TONALIDADES.find(
    (o) => o !== t && o.mayor.tonica.pc === t.mayor.tonica.pc,
  );
}

/**
 * Tonalidades que se confunden con ésta, para las opciones de un quiz.
 *
 * No son al azar y ahí está el ejercicio: se confunde **la relativa** (misma
 * armadura, otra casa), **la vecina** (un signo más o uno menos, que en el
 * papel es un solo símbolo de diferencia) y **la enarmónica** (la misma tecla
 * escrita al revés). Un distractor lejano no enseña nada: nadie confunde Do
 * mayor con Fa♯ mayor.
 */
export function confundiblesCon(t: Tono, cuantos = 3): Tono[] {
  const armadura = armaduraDeTono(t);
  const otra = (n: number, modo: Modo) => tonoDeArmadura(n, modo);
  const candidatos = [
    // La relativa: es el error de la clase, así que va primera.
    otra(armadura, t.modo === "mayor" ? "menor" : "mayor"),
    otra(armadura + 1, t.modo),
    otra(armadura - 1, t.modo),
    otra(armadura + 2, t.modo),
    otra(armadura - 2, t.modo),
    // El otro signo con la misma cuenta: tres bemoles en vez de tres sostenidos.
    otra(-armadura, t.modo),
  ];
  const vistos = new Set([nombreDeTono(t)]);
  const out: Tono[] = [];
  for (const c of candidatos) {
    if (!c || vistos.has(nombreDeTono(c))) continue;
    vistos.add(nombreDeTono(c));
    out.push(c);
    if (out.length === cuantos) break;
  }
  return out;
}

/** Las armaduras que se confunden con una: las vecinas y la del signo opuesto. */
export function armadurasConfundiblesCon(armadura: number, cuantos = 3): number[] {
  const candidatos = [armadura + 1, armadura - 1, -armadura, armadura + 2, armadura - 2];
  const out: number[] = [];
  for (const n of candidatos) {
    if (n === armadura || out.includes(n) || !tonalidadPorArmadura(n)) continue;
    out.push(n);
    if (out.length === cuantos) break;
  }
  return out;
}

/**
 * La escala de una tecla, escrita con los nombres que se leen.
 *
 * Una tecla es dos tonalidades —la de Mi♭ y la de Re♯— y sólo una de las dos
 * se escribe sin dobles signos: la menor armónica de Mi♭ tiene un Re natural,
 * y la de Re♯ tendría un Do♯♯. Así que la escritura no se elige por gusto, se
 * prueba: gana la que no pide dobles, y si las dos los piden (no pasa con las
 * escalas de la clase) queda la de costumbre.
 *
 * Existe porque el ejercicio de escalas acepta cualquier tecla como tónica,
 * mientras que las quince tonalidades son las que se escriben en un papel.
 */
export function escalaLegible(pc: number, escala: Escala): NotaEscrita[] {
  // La de costumbre va primera —la misma que dice el botón de la tónica— y
  // las otras escrituras de esa tecla quedan de reserva.
  const preferida = raizEscrita(mod12(pc));
  const candidatas: NotaEscrita[] = [preferida];
  for (let letra = 0; letra < 7; letra++) {
    for (const alter of [0, 1, -1]) {
      const n = nota(letra, alter);
      if (n.pc === mod12(pc) && n.letra !== preferida.letra) candidatas.push(n);
    }
  }
  const limpia = candidatas.find(
    (c) => !escalaEscrita(c, escala).some((n) => Math.abs(n.alter) > 1),
  );
  return escalaEscrita(limpia ?? candidatas[0], escala);
}
