import type { Lesson } from "@/content/types";
import { slugOf } from "@/content/types";
import clase01 from "@/content/lessons/clase-01";

/**
 * El índice de clases. Para agregar una clase nueva: crear el archivo en
 * content/lessons/ y sumarlo acá. Nada más.
 */
export const LESSONS: Lesson[] = [clase01].sort((a, b) => a.n - b.n);

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
