/**
 * Las secciones «Aprender»: el análisis y la práctica por capas de cada
 * partitura que los tiene. Sumar una es un archivo más en esta carpeta y una
 * línea acá: la página, el enlace desde la partitura y el estante del índice
 * salen solos. Una partitura que no está acá no muestra la sección.
 */

import { PASOS_DEL_ANALISIS } from "@/lib/analisis";
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
  }
  return faltas;
}
