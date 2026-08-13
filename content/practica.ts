import { LESSONS } from "@/content";
import type {
  CompasesBlock,
  ExerciseBlock,
  FigurasBlock,
  HandsBlock,
  Lesson,
  NomenclatureBlock,
  SecuenciaBlock,
} from "@/content/types";

/**
 * El catálogo de la sala de práctica.
 *
 * Está agrupado por **tipo de ejercicio y no por clase**. Cuando había una sola
 * clase, la sala era un reflejo fiel de esa clase y daba igual; con dos ya no,
 * porque para practicar acordes querés todos los acordes juntos y no ir a
 * buscar la mitad a la clase 1 y la otra mitad a la 2.
 *
 * Igual se llena sola: sale de recorrer `LESSONS` y ver qué bloques aparecieron.
 * Agregar una clase nueva no obliga a tocar esto — sigue valiendo la regla de
 * oro. Sólo hay que sumar acá si aparece un *tipo* de bloque que no existía.
 */

export type AreaId = "manos" | "acordes" | "tiempo" | "lectura";

export interface Area {
  id: AreaId;
  titulo: string;
  emoji: string;
  bajada: string;
}

/**
 * El orden es el de una rutina, no el de las clases: primero el cuerpo, después
 * la cabeza. Si vas a practicar media hora, arrancás por arriba.
 */
export const AREAS: Area[] = [
  {
    id: "manos",
    titulo: "Las manos",
    emoji: "🏃",
    bajada:
      "Para empezar, siempre. Son los que necesitan el instrumento y los dedos, no la cabeza.",
  },
  {
    id: "acordes",
    titulo: "Los acordes",
    emoji: "🎹",
    bajada:
      "El corazón de todo. Armarlos, girarlos, reconocerlos y encadenarlos — se puede sin el piano al lado.",
  },
  {
    id: "tiempo",
    titulo: "El tiempo",
    emoji: "⏱️",
    bajada:
      "Figuras, compases y subdivisión. Son de escuchar y contar más que de tocar.",
  },
  {
    id: "lectura",
    titulo: "Leer y nombrar",
    emoji: "🔤",
    bajada: "Los de velocidad: que el nombre salga antes de pensarlo.",
  },
];

/** Las herramientas que no vienen con datos de una clase: son siempre iguales. */
export type HerramientaSuelta =
  | "laboratorio"
  | "identificador"
  | "figuras"
  | "compases"
  | "semitonos";

export type Entrada =
  | { tipo: "exercise"; area: AreaId; lesson: Lesson; block: ExerciseBlock }
  | { tipo: "hands"; area: AreaId; lesson: Lesson; block: HandsBlock }
  | { tipo: "secuencia"; area: AreaId; lesson: Lesson; block: SecuenciaBlock }
  | { tipo: "nomenclature"; area: AreaId; lesson: Lesson; block: NomenclatureBlock }
  | { tipo: "suelta"; area: AreaId; lesson: Lesson; id: HerramientaSuelta };

/** En qué área cae cada tipo de bloque. */
const AREA_DE: Record<string, AreaId> = {
  exercise: "manos",
  hands: "manos",
  "chord-lab": "acordes",
  secuencia: "acordes",
  figuras: "tiempo",
  compases: "tiempo",
  nomenclature: "lectura",
  semitonos: "lectura",
};

/**
 * Todo lo que hay para practicar, en orden de clase.
 *
 * Las herramientas que no dependen de datos de la clase (el laboratorio, el
 * árbol de figuras) aparecen una sola vez, con la clase donde se vieron por
 * primera vez: en la sala no interesa que el laboratorio salió en la 1 y en la
 * 2, interesa que existe y con qué acordes.
 */
export function catalogo(): Entrada[] {
  const out: Entrada[] = [];
  const yaEsta = new Set<string>();
  const sumarSuelta = (id: HerramientaSuelta, lesson: Lesson) => {
    if (yaEsta.has(id)) return;
    yaEsta.add(id);
    out.push({ tipo: "suelta", area: AREA_DE[id] ?? "acordes", lesson, id });
  };

  for (const lesson of LESSONS) {
    for (const block of lesson.blocks) {
      const area = AREA_DE[block.kind];
      if (!area) continue;
      switch (block.kind) {
        case "exercise":
          out.push({ tipo: "exercise", area, lesson, block });
          break;
        case "hands":
          out.push({ tipo: "hands", area, lesson, block });
          break;
        case "secuencia":
          out.push({ tipo: "secuencia", area, lesson, block });
          break;
        case "nomenclature":
          if (!yaEsta.has("nomenclature")) {
            yaEsta.add("nomenclature");
            out.push({ tipo: "nomenclature", area, lesson, block });
          }
          break;
        case "chord-lab":
          sumarSuelta("laboratorio", lesson);
          // El identificador es el revés del dictado: aparece con el primer
          // laboratorio aunque no sea un bloque de ninguna clase.
          sumarSuelta("identificador", lesson);
          break;
        case "figuras":
          sumarSuelta("figuras", lesson);
          break;
        case "compases":
          sumarSuelta("compases", lesson);
          break;
        case "semitonos":
          sumarSuelta("semitonos", lesson);
          break;
      }
    }
  }
  return out;
}

/** Los acordes que se vieron hasta ahora, que son los que la sala ofrece. */
export function acordesAprendidos(): string[] {
  const ids = new Set<string>();
  for (const lesson of LESSONS) {
    for (const block of lesson.blocks) {
      if (block.kind === "chord-lab") block.qualities.forEach((q) => ids.add(q));
    }
  }
  return [...ids];
}

/** Todas las progresiones que aparecieron, para el ejercicio de enlace. */
export function progresiones() {
  return catalogo().filter((e) => e.tipo === "secuencia");
}
