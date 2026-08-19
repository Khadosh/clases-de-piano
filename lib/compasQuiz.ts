import {
  type Compas,
  type Figura,
  duracionDe,
  duracionDeCompas,
  figuraQueDivide,
} from "./ritmo.ts";

/**
 * Las rondas de los dos ejercicios de compases: ponerle el número a un compás
 * lleno, y completar el que le falta una figura.
 *
 * Sale todo de la misma idea de `lib/ritmo.ts` — el compás es un presupuesto y
 * las figuras lo gastan — así que acá no hay tabla de casos: se llena un compás
 * con figuras al azar que cierren justo, y las opciones equivocadas se eligen
 * para que **la duración sola decida**. Por eso los hermanos (3/4 y 6/8, que
 * duran lo mismo) no aparecen nunca juntos como opciones: distinguirlos pide
 * escuchar dónde caen los golpes, no sumar, y ese ejercicio es el de la máquina
 * de compases.
 *
 * Sin React ni azar escondido: todas reciben el `azar` de afuera, así que se
 * prueban con un generador fijo en `npm run test:ritmo`.
 */

export interface FiguraPuesta {
  figura: Figura;
  puntillo: boolean;
}

/** Los compases con los que se juega: los de la clase y sus vecinos. */
export const COMPASES_DEL_QUIZ: Compas[] = [
  { numerador: 2, denominador: 4 },
  { numerador: 3, denominador: 4 },
  { numerador: 4, denominador: 4 },
  { numerador: 3, denominador: 8 },
  { numerador: 6, denominador: 8 },
];

/** Con qué se puede llenar: de la blanca a la corchea, con y sin puntillo. */
const LADRILLOS: FiguraPuesta[] = [
  { figura: figuraQueDivide(2)!, puntillo: false },
  { figura: figuraQueDivide(4)!, puntillo: true },
  { figura: figuraQueDivide(4)!, puntillo: false },
  { figura: figuraQueDivide(8)!, puntillo: false },
];

export const duracionPuesta = (f: FiguraPuesta) =>
  duracionDe(f.figura, f.puntillo);

export const sumaDe = (figuras: FiguraPuesta[]) =>
  figuras.reduce((s, f) => s + duracionPuesta(f), 0);

/**
 * Llena un compás con figuras al azar, cerrando justo.
 *
 * Siempre termina porque la corchea está en el pozo y todo lo demás dura un
 * múltiplo de corchea: lo que falte, en el peor de los casos, se llena de
 * corcheas. Se descartan las manos aburridas (menos de tres figuras, o todas
 * iguales): un compás de una sola redonda no enseña a sumar.
 */
export function llenarCompas(compas: Compas, azar: () => number): FiguraPuesta[] {
  const total = duracionDeCompas(compas);
  for (let intento = 0; intento < 50; intento++) {
    const puestas: FiguraPuesta[] = [];
    let falta = total;
    while (falta > 1e-9) {
      const caben = LADRILLOS.filter((l) => duracionPuesta(l) <= falta + 1e-9);
      puestas.push(caben[Math.floor(azar() * caben.length)]);
      falta = total - sumaDe(puestas);
    }
    const distintas = new Set(puestas.map(duracionPuesta)).size;
    // Dos figuras distintas alcanzan, y tres iguales también (3/8 son tres
    // corcheas y no hay forma más interesante de llenarlo). Lo que no va es
    // una figura sola ni un compás eterno.
    if (
      puestas.length >= 2 &&
      puestas.length <= 7 &&
      (distintas >= 2 || puestas.length >= 3)
    ) {
      return puestas;
    }
  }
  // Con 50 intentos siempre salió algo; esto es el paracaídas.
  return [
    { figura: figuraQueDivide(4)!, puntillo: false },
    ...llenarConCorcheas(total - 0.25),
  ];
}

const llenarConCorcheas = (falta: number): FiguraPuesta[] =>
  Array.from({ length: Math.round(falta * 8) }, () => ({
    figura: figuraQueDivide(8)!,
    puntillo: false,
  }));

export interface RondaNumero {
  figuras: FiguraPuesta[];
  compas: Compas;
  /** Cuatro, mezcladas, con duraciones todas distintas: la cuenta decide. */
  opciones: Compas[];
}

export function rondaNumero(azar: () => number): RondaNumero {
  const compas = COMPASES_DEL_QUIZ[Math.floor(azar() * COMPASES_DEL_QUIZ.length)];
  const figuras = llenarCompas(compas, azar);
  // Una opción por duración distinta: si la correcta es 6/8, su hermano 3/4 no
  // puede aparecer, porque los dos cerrarían la cuenta y habría dos correctas.
  const porDuracion = new Map<number, Compas[]>();
  for (const c of COMPASES_DEL_QUIZ) {
    const d = duracionDeCompas(c);
    porDuracion.set(d, [...(porDuracion.get(d) ?? []), c]);
  }
  const opciones: Compas[] = [compas];
  for (const [d, candidatos] of porDuracion) {
    if (Math.abs(d - duracionDeCompas(compas)) < 1e-9) continue;
    opciones.push(candidatos[Math.floor(azar() * candidatos.length)]);
  }
  return { figuras, compas, opciones: mezclar(opciones, azar) };
}

export interface RondaCompletar {
  compas: Compas;
  /** Lo que ya está puesto en el compás. */
  figuras: FiguraPuesta[];
  /** La que falta para cerrarlo. */
  falta: FiguraPuesta;
  /** Cuatro figuras, mezcladas, con duraciones todas distintas. */
  opciones: FiguraPuesta[];
}

export function rondaCompletar(azar: () => number): RondaCompletar {
  const compas = COMPASES_DEL_QUIZ[Math.floor(azar() * COMPASES_DEL_QUIZ.length)];
  const llenas = llenarCompas(compas, azar);
  const cual = Math.floor(azar() * llenas.length);
  const falta = llenas[cual];
  const figuras = llenas.filter((_, i) => i !== cual);
  const opciones: FiguraPuesta[] = [falta];
  for (const l of mezclar(LADRILLOS, azar)) {
    if (opciones.length >= 4) break;
    if (opciones.some((o) => Math.abs(duracionPuesta(o) - duracionPuesta(l)) < 1e-9)) continue;
    opciones.push(l);
  }
  return { compas, figuras, falta, opciones: mezclar(opciones, azar) };
}

export const nombreDeOpcion = (c: Compas) => `${c.numerador}/${c.denominador}`;

const NUMS: Record<number, string> = { 2: "dos", 3: "tres", 4: "cuatro", 5: "cinco", 6: "seis" };

/** "blanca + negra + dos corcheas", para contar una resolución. */
export function enPalabras(fs: FiguraPuesta[]): string {
  const partes: string[] = [];
  let i = 0;
  while (i < fs.length) {
    let j = i;
    while (
      j < fs.length &&
      fs[j].figura.id === fs[i].figura.id &&
      fs[j].puntillo === fs[i].puntillo
    ) {
      j++;
    }
    const n = j - i;
    const f = fs[i];
    const nombre = n === 1 ? f.figura.nombre : f.figura.plural;
    const conPuntillo = f.puntillo ? " con puntillo" : "";
    partes.push(n === 1 ? `${nombre}${conPuntillo}` : `${NUMS[n] ?? n} ${nombre}${conPuntillo}`);
    i = j;
  }
  return partes.join(" + ");
}

function mezclar<T>(lista: T[], azar: () => number): T[] {
  const out = [...lista];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Un generador chiquito y determinista, para que la primera ronda sea la misma
 * en el servidor y en el cliente (si no, React se queja de que el HTML no
 * coincide) y para que los tests den siempre lo mismo.
 */
export function azarSembrado(semilla: number): () => number {
  let x = semilla || 1;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}
