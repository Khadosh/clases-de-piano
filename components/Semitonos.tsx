"use client";

import { useState } from "react";
import Keyboard, { type Mark } from "./Keyboard";
import { NOTES_ES, scaleDegreeToPitch } from "@/lib/music";
import { playNote, wakeAudio } from "@/lib/audio";

/**
 * Por qué mi♯ y fa son la misma tecla.
 *
 * La idea es de una clase y hay que *verla*: entre casi todas las notas
 * vecinas hay una tecla negra en el medio, menos entre mi–fa y si–do. Ahí es
 * donde el teclado no tiene dónde poner el sostenido, y por eso cae en la
 * blanca de al lado.
 */

const BASE = 60; // Do4
/** Grados de la escala de Do, de Do a Do. */
const GRADOS = [0, 1, 2, 3, 4, 5, 6, 7];

export default function Semitonos() {
  const [sostenidos, setSostenidos] = useState(false);

  const pitches = GRADOS.map((g) => scaleDegreeToPitch(g, BASE));
  /** La distancia en semitonos de cada nota a la siguiente. */
  const saltos = pitches.slice(0, -1).map((p, i) => pitches[i + 1] - p);

  const nombre = (i: number) => {
    if (!sostenidos) return NOTES_ES[pitches[i] % 12];
    // Las dos que se pueden escribir como el sostenido de la anterior.
    if (i === 3) return "Mi♯";
    if (i === 7) return "Si♯";
    return NOTES_ES[pitches[i] % 12];
  };

  // Se marcan las cuatro teclas de los dos pares pegados: mi–fa y si–do.
  const pegadas = new Set([2, 3, 6, 7]);
  const marks: Mark[] = GRADOS.filter((i) => pegadas.has(i)).map((i) => ({
    pitch: pitches[i],
    tone: "sol",
    label: nombre(i),
  }));

  const tocar = (i: number) => {
    wakeAudio();
    playNote(pitches[i], 0.7);
  };

  return (
    <div className="card overflow-hidden">
      <div className="p-5">
        {/* Una sola octava: sin tope se estira y quedan teclas gigantes. */}
        <div className="mx-auto max-w-md rounded-2xl bg-noche-2 p-3">
          <Keyboard from={BASE} to={BASE + 12} marks={marks} showNoteNames />
        </div>

        {/* La escala con la distancia entre cada nota y la siguiente. */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
          {GRADOS.map((i) => (
            <span key={i} className="flex items-center gap-1.5">
              <button
                onClick={() => tocar(i)}
                className="rounded-xl bg-carta-2 px-3 py-2 font-mono text-sm font-bold text-tiza transition hover:bg-borde"
              >
                {nombre(i)}
              </button>
              {i < 7 && (
                <span
                  className={`rounded-md px-2 py-1 font-mono text-xs ${
                    saltos[i] === 1
                      ? "bg-sol font-bold text-noche"
                      : "text-humo"
                  }`}
                >
                  {saltos[i]}
                </span>
              )}
            </span>
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-humo">
          los números son los semitonos que hay de una nota a la siguiente
        </p>

        <button
          onClick={() => setSostenidos((s) => !s)}
          className={`mt-5 rounded-full px-4 py-2 text-sm font-bold transition ${
            sostenidos
              ? "bg-sol text-noche"
              : "bg-carta-2 text-tiza hover:bg-borde"
          }`}
        >
          {sostenidos ? "↩ Volver a los nombres de siempre" : "✳ Escribirlas como sostenidos"}
        </button>

        <div className="mt-4 rounded-2xl bg-noche-2 px-4 py-3 text-sm leading-relaxed text-humo">
          {sostenidos ? (
            <>
              Ahí está: <span className="font-semibold text-sol">Mi♯ es Fa</span>{" "}
              y <span className="font-semibold text-sol">Si♯ es Do</span>. No es
              una licencia — es la misma tecla. Subirle un semitono a Mi te deja
              en Fa porque en el medio no hay ninguna negra donde caer.
            </>
          ) : (
            <>
              Entre casi todas las notas vecinas de la escala hay una tecla negra
              en el medio: <span className="font-mono text-tiza">2</span>{" "}
              semitonos. Entre{" "}
              <span className="font-semibold text-sol">mi y fa</span> y entre{" "}
              <span className="font-semibold text-sol">si y do</span> no hay
              nada: <span className="font-mono text-tiza">1</span>. Dale al botón
              para ver qué pasa si igual las escribís con sostenido.
            </>
          )}
        </div>
      </div>
    </div>
  );
}
