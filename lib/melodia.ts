/**
 * Ponerle melodía a una secuencia de acordes.
 *
 * Es el puente entre las dos mitades del sitio: los acordes son los de la sala
 * de práctica (grados de Do mayor, ahora también con préstamos de las menores
 * paralelas) y la melodía sale escrita en pentagrama, como una partitura. Las
 * reglas son las que enseñaron las clases 3 y 4, ninguna nueva:
 *
 * - **En los pulsos fuertes (1 y 3) va una nota del acorde.** Es lo que hace
 *   que la melodía y la armonía suenen juntas y no una arriba de la otra.
 * - **Entre medio se camina por la escala, de a un paso.** Las notas que no
 *   son del acorde se ganan el lugar llegando o yéndose por grado conjunto:
 *   son notas de paso o vecinas, no saltos al vacío.
 * - **La melodía respira**: frases con silencios en los pulsos débiles, que es
 *   la mitad del *cantabile* de la clase 4 — lo que no corta nunca no se
 *   puede cantar.
 * - **El final es una nota larga del último acorde**, con preferencia por la
 *   fundamental: terminar en la casa.
 * - **Las guías mandan**: si se eligió la nota con la que la melodía recibe a
 *   cada acorde (el método de la clase 4), cada compás arranca ahí.
 *
 * Todo pasa en **grados de la escala** (0 = Do4, 7 = Do5) y no en semitonos —
 * con una sola excepción: los préstamos traen bemoles (el La♭ del Fm), así que
 * una nota de melodía es un grado que puede venir achatado (`NotaMelodia`).
 *
 * Sin React ni audio: se prueba con `npm run test:melodia`.
 */

import { scaleDegreeToPitch, seededRandom, mod12, MAJOR_SCALE } from "./music.ts";
import {
  clasesDelAcorde,
  raizDelAcorde,
  type AcordeDeLaSecuencia,
} from "./grados.ts";
import { HOLGURA, ubicar, type Evento } from "./pentagrama.ts";

/** El rango de la melodía, en grados: de Do4 a Mi5. Cómodo para cantar y leer. */
export const GRADO_MIN = 0;
export const GRADO_MAX = 9;
/** El centro del rango, adonde la melodía tiende a volver si se fue lejos. */
const CENTRO = 4;

/**
 * Una nota de melodía: un grado de Do mayor, quizás achatado.
 *
 * El bemol existe por los préstamos: el Fm trae La♭, que no es ningún grado de
 * Do mayor. Sólo se achatan las letras que las menores paralelas achatan — Mi,
 * La y Si — así el modelo no puede escribir un bemol que la clase no vio.
 */
export interface NotaMelodia {
  d: number;
  b?: boolean;
}

const ACHATABLES = new Set([2, 5, 6]); // Mi, La, Si

export const midiDeNota = (n: NotaMelodia): number =>
  scaleDegreeToPitch(n.d) - (n.b ? 1 : 0);

export const mismaNota = (a: NotaMelodia, b: NotaMelodia): boolean =>
  a.d === b.d && !!a.b === !!b.b;

/** De una tecla a la nota de melodía que le toca, si el modelo la puede decir. */
export function notaDeTecla(midi: number): NotaMelodia | null {
  const idx = MAJOR_SCALE.indexOf(mod12(midi));
  if (idx >= 0) return { d: Math.floor((midi - 60) / 12) * 7 + idx };
  const arriba = MAJOR_SCALE.indexOf(mod12(midi + 1));
  if (arriba < 0 || !ACHATABLES.has(arriba)) return null;
  return { d: Math.floor((midi + 1 - 60) / 12) * 7 + arriba, b: true };
}

/** De una tecla de Do mayor a su grado de melodía (0 = Do4), si lo es. */
export function gradoDeTecla(midi: number): number | null {
  const idx = MAJOR_SCALE.indexOf(mod12(midi));
  if (idx < 0) return null;
  return Math.floor((midi - 60) / 12) * 7 + idx;
}

/** ¿Esta nota es del acorde? Por clase de altura: el acorde sabe sus teclas. */
export function esDelAcorde(n: NotaMelodia, a: AcordeDeLaSecuencia): boolean {
  return clasesDelAcorde(a).has(mod12(midiDeNota(n)));
}

/**
 * Todas las notas del acorde que caen dentro del rango de la melodía —
 * incluidas las achatadas que trae un préstamo: el La♭ del Fm es candidato,
 * y es justo la nota que le pone el color.
 */
export function candidatosDelAcorde(a: AcordeDeLaSecuencia): NotaMelodia[] {
  const clases = clasesDelAcorde(a);
  const out: NotaMelodia[] = [];
  for (let d = GRADO_MIN; d <= GRADO_MAX; d++) {
    const pc = mod12(scaleDegreeToPitch(d));
    if (clases.has(pc)) out.push({ d });
    else if (ACHATABLES.has(((d % 7) + 7) % 7) && clases.has(mod12(pc - 1))) {
      out.push({ d, b: true });
    }
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
  candidatos: NotaMelodia[],
  ref: number,
  rnd: () => number,
  evitar?: NotaMelodia,
): NotaMelodia {
  const puntaje = (n: NotaMelodia) =>
    Math.abs(n.d - ref) + Math.abs(n.d - CENTRO) * 0.25;
  const orden = [...candidatos]
    .filter((n) => !evitar || !mismaNota(n, evitar) || candidatos.length === 1)
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
 * caminar hacia la de destino. El conector camina por la escala pelada: los
 * bemoles son de los acordes, no del camino.
 */
function conector(x: number, y: number, rnd: () => number): NotaMelodia {
  const salto = y - x;
  if (Math.abs(salto) === 2) return { d: x + salto / 2 };
  if (salto === 0) {
    const arriba = x + 1 <= GRADO_MAX;
    const abajo = x - 1 >= GRADO_MIN;
    if (arriba && abajo) return { d: rnd() < 0.5 ? x + 1 : x - 1 };
    return { d: arriba ? x + 1 : x - 1 };
  }
  if (Math.abs(salto) === 1) return { d: rnd() < 0.6 ? x : y };
  return { d: x + Math.sign(salto) };
}

/** La figura de cada duración, para no repetir números mágicos. */
const REDONDA = 1;
const BLANCA = 2;
const NEGRA = 4;
const CORCHEA = 8;

const nota = (n: NotaMelodia, divide: number): Evento => ({
  midis: [midiDeNota(n)],
  divide,
});
const silencio = (divide: number): Evento => ({ midis: [], divide });

/**
 * El esqueleto: la nota que recibe a cada acorde (la guía, si la hay) y la del
 * pulso 3, más la nota final. Es la misma cuenta para componer y para sugerir
 * guías: el generador siempre trabajó con el método de la clase 4, sólo que
 * ahora lo muestra.
 */
function esqueletoDe(
  acordes: AcordeDeLaSecuencia[],
  rnd: () => number,
  guias?: (NotaMelodia | null)[],
) {
  const pares: [NotaMelodia, NotaMelodia][] = [];
  let previa: NotaMelodia = guias?.[0] ?? elegirCerca(candidatosDelAcorde(acordes[0]), CENTRO, rnd);
  for (let i = 0; i < acordes.length - 1; i++) {
    const candidatos = candidatosDelAcorde(acordes[i]);
    const s0 = guias?.[i] ?? (i === 0 ? previa : elegirCerca(candidatos, previa.d, rnd));
    const s1 = elegirCerca(candidatos, s0.d, rnd, rnd() < 0.7 ? s0 : undefined);
    pares.push([s0, s1]);
    previa = s1;
  }
  const ultimo = acordes[acordes.length - 1];
  const final =
    guias?.[acordes.length - 1] ??
    (() => {
      const raiz = mod12(raizDelAcorde(ultimo));
      const esFundamental = (n: NotaMelodia) => mod12(midiDeNota(n)) === raiz;
      return [...candidatosDelAcorde(ultimo)].sort(
        (a, b) =>
          Number(esFundamental(b)) - Number(esFundamental(a)) ||
          Math.abs(a.d - previa.d) - Math.abs(b.d - previa.d),
      )[0];
    })();
  return { pares, final };
}

/** Las guías que el generador usaría: para el botón de "sugerime las guías". */
export function sugerirGuias(
  acordes: AcordeDeLaSecuencia[],
  semilla: number,
): NotaMelodia[] {
  if (acordes.length === 0) return [];
  const rnd = seededRandom(semilla * 7919 + acordes.length);
  const { pares, final } = esqueletoDe(acordes, rnd);
  return [...pares.map(([s0]) => s0), final];
}

/**
 * Compone una melodía de un compás de 4/4 por acorde.
 *
 * Determinística: la misma secuencia con la misma semilla da la misma melodía,
 * así que el servidor y el cliente dibujan lo mismo y el "otra melodía" es
 * sólo cambiar la semilla. Con `guias`, cada compás arranca en la nota
 * prometida.
 */
export function componerMelodia(
  acordes: AcordeDeLaSecuencia[],
  semilla: number,
  guias?: (NotaMelodia | null)[],
): Evento[] {
  if (acordes.length === 0) return [];
  const rnd = seededRandom(semilla * 7919 + acordes.length);
  const { pares, final } = esqueletoDe(acordes, rnd, guias);

  // La carne: cada compás conecta su esqueleto con notas de paso, con un
  // patrón rítmico sorteado. Las corcheas sólo aparecen donde caminan de
  // verdad, y las respiraciones —los silencios del cantabile— sólo en el
  // pulso débil del final del compás, donde no le sacan la nota del acorde
  // a ningún pulso fuerte.
  const eventos: Evento[] = [];
  for (let i = 0; i < pares.length; i++) {
    const [s0, s1] = pares[i];
    const siguiente = i + 1 < pares.length ? pares[i + 1][0] : final;
    const r = rnd();
    if (r < 0.18) {
      // negra negra blanca: el compás se apoya al final.
      eventos.push(nota(s0, NEGRA), nota(conector(s0.d, s1.d, rnd), NEGRA), nota(s1, BLANCA));
    } else if (r < 0.32) {
      // blanca negra negra: la primera nota se sostiene.
      eventos.push(nota(s0, BLANCA), nota(s1, NEGRA), nota(conector(s1.d, siguiente.d, rnd), NEGRA));
    } else if (r < 0.5) {
      // negra negra negra silencio: la frase respira antes del cambio.
      eventos.push(
        nota(s0, NEGRA),
        nota(conector(s0.d, s1.d, rnd), NEGRA),
        nota(s1, NEGRA),
        silencio(NEGRA),
      );
    } else {
      // Cuatro pulsos. Uno de los conectores puede volverse un par de
      // corcheas, si el terreno lo permite.
      const c1 = conector(s0.d, s1.d, rnd);
      const c3 = conector(s1.d, siguiente.d, rnd);
      const parDeCorcheas = (x: number, y: number): [NotaMelodia, NotaMelodia] | null => {
        const salto = y - x;
        if (Math.abs(salto) === 3) {
          const dir = Math.sign(salto);
          return [{ d: x + dir }, { d: x + 2 * dir }];
        }
        if (salto === 0 && x + 1 <= GRADO_MAX && x - 1 >= GRADO_MIN)
          return [{ d: x + 1 }, { d: x - 1 }];
        return null;
      };
      const donde = rnd() < 0.5 ? 1 : 3;
      const par =
        rnd() < 0.45
          ? donde === 1
            ? parDeCorcheas(s0.d, s1.d)
            : parDeCorcheas(s1.d, siguiente.d)
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
 * Un evento de la melodía escrita: una nota con su figura, o un silencio.
 *
 * Desde la clase 4 el ritmo es parte del ejercicio — sin figura ni silencios
 * no hay *cantabile* — así que la escritura dejó de ser una nota por pulso:
 * cada entrada trae su figura, y los silencios se escriben como en el papel.
 */
export interface EventoEscrito {
  nota: NotaMelodia | null;
  /** En cuántas partes divide a la redonda: 2 blanca, 4 negra, 8 corchea. */
  divide: number;
}

/** Cuánto lleva escrito, en redondas (= compases de 4/4). Fracciones binarias: exacto. */
export function duracionEscrita(escrita: EventoEscrito[]): number {
  return escrita.reduce((s, e) => s + 1 / e.divide, 0);
}

/**
 * Dónde está parada la escritura: en qué compás, cuánto va del compás, si ya
 * está en el último (donde sólo entra la redonda final) y si terminó.
 */
export function posicionEscrita(escrita: EventoEscrito[], compases: number) {
  const t = duracionEscrita(escrita);
  const compas = Math.min(Math.floor(t + HOLGURA), compases - 1);
  return {
    compas,
    dentro: t - compas,
    esUltimo: compas >= compases - 1,
    completa: t >= compases - HOLGURA,
  };
}

/**
 * ¿Esta figura entra donde va la escritura? Una figura no cruza la barra de
 * compás — si el compás va por la mitad, la blanca justo lo cierra y la
 * redonda no entra — y en el último compás sólo entra la redonda del final.
 */
export function figuraEntra(
  escrita: EventoEscrito[],
  divide: number,
  compases: number,
): boolean {
  const { dentro, esUltimo, completa } = posicionEscrita(escrita, compases);
  if (completa) return false;
  if (esUltimo) return divide === REDONDA && dentro < HOLGURA;
  return 1 / divide <= 1 - dentro + HOLGURA;
}

/** Los eventos de la melodía escrita, para dibujarla y tocarla. */
export function eventosEscritos(escrita: EventoEscrito[]): Evento[] {
  return escrita.map((e) => (e.nota ? nota(e.nota, e.divide) : silencio(e.divide)));
}

export type Veredicto = "acorde" | "paso" | "aire";

const COMPAS_4_4 = { numerador: 4, denominador: 4 };

/**
 * Qué es cada nota de la melodía escrita; los silencios no se juzgan (null).
 *
 * No corrige, puntúa — como el enlace: "aire" no es un error, es una nota que
 * ni pertenece al acorde ni llegó caminando, y el aviso es para que se escuche
 * por qué suena más flotante que las otras. El paso se mide en semitonos (uno
 * o dos) para que valga también con los bemoles de los préstamos: de La♭ a
 * Sol se camina igual que de La a Sol. Un silencio corta la caminata: después
 * de respirar se arranca frase nueva, y una ajena no llega caminando desde
 * el otro lado de un silencio.
 */
export function analizarEscrita(
  escrita: EventoEscrito[],
  acordes: AcordeDeLaSecuencia[],
): (Veredicto | null)[] {
  const ubicadas = ubicar(eventosEscritos(escrita), COMPAS_4_4);
  return escrita.map((e, i) => {
    if (!e.nota) return null;
    const compas = Math.min(ubicadas[i].compas, acordes.length - 1);
    if (esDelAcorde(e.nota, acordes[compas])) return "acorde";
    const midi = midiDeNota(e.nota);
    const vecino = (j: number) => {
      const v = escrita[j];
      if (!v || !v.nota) return null;
      return Math.abs(midiDeNota(v.nota) - midi);
    };
    const antes = vecino(i - 1);
    const despues = vecino(i + 1);
    const paso = (x: number | null) => x !== null && x >= 1 && x <= 2;
    return paso(antes) || paso(despues) ? "paso" : "aire";
  });
}

/** El resumen del veredicto: los números que se muestran al completar. */
export function resumenDeEscrita(
  escrita: EventoEscrito[],
  acordes: AcordeDeLaSecuencia[],
  guias?: (NotaMelodia | null)[],
) {
  const veredictos = analizarEscrita(escrita, acordes);
  const ubicadas = ubicar(eventosEscritos(escrita), COMPAS_4_4);

  let fuertes = 0;
  let fuertesBien = 0;
  const primeraDelCompas = new Map<number, number>();
  escrita.forEach((e, i) => {
    if (!e.nota) return;
    const u = ubicadas[i];
    if (Math.abs(u.dentro) < HOLGURA || Math.abs(u.dentro - 0.5) < HOLGURA) {
      fuertes++;
      if (veredictos[i] === "acorde") fuertesBien++;
    }
    if (!primeraDelCompas.has(u.compas)) primeraDelCompas.set(u.compas, i);
  });

  // Los aterrizajes: en cada compás con guía elegida, ¿la primera nota que
  // suena es la prometida? Es el corazón del método de la clase 4.
  let aterrizajes = 0;
  let aterrizajesBien = 0;
  guias?.forEach((g, c) => {
    if (!g) return;
    const i = primeraDelCompas.get(c);
    if (i === undefined) return;
    aterrizajes++;
    const n = escrita[i].nota!;
    if (mismaNota(n, g)) aterrizajesBien++;
  });

  const notas = escrita.filter((e) => e.nota);
  const ultima = notas.at(-1)?.nota ?? null;
  const ultimo = acordes[acordes.length - 1];
  return {
    veredictos,
    fuertes,
    fuertesBien,
    deAire: veredictos.filter((v) => v === "aire").length,
    /** ¿Hay silencios? Sin respirar no hay cantabile. */
    respira: escrita.some((e) => !e.nota),
    /** ¿Hay al menos dos duraciones distintas entre las notas? */
    varia: new Set(notas.map((e) => e.divide)).size >= 2,
    aterrizajes,
    aterrizajesBien,
    terminaEnAcorde: ultima !== null && esDelAcorde(ultima, ultimo),
    terminaEnCasa:
      ultima !== null && mod12(midiDeNota(ultima)) === mod12(raizDelAcorde(ultimo)),
  };
}
