"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Keyboard, { type Mark } from "./Keyboard";
import NotasPuestas from "./NotasPuestas";
import {
  chordPitches,
  mod12,
  noteName,
  parseCifrado,
  type Chord,
} from "@/lib/music";
import {
  bajoDe,
  esElAcorde,
  mejorMovimiento,
  notasComunes,
  recorridoOptimo,
  saltoDelBajo,
  totalDelRecorrido,
  viajeDeLaMano,
  type Criterio,
} from "@/lib/enlace";
import { playChord, playNote, wakeAudio } from "@/lib/audio";

/**
 * Enlazar una progresión: te la damos toda en estado fundamental y vos vas
 * girando cada acorde para moverte lo menos posible.
 *
 * **No corrige, puntúa.** Muy seguido hay dos inversiones igual de buenas, así
 * que decir "la respuesta correcta es ésta" sería mentir. En vez de eso te
 * muestra cuánto moviste y cuánto era el mínimo posible desde donde estabas: el
 * ejercicio pasa a ser bajar un número, y podés empatar el óptimo por un camino
 * distinto al que esperaba la app.
 */

const BASE = 48; // Do3

interface Paso {
  /** Lo que efectivamente tocaste. */
  pitches: number[];
  costoTuyo: number;
  costoMinimo: number;
}

export default function Enlace({ acordes }: { acordes: string[] }) {
  const progresion = useMemo(
    () =>
      acordes
        .map((sym) => ({ sym, chord: parseCifrado(sym) }))
        .filter((x): x is { sym: string; chord: Chord } => x.chord !== null),
    [acordes],
  );

  const [criterio, setCriterio] = useState<Criterio>("bajo");
  const [pasos, setPasos] = useState<Paso[]>([]);
  const [armado, setArmado] = useState<number[]>([]);
  const [mostrando, setMostrando] = useState(false);

  // El primero se regala: es el que fija la tonalidad y la posición de la mano.
  const primero = useMemo(
    () =>
      progresion.length
        ? chordPitches(BASE + progresion[0].chord.root, progresion[0].chord.quality)
        : [],
    [progresion],
  );

  /**
   * El mejor recorrido posible de la progresión entera, que es contra lo que se
   * compara el total.
   *
   * Ojo: NO es la suma de los mínimos de cada paso. Eso da un número más chico y
   * mentiroso, porque cada mínimo se calcula desde la posición (mala) en la que
   * estabas — sobre esta progresión daba 0, como si se pudiera hacer entera sin
   * mover el bajo, y no se puede. El de cada paso sirve para decirte "acá se
   * podía menos"; el del camino entero es el que va abajo como objetivo.
   */
  const totalMinimo = useMemo(
    () =>
      totalDelRecorrido(
        recorridoOptimo(progresion.map((p) => p.chord), criterio, BASE).pasos,
        criterio,
      ),
    [progresion, criterio],
  );

  const reiniciar = useCallback(() => {
    setPasos([{ pitches: primero, costoTuyo: 0, costoMinimo: 0 }]);
    setArmado([]);
    setMostrando(false);
  }, [primero]);

  useEffect(() => {
    reiniciar();
  }, [reiniciar, criterio]);

  const i = pasos.length; // cuál toca ahora
  const terminado = i >= progresion.length;
  const actual = terminado ? null : progresion[i];
  const previa = pasos[pasos.length - 1]?.pitches ?? primero;

  // Se corrige recién cuando el acorde está completo, igual que el dictado.
  const completo =
    actual !== null &&
    armado.length === chordPitches(0, actual.chord.quality).length;
  const acerto = completo && actual !== null && esElAcorde(armado, actual.chord);

  useEffect(() => {
    if (!completo || !acerto || !actual) return;
    const min = mejorMovimiento(previa, actual.chord, criterio);
    const tuyo =
      criterio === "bajo"
        ? saltoDelBajo(previa, armado)
        : viajeDeLaMano(previa, armado);
    const minimo =
      criterio === "bajo"
        ? saltoDelBajo(previa, min.disposicion.pitches)
        : viajeDeLaMano(previa, min.disposicion.pitches);
    wakeAudio();
    playChord([...armado].sort((a, b) => a - b));
    setPasos((p) => [
      ...p,
      { pitches: [...armado].sort((a, b) => a - b), costoTuyo: tuyo, costoMinimo: minimo },
    ]);
    setArmado([]);
  }, [completo, acerto, actual, previa, armado, criterio]);

  const tocar = (p: number) => {
    if (terminado || mostrando) return;
    wakeAudio();
    if (!armado.includes(p)) playNote(p, 0.9);
    setArmado((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p].sort((a, b) => a - b),
    );
  };

  /** Toca el mejor recorrido posible, para escucharlo. */
  const mostrarOptimo = useCallback(() => {
    wakeAudio();
    setMostrando(true);
    // El del camino entero, no el de ir eligiendo lo mejor en cada paso: si no,
    // el botón tocaría algo peor que el número que muestra abajo.
    const optimo = recorridoOptimo(
      progresion.map((p) => p.chord),
      criterio,
      BASE,
    ).pasos.map((d) => d.pitches);
    optimo.forEach((ps, n) => setTimeout(() => playChord(ps, 1.1), n * 900));
    setTimeout(() => setMostrando(false), optimo.length * 900 + 400);
    setPasos([{ pitches: primero, costoTuyo: 0, costoMinimo: 0 }]);
    setArmado([]);
    // Se dejan puestos como referencia, sin puntaje: es una demostración.
    optimo.slice(1).forEach((ps, n) =>
      setTimeout(
        () =>
          setPasos((p) => [
            ...p,
            { pitches: ps, costoTuyo: 0, costoMinimo: 0 },
          ]),
        (n + 1) * 900,
      ),
    );
  }, [primero, progresion, criterio]);

  if (!progresion.length) return null;

  const marks: Mark[] = terminado
    ? previa.map((p) => ({ pitch: p, tone: "menta" as const }))
    : [
        // Lo que venías tocando queda como fantasma: es contra eso que se mide
        // cuánto te moviste, así que tiene que estar a la vista.
        ...previa.map((p) => ({ pitch: p, tone: "niebla" as const, ghost: true })),
        ...armado.map((p) => ({
          pitch: p,
          tone: (completo && !acerto ? "brasa" : "luna") as Mark["tone"],
        })),
      ];

  const totalTuyo = pasos.reduce((s, p) => s + p.costoTuyo, 0);
  const unidad = criterio === "bajo" ? "el bajo" : "la mano";

  return (
    <div className="card overflow-hidden">
      {/* Criterio */}
      <div className="flex flex-wrap items-center gap-2 border-b border-borde/60 p-4">
        <span className="text-xs tracking-[0.2em] text-humo uppercase">
          Mover lo menos posible
        </span>
        {(["bajo", "mano"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCriterio(c)}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
              criterio === c
                ? "bg-sol text-noche"
                : "bg-carta-2 text-humo hover:text-tiza"
            }`}
          >
            {c === "bajo" ? "el bajo" : "la mano entera"}
          </button>
        ))}
        <button
          onClick={reiniciar}
          className="ml-auto rounded-xl bg-carta-2 px-3 py-1.5 text-sm font-bold transition hover:bg-borde"
        >
          ↺ De nuevo
        </button>
      </div>

      {/* La progresión */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-borde/60 p-4">
        {progresion.map(({ sym }, n) => {
          const hecho = n < pasos.length;
          const esAhora = n === pasos.length;
          const paso = pasos[n];
          const optimo = hecho && n > 0 && paso.costoTuyo === paso.costoMinimo;
          return (
            <span
              key={n}
              className={`rounded-xl px-2.5 py-1.5 font-mono text-sm font-bold ${
                esAhora
                  ? "bg-sol text-noche"
                  : hecho
                    ? n === 0
                      ? "bg-carta-2 text-humo"
                      : optimo
                        ? "bg-menta/25 text-menta"
                        : "bg-carta-2 text-tiza"
                    : "bg-carta-2/50 text-humo/50"
              }`}
            >
              {sym}
              {hecho && n > 0 && (
                <span className="ml-1.5 text-[10px] opacity-80">
                  +{paso.costoTuyo}
                  {!optimo && `/${paso.costoMinimo}`}
                </span>
              )}
            </span>
          );
        })}
      </div>

      <div className="p-5">
        {terminado ? (
          <div className="mb-4 text-center">
            <p className="text-xs tracking-[0.25em] text-humo uppercase">
              Progresión enlazada
            </p>
            <p className="font-display my-2 text-5xl font-black text-sol">
              {totalTuyo}
              <span className="text-2xl text-humo"> / {totalMinimo}</span>
            </p>
            <p className="text-sm text-humo">
              Moviste {unidad} {totalTuyo} semitonos en total.{" "}
              {totalTuyo === totalMinimo
                ? "Es el mínimo posible: no había forma de hacerlo mejor."
                : `El mínimo era ${totalMinimo}. Probá nuevo mirando dónde se te fue.`}
            </p>
          </div>
        ) : (
          <div className="mb-4 text-center">
            <p className="text-xs tracking-[0.25em] text-humo uppercase">
              Acorde {i + 1} de {progresion.length}
            </p>
            <p className="font-display my-2 text-6xl font-black text-sol">
              {actual?.sym}
            </p>
            <p className="text-sm text-humo">
              Armalo en la inversión que menos mueva{" "}
              <strong className="text-tiza">{unidad}</strong> desde el acorde
              anterior, que está en gris.
            </p>
          </div>
        )}

        <div className="rounded-2xl bg-noche-2 p-3">
          <Keyboard from={45} to={84} marks={marks} onKeyPress={tocar} />
        </div>

        {!terminado && (
          <NotasPuestas
            notas={armado}
            faltan={
              (actual ? chordPitches(0, actual.chord.quality).length : 0) -
              armado.length
            }
            onQuitar={(p) => setArmado((prev) => prev.filter((x) => x !== p))}
            onBorrar={() => setArmado([])}
          />
        )}

        {completo && !acerto && (
          <p className="mt-3 text-center text-sm text-brasa">
            Ésas no son las notas de {actual?.sym}. Cualquier inversión vale,
            pero tienen que ser sus notas.
          </p>
        )}

        {pasos.length > 1 && (
          <div className="mt-4 rounded-2xl bg-noche-2 px-4 py-3 text-sm">
            <p className="text-humo">
              Último movimiento:{" "}
              <span className="font-mono text-tiza">
                {noteName(bajoDe(pasos[pasos.length - 2].pitches))} →{" "}
                {noteName(bajoDe(pasos[pasos.length - 1].pitches))}
              </span>{" "}
              en el bajo, {notasComunes(
                pasos[pasos.length - 2].pitches,
                pasos[pasos.length - 1].pitches,
              )}{" "}
              notas en común.
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={mostrarOptimo}
            disabled={mostrando}
            className="rounded-full bg-carta-2 px-4 py-2 text-sm font-bold transition hover:bg-borde disabled:opacity-50"
          >
            👂 Escuchar el óptimo
          </button>
        </div>
      </div>
    </div>
  );
}
