"use client";

import { useCallback, useEffect, useState } from "react";
import Keyboard, { type Mark } from "./Keyboard";
import { corregirAcorde } from "@/lib/music";
import { generarExamen, type OpcionesExamen, type Pregunta } from "@/lib/examen";
import { playChord, playNote, wakeAudio } from "@/lib/audio";

/**
 * El examen de la clase.
 *
 * Es un juguete, no un boletín: el puntaje se pierde al recargar y las
 * preguntas cambian cada vez, así que no se puede aprobar de memoria. Por eso
 * también arranca cerrado — nadie quiere que una clase termine con un examen
 * abierto en la cara.
 */
export default function Examen(opciones: OpcionesExamen) {
  const [preguntas, setPreguntas] = useState<Pregunta[] | null>(null);
  const [i, setI] = useState(0);
  const [elegida, setElegida] = useState<number | null>(null);
  const [armado, setArmado] = useState<number[]>([]);
  const [resuelta, setResuelta] = useState(false);
  const [bien, setBien] = useState(0);

  const arrancar = useCallback(() => {
    setPreguntas(generarExamen(opciones));
    setI(0);
    setElegida(null);
    setArmado([]);
    setResuelta(false);
    setBien(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opciones.qualityIds.join(","), opciones.inversiones, opciones.semitonos]);

  const pregunta = preguntas?.[i];
  const terminado = Boolean(preguntas && i >= preguntas.length);

  // Las de armar se corrigen solas al completar el acorde, como el dictado.
  const veredicto =
    pregunta?.tipo === "armar"
      ? corregirAcorde(armado, pregunta.pitches)
      : null;

  useEffect(() => {
    if (!veredicto || resuelta) return;
    setResuelta(true);
    if (veredicto === "bien") {
      setBien((n) => n + 1);
      wakeAudio();
      if (pregunta?.tipo === "armar") playChord(pregunta.pitches);
    }
  }, [veredicto, resuelta, pregunta]);

  if (!preguntas) {
    return (
      <div className="card flex flex-wrap items-center gap-4 px-6 py-5">
        <span className="text-3xl">📝</span>
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-bold">
            Examen de la clase
          </h2>
          <p className="text-sm text-humo">
            Ocho preguntas sobre lo de hoy. Se arma distinto cada vez, así que
            no se puede aprobar de memoria.
          </p>
        </div>
        <button
          onClick={arrancar}
          className="ml-auto rounded-full bg-sol px-5 py-2.5 font-bold text-noche transition hover:brightness-110"
        >
          Tomar el examen →
        </button>
      </div>
    );
  }

  if (terminado) {
    const total = preguntas.length;
    const pct = Math.round((bien / total) * 100);
    const mensaje =
      pct === 100
        ? "Perfecto. Andá a molestar al profe con esto."
        : pct >= 75
          ? "Muy bien. Lo que falló, mirá la explicación y volvé a intentar."
          : pct >= 50
            ? "Va saliendo. Las recetas se aprenden contando, no mirando."
            : "Todavía no. Volvé al laboratorio, contá las fórmulas, y probá de nuevo.";
    return (
      <div className="card px-6 py-7 text-center">
        <p className="text-xs tracking-[0.25em] text-humo uppercase">
          Examen terminado
        </p>
        <p className="font-display my-3 text-6xl font-black text-sol">
          {bien}/{total}
        </p>
        <p className="mx-auto max-w-md text-humo">{mensaje}</p>
        <button
          onClick={arrancar}
          className="mt-5 rounded-full bg-sol px-5 py-2.5 font-bold text-noche transition hover:brightness-110"
        >
          Otro examen
        </button>
      </div>
    );
  }

  if (!pregunta) return null;

  const siguiente = () => {
    setI((n) => n + 1);
    setElegida(null);
    setArmado([]);
    setResuelta(false);
  };

  const responder = (idx: number) => {
    if (resuelta || pregunta.tipo !== "opciones") return;
    setElegida(idx);
    setResuelta(true);
    if (idx === pregunta.correcta) setBien((n) => n + 1);
  };

  const tocarTecla = (p: number) => {
    if (resuelta) return;
    wakeAudio();
    if (!armado.includes(p)) playNote(p, 0.9);
    setArmado((prev) =>
      prev.includes(p)
        ? prev.filter((x) => x !== p)
        : [...prev, p].sort((a, b) => a - b),
    );
  };

  const marks: Mark[] =
    pregunta.tipo !== "armar"
      ? []
      : resuelta && veredicto !== "bien"
        ? // Al corregir se muestra la respuesta, no sólo el error.
          pregunta.pitches.map((p) => ({
            pitch: p,
            tone: "menta" as const,
            label: "✓",
          }))
        : // Mientras armás, todas iguales: corregir tecla por tecla convertiría
          // el examen en adivinar por descarte.
          armado.map((p) => ({
            pitch: p,
            tone: veredicto === "bien" ? ("menta" as const) : ("luna" as const),
          }));

  const acerto =
    pregunta.tipo === "armar"
      ? veredicto === "bien"
      : elegida === pregunta.correcta;

  return (
    <div className="card overflow-hidden">
      {/* Progreso */}
      <div className="flex items-center gap-3 border-b border-borde/60 px-5 py-3">
        <span className="text-xs tracking-[0.2em] text-humo uppercase">
          Pregunta {i + 1} de {preguntas.length}
        </span>
        <div className="ml-auto flex gap-1">
          {preguntas.map((_, n) => (
            <span
              key={n}
              className={`h-1.5 w-5 rounded-full ${
                n < i ? "bg-menta" : n === i ? "bg-sol" : "bg-carta-2"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="p-5">
        {pregunta.destacado && (
          <p className="font-display mb-2 text-center text-5xl font-black text-sol">
            {pregunta.destacado}
          </p>
        )}
        <p className="mb-5 text-center text-lg">{pregunta.consigna}</p>

        {pregunta.tipo === "opciones" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {pregunta.opciones.map((op, idx) => {
              const esLaCorrecta = idx === pregunta.correcta;
              const clase = !resuelta
                ? "bg-carta-2 hover:bg-borde"
                : esLaCorrecta
                  ? "bg-menta text-noche"
                  : idx === elegida
                    ? "bg-brasa text-noche"
                    : "bg-carta-2 opacity-45";
              return (
                <button
                  key={idx}
                  onClick={() => responder(idx)}
                  disabled={resuelta}
                  className={`rounded-2xl px-4 py-3 text-left font-mono font-semibold transition ${clase}`}
                >
                  {op}
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-noche-2 p-3">
              <Keyboard
                from={45}
                to={81}
                marks={marks}
                onKeyPress={resuelta ? undefined : tocarTecla}
              />
            </div>
            {!resuelta && (
              <p className="mt-3 text-center text-sm text-humo">
                {pregunta.pitches.length - armado.length > 0
                  ? `Faltan ${pregunta.pitches.length - armado.length} notas.`
                  : "Sacá alguna: te pasaste."}
              </p>
            )}
          </>
        )}

        {resuelta && (
          <div
            className={`mt-5 rounded-2xl border px-4 py-3 ${
              acerto
                ? "border-menta/40 bg-menta/10"
                : "border-brasa/40 bg-brasa/10"
            }`}
          >
            <p
              className={`font-display text-lg font-bold ${
                acerto ? "text-menta" : "text-brasa"
              }`}
            >
              {acerto
                ? "Bien"
                : veredicto === "bajo"
                  ? "Casi: las notas están, el bajo no"
                  : "No"}
            </p>
            <p className="mt-1 text-sm text-humo">{pregunta.explicacion}</p>
            {pregunta.tipo === "armar" && !acerto && (
              <p className="mt-1 font-mono text-sm text-tiza">
                {pregunta.notas.join(" · ")}
              </p>
            )}
            <button
              onClick={siguiente}
              className="mt-3 rounded-full bg-sol px-4 py-2 text-sm font-bold text-noche transition hover:brightness-110"
            >
              {i + 1 === preguntas.length ? "Ver el resultado →" : "Siguiente →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
