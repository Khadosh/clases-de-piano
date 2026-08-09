import type { Block } from "@/content/types";
import ChordLab from "./ChordLab";
import ExerciseRunner from "./ExerciseRunner";
import HandsSwap from "./HandsSwap";
import NomenclatureQuiz from "./NomenclatureQuiz";
import Keyboard from "./Keyboard";
import { CHORD_QUALITIES, chordPitches, mod12 } from "@/lib/music";

/** Convierte *esto* en negrita, sin traer un parser de markdown entero. */
export function rich(text: string) {
  return text.split(/(\*[^*]+\*)/g).map((chunk, i) =>
    chunk.startsWith("*") && chunk.endsWith("*") && chunk.length > 2 ? (
      <strong key={i} className="font-semibold text-sol">
        {chunk.slice(1, -1)}
      </strong>
    ) : (
      <span key={i}>{chunk}</span>
    ),
  );
}

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display mb-3 text-2xl font-bold tracking-tight">
      {children}
    </h2>
  );
}

const LETTER_PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** Interpreta cifrados sueltos tipo "Emaj7" para la tablita de nomenclatura. */
function parseSymbol(sym: string) {
  const m = /^([A-G])([#b]?)(.*)$/.exec(sym.trim());
  if (!m) return null;
  const [, letter, alt, suffix] = m;
  const pc = LETTER_PC[letter];
  if (pc === undefined) return null;
  const root = mod12(pc + (alt === "#" ? 1 : alt === "b" ? -1 : 0));
  const quality =
    CHORD_QUALITIES.find((q) => q.suffix === suffix) ??
    CHORD_QUALITIES.find((q) => q.aliases?.includes(suffix));
  if (!quality) return null;
  return { root, quality };
}

/** El id de ancla de una sección, para el índice de la clase. */
export const anchorDe = (titulo: string) =>
  titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case "section":
      return (
        <section id={anchorDe(block.title)} className="scroll-mt-20 pt-6">
          <div className="flex items-center gap-3 border-b-2 border-borde pb-3">
            <span className="text-3xl">{block.emoji}</span>
            <h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl">
              {block.title}
            </h2>
          </div>
          {block.intro && (
            <p className="mt-4 text-lg leading-relaxed text-humo">
              {rich(block.intro)}
            </p>
          )}
        </section>
      );

    case "prose":
      return (
        <section>
          {block.title && <Titulo>{block.title}</Titulo>}
          <p className="text-lg leading-relaxed text-humo">
            {rich(block.text)}
          </p>
        </section>
      );

    case "quote":
      return (
        <figure className="card relative px-6 py-7 pl-14">
          <span className="font-display absolute top-2 left-4 text-6xl leading-none text-sol/40">
            “
          </span>
          <blockquote className="font-display text-xl leading-snug italic">
            {block.text}
          </blockquote>
          {block.by && (
            <figcaption className="mt-2 text-sm text-humo">
              — {block.by}
            </figcaption>
          )}
        </figure>
      );

    case "correction":
      return (
        <section className="card overflow-hidden">
          <div className="flex items-start gap-4 p-5">
            <span
              className="flota text-4xl"
              style={{ ["--tilt" as string]: "-6deg" }}
            >
              {block.emoji}
            </span>
            <div className="min-w-0">
              <p className="text-xs tracking-[0.2em] text-brasa uppercase">
                Corrección
              </p>
              <h3 className="font-display mt-1 mb-3 text-2xl font-bold">
                {block.title}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-brasa/25 bg-brasa/10 p-3">
                  <p className="mb-1 text-xs tracking-wider text-brasa uppercase">
                    Lo que hacía
                  </p>
                  <p className="text-sm text-tiza/90">{block.problem}</p>
                </div>
                <div className="rounded-2xl border border-menta/25 bg-menta/10 p-3">
                  <p className="mb-1 text-xs tracking-wider text-menta uppercase">
                    Lo que va
                  </p>
                  <p className="text-sm text-tiza/90">{block.fix}</p>
                </div>
              </div>
              {block.analogy && (
                <p className="font-display mt-4 border-l-4 border-sol pl-4 text-lg italic">
                  {block.analogy}
                </p>
              )}
            </div>
          </div>
        </section>
      );

    case "chord-lab":
      return (
        <section>
          <Titulo>{block.title}</Titulo>
          {block.intro && (
            <p className="mb-4 leading-relaxed text-humo">
              {rich(block.intro)}
            </p>
          )}
          <ChordLab
            qualityIds={block.qualities}
            dictation={block.dictation}
            inversiones={block.inversiones}
          />
        </section>
      );

    case "exercise":
      return (
        <section>
          <Titulo>{block.title}</Titulo>
          {block.intro && (
            <p className="mb-4 leading-relaxed text-humo">
              {rich(block.intro)}
            </p>
          )}
          <ExerciseRunner variants={block.variants} />
        </section>
      );

    case "hands":
      return (
        <section>
          <Titulo>{block.title}</Titulo>
          {block.intro && (
            <p className="mb-4 leading-relaxed text-humo">
              {rich(block.intro)}
            </p>
          )}
          <HandsSwap positions={block.positions} />
        </section>
      );

    case "nomenclature": {
      const parsed = block.examples
        .map((sym) => {
          const chord = parseSymbol(sym);
          if (!chord) return null;
          const pitches = chordPitches(60 + chord.root, chord.quality);
          // Una octava y media arrancando en el Do de abajo del acorde: entra
          // cualquier fundamental sin que el teclado cambie de tamaño.
          const from = Math.floor((pitches[0] - 1) / 12) * 12;
          return { sym, chord, pitches, from };
        })
        .filter((e) => e !== null);
      return (
        <section>
          <Titulo>{block.title}</Titulo>
          {block.intro && (
            <p className="mb-4 leading-relaxed text-humo">
              {rich(block.intro)}
            </p>
          )}
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            {parsed.map(({ sym, chord, pitches, from }) => (
              <div key={sym} className="card p-4">
                <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
                  <span className="font-display text-2xl font-black text-sol">
                    {sym}
                  </span>
                  <span className="text-sm text-humo">
                    {chord.quality.name}
                  </span>
                  <span className="ml-auto rounded-full bg-carta-2 px-2.5 py-1 font-mono text-xs">
                    {chord.quality.stack.join(" + ")}
                  </span>
                </div>
                <div className="rounded-xl bg-noche-2 p-2">
                  <Keyboard
                    from={from}
                    to={from + 17}
                    marks={pitches.map((p) => ({
                      pitch: p,
                      tone: chord.quality.tone,
                    }))}
                  />
                </div>
              </div>
            ))}
          </div>
          <NomenclatureQuiz />
        </section>
      );
    }
  }
}
