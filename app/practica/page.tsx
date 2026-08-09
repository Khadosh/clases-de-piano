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

export default function PracticaPage() {
  const ejercicios = ejerciciosDeTodasLasClases();

  return (
    <div className="pt-10">
      <h1 className="font-display mb-2 text-5xl font-black tracking-tight">
        Sala de práctica
      </h1>
      <p className="mb-12 max-w-2xl text-lg leading-relaxed text-humo">
        Todo lo que hay que machacar entre un miércoles y el otro, en un solo
        lugar. Se va llenando sola con cada clase nueva.
      </p>

      <section className="mb-14">
        <div className="mb-4 flex items-baseline gap-3">
          <h2 className="font-display text-3xl font-bold">Dictado de acordes</h2>
          <span className="rounded-full bg-uva/15 px-3 py-1 text-xs text-uva">
            el juego del profe
          </span>
        </div>
        <p className="mb-4 max-w-2xl text-humo">
          Sale un cifrado, ponés las manos, después mirás. Sin pensar de más:
          la idea es que la fórmula salga del dedo, no de la cabeza.
        </p>
        <ChordLab qualityIds={CHORD_QUALITIES.map((q) => q.id)} dictation />
      </section>

      <section className="mb-14">
        <h2 className="font-display mb-4 text-3xl font-bold">
          Cifrado inglés a toda velocidad
        </h2>
        <NomenclatureQuiz />
      </section>

      <section className="mb-14">
        <h2 className="font-display mb-2 text-3xl font-bold">
          ¿Qué acorde armé?
        </h2>
        <p className="mb-4 max-w-2xl text-humo">
          Al revés del dictado: tocás teclas y te dice cómo se llama eso que
          hiciste. Sirve para descubrir inversiones sin querer.
        </p>
        <TecladoLibre />
      </section>

      <section>
        <h2 className="font-display mb-6 text-3xl font-bold">Los ejercicios</h2>
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
    </div>
  );
}
