import Link from "next/link";
import type { Metadata } from "next";
import { LESSONS, formatDate, slugOf } from "@/content";

export const metadata: Metadata = {
  title: "Para preguntarle a Quique",
  description: "Lo que quedó dudoso en cada clase, todo junto, para llevarlo el miércoles.",
};

/**
 * Las preguntas abiertas de todas las clases, en una sola página.
 *
 * Cada clase guarda las suyas en `openQuestions` y las muestra al pie, y eso
 * está bien para leer la clase. Para llevarlas el miércoles no: había que
 * abrir siete clases y bajar hasta el final de cada una. Acá están todas,
 * de la más nueva a la más vieja, y no hay nada que mantener: sale de
 * `LESSONS`. Cuando Quique contesta una, se borra de `openQuestions` y la
 * respuesta pasa a la clase como `prose` — así esta lista sólo tiene lo que
 * falta preguntar.
 */
export default function PreguntasPage() {
  const conPreguntas = [...LESSONS]
    .reverse()
    .filter((l) => l.openQuestions && l.openQuestions.length > 0);
  const total = conPreguntas.reduce((acc, l) => acc + (l.openQuestions?.length ?? 0), 0);

  return (
    <div className="pt-10">
      <header className="mb-10">
        <p className="mb-3 text-sm tracking-[0.3em] text-uva uppercase">para el miércoles</p>
        <h1 className="font-display text-5xl leading-[1] font-black tracking-tight sm:text-6xl">
          Para preguntarle a Quique
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-humo">
          Lo que quedó dudoso al pasar cada clase al cuaderno: cosas que se interpretaron de la mejor
          manera posible y se implementaron así, pero que conviene confirmar. Cuando una se contesta,
          desaparece de acá y la respuesta queda en la clase.
        </p>
        <p className="mt-3 font-mono text-sm text-humo">
          {total === 0
            ? "No hay ninguna pendiente."
            : `${total} ${total === 1 ? "pregunta" : "preguntas"} en ${conPreguntas.length} ${conPreguntas.length === 1 ? "clase" : "clases"}`}
        </p>
      </header>

      <div className="space-y-10">
        {conPreguntas.map((l) => (
          <section key={l.n}>
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
              <Link
                href={`/clases/${slugOf(l)}`}
                className="font-mono text-sm text-sol transition hover:brightness-125"
              >
                Clase {String(l.n).padStart(2, "0")}
              </Link>
              <span className="text-sm text-humo">{formatDate(l.date, { weekday: true })}</span>
              <Link
                href={`/clases/${slugOf(l)}`}
                className="font-display text-xl font-bold transition hover:text-sol"
              >
                {l.title}
              </Link>
            </div>
            <ul className="space-y-2">
              {l.openQuestions!.map((q, i) => (
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
        ))}
      </div>
    </div>
  );
}
