"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Keyboard, { type Mark } from "./Keyboard";
import {
  buildExercise,
  noteName,
  positionDegrees,
  scaleDegreeToPitch,
  type ExerciseStep,
  type Hand,
} from "@/lib/music";
import { playNote, wakeAudio } from "@/lib/audio";

export interface Variant {
  label: string;
  hand: Hand | "ambas";
  gapAt: 5 | 1;
  note?: string;
}

const BASE_IZQ = 48; // Do3
const BASE_DER = 60; // Do4
const POSICIONES = 4;
const PASOS_POR_POSICION = 9; // 5 subiendo + 4 bajando

export default function ExerciseRunner({ variants }: { variants: Variant[] }) {
  const [vi, setVi] = useState(0);
  const [bpm, setBpm] = useState(72);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const v = variants[vi];

  const { izq, der } = useMemo(() => {
    const izq =
      v.hand === "derecha"
        ? null
        : buildExercise({
            hand: "izquierda",
            gapAt: v.gapAt,
            positions: POSICIONES,
            base: BASE_IZQ,
          });
    const der =
      v.hand === "izquierda"
        ? null
        : buildExercise({
            hand: "derecha",
            gapAt: v.gapAt,
            positions: POSICIONES,
            base: BASE_DER,
          });
    return { izq, der };
  }, [v]);

  const total = (izq ?? der)!.length;

  // Reinicia al cambiar de variante.
  useEffect(() => {
    setI(0);
    setPlaying(false);
  }, [vi]);

  const izqRef = useRef(izq);
  const derRef = useRef(der);
  izqRef.current = izq;
  derRef.current = der;

  useEffect(() => {
    if (!playing) return;
    const ms = 60_000 / bpm;
    const id = setInterval(() => {
      setI((prev) => {
        const next = (prev + 1) % total;
        const l = izqRef.current?.[next];
        const r = derRef.current?.[next];
        if (l) playNote(l.pitch, 0.42);
        if (r) playNote(r.pitch, 0.42);
        return next;
      });
    }, ms);
    return () => clearInterval(id);
  }, [playing, bpm, total]);

  const marks: Mark[] = [];
  const pushHand = (
    steps: ExerciseStep[] | null,
    tone: "izq" | "der",
    base: number,
  ) => {
    if (!steps) return;
    const pos = Math.floor(i / PASOS_POR_POSICION);
    // La "casa" de la mano en esta posición: las cinco teclas apoyadas.
    for (const d of positionDegrees(v.gapAt)) {
      marks.push({
        pitch: scaleDegreeToPitch(pos + d, base),
        tone,
        ghost: true,
      });
    }
    const step = steps[i];
    marks.push({
      pitch: step.pitch,
      tone,
      label: String(step.finger),
      active: true,
    });
  };
  pushHand(izq, "izq", BASE_IZQ);
  pushHand(der, "der", BASE_DER);

  const actual = [izq?.[i], der?.[i]].filter(Boolean) as ExerciseStep[];
  const posicion = Math.floor(i / PASOS_POR_POSICION) + 1;

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap gap-1.5 border-b border-borde/60 p-4">
        {variants.map((variant, idx) => (
          <button
            key={variant.label}
            onClick={() => setVi(idx)}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
              vi === idx
                ? "bg-tiza text-noche"
                : "bg-carta-2 text-humo hover:text-tiza"
            }`}
          >
            {variant.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {v.note && <p className="mb-4 text-sm text-humo italic">{v.note}</p>}

        <div className="rounded-2xl bg-noche-2 p-3">
          <Keyboard from={45} to={84} marks={marks} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              wakeAudio();
              setPlaying((p) => !p);
            }}
            className="rounded-full bg-menta px-5 py-2 text-sm font-bold text-noche transition hover:brightness-110"
          >
            {playing ? "⏸ Pausa" : "▶ Arrancar"}
          </button>
          <button
            onClick={() => {
              setPlaying(false);
              setI(0);
            }}
            className="rounded-full bg-carta-2 px-4 py-2 text-sm font-bold transition hover:bg-borde"
          >
            ↺ Volver al principio
          </button>
          <button
            onClick={() => {
              setPlaying(false);
              setI((p) => {
                const next = (p + 1) % total;
                const l = izq?.[next];
                const r = der?.[next];
                wakeAudio();
                if (l) playNote(l.pitch, 0.42);
                if (r) playNote(r.pitch, 0.42);
                return next;
              });
            }}
            className="rounded-full bg-carta-2 px-4 py-2 text-sm font-bold transition hover:bg-borde"
          >
            → Una nota
          </button>

          <label className="ml-auto flex items-center gap-2 text-sm text-humo">
            <span className="font-mono">{bpm} bpm</span>
            <input
              type="range"
              min={30}
              max={160}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="accent-sol"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-noche-2 px-4 py-3 text-sm">
          <span className="rounded-lg bg-carta-2 px-2 py-1 text-xs tracking-wider text-humo uppercase">
            posición {posicion} de {POSICIONES}
          </span>
          {actual.map((s, idx) => (
            <span key={idx} className="font-mono">
              <span className="text-humo">dedo</span>{" "}
              <span className="font-bold text-sol">{s.finger}</span>{" "}
              <span className="text-humo">→</span> {noteName(s.pitch)}
            </span>
          ))}
          <span className="ml-auto flex gap-3 text-xs text-humo">
            {izq && (
              <span className="flex items-center gap-1.5">
                <i className="inline-block h-2.5 w-2.5 rounded-full bg-menta" />
                izquierda
              </span>
            )}
            {der && (
              <span className="flex items-center gap-1.5">
                <i className="inline-block h-2.5 w-2.5 rounded-full bg-rosa" />
                derecha
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
