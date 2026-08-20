"use client";

import { useState } from "react";
import {
  FUNCIONES,
  TONALIDAD_MAYOR,
  raizDelGrado,
  type Funcion,
} from "@/lib/grados";
import { chordPitches, chordSymbol, qualityById } from "@/lib/music";
import { playChord, wakeAudio } from "@/lib/audio";

/**
 * El mapa de las funciones armónicas, para tocarlo.
 *
 * Las tres familias con sus grados, cada uno sonando al toque — en Do, que es
 * donde vive toda la clase 3. Abajo, las tres cadencias para escuchar la
 * diferencia entre nombrarlas y sentirlas: la auténtica cierra, la rota te
 * deja parado en otra casa, la plagal es la de las misas.
 */

const BASE = 48; // Do3

/** El orden de lectura: reposo, media tensión, tensión. */
const ORDEN: Funcion[] = ["reposo", "subdominante", "dominante"];

const COLOR: Record<Funcion, { chip: string; texto: string }> = {
  reposo: { chip: "bg-menta text-noche", texto: "text-menta" },
  subdominante: { chip: "bg-sol text-noche", texto: "text-sol" },
  dominante: { chip: "bg-brasa text-noche", texto: "text-brasa" },
};

const CADENCIAS: { nombre: string; detalle: string; grados: number[] }[] = [
  {
    nombre: "Auténtica",
    detalle: "V → I. La cadencia más famosa de todos los tiempos: tensión, casa.",
    grados: [4, 0],
  },
  {
    nombre: "Rota o de engaño",
    detalle:
      "V → VIm. El V promete el I y aterriza en el relativo menor: la casa del engaño.",
    grados: [4, 5],
  },
  {
    nombre: "Plagal",
    detalle:
      "V → IV → I. La subdominante en el medio, típica de la música clásica.",
    grados: [4, 3, 0],
  },
];

export default function Funciones() {
  const [sonando, setSonando] = useState<number | null>(null);

  const tocarGrado = (g: number) => {
    wakeAudio();
    const grado = TONALIDAD_MAYOR[g];
    const quality = qualityById(grado.triada)!;
    playChord(chordPitches(BASE + raizDelGrado(0, g), quality), 1.4);
    setSonando(g);
    setTimeout(() => setSonando((s) => (s === g ? null : s)), 900);
  };

  const tocarCadencia = (grados: number[]) => {
    wakeAudio();
    grados.forEach((g, n) => {
      const grado = TONALIDAD_MAYOR[g];
      const quality = qualityById(grado.triada)!;
      setTimeout(() => {
        playChord(chordPitches(BASE + raizDelGrado(0, g), quality), 1.3);
        setSonando(g);
      }, n * 950);
    });
    setTimeout(() => setSonando(null), grados.length * 950 + 400);
  };

  return (
    <div className="card overflow-hidden">
      <div className="grid gap-px bg-borde/40 sm:grid-cols-3">
        {ORDEN.map((f) => {
          const familia = FUNCIONES[f];
          return (
            <div key={f} className="bg-carta p-4">
              <p className={`text-xs font-bold tracking-[0.2em] uppercase ${COLOR[f].texto}`}>
                {familia.nombre}
              </p>
              <p className="mb-3 text-xs text-humo">({familia.alias})</p>
              <div className="flex flex-wrap gap-1.5">
                {familia.grados.map((g) => {
                  const grado = TONALIDAD_MAYOR[g];
                  const quality = qualityById(grado.triada)!;
                  return (
                    <button
                      key={g}
                      onClick={() => tocarGrado(g)}
                      className={`rounded-xl px-3 py-2 text-center transition ${
                        sonando === g
                          ? COLOR[f].chip
                          : "bg-carta-2 hover:bg-borde"
                      }`}
                    >
                      <span className="block font-mono text-sm font-bold">
                        {grado.cifra}
                      </span>
                      <span className="block text-[11px] opacity-80">
                        {chordSymbol(raizDelGrado(0, g), quality)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-humo">{familia.papel}</p>
            </div>
          );
        })}
      </div>

      <div className="border-t border-borde/60 p-4">
        <p className="mb-2 text-xs tracking-[0.2em] text-humo uppercase">
          Las cadencias, para escucharlas
        </p>
        <div className="flex flex-col gap-2">
          {CADENCIAS.map((c) => (
            <button
              key={c.nombre}
              onClick={() => tocarCadencia(c.grados)}
              className="flex flex-wrap items-baseline gap-x-3 rounded-xl bg-carta-2 px-4 py-2.5 text-left transition hover:bg-borde"
            >
              <span className="font-bold">▶ {c.nombre}</span>
              <span className="text-sm text-humo">{c.detalle}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
