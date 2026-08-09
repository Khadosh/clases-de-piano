import type { Metadata } from "next";
import Keyboard from "@/components/Keyboard";
import ChordLab from "@/components/ChordLab";
import {
  CHORD_QUALITIES,
  chordPitches,
  chordSymbol,
  intervalsOf,
  stackLabel,
} from "@/lib/music";

export const metadata: Metadata = {
  title: "Acordes",
  description:
    "Todas las recetas de acorde que fueron apareciendo en clase, contadas en semitonos.",
};

const FAMILIAS = [
  { id: "triada", titulo: "Tríadas", bajada: "Tres notas. Dos saltos." },
  {
    id: "suspendido",
    titulo: "Suspendidos",
    bajada: "La tríada con el dedo del medio corrido un lugar.",
  },
  {
    id: "septima",
    titulo: "Séptimas",
    bajada: "La tríada más una nota arriba. Ahí empieza el color.",
  },
] as const;

export default function AcordesPage() {
  return (
    <div className="pt-10">
      <h1 className="font-display mb-2 text-5xl font-black tracking-tight">
        Acordes
      </h1>
      <p className="mb-10 max-w-2xl text-lg leading-relaxed text-humo">
        Ninguno está memorizado: todos se arman contando semitonos desde la
        fundamental. La fórmula es lo único que hay que saber; la fundamental
        es de dónde arrancás a contar.
      </p>

      <section className="mb-14">
        <h2 className="font-display mb-4 text-2xl font-bold">
          El laboratorio
        </h2>
        <ChordLab
          qualityIds={CHORD_QUALITIES.map((q) => q.id)}
          dictation
        />
      </section>

      {FAMILIAS.map((fam) => {
        const qs = CHORD_QUALITIES.filter((q) => q.family === fam.id);
        if (!qs.length) return null;
        return (
          <section key={fam.id} className="mb-12">
            <h2 className="font-display text-2xl font-bold">{fam.titulo}</h2>
            <p className="mb-4 text-humo">{fam.bajada}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {qs.map((q) => (
                <div key={q.id} className="card p-5">
                  <div className="mb-3 flex items-baseline gap-3">
                    <span className="font-display text-2xl font-black">
                      {chordSymbol(0, q)}
                    </span>
                    <span className="text-humo">{q.name}</span>
                    <span className="ml-auto rounded-full bg-carta-2 px-3 py-1 font-mono text-sm text-sol">
                      {stackLabel(q)}
                    </span>
                  </div>
                  <div className="rounded-2xl bg-noche-2 p-2">
                    <Keyboard
                      from={60}
                      to={76}
                      marks={chordPitches(60, q).map((p) => ({
                        pitch: p,
                        tone: q.tone,
                      }))}
                    />
                  </div>
                  <p className="mt-3 text-sm text-humo italic">{q.vibe}</p>
                  <p className="mt-2 font-mono text-xs text-humo">
                    intervalos desde la fundamental:{" "}
                    {intervalsOf(q).join(" · ")}
                    {q.aliases?.length ? (
                      <>
                        {" "}
                        · también se escribe{" "}
                        {q.aliases.map((a) => `C${a}`).join(", ")}
                      </>
                    ) : null}
                  </p>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
