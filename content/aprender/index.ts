/**
 * Las secciones «Aprender»: el análisis y la práctica por capas de cada
 * partitura que los tiene. Sumar una es un archivo más en esta carpeta y una
 * línea acá: la página, el enlace desde la partitura y el estante del índice
 * salen solos. Una partitura que no está acá no muestra la sección.
 */

import { PASOS_DEL_ANALISIS, esDelCampo, type AcordeDeAfuera } from "@/lib/analisis";
import { cifradoDeVoicing, gradoEnMayor, type CompasDeCapa, type Voicing } from "@/lib/capas";
import { BLACKBIRD } from "./blackbird";
import { CANON_EN_RE } from "./canon-en-re";
import { HERE_COMES_THE_SUN } from "./here-comes-the-sun";
import { ODA_A_LA_ALEGRIA } from "./oda-a-la-alegria";
import type { Aprendizaje, Capa } from "./tipos";

export type { Aprendizaje, Capa } from "./tipos";

export const APRENDER: Aprendizaje[] = [HERE_COMES_THE_SUN, BLACKBIRD, ODA_A_LA_ALEGRIA, CANON_EN_RE];

export const aprenderDe = (slug: string) => APRENDER.find((a) => a.slug === slug) ?? null;

export const rutaDeAprender = (slug: string) => `/partituras/${slug}/aprender`;

/** Lo que suena en una capa, en todas sus listas: el loop y el paso previo. */
export function compasesDeCapa(k: Capa) {
  switch (k.tipo) {
    case "acordes":
      return [k.vuelta];
    case "riff":
      return [k.compases, ...(k.previo ? [k.previo.compases] : [])];
    case "ritmo":
      return [k.compases.map((c) => ({ grupos: c.grupos, eventos: [] }))];
    case "progresion":
      return [k.compases];
    case "todo":
      return [k.secciones.flatMap((s) => s.compases)];
    default: {
      const nunca: never = k;
      return nunca;
    }
  }
}

/**
 * Todos los acordes que se practican en las capas, uno por cifrado y en el
 * orden en que aparecen: los de las vueltas y los de las listas de acordes.
 */
export function acordesDe(a: Aprendizaje): { cifrado: string; voicing: Voicing }[] {
  const vistos = new Map<string, Voicing>();
  const sumar = (v: Voicing | undefined) => {
    if (v && !vistos.has(cifradoDeVoicing(v))) vistos.set(cifradoDeVoicing(v), v);
  };
  for (const k of a.capas) {
    if (k.tipo === "acordes" || k.tipo === "progresion") k.acordes.forEach(sumar);
    for (const lista of compasesDeCapa(k)) lista.forEach((c: CompasDeCapa) => sumar(c.voicing));
  }
  return [...vistos].map(([cifrado, voicing]) => ({ cifrado, voicing }));
}

/** Para qué está el acorde de un compás, si no es de casa: lo que la capa muestra al lado del acorde. */
export function porQueAfuera(a: Aprendizaje, c: CompasDeCapa): AcordeDeAfuera | null {
  if (!c.voicing || esDelCampo(c.voicing, a.tonica)) return null;
  return a.deAfuera[cifradoDeVoicing(c.voicing)] ?? null;
}

export interface RenglonDelCuadro {
  cifrado: string;
  voicing: Voicing;
  /** El grado: el del campo si es de casa, el escrito si no. */
  romano: string;
  /** Null si es del campo. */
  afuera: AcordeDeAfuera | null;
}

/** El cuadro del análisis: cada acorde que se practica, del campo (con su grado) o de afuera (con qué es). */
export const cuadroDe = (a: Aprendizaje): RenglonDelCuadro[] =>
  acordesDe(a).map(({ cifrado, voicing }) => {
    const afuera = esDelCampo(voicing, a.tonica) ? null : (a.deAfuera[cifrado] ?? null);
    return { cifrado, voicing, romano: afuera?.romano ?? gradoEnMayor(voicing, a.tonica).romano, afuera };
  });

/**
 * Lo que falta para que la sección cumpla lo que promete: los seis pasos con
 * su respuesta, al menos una capa antes de todo junto, todo junto al final, y
 * cada capa con algo para tocar en loop. El tipo ya lo pide; esto agarra lo
 * que el tipo deja pasar (un paso con la respuesta vacía, una capa sin
 * compases, un `as` de más). Vacío es que está bien.
 */
export function faltasDe(a: Aprendizaje): string[] {
  const faltas: string[] = [];
  for (const { clave } of PASOS_DEL_ANALISIS) {
    const paso = a.analisis?.[clave];
    if (!paso) faltas.push(`falta el paso «${clave}»`);
    else if (!paso.respuesta?.trim() || !paso.simple?.length) faltas.push(`el paso «${clave}» está vacío`);
  }
  if (!a.capas?.length) faltas.push("no tiene capas");
  else {
    if (a.capas.at(-1)!.tipo !== "todo") faltas.push("la última capa no es «todo junto»");
    if (a.capas.length < 2) faltas.push("no hay ninguna capa antes de «todo junto»");
    a.capas.forEach((k, i) => {
      const listas = compasesDeCapa(k);
      if (!listas.length || listas.some((l) => !l.length)) faltas.push(`la capa ${i + 1} («${k.titulo}») no tiene nada para el loop`);
    });
    const acordes = acordesDe(a);
    for (const { cifrado, voicing } of acordes)
      if (!esDelCampo(voicing, a.tonica) && !a.deAfuera?.[cifrado]) faltas.push(`el ${cifrado} no es de ${a.tonalidad} y no dice para qué está`);
    for (const cifrado of Object.keys(a.deAfuera ?? {})) {
      const v = acordes.find((x) => x.cifrado === cifrado)?.voicing;
      if (!v) faltas.push(`el ${cifrado} se explica y no está en ninguna capa`);
      else if (esDelCampo(v, a.tonica)) faltas.push(`el ${cifrado} se explica como de afuera y es de ${a.tonalidad}`);
    }
  }
  return faltas;
}
