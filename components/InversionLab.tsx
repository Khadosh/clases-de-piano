"use client";

import { useCallback, useMemo, useState } from "react";
import Keyboard, { type Mark, type Tone } from "./Keyboard";
import {
  CHORD_QUALITIES,
  GRADOS_ACORDE,
  NOMBRES_INVERSION,
  NOTES_EN,
  NOTES_ES,
  cantidadDeInversiones,
  chordPitches,
  chordSymbol,
  invertir,
  noteName,
  qualityById,
  simboloConBajo,
  stackLabel,
  type ChordQuality,
} from "@/lib/music";
import { playArpeggio, playChord, wakeAudio } from "@/lib/audio";

export default function InversionLab({
  qualityIds,
}: {
  qualityIds: string[];
}) {
  const qualities = useMemo(() => {
    const qs = qualityIds
      .map((id) => qualityById(id))
      .filter((q): q is ChordQuality => Boolean(q));
    return qs.length ? qs : CHORD_QUALITIES;
  }, [qualityIds]);

  const [root, setRoot] = useState(0);
  const [qid, setQid] = useState(qualities[0].id);
  const [inv, setInv] = useState(0);

  const quality = qualityById(qid) ?? qualities[0];
  const maxInv = cantidadDeInversiones(quality);
  const inversion = Math.min(inv, maxInv);

  // La posición fundamental, y la misma con las de abajo subidas una octava.
  const fundamental = chordPitches(48 + root, quality);
  const pitches = invertir(fundamental, inversion);

  // Los grados quedan rotados: en 1ª inversión el bajo es la tercera.
  const gradosRotados = [
    ...GRADOS_ACORDE.slice(0, quality.stack.length + 1),
  ];
  const grados = [
    ...gradosRotados.slice(inversion),
    ...gradosRotados.slice(0, inversion),
  ];

  const marks: Mark[] = pitches.map((p, i) => ({
    pitch: p,
    tone: quality.tone as Tone,
    label: grados[i],
    // La nota que subió de octava se marca, que es de lo que se trata.
    active: i >= pitches.length - inversion,
  }));

  const sonar = useCallback(
    (arpegio: boolean) => {
      wakeAudio();
      const ps = invertir(chordPitches(48 + root, quality), inversion);
      if (arpegio) playArpeggio(ps);
      else playChord(ps);
    },
    [root, quality, inversion],
  );

  /** Recorre las inversiones una tras otra, que es como se entiende de una. */
  const girar = useCallback(() => {
    wakeAudio();
    const ps = chordPitches(48 + root, quality);
    for (let n = 0; n <= maxInv; n++) {
      const cuando = n * 0.75;
      setTimeout(() => {
        setInv(n);
        playChord(invertir(ps, n), 0.9);
      }, cuando * 1000);
    }
  }, [root, quality, maxInv]);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap gap-1.5 border-b border-borde/60 p-4">
        {NOTES_ES.map((n, i) => (
          <button
            key={n}
            onClick={() => setRoot(i)}
            className={`rounded-xl px-2.5 py-1.5 text-sm font-semibold transition ${
              root === i ? "bg-sol text-noche" : "bg-carta-2 text-humo hover:text-tiza"
            }`}
          >
            {NOTES_EN[i]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-borde/60 p-4">
        {qualities.map((q) => (
          <button
            key={q.id}
            onClick={() => {
              setQid(q.id);
              setInv((n) => Math.min(n, cantidadDeInversiones(q)));
            }}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
              qid === q.id ? "bg-tiza text-noche" : "bg-carta-2 text-humo hover:text-tiza"
            }`}
          >
            {q.name}
            <span className="ml-1.5 font-mono text-[11px] opacity-70">
              {q.stack.length + 1} notas
            </span>
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* Las inversiones disponibles cambian según cuántas notas tenga */}
        <div className="mb-4 flex flex-wrap gap-2">
          {Array.from({ length: maxInv + 1 }, (_, n) => (
            <button
              key={n}
              onClick={() => setInv(n)}
              className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                inversion === n
                  ? "bg-uva text-noche"
                  : "bg-carta-2 text-humo hover:text-tiza"
              }`}
            >
              {NOMBRES_INVERSION[n]}
            </button>
          ))}
          <button
            onClick={girar}
            className="ml-auto rounded-xl bg-carta-2 px-3 py-2 text-sm font-bold transition hover:bg-borde"
          >
            🔄 Girarlas todas
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="font-display text-4xl font-black text-sol">
            {simboloConBajo(root, quality, inversion)}
          </span>
          <span className="text-humo">
            {NOTES_ES[root]} {quality.name.toLowerCase()},{" "}
            {NOMBRES_INVERSION[inversion]}
          </span>
          <span className="ml-auto rounded-full bg-carta-2 px-3 py-1 font-mono text-sm">
            {stackLabel(quality)}
          </span>
        </div>

        <div className="rounded-2xl bg-noche-2 p-3">
          <Keyboard from={45} to={81} marks={marks} />
        </div>

        <div className="mt-4 rounded-2xl bg-noche-2 px-4 py-3">
          <p className="font-mono text-lg">
            {pitches.map((p, i) => (
              <span key={i}>
                {i > 0 && <span className="text-humo"> · </span>}
                <span
                  className={
                    i >= pitches.length - inversion ? "text-sol" : undefined
                  }
                >
                  {noteName(p)}
                </span>
              </span>
            ))}
          </p>
          <p className="mt-1.5 text-sm text-humo">
            {inversion === 0 ? (
              <>
                Posición fundamental: la nota que le da el nombre al acorde está
                abajo de todo.
              </>
            ) : (
              <>
                {inversion === 1 ? "La nota de abajo subió" : `Las ${inversion} notas de abajo subieron`}{" "}
                una octava (en amarillo). Son <em>las mismas notas</em> que{" "}
                {chordSymbol(root, quality)}, pero ahora el bajo es{" "}
                <span className="font-semibold text-tiza">
                  {noteName(pitches[0])}
                </span>
                , la {grados[0] === "3" ? "tercera" : grados[0] === "5" ? "quinta" : "séptima"}.
              </>
            )}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
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
          <p className="w-full pt-1 text-xs text-humo">
            Los números en las teclas son los grados del acorde, y no cambian al
            invertir: lo que cambia es cuál queda abajo.
          </p>
        </div>
      </div>
    </div>
  );
}
