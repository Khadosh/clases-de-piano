import Link from "next/link";
import type { Metadata } from "next";
import { LESSONS, slugOf } from "@/content";
import type { ExerciseBlock, HandsBlock, Lesson } from "@/content/types";
import ExerciseRunner from "@/components/ExerciseRunner";
import HandsSwap from "@/components/HandsSwap";
import NomenclatureQuiz from "@/components/NomenclatureQuiz";
import ChordLab from "@/components/ChordLab";
import TecladoLibre from "@/components/TecladoLibre";
import { CHORD_QUALITIES } from "@/lib/music";

export const metadata: Metadata = {
  title: "Práctica",
  description:
    "Todos los ejercicios de todas las clases, juntos, para machacarlos entre miércoles y miércoles.",
};

/** La sala de práctica se llena sola: junta los ejercicios de todas las clases. */
function ejerciciosDeTodasLasClases() {
  const out: { lesson: Lesson; block: ExerciseBlock | HandsBlock }[] = [];
  for (const lesson of LESSONS) {
    for (const block of lesson.blocks) {
      if (block.kind === "exercise" || block.kind === "hands") {
        out.push({ lesson, block });
      }
    }
  }
  return out;
}

const TODOS = CHORD_QUALITIES.map((q) => q.id);

const AREAS = [
  { id: "manos", titulo: "Con las manos", emoji: "🏃" },
  { id: "acordes", titulo: "Con la cabeza", emoji: "🧠" },
] as const;

export default function PracticaPage() {
  const ejercicios = ejerciciosDeTodasLasClases();

  return (
    <div className="pt-10">
      <h1 className="font-display mb-2 text-5xl font-black tracking-tight">
        Sala de práctica
      </h1>
      <p className="mb-8 max-w-2xl text-lg leading-relaxed text-humo">
        Todo lo que hay que machacar entre un miércoles y el otro, en un solo
        lugar. Se va llenando sola con cada clase nueva.
      </p>

      <nav className="card mb-14 flex flex-wrap gap-2 px-6 py-5">
        {AREAS.map((a) => (
          <a
            key={a.id}
            href={`#${a.id}`}
            className="flex items-center gap-2 rounded-full bg-carta-2 px-4 py-2 text-sm font-semibold transition hover:bg-borde"
          >
            <span>{a.emoji}</span>
            {a.titulo}
          </a>
        ))}
      </nav>

      {/* ------------------------------------------------------------------ */}
      <section id="manos" className="mb-16 scroll-mt-20">
        <div className="mb-6 flex items-center gap-3 border-b-2 border-borde pb-3">
          <span className="text-3xl">🏃</span>
          <h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl">
            Con las manos
          </h2>
        </div>

        <div className="space-y-10">
          {ejercicios.map(({ lesson, block }, i) => (
            <div key={i}>
              <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
                <h3 className="font-display text-2xl font-bold">
                  {block.title}
                </h3>
                <Link
                  href={`/clases/${slugOf(lesson)}`}
                  className="text-sm text-humo transition hover:text-sol"
                >
                  de la clase {lesson.n} →
                </Link>
              </div>
              {block.kind === "exercise" ? (
                <ExerciseRunner variants={block.variants} />
              ) : (
                <HandsSwap positions={block.positions} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section id="acordes" className="scroll-mt-20">
        <div className="mb-6 flex items-center gap-3 border-b-2 border-borde pb-3">
          <span className="text-3xl">🧠</span>
          <h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl">
            Con la cabeza
          </h2>
        </div>

        <div className="space-y-14">
          <div>
            <div className="mb-3 flex flex-wrap items-baseline gap-3">
              <h3 className="font-display text-2xl font-bold">
                Acordes e inversiones
              </h3>
              <span className="rounded-full bg-uva/15 px-3 py-1 text-xs text-uva">
                con el dictado del profe
              </span>
            </div>
            <p className="mb-4 max-w-2xl text-humo">
              Fundamental, receta e inversión, todo en el mismo teclado. Para
              practicar en serio: <strong className="text-tiza">dictado</strong>{" "}
              — sale un cifrado y lo armás apretando las teclas, sin necesidad
              de tener el piano al lado. Te dice si está bien, y si le erraste
              sólo al bajo también te lo dice. Cuando eso ya sale, prendé las
              inversiones y empiezan a aparecer cifrados con barra.
            </p>
            <ChordLab qualityIds={TODOS} dictation inversiones />
          </div>

          <div>
            <h3 className="font-display mb-4 text-2xl font-bold">
              Cifrado inglés a toda velocidad
            </h3>
            <NomenclatureQuiz />
          </div>

          <div>
            <h3 className="font-display mb-2 text-2xl font-bold">
              ¿Qué acorde armé?
            </h3>
            <p className="mb-4 max-w-2xl text-humo">
              Al revés del dictado: tocás teclas y te dice cómo se llama eso que
              hiciste. Sirve para descubrir inversiones sin querer.
            </p>
            <TecladoLibre />
          </div>
        </div>
      </section>
    </div>
  );
}
