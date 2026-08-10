import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LESSONS, formatDate, lessonBySlug, slugOf, temarioDe } from "@/content";
import { BlockView, anchorDe } from "@/components/Blocks";
import Examen from "@/components/Examen";

export function generateStaticParams() {
  return LESSONS.map((l) => ({ slug: slugOf(l) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lesson = lessonBySlug(slug);
  if (!lesson) return { title: "Clase" };
  return {
    title: `Clase ${lesson.n} · ${lesson.title}`,
    description: lesson.summary,
  };
}

export default async function ClasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = lessonBySlug(slug);
  if (!lesson) notFound();

  const idx = LESSONS.findIndex((l) => l.n === lesson.n);
  const anterior = LESSONS[idx - 1];
  const siguiente = LESSONS[idx + 1];
  const secciones = lesson.blocks.filter((b) => b.kind === "section");
  const temario = temarioDe(lesson);

  return (
    <article className="pt-10">
      <header className="mb-12">
        <Link
          href="/clases"
          className="text-sm text-humo transition hover:text-tiza"
        >
          ← todas las clases
        </Link>
        <p className="mt-6 mb-2 font-mono text-sm text-sol">
          Clase {String(lesson.n).padStart(2, "0")} ·{" "}
          {formatDate(lesson.date, { weekday: true })}
        </p>
        <h1 className="font-display text-5xl leading-[1] font-black tracking-tight sm:text-6xl">
          {lesson.title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-humo">
          {lesson.summary}
        </p>
        <div className="mt-5 flex flex-wrap gap-1.5">
          {lesson.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-borde px-3 py-1 text-xs text-humo"
            >
              {t}
            </span>
          ))}
        </div>
      </header>

      {/* El índice sale solo de los bloques `section`. */}
      {secciones.length > 1 && (
        <nav className="card mb-12 px-6 py-5">
          <p className="mb-3 text-xs tracking-[0.2em] text-humo uppercase">
            En esta clase
          </p>
          <ol className="flex flex-wrap gap-2">
            {secciones.map((s) => (
              <li key={s.title}>
                <a
                  href={`#${anchorDe(s.title)}`}
                  className="flex items-center gap-2 rounded-full bg-carta-2 px-4 py-2 text-sm font-semibold transition hover:bg-borde"
                >
                  <span>{s.emoji}</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="space-y-12">
        {lesson.blocks.map((block, i) => (
          <BlockView key={i} block={block} />
        ))}
      </div>

      {temario.qualityIds.length > 0 && (
        <section className="mt-16">
          <Examen {...temario} />
        </section>
      )}

      {lesson.homework && lesson.homework.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display mb-4 text-2xl font-bold">
            Para el próximo miércoles
          </h2>
          <ul className="card space-y-3 px-6 py-5">
            {lesson.homework.map((h, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-sol text-[11px] font-bold text-sol">
                  {i + 1}
                </span>
                <span className="text-humo">{h}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {lesson.openQuestions && lesson.openQuestions.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display mb-4 text-2xl font-bold">
            Preguntar la próxima
          </h2>
          <ul className="space-y-2">
            {lesson.openQuestions.map((q, i) => (
              <li
                key={i}
                className="rounded-2xl border border-dashed border-uva/40 bg-uva/5 px-5 py-3 text-humo"
              >
                <span className="mr-2 text-uva">?</span>
                {q}
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className="mt-16 flex gap-3 border-t border-borde/60 pt-6 text-sm">
        {anterior && (
          <Link
            href={`/clases/${slugOf(anterior)}`}
            className="text-humo transition hover:text-tiza"
          >
            ← Clase {anterior.n}: {anterior.title}
          </Link>
        )}
        {siguiente && (
          <Link
            href={`/clases/${slugOf(siguiente)}`}
            className="ml-auto text-humo transition hover:text-tiza"
          >
            Clase {siguiente.n}: {siguiente.title} →
          </Link>
        )}
      </nav>
    </article>
  );
}
