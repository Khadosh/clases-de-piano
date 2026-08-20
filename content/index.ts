import type { Lesson } from "@/content/types";
import { slugOf } from "@/content/types";
import clase01 from "@/content/lessons/clase-01";
import clase02 from "@/content/lessons/clase-02";
import clase03 from "@/content/lessons/clase-03";

/**
 * El índice de clases. Para agregar una clase nueva: crear el archivo en
 * content/lessons/ y sumarlo acá. Nada más.
 */
export const LESSONS: Lesson[] = [clase01, clase02, clase03].sort((a, b) => a.n - b.n);

export const lessonBySlug = (slug: string) =>
  LESSONS.find((l) => slugOf(l) === slug);

export const latestLesson = () => LESSONS[LESSONS.length - 1];

export { slugOf };

/** Formato "miércoles 5 de agosto", en castellano y sin sorpresas de timezone. */
export function formatDate(iso: string, opts: { weekday?: boolean } = {}) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("es-AR", {
    weekday: opts.weekday ? "long" : undefined,
    day: "numeric",
    month: "long",
    year: y === new Date().getUTCFullYear() ? undefined : "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * De qué se puede examinar una clase, sacado de sus propios bloques. Así una
 * clase nueva trae su examen sin que haya que escribir preguntas a mano.
 */
export function temarioDe(lesson: Lesson) {
  const qualityIds = new Set<string>();
  let inversiones = false;
  let semitonos = false;
  let figuras = false;
  let compases = false;
  let funciones = false;
  for (const b of lesson.blocks) {
    if (b.kind === "chord-lab") {
      b.qualities.forEach((q) => qualityIds.add(q));
      if (b.inversiones) inversiones = true;
    }
    if (b.kind === "semitonos") semitonos = true;
    if (b.kind === "figuras") figuras = true;
    if (b.kind === "compases") compases = true;
    if (b.kind === "funciones") {
      funciones = true;
      // El campo armónico toca todos estos aunque no haya chord-lab: las
      // tríadas de los siete grados y las cuatriadas que la clase nombró.
      for (const q of ["maj", "min", "dim", "maj7", "min7", "dom7", "m7b5"]) {
        qualityIds.add(q);
      }
    }
  }
  return { qualityIds: [...qualityIds], inversiones, semitonos, figuras, compases, funciones };
}

export interface Stats {
  clases: number;
  /** Miércoles consecutivos con clase, contando desde la última hacia atrás. */
  racha: number;
  acordes: number;
  ejercicios: number;
  desde: string | null;
}

export function computeStats(lessons: Lesson[], acordes: number): Stats {
  if (lessons.length === 0)
    return { clases: 0, racha: 0, acordes, ejercicios: 0, desde: null };

  const days = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;
  const sorted = [...lessons].sort((a, b) => days(a.date) - days(b.date));

  let racha = 1;
  for (let i = sorted.length - 1; i > 0; i--) {
    const gap = days(sorted[i].date) - days(sorted[i - 1].date);
    if (gap === 7) racha++;
    else break;
  }

  const ejercicios = lessons.reduce(
    (acc, l) =>
      acc +
      l.blocks.filter((b) => b.kind === "exercise" || b.kind === "hands").length,
    0,
  );

  return {
    clases: lessons.length,
    racha,
    acordes,
    ejercicios,
    desde: sorted[0].date,
  };
}
