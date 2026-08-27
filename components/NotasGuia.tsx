"use client";

import { useEffect, useRef, useState } from "react";
import {
  LETRAS_EN,
  LETRAS_PC,
  chordPitches,
  invertir,
  mod12,
  parseCifradoConBajo,
} from "@/lib/music";
import { playChord, playNote, wakeAudio } from "@/lib/audio";

/**
 * El renglón del cuaderno de papel: arriba la nota con la que la melodía
 * recibe a cada acorde, abajo el cifrado. Es el ejercicio de la clase 4 tal
 * como quedó escrito — primero se elige dónde aterriza la melodía en cada
 * cambio, y recién después se juega alrededor.
 *
 * Cada columna suena al toque (el acorde con su guía cantando arriba), y el
 * botón toca el renglón entero de corrido, que es donde se escucha lo que el
 * papel no muestra: la guía sola ya es casi una melodía.
 */

const BASE = 48; // Do3 para los acordes; la guía canta arriba.

interface Columna {
  guia: string;
  acorde: string;
  pitchesAcorde: number[];
  pitchGuia: number | null;
}

/** "E" → la clase de altura de esa letra (con # o b si trae). */
function pcDeNota(nombre: string): number | null {
  const m = /^([A-G])([#b]?)$/.exec(nombre.trim());
  if (!m) return null;
  const i = LETRAS_EN.indexOf(m[1] as (typeof LETRAS_EN)[number]);
  if (i < 0) return null;
  return mod12(LETRAS_PC[i] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0));
}

function armarColumnas(columnas: { guia: string; acorde: string }[]): Columna[] {
  return columnas.map((c) => {
    const parsed = parseCifradoConBajo(c.acorde);
    const pitchesAcorde = parsed
      ? invertir(chordPitches(BASE + parsed.chord.root, parsed.chord.quality), parsed.inversion)
      : [];
    // La guía canta arriba del acorde: la primera aparición de su nota por
    // encima de la nota más aguda del acorde.
    const pc = pcDeNota(c.guia);
    let pitchGuia: number | null = null;
    if (pc !== null && pitchesAcorde.length) {
      const techo = Math.max(...pitchesAcorde);
      pitchGuia = techo + 1;
      while (mod12(pitchGuia) !== pc) pitchGuia++;
    }
    return { ...c, pitchesAcorde, pitchGuia };
  });
}

export default function NotasGuia({
  columnas,
}: {
  columnas: { guia: string; acorde: string }[];
}) {
  const [sonando, setSonando] = useState<number | null>(null);
  const [tocandoTodo, setTocandoTodo] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cols = armarColumnas(columnas);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const tocarColumna = (i: number, soloGuia = false) => {
    wakeAudio();
    const c = cols[i];
    if (!soloGuia && c.pitchesAcorde.length) playChord(c.pitchesAcorde, 1.4);
    if (c.pitchGuia !== null) playNote(c.pitchGuia, soloGuia ? 0.8 : 1.4);
    setSonando(i);
    if (!tocandoTodo) {
      timers.current.push(setTimeout(() => setSonando((s) => (s === i ? null : s)), 900));
    }
  };

  const tocarTodo = (soloGuia = false) => {
    wakeAudio();
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setTocandoTodo(true);
    const paso = soloGuia ? 550 : 1000;
    cols.forEach((_, i) => {
      timers.current.push(setTimeout(() => tocarColumna(i, soloGuia), i * paso));
    });
    timers.current.push(
      setTimeout(() => {
        setSonando(null);
        setTocandoTodo(false);
      }, cols.length * paso + 400),
    );
  };

  return (
    <div className="card overflow-hidden">
      {/* El renglón, como en el papel: scrollea de costado si no entra. */}
      <div className="overflow-x-auto p-4">
        <div className="flex min-w-max gap-1.5">
          {cols.map((c, i) => (
            <button
              key={i}
              onClick={() => tocarColumna(i)}
              className={`min-w-[72px] rounded-xl border px-3 py-2.5 text-center transition ${
                sonando === i
                  ? "border-sol/60 bg-sol/15"
                  : "border-borde/60 bg-carta-2 hover:bg-borde"
              }`}
            >
              <span className={`block font-display text-2xl font-black ${sonando === i ? "text-sol" : "text-tiza"}`}>
                {c.guia}
              </span>
              <span className="mt-1 block border-t border-borde/60 pt-1 font-mono text-sm text-humo">
                {c.acorde}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-borde/60 px-4 py-3">
        <button
          onClick={() => tocarTodo(false)}
          className="rounded-full bg-sol px-4 py-2 text-sm font-bold text-noche transition hover:brightness-110"
        >
          ▶ El renglón entero
        </button>
        <button
          onClick={() => tocarTodo(true)}
          className="rounded-xl bg-carta-2 px-3 py-1.5 text-sm font-semibold text-humo transition hover:text-tiza"
        >
          sólo las guías
        </button>
        <span className="text-xs text-humo">
          — la fila de arriba, sola, ya es casi una melodía
        </span>
      </div>
    </div>
  );
}
