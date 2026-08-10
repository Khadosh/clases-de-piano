"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Keyboard from "./Keyboard";
import {
  CHORD_QUALITIES,
  chordPitches,
  chordSymbol,
  intervalsOf,
  mod12,
  notasDeAcorde,
  pickRandom,
  qualityById,
  rangoParaAcorde,
  shuffle,
  stackLabel,
  type ChordQuality,
} from "@/lib/music";
import { playChord, wakeAudio } from "@/lib/audio";

type Mode = "cifrado-a-notas" | "notas-a-cifrado";

interface Question {
  mode: Mode;
  root: number;
  quality: ChordQuality;
  options: { key: string; text: string; ok: boolean }[];
}

const notesText = (root: number, q: ChordQuality) =>
  notasDeAcorde(root, q).join(" · ");

/** Qué teclas usa el acorde, sin importar cómo se llamen ni en qué orden. */
const teclas = (root: number, q: ChordQuality) =>
  intervalsOf(q)
    .map((iv) => mod12(root + iv))
    .sort((a, b) => a - b)
    .join(",");

function buildQuestion(pool: ChordQuality[]): Question {
  const mode: Mode =
    Math.random() < 0.5 ? "cifrado-a-notas" : "notas-a-cifrado";
  const quality = pickRandom(pool);
  const root = Math.floor(Math.random() * 12);

  const distractors: { root: number; quality: ChordQuality }[] = [];
  const seen = new Set([`${root}-${quality.id}`]);
  const teclasCorrectas = teclas(root, quality);
  let guard = 0;
  while (distractors.length < 3 && guard++ < 200) {
    // Mitad de las trampas cambian la receta, mitad cambian la fundamental:
    // así se entrena leer el sufijo y la letra por separado.
    const cambiaCalidad = Math.random() < 0.6;
    const d = {
      root: cambiaCalidad ? root : (root + 1 + Math.floor(Math.random() * 11)) % 12,
      quality: cambiaCalidad ? pickRandom(pool) : quality,
    };
    const key = `${d.root}-${d.quality.id}`;
    if (seen.has(key)) continue;
    // Cuando la pregunta es "mirá el teclado y decime el cifrado", un acorde
    // que usa las mismas teclas es otra respuesta correcta y no una trampa: Do
    // aumentado y Mi aumentado son las mismas tres teclas con nombres distintos.
    if (mode === "notas-a-cifrado" && teclas(d.root, d.quality) === teclasCorrectas)
      continue;
    seen.add(key);
    distractors.push(d);
  }

  const all = [{ root, quality }, ...distractors];
  const options = shuffle(
    all.map((c) => ({
      key: `${c.root}-${c.quality.id}`,
      text:
        mode === "cifrado-a-notas"
          ? notesText(c.root, c.quality)
          : chordSymbol(c.root, c.quality),
      ok: c.root === root && c.quality.id === quality.id,
    })),
  );

  return { mode, root, quality, options };
}

export default function NomenclatureQuiz({
  qualityIds,
}: {
  qualityIds?: string[];
}) {
  const pool = useMemo(() => {
    const picked = (qualityIds ?? [])
      .map((id) => qualityById(id))
      .filter((q): q is ChordQuality => Boolean(q));
    return picked.length ? picked : CHORD_QUALITIES;
  }, [qualityIds]);

  const [q, setQ] = useState<Question | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ ok: 0, total: 0, racha: 0, mejor: 0 });

  // Se arma en el cliente: si lo hiciéramos en el render el HTML del server
  // y el del browser no coincidirían.
  const siguiente = useCallback(() => {
    setPicked(null);
    setQ(buildQuestion(pool));
  }, [pool]);

  useEffect(() => {
    siguiente();
  }, [siguiente]);

  if (!q) {
    return (
      <div className="card h-64 animate-pulse bg-carta-2/40" aria-hidden />
    );
  }

  const responder = (opt: (typeof q.options)[number]) => {
    if (picked) return;
    setPicked(opt.key);
    wakeAudio();
    playChord(chordPitches(60 + q.root, q.quality), 1.4);
    setScore((s) => {
      const racha = opt.ok ? s.racha + 1 : 0;
      return {
        ok: s.ok + (opt.ok ? 1 : 0),
        total: s.total + 1,
        racha,
        mejor: Math.max(s.mejor, racha),
      };
    });
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-borde/60 px-4 py-3 text-sm">
        <span className="rounded-lg bg-carta-2 px-2 py-1 text-xs tracking-wider text-humo uppercase">
          {q.mode === "cifrado-a-notas" ? "Del cifrado al teclado" : "Del teclado al cifrado"}
        </span>
        <span className="ml-auto font-mono text-humo">
          {score.ok}/{score.total}
        </span>
        <span className="font-mono">
          🔥 {score.racha}
          <span className="ml-1 text-xs text-humo">(máx {score.mejor})</span>
        </span>
      </div>

      <div className="p-5">
        {q.mode === "cifrado-a-notas" ? (
          <div className="py-4 text-center">
            <p className="font-display text-6xl font-black text-sol">
              {chordSymbol(q.root, q.quality)}
            </p>
            <p className="mt-2 text-sm text-humo">¿Qué notas son?</p>
          </div>
        ) : (
          <div>
            <div className="rounded-2xl bg-noche-2 p-3">
              <Keyboard
                {...rangoParaAcorde(chordPitches(60 + q.root, q.quality))}
                marks={chordPitches(60 + q.root, q.quality).map((p) => ({
                  pitch: p,
                  tone: "sol" as const,
                }))}
              />
            </div>
            <p className="mt-2 text-center text-sm text-humo">
              ¿Cómo se escribe este acorde?
            </p>
          </div>
        )}

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {q.options.map((opt) => {
            const elegida = picked === opt.key;
            const revelar = Boolean(picked);
            const clase = !revelar
              ? "bg-carta-2 hover:bg-borde"
              : opt.ok
                ? "bg-menta text-noche"
                : elegida
                  ? "bg-brasa text-noche"
                  : "bg-carta-2 opacity-45";
            return (
              <button
                key={opt.key}
                onClick={() => responder(opt)}
                disabled={revelar}
                className={`rounded-2xl px-4 py-3 text-left font-mono font-semibold transition ${clase}`}
              >
                {opt.text}
              </button>
            );
          })}
        </div>

        {picked && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-noche-2 px-4 py-3">
            <p className="text-sm">
              <span className="font-bold">
                {chordSymbol(q.root, q.quality)}
              </span>{" "}
              <span className="text-humo">= {q.quality.name.toLowerCase()},</span>{" "}
              <span className="font-mono text-sol">{stackLabel(q.quality)}</span>{" "}
              {/* Siempre las notas: en "del teclado al cifrado" la respuesta
                  correcta es el cifrado, y repetirlo no enseña nada. */}
              <span className="text-humo">
                → {notesText(q.root, q.quality)}
              </span>
            </p>
            <button
              onClick={siguiente}
              className="ml-auto rounded-full bg-sol px-4 py-2 text-sm font-bold text-noche transition hover:brightness-110"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
