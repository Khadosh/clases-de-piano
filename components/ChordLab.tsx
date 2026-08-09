"use client";

import { useCallback, useMemo, useState } from "react";
import Keyboard, { type Mark, type Tone } from "./Keyboard";
import {
  CHORD_QUALITIES,
  NOTES_EN,
  NOTES_ES,
  chordNameEs,
  chordPitches,
  chordSymbol,
  intervalsOf,
  pickRandom,
  qualityById,
  stackLabel,
  type ChordQuality,
} from "@/lib/music";
import { playArpeggio, playChord, wakeAudio } from "@/lib/audio";

interface Props {
  qualityIds: string[];
  dictation?: boolean;
}

/** Grados del acorde: fundamental, tercera, quinta, séptima. */
const GRADOS = ["1", "3", "5", "7"];

export default function ChordLab({ qualityIds, dictation = false }: Props) {
  const qualities = useMemo(
    () =>
      qualityIds
        .map((id) => qualityById(id))
        .filter((q): q is ChordQuality => Boolean(q)),
    [qualityIds],
  );

  const [root, setRoot] = useState(0);
  const [qid, setQid] = useState(qualities[0]?.id ?? "maj");
  const quality = qualityById(qid) ?? qualities[0] ?? CHORD_QUALITIES[0];

  // Dictado: el profe canta un cifrado raro y vos ponés las manos.
  const [dictado, setDictado] = useState<{
    root: number;
    quality: ChordQuality;
  } | null>(null);
  const [revelado, setRevelado] = useState(false);
  const [ronda, setRonda] = useState(0);

  const shown = dictado ?? { root, quality };
  const pitches = chordPitches(60 + shown.root, shown.quality);
  const hidden = Boolean(dictado) && !revelado;

  const marks: Mark[] = hidden
    ? []
    : pitches.map((p, i) => ({
        pitch: p,
        tone: shown.quality.tone as Tone,
        label: GRADOS[i] ?? "",
      }));

  const sonar = useCallback(
    (arpegio = false) => {
      wakeAudio();
      const ps = chordPitches(60 + shown.root, shown.quality);
      if (arpegio) playArpeggio(ps);
      else playChord(ps);
    },
    [shown.root, shown.quality],
  );

  const nuevoDictado = () => {
    wakeAudio();
    const q = pickRandom(qualities.length ? qualities : CHORD_QUALITIES);
    const r = Math.floor(Math.random() * 12);
    setDictado({ root: r, quality: q });
    setRevelado(false);
    setRonda((n) => n + 1);
  };

  return (
    <div className="card overflow-hidden">
      {/* Selector de fundamental */}
      <div className="flex flex-wrap gap-1.5 border-b border-borde/60 p-4">
        {NOTES_ES.map((n, i) => (
          <button
            key={n}
            onClick={() => {
              setDictado(null);
              setRoot(i);
            }}
            className={`rounded-xl px-2.5 py-1.5 text-sm font-semibold transition ${
              !dictado && root === i
                ? "bg-sol text-noche"
                : "bg-carta-2 text-humo hover:text-tiza"
            }`}
          >
            {NOTES_EN[i]}
            <span className="ml-1 text-[10px] opacity-60">{n}</span>
          </button>
        ))}
      </div>

      {/* Selector de calidad */}
      <div className="flex flex-wrap gap-1.5 border-b border-borde/60 p-4">
        {qualities.map((q) => (
          <button
            key={q.id}
            onClick={() => {
              setDictado(null);
              setQid(q.id);
            }}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
              !dictado && qid === q.id
                ? "bg-tiza text-noche"
                : "bg-carta-2 text-humo hover:text-tiza"
            }`}
          >
            {q.name}
            <span className="ml-1.5 font-mono text-[11px] opacity-70">
              {stackLabel(q)}
            </span>
          </button>
        ))}
      </div>

      {/* Pantalla */}
      <div className="p-5">
        {hidden ? (
          <div className="mb-4 text-center">
            <p className="text-xs tracking-[0.25em] text-humo uppercase">
              Dictado · ronda {ronda}
            </p>
            <p className="font-display my-3 text-6xl font-black text-sol">
              {chordSymbol(shown.root, shown.quality)}
            </p>
            <p className="text-sm text-humo">
              Poné las manos. Después fijate si te dio.
            </p>
          </div>
        ) : (
          <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-display text-4xl font-black">
              {chordSymbol(shown.root, shown.quality)}
            </span>
            <span className="text-humo">
              {chordNameEs(shown.root, shown.quality)}
            </span>
            <span className="ml-auto rounded-full bg-carta-2 px-3 py-1 font-mono text-sm">
              {stackLabel(shown.quality)}
            </span>
          </div>
        )}

        <div className="rounded-2xl bg-noche-2 p-3">
          <Keyboard from={55} to={79} marks={marks} />
        </div>

        {!hidden && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            {intervalsOf(shown.quality).map((iv, i) => (
              <span
                key={i}
                className="rounded-lg bg-carta-2 px-2.5 py-1 font-mono text-xs"
              >
                {NOTES_ES[(shown.root + iv) % 12]}
                <span className="ml-1.5 text-humo">+{iv}</span>
              </span>
            ))}
            <span className="text-xs text-humo">
              (los números en las teclas son los grados: 1 fundamental, 3, 5, 7)
            </span>
            <p className="w-full pt-1 text-humo italic">{shown.quality.vibe}</p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={() => sonar(false)}
            className="rounded-full bg-menta px-4 py-2 text-sm font-bold text-noche transition hover:brightness-110"
          >
            ▶ Sonar junto
          </button>
          <button
            onClick={() => sonar(true)}
            className="rounded-full bg-carta-2 px-4 py-2 text-sm font-bold transition hover:bg-borde"
          >
            ♪ Nota por nota
          </button>

          {dictation && (
            <>
              <button
                onClick={nuevoDictado}
                className="ml-auto rounded-full bg-uva px-4 py-2 text-sm font-bold text-noche transition hover:brightness-110"
              >
                🎲 Dictado
              </button>
              {dictado && (
                <button
                  onClick={() => {
                    setRevelado(true);
                    sonar(false);
                  }}
                  disabled={revelado}
                  className="rounded-full bg-sol px-4 py-2 text-sm font-bold text-noche transition hover:brightness-110 disabled:opacity-40"
                >
                  👀 Ver respuesta
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
