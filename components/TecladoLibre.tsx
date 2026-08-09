"use client";

import { useState } from "react";
import Keyboard, { type Mark } from "./Keyboard";
import { CHORD_QUALITIES, intervalsOf, mod12, noteName } from "@/lib/music";
import { playNote, wakeAudio } from "@/lib/audio";

/**
 * Tocás teclas y te dice si lo que armaste tiene nombre. Es el revés del
 * dictado: en vez de leer un cifrado, lo escribís con los dedos.
 */
export default function TecladoLibre() {
  const [held, setHeld] = useState<number[]>([]);

  const toggle = (p: number) => {
    wakeAudio();
    setHeld((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p].sort((a, b) => a - b),
    );
    if (!held.includes(p)) playNote(p, 0.9);
  };

  const marks: Mark[] = held.map((p) => ({ pitch: p, tone: "sol" }));
  const nombre = identificar(held);

  return (
    <div className="card overflow-hidden">
      <div className="p-5">
        <div className="rounded-2xl bg-noche-2 p-3">
          <Keyboard from={48} to={84} marks={marks} onKeyPress={toggle} showNoteNames />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="font-display text-2xl font-bold">
            {nombre ? (
              <span className="text-sol">{nombre}</span>
            ) : held.length ? (
              <span className="text-humo">
                {held.map((p) => noteName(p)).join(" · ")}
              </span>
            ) : (
              <span className="text-humo">Tocá algunas teclas…</span>
            )}
          </p>
          {held.length > 0 && (
            <button
              onClick={() => setHeld([])}
              className="ml-auto rounded-full bg-carta-2 px-4 py-2 text-sm font-bold transition hover:bg-borde"
            >
              Limpiar
            </button>
          )}
        </div>
        {held.length > 0 && !nombre && (
          <p className="mt-2 text-sm text-humo">
            Todavía no coincide con ninguna receta conocida. Puede ser una
            inversión, o algo que el profe todavía no nos contó.
          </p>
        )}
      </div>
    </div>
  );
}

/** Busca la receta que coincida, probando cada nota como fundamental. */
function identificar(pitches: number[]): string | null {
  if (pitches.length < 3) return null;
  const pcs = [...new Set(pitches.map(mod12))].sort((a, b) => a - b);

  for (const root of pcs) {
    const rel = pcs.map((pc) => mod12(pc - root)).sort((a, b) => a - b);
    for (const q of CHORD_QUALITIES) {
      const target = intervalsOf(q)
        .map(mod12)
        .sort((a, b) => a - b);
      if (
        target.length === rel.length &&
        target.every((v, i) => v === rel[i])
      ) {
        const esFundamental = mod12(Math.min(...pitches)) === root;
        return `${noteName(root, { lang: "en" })}${q.suffix}${
          esFundamental ? "" : ` (invertido, bajo en ${noteName(Math.min(...pitches))})`
        }`;
      }
    }
  }
  return null;
}
