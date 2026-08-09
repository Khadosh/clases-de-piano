"use client";

import { useEffect, useState } from "react";
import Keyboard, { type Mark } from "./Keyboard";
import { noteName } from "@/lib/music";
import { playChord, wakeAudio } from "@/lib/audio";

export interface HandPosition {
  label: string;
  izquierda: number[];
  derecha: number[];
  note?: string;
}

export default function HandsSwap({
  positions,
}: {
  positions: HandPosition[];
}) {
  const [pi, setPi] = useState(0);
  const [auto, setAuto] = useState(false);
  const pos = positions[pi];

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => {
      setPi((p) => {
        const next = (p + 1) % positions.length;
        const q = positions[next];
        playChord([...q.izquierda, ...q.derecha], 1.5);
        return next;
      });
    }, 2000);
    return () => clearInterval(id);
  }, [auto, positions]);

  const marks: Mark[] = [
    ...pos.izquierda.map((p) => ({ pitch: p, tone: "izq" as const })),
    ...pos.derecha.map((p) => ({ pitch: p, tone: "der" as const })),
  ];

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap gap-1.5 border-b border-borde/60 p-4">
        {positions.map((p, idx) => (
          <button
            key={p.label}
            onClick={() => {
              setAuto(false);
              setPi(idx);
              wakeAudio();
              playChord([...p.izquierda, ...p.derecha], 1.5);
            }}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
              pi === idx
                ? "bg-tiza text-noche"
                : "bg-carta-2 text-humo hover:text-tiza"
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => {
            wakeAudio();
            setAuto((a) => !a);
          }}
          className={`ml-auto rounded-xl px-3 py-1.5 text-sm font-bold transition ${
            auto ? "bg-brasa text-noche" : "bg-carta-2 text-humo hover:text-tiza"
          }`}
        >
          {auto ? "⏸ Parar el intercambio" : "🔁 Intercambiar solo"}
        </button>
      </div>

      <div className="p-5">
        <div className="rounded-2xl bg-noche-2 p-3">
          <Keyboard from={40} to={79} marks={marks} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-menta/30 bg-menta/10 p-3">
            <p className="mb-1 text-xs tracking-wider text-menta uppercase">
              Mano izquierda
            </p>
            <p className="font-mono text-lg">
              {pos.izquierda.map((p) => noteName(p)).join(" · ")}
            </p>
          </div>
          <div className="rounded-2xl border border-rosa/30 bg-rosa/10 p-3">
            <p className="mb-1 text-xs tracking-wider text-rosa uppercase">
              Mano derecha
            </p>
            <p className="font-mono text-lg">
              {pos.derecha.map((p) => noteName(p)).join(" · ")}
            </p>
          </div>
        </div>

        {pos.note && <p className="mt-3 text-sm text-humo italic">{pos.note}</p>}
      </div>
    </div>
  );
}
