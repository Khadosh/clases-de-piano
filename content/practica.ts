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

/** Lo que comparten todas: dónde va, de qué clase salió y cómo se llama su URL. */
interface Comun {
  area: AreaId;
  lesson: Lesson;
  /** El pedazo de URL. Estable: es lo que alguien se guarda en favoritos. */
  slug: string;
  titulo: string;
  bajada: string;
  emoji: string;
}

export type Entrada = Comun &
  (
    | { tipo: "exercise"; block: ExerciseBlock }
    | { tipo: "hands"; block: HandsBlock }
    | { tipo: "secuencia"; block: SecuenciaBlock }
    | { tipo: "nomenclature"; block: NomenclatureBlock }
    | { tipo: "suelta"; id: HerramientaSuelta }
  );

/**
 * La ficha de las herramientas sueltas.
 *
 * Las que salen de un bloque de clase traen su propio título y su bajada de
 * allá; éstas no son de ninguna clase en particular, así que se escriben acá.
 */
const FICHAS: Record<HerramientaSuelta, { titulo: string; bajada: string; emoji: string }> = {
  laboratorio: {
    titulo: "El laboratorio de acordes",
    emoji: "🧪",
    bajada:
      "Fundamental, receta e inversión en el mismo teclado. Con el dictado prendido sale un cifrado y lo armás apretando teclas —o tocándolo en el piano, si tenés uno enchufado— y te dice si está bien, y si le erraste sólo al bajo también.",
  },
  identificador: {
    titulo: "¿Qué acorde armé?",
    emoji: "🔎",
    bajada:
      "El revés del dictado: tocás teclas y te dice cómo se llama eso. Sirve para encontrar inversiones sin buscarlas.",
  },
  figuras: {
    titulo: "El árbol de las figuras",
    emoji: "🌳",
    bajada:
      "Tocá una fila y después la de abajo: las cuatro duran lo mismo, sólo se parte más fino.",
  },
  compases: {
    titulo: "Compases simples y compuestos",
    emoji: "🥁",
    bajada:
      "Elegí un compás y escuchá dónde caen los golpes. El botón de la constante pasa de simple a compuesto sin cambiar las notas.",
  },
  semitonos: {
    titulo: "Los semitonos de la octava",
    emoji: "📏",
    bajada:
      "Dónde no hay tecla negra en el medio, que es de donde sale todo lo demás.",
  },
};

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
 *
 * Cada una se lleva su `slug`, que es su URL. **Tiene que ser estable**: es lo
 * que alguien deja abierto en el teléfono arriba del piano. Por eso el número
 * de clase se agrega sólo cuando hay repetidos, y no siempre — si no, publicar
 * la clase 3 cambiaría la dirección de todo lo de la 1.
 */
export function catalogo(): Entrada[] {
  const out: Entrada[] = [];
  const yaEsta = new Set<string>();
  const usados = new Set<string>();

  /** Si el slug ya está tomado, lo desempata la clase; si no, se queda pelado. */
  const unico = (base: string, lesson: Lesson) => {
    if (!usados.has(base)) {
      usados.add(base);
      return base;
    }
    let slug = `${base}-clase-${lesson.n}`;
    let n = 2;
    while (usados.has(slug)) slug = `${base}-clase-${lesson.n}-${n++}`;
    usados.add(slug);
    return slug;
  };

  const sumarSuelta = (id: HerramientaSuelta, lesson: Lesson) => {
    if (yaEsta.has(id)) return;
    yaEsta.add(id);
    out.push({
      tipo: "suelta",
      area: AREA_DE[id] ?? "acordes",
      lesson,
      id,
      slug: unico(id, lesson),
      ...FICHAS[id],
    });
  };

  for (const lesson of LESSONS) {
    for (const block of lesson.blocks) {
      const area = AREA_DE[block.kind];
      if (!area) continue;
      switch (block.kind) {
        case "exercise":
          out.push({
            tipo: "exercise",
            area,
            lesson,
            block,
            slug: unico("posiciones", lesson),
            titulo: block.title,
            bajada: block.intro ?? "",
            emoji: "🏃",
          });
          break;
        case "hands":
          out.push({
            tipo: "hands",
            area,
            lesson,
            block,
            slug: unico("manos", lesson),
            titulo: block.title,
            bajada: block.intro ?? "",
            emoji: "🤲",
          });
          break;
        case "secuencia":
          out.push({
            tipo: "secuencia",
            area,
            lesson,
            block,
            slug: unico("enlace", lesson),
            titulo: "Enlazar una progresión",
            emoji: "🔗",
            bajada:
              "Los acordes vienen en estado fundamental y hay que girarlos para moverse lo menos posible. No hay una única respuesta: el objetivo es bajar el número.",
          });
          break;
        case "nomenclature":
          if (!yaEsta.has("nomenclature")) {
            yaEsta.add("nomenclature");
            out.push({
              tipo: "nomenclature",
              area,
              lesson,
              block,
              slug: unico("cifrado", lesson),
              titulo: "Cifrado inglés a toda velocidad",
              emoji: "🔤",
              bajada:
                "Del símbolo a las notas y de las notas al símbolo, contra el reloj de tu propia paciencia.",
            });
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
  // Al final se acomoda por área, que es el orden de una rutina y el orden en
  // que se ve el índice. Sin esto, el "siguiente" de cada ejercicio salta de
  // área en área siguiendo el orden en que aparecieron en las clases, que arriba
  // del piano no significa nada.
  const orden = (e: Entrada) => AREAS.findIndex((a) => a.id === e.area);
  return out
    .map((e, i) => ({ e, i }))
    .sort((a, b) => orden(a.e) - orden(b.e) || a.i - b.i)
    .map(({ e }) => e);
}

/** El ejercicio de una URL, y sus vecinos para el "siguiente" del pie. */
export function buscar(slug: string) {
  const todo = catalogo();
  const i = todo.findIndex((e) => e.slug === slug);
  if (i < 0) return null;
  return {
    entrada: todo[i],
    anterior: i > 0 ? todo[i - 1] : null,
    siguiente: i < todo.length - 1 ? todo[i + 1] : null,
  };
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
