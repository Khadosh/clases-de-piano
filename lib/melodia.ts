/**
 * Ponerle melodía a una secuencia de acordes.
 *
 * Es el puente entre las dos mitades del sitio: los acordes son los de la sala
 * de práctica (grados de Do mayor, como en el inventor de secuencias) y la
 * melodía sale escrita en pentagrama, como una partitura. Las reglas son las
 * que ya enseñó la clase, ninguna nueva:
 *
 * - **En los pulsos fuertes (1 y 3) va una nota del acorde.** Es lo que hace
 *   que la melodía y la armonía suenen juntas y no una arriba de la otra.
 * - **Entre medio se camina por la escala, de a un paso.** Las notas que no
 *   son del acorde se ganan el lugar llegando o yéndose por grado conjunto:
 *   son notas de paso o vecinas, no saltos al vacío.
 * - **El final es una nota larga del último acorde**, con preferencia por la
 *   fundamental: terminar en la casa.
 *
 * Todo pasa en **grados de la escala** (0 = Do4, 7 = Do5) y no en semitonos:
 * en Do mayor un paso de melodía es un paso de escala, mida dos semitonos o
 * uno. Recién al final cada grado se vuelve tecla con `scaleDegreeToPitch`.
 *
 * Sin React ni audio: se prueba con `npm run test:melodia`.
 */

import { scaleDegreeToPitch, seededRandom, MAJOR_SCALE, mod12 } from "./music.ts";
import type { Evento } from "./pentagrama.ts";

/** El rango de la melodía, en grados: de Do4 a Mi5. Cómodo para cantar y leer. */
export const GRADO_MIN = 0;
export const GRADO_MAX = 9;
/** El centro del rango, adonde la melodía tiende a volver si se fue lejos. */
const CENTRO = 4;

/** Los grados-de-escala (0..6) que forman la tríada del grado armónico `g`. */
export function gradosDelAcorde(g: number): Set<number> {
  return new Set([g % 7, (g + 2) % 7, (g + 4) % 7]);
}

/** ¿Este grado de melodía es nota del acorde `g`? */
export function esDelAcorde(d: number, g: number): boolean {
  return gradosDelAcorde(g).has(((d % 7) + 7) % 7);
}

/** Todas las notas del acorde que caen dentro del rango de la melodía. */
function candidatosDelAcorde(g: number): number[] {
  const clases = gradosDelAcorde(g);
  const out: number[] = [];
  for (let d = GRADO_MIN; d <= GRADO_MAX; d++) {
    if (clases.has(((d % 7) + 7) % 7)) out.push(d);
  }
  return out;
}

/**
 * Elige un candidato cerca de la referencia, con un poco de azar.
 *
 * No siempre el más cercano: una melodía que sólo da el paso mínimo se queda
 * pedaleando en dos notas. Se ordena por distancia —con una atracción suave
 * hacia el centro del rango, para no quedarse viviendo en el techo— y se
 * sortea entre los tres mejores, cargado hacia el primero.
 */
function elegirCerca(
  candidatos: number[],
  ref: number,
  rnd: () => number,
  evitar?: number,
): number {
  const puntaje = (d: number) => Math.abs(d - ref) + Math.abs(d - CENTRO) * 0.25;
  const orden = [...candidatos]
    .filter((d) => d !== evitar || candidatos.length === 1)
    .sort((a, b) => puntaje(a) - puntaje(b));
  const r = rnd();
  const i = r < 0.55 ? 0 : r < 0.85 ? 1 : 2;
  return orden[Math.min(i, orden.length - 1)];
}

/**
 * La nota que conecta dos notas del esqueleto, a un pulso de distancia.
 *
 * Acá vive la regla de caminar: si entre las dos hay una tercera, la del medio
 * es la nota de paso; si son la misma, una vecina que vuelve; si ya están a un
 * paso, se repite o se anticipa; y si el salto es más grande, se arranca a
 * caminar hacia la de destino.
 */
function conector(x: number, y: number, rnd: () => number): number {
  const salto = y - x;
  if (Math.abs(salto) === 2) return x + salto / 2;
  if (salto === 0) {
    const arriba = x + 1 <= GRADO_MAX;
    const abajo = x - 1 >= GRADO_MIN;
    if (arriba && abajo) return rnd() < 0.5 ? x + 1 : x - 1;
    return arriba ? x + 1 : x - 1;
  }
  if (Math.abs(salto) === 1) return rnd() < 0.6 ? x : y;
  return x + Math.sign(salto);
}

/** La figura de cada duración, para no repetir números mágicos. */
const REDONDA = 1;
const BLANCA = 2;
const NEGRA = 4;
const CORCHEA = 8;

const nota = (d: number, divide: number): Evento => ({
  midis: [scaleDegreeToPitch(d)],
  divide,
});

/**
 * Compone una melodía de un compás de 4/4 por acorde.
 *
 * Determinística: la misma secuencia con la misma semilla da la misma melodía,
 * así que el servidor y el cliente dibujan lo mismo y el "otra melodía" es
 * sólo cambiar la semilla.
 */
export function componerMelodia(grados: number[], semilla: number): Evento[] {
  if (grados.length === 0) return [];
  const rnd = seededRandom(semilla * 7919 + grados.length);

  // Primero el esqueleto: las notas del acorde de los pulsos 1 y 3 de cada
  // compás, cada una elegida cerca de la anterior. El último compás es una
  // sola nota larga, con preferencia por la fundamental.
  const esqueleto: [number, number][] = [];
  let previa = elegirCerca(candidatosDelAcorde(grados[0]), CENTRO, rnd);
  for (let i = 0; i < grados.length - 1; i++) {
    const candidatos = candidatosDelAcorde(grados[i]);
    const s0 = i === 0 ? previa : elegirCerca(candidatos, previa, rnd);
    const s1 = elegirCerca(candidatos, s0, rnd, rnd() < 0.7 ? s0 : undefined);
    esqueleto.push([s0, s1]);
    previa = s1;
  }
  const ultimo = grados[grados.length - 1];
  const candidatosFinal = candidatosDelAcorde(ultimo);
  const esFundamental = (d: number) => ((d % 7) + 7) % 7 === ultimo % 7;
  const final = [...candidatosFinal].sort(
    (a, b) =>
      Number(esFundamental(b)) - Number(esFundamental(a)) ||
      Math.abs(a - previa) - Math.abs(b - previa),
  )[0];

  // Y después la carne: cada compás conecta su esqueleto con notas de paso,
  // con un patrón rítmico sorteado. Las corcheas sólo aparecen donde caminan
  // de verdad (una cuarta que se rellena) o donde bordan la misma nota.
  const eventos: Evento[] = [];
  for (let i = 0; i < esqueleto.length; i++) {
    const [s0, s1] = esqueleto[i];
    const siguiente = i + 1 < esqueleto.length ? esqueleto[i + 1][0] : final;
    const r = rnd();
    if (r < 0.2) {
      // negra negra blanca: el compás respira al final.
      eventos.push(nota(s0, NEGRA), nota(conector(s0, s1, rnd), NEGRA), nota(s1, BLANCA));
    } else if (r < 0.35) {
      // blanca negra negra: la primera nota se sostiene.
      eventos.push(nota(s0, BLANCA), nota(s1, NEGRA), nota(conector(s1, siguiente, rnd), NEGRA));
    } else {
      // Cuatro pulsos. Uno de los conectores puede volverse un par de
      // corcheas, si el terreno lo permite.
      const c1 = conector(s0, s1, rnd);
      const c3 = conector(s1, siguiente, rnd);
      const parDeCorcheas = (x: number, y: number): [number, number] | null => {
        const salto = y - x;
        if (Math.abs(salto) === 3) {
          const d = Math.sign(salto);
          return [x + d, x + 2 * d];
        }
        if (salto === 0 && x + 1 <= GRADO_MAX && x - 1 >= GRADO_MIN) return [x + 1, x - 1];
        return null;
      };
      const donde = rnd() < 0.5 ? 1 : 3;
      const par =
        rnd() < 0.45
          ? donde === 1
            ? parDeCorcheas(s0, s1)
            : parDeCorcheas(s1, siguiente)
          : null;
      if (par && donde === 1) {
        eventos.push(nota(s0, NEGRA), nota(par[0], CORCHEA), nota(par[1], CORCHEA), nota(s1, NEGRA), nota(c3, NEGRA));
      } else if (par && donde === 3) {
        eventos.push(nota(s0, NEGRA), nota(c1, NEGRA), nota(s1, NEGRA), nota(par[0], CORCHEA), nota(par[1], CORCHEA));
      } else {
        eventos.push(nota(s0, NEGRA), nota(c1, NEGRA), nota(s1, NEGRA), nota(c3, NEGRA));
      }
    }
  }
  eventos.push(nota(final, REDONDA));
  return eventos;
}

// ---------------------------------------------------------------------------
// La melodía escrita por el que practica
// ---------------------------------------------------------------------------

/**
 * Cuando la melodía la escribís vos, va una negra por pulso y el último compás
 * es una redonda: la misma grilla en la que compone la app, sin el ritmo en el
 * medio — el ejercicio es elegir las notas, no pelearse con las figuras.
 */
export function lugaresDeMelodia(compases: number): number {
  return compases <= 1 ? 1 : 4 * (compases - 1) + 1;
}

/** En qué compás y pulso cae cada lugar de la grilla. */
export function posicionDeLugar(
  lugar: number,
  compases: number,
): { compas: number; pulso: number; esFinal: boolean } {
  const esFinal = lugar >= lugaresDeMelodia(compases) - 1;
  return esFinal
    ? { compas: compases - 1, pulso: 0, esFinal }
    : { compas: Math.floor(lugar / 4), pulso: lugar % 4, esFinal };
}

/** Los eventos de una melodía a medio escribir, para dibujarla mientras va. */
export function eventosDeMelodiaEscrita(notas: number[], compases: number): Evento[] {
  return notas.map((d, i) =>
    nota(d, posicionDeLugar(i, compases).esFinal ? REDONDA : NEGRA),
  );
}

export type Veredicto = "acorde" | "paso" | "aire";

/**
 * Qué es cada nota de la melodía escrita, con las reglas de arriba.
 *
 * No corrige, puntúa — como el enlace: "aire" no es un error, es una nota de
 * la escala que ni pertenece al acorde ni llegó caminando, y el aviso es para
 * que se escuche por qué suena más flotante que las otras.
 */
export function analizarMelodia(
  notas: number[],
  grados: number[],
): Veredicto[] {
  return notas.map((d, i) => {
    const { compas } = posicionDeLugar(i, grados.length);
    if (esDelAcorde(d, grados[compas])) return "acorde";
    const previa = i > 0 ? notas[i - 1] : null;
    const siguiente = i + 1 < notas.length ? notas[i + 1] : null;
    const porPaso =
      (previa !== null && Math.abs(d - previa) === 1) ||
      (siguiente !== null && Math.abs(d - siguiente) === 1);
    return porPaso ? "paso" : "aire";
  });
}

/** El resumen del veredicto: los números que se muestran al completar. */
export function resumenDeMelodia(notas: number[], grados: number[]) {
  const veredictos = analizarMelodia(notas, grados);
  let fuertes = 0;
  let fuertesBien = 0;
  notas.forEach((_, i) => {
    const { pulso, esFinal } = posicionDeLugar(i, grados.length);
    if (esFinal || pulso === 0 || pulso === 2) {
      fuertes++;
      if (veredictos[i] === "acorde") fuertesBien++;
    }
  });
  const ultima = notas[notas.length - 1];
  const g = grados[grados.length - 1];
  return {
    veredictos,
    fuertes,
    fuertesBien,
    deAire: veredictos.filter((v) => v === "aire").length,
    terminaEnAcorde: ultima !== undefined && esDelAcorde(ultima, g),
    terminaEnCasa: ultima !== undefined && ((ultima % 7) + 7) % 7 === g % 7,
  };
}

/** De una tecla de Do mayor a su grado de melodía (0 = Do4), si lo es. */
export function gradoDeTecla(midi: number): number | null {
  const idx = MAJOR_SCALE.indexOf(mod12(midi));
  if (idx < 0) return null;
  return Math.floor((midi - 60) / 12) * 7 + idx;
}
