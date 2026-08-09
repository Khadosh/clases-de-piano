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
  chordNameEs,
  chordPitches,
  chordSymbol,
  invertir,
  noteName,
  pickRandom,
  qualityById,
  simboloConBajo,
  stackLabel,
  type ChordQuality,
} from "@/lib/music";
import { playArpeggio, playChord, wakeAudio } from "@/lib/audio";

/**
 * El laboratorio de acordes.
 *
 * Armar un acorde y girarlo son la misma operación mirada desde dos lugares
 * —las mismas notas, la misma receta, sólo cambia cuál queda abajo— así que
 * son una sola herramienta con un eje más, y no dos. `inversiones` muestra ese
 * eje; sin él queda el laboratorio pelado, para cuando todavía no se vio.
 */
interface Props {
  qualityIds: string[];
  /** El juego del profe: sale un cifrado y ponés las manos. */
  dictation?: boolean;
  /** Muestra el selector de inversión y deja pedirlas en el dictado. */
  inversiones?: boolean;
}

const BASE = 48; // Do3, así entra cualquier inversión sin irse del teclado

export default function ChordLab({
  qualityIds,
  dictation = false,
  inversiones = false,
}: Props) {
  const qualities = useMemo(() => {
    const qs = qualityIds
      .map((id) => qualityById(id))
      .filter((q): q is ChordQuality => Boolean(q));
    return qs.length ? qs : CHORD_QUALITIES;
  }, [qualityIds]);

  const [root, setRoot] = useState(0);
  const [qid, setQid] = useState(qualities[0].id);
  const [inv, setInv] = useState(0);

  // Dictado: el profe canta un cifrado raro y vos ponés las manos.
  const [dictado, setDictado] = useState<{
    root: number;
    quality: ChordQuality;
    inv: number;
  } | null>(null);
  const [revelado, setRevelado] = useState(false);
  const [ronda, setRonda] = useState(0);
  const [dictarInversiones, setDictarInversiones] = useState(false);

  const elegido = qualityById(qid) ?? qualities[0];
  const mostrado = dictado ?? {
    root,
    quality: elegido,
    inv: Math.min(inv, cantidadDeInversiones(elegido)),
  };
  const maxInv = cantidadDeInversiones(mostrado.quality);
  const inversion = Math.min(mostrado.inv, maxInv);

  const fundamental = chordPitches(BASE + mostrado.root, mostrado.quality);
  const pitches = invertir(fundamental, inversion);

  // Los grados quedan rotados: en 1ª inversión el bajo es la tercera.
  const gradosBase = GRADOS_ACORDE.slice(0, mostrado.quality.stack.length + 1);
  const grados = [...gradosBase.slice(inversion), ...gradosBase.slice(0, inversion)];

  const oculto = Boolean(dictado) && !revelado;

  const marks: Mark[] = oculto
    ? []
    : pitches.map((p, i) => {
        // Las que subieron una octava se pintan distinto: de eso se trata
        // invertir, y si no se ve cuáles se movieron no se entiende nada.
        const subio = inversion > 0 && i >= pitches.length - inversion;
        return {
          pitch: p,
          tone: (subio ? "sol" : mostrado.quality.tone) as Tone,
          label: grados[i],
          active: subio,
        };
      });

  const sonar = useCallback(
    (arpegio: boolean) => {
      wakeAudio();
      const ps = invertir(
        chordPitches(BASE + mostrado.root, mostrado.quality),
        inversion,
      );
      if (arpegio) playArpeggio(ps);
      else playChord(ps);
    },
    [mostrado.root, mostrado.quality, inversion],
  );

  /** Recorre las inversiones una tras otra, que es como se entiende de una. */
  const girar = useCallback(() => {
    wakeAudio();
    setDictado(null);
    const q = elegido;
    const ps = chordPitches(BASE + root, q);
    for (let n = 0; n <= cantidadDeInversiones(q); n++) {
      setTimeout(() => {
        setInv(n);
        playChord(invertir(ps, n), 0.9);
      }, n * 750);
    }
  }, [root, elegido]);

  const nuevoDictado = () => {
    wakeAudio();
    const q = pickRandom(qualities);
    setDictado({
      root: Math.floor(Math.random() * 12),
      quality: q,
      inv:
        dictarInversiones && inversiones
          ? Math.floor(Math.random() * (cantidadDeInversiones(q) + 1))
          : 0,
    });
    setRevelado(false);
    setRonda((n) => n + 1);
  };

  const salirDelDictado = () => setDictado(null);

  return (
    <div className="card overflow-hidden">
      {/* Fundamental */}
      <div className="flex flex-wrap gap-1.5 border-b border-borde/60 p-4">
        {NOTES_ES.map((n, i) => (
          <button
            key={n}
            onClick={() => {
              salirDelDictado();
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

      {/* Receta */}
      <div className="flex flex-wrap gap-1.5 border-b border-borde/60 p-4">
        {qualities.map((q) => (
          <button
            key={q.id}
            onClick={() => {
              salirDelDictado();
              setQid(q.id);
              setInv((n) => Math.min(n, cantidadDeInversiones(q)));
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

      {/* Inversión */}
      {inversiones && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-borde/60 p-4">
          {Array.from(
            { length: cantidadDeInversiones(elegido) + 1 },
            (_, n) => (
              <button
                key={n}
                onClick={() => {
                  salirDelDictado();
                  setInv(n);
                }}
                className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                  !dictado && inversion === n
                    ? "bg-uva text-noche"
                    : "bg-carta-2 text-humo hover:text-tiza"
                }`}
              >
                {NOMBRES_INVERSION[n]}
              </button>
            ),
          )}
          <button
            onClick={girar}
            className="ml-auto rounded-xl bg-carta-2 px-3 py-1.5 text-sm font-bold transition hover:bg-borde"
          >
            🔄 Girarlas todas
          </button>
        </div>
      )}

      <div className="p-5">
        {oculto ? (
          <div className="mb-4 text-center">
            <p className="text-xs tracking-[0.25em] text-humo uppercase">
              Dictado · ronda {ronda}
            </p>
            <p className="font-display my-3 text-6xl font-black text-sol">
              {simboloConBajo(mostrado.root, mostrado.quality, inversion)}
            </p>
            <p className="text-sm text-humo">
              {inversion > 0
                ? "Ojo con el bajo: la letra de después de la barra va abajo de todo."
                : "Poné las manos. Después fijate si te dio."}
            </p>
          </div>
        ) : (
          <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-display text-4xl font-black">
              {simboloConBajo(mostrado.root, mostrado.quality, inversion)}
            </span>
            <span className="text-humo">
              {chordNameEs(mostrado.root, mostrado.quality)}
              {inversion > 0 && `, ${NOMBRES_INVERSION[inversion]}`}
            </span>
            <span className="ml-auto rounded-full bg-carta-2 px-3 py-1 font-mono text-sm">
              {stackLabel(mostrado.quality)}
            </span>
          </div>
        )}

        <div className="rounded-2xl bg-noche-2 p-3">
          <Keyboard from={45} to={81} marks={marks} />
        </div>

        {!oculto && (
          <div className="mt-4 rounded-2xl bg-noche-2 px-4 py-3">
            <p className="font-mono text-lg">
              {pitches.map((p, i) => (
                <span key={i}>
                  {i > 0 && <span className="text-humo"> · </span>}
                  <span
                    className={
                      inversion > 0 && i >= pitches.length - inversion
                        ? "text-sol"
                        : undefined
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
                  {mostrado.quality.vibe} Los números en las teclas son los
                  grados: 1 la fundamental, después 3, 5 y 7.
                </>
              ) : (
                <>
                  {inversion === 1
                    ? "La nota de abajo subió"
                    : `Las ${inversion} notas de abajo subieron`}{" "}
                  una octava (en amarillo). Son <em>las mismas notas</em> que{" "}
                  {chordSymbol(mostrado.root, mostrado.quality)}, pero ahora el
                  bajo es{" "}
                  <span className="font-semibold text-tiza">
                    {noteName(pitches[0])}
                  </span>
                  , la{" "}
                  {grados[0] === "3"
                    ? "tercera"
                    : grados[0] === "5"
                      ? "quinta"
                      : "séptima"}
                  .
                </>
              )}
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
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

        {dictation && inversiones && (
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-humo">
            <input
              type="checkbox"
              checked={dictarInversiones}
              onChange={(e) => setDictarInversiones(e.target.checked)}
              className="accent-uva"
            />
            Que el dictado pida también inversiones (aparecen cifrados con
            barra, tipo <span className="font-mono text-tiza">Am/C</span>)
          </label>
        )}
      </div>
    </div>
  );
}
