"use client";

import { useState } from "react";
import {
  FUNCION_DE_GRADO,
  PRESTAMOS,
  PROGRESIONES,
  TONALIDAD_MAYOR,
  cadenciaAlFinal,
  cifradoDelAcorde,
  conSeptima,
  esPrestado,
  gradoDe,
  rachaDeFuncion,
  type AcordeDeLaSecuencia,
  type Funcion,
} from "@/lib/grados";

/**
 * El armador de progresiones que comparten los ejercicios de melodía: las
 * progresiones del catálogo, la paleta de grados diatónicos, y —desde la
 * clase 4— la fila de los préstamos de las menores paralelas.
 *
 * La paleta hace lo que hacen las herramientas que funcionan (Hookpad, sin ir
 * más lejos): ofrece lo diatónico como lo normal y lo prestado etiquetado con
 * su origen, cada acorde pintado por su función — que el préstamo hereda del
 * grado: el Fm sigue siendo subdominante, y la regla de oro ni se entera.
 */

const COLOR: Record<Funcion, { chip: string; suave: string }> = {
  reposo: { chip: "bg-menta text-noche", suave: "bg-menta/15 text-menta" },
  subdominante: { chip: "bg-sol text-noche", suave: "bg-sol/15 text-sol" },
  dominante: { chip: "bg-brasa text-noche", suave: "bg-brasa/15 text-brasa" },
};

const chip = (activo: boolean) =>
  `rounded-xl px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition ${
    activo ? "bg-tiza text-noche" : "bg-carta-2 text-humo hover:text-tiza"
  }`;

/** El sufijo romano de cada cuatriada: V7, ii7, Imaj7, viiø. */
const SUFIJO_ROMANO: Record<string, string> = {
  maj7: "maj7",
  min7: "7",
  dom7: "7",
  m7b5: "ø",
};

/** La cifra romana del acorde, con el préstamo en minúscula de verdad: iv. */
export function cifraDe(a: AcordeDeLaSecuencia): string {
  const base = (() => {
    const cifra = TONALIDAD_MAYOR[gradoDe(a)].cifra;
    if (!esPrestado(a)) return cifra;
    // La cifra del prestado sale de su cifrado: minúscula si es menor, ° si es
    // disminuido, + si aumentado, ♭ adelante si la fundamental se corrió.
    const cifrado = cifradoDelAcorde(a);
    const romano = ["I", "II", "III", "IV", "V", "VI", "VII"][gradoDe(a)];
    const bemol = ["Eb", "Ab", "Bb", "Db", "Gb"].some((r) => cifrado.startsWith(r)) ? "♭" : "";
    if (cifrado.endsWith("dim")) return `${bemol}${romano.toLowerCase()}°`;
    if (cifrado.endsWith("aug")) return `${bemol}${romano}+`;
    if (cifrado.endsWith("m")) return `${bemol}${romano.toLowerCase()}`;
    return `${bemol}${romano}`;
  })();
  if (!conSeptima(a)) return base;
  return base + (SUFIJO_ROMANO[TONALIDAD_MAYOR[gradoDe(a)].cuatriada] ?? "7");
}

export default function SelectorDeAcordes({
  acordes,
  onCambiar,
  max = 8,
}: {
  acordes: AcordeDeLaSecuencia[];
  onCambiar: (acordes: AcordeDeLaSecuencia[]) => void;
  max?: number;
}) {
  // ¿La paleta suma tríadas o cuatriadas? Es un modo de escribir, no un dato
  // de la secuencia: se puede mezclar (C · G · G7 · C) cambiando en el medio.
  const [septima, setSeptima] = useState(false);

  const grados = acordes.map(gradoDe);
  const racha = rachaDeFuncion(grados);
  const cadencia = cadenciaAlFinal(grados);
  const lleno = acordes.length >= max;

  const esLaProgresion = (p: (typeof PROGRESIONES)[number]) =>
    acordes.length === p.grados.length &&
    acordes.every((a, i) => !esPrestado(a) && !conSeptima(a) && gradoDe(a) === p.grados[i]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {PROGRESIONES.map((p) => (
          <button
            key={p.nombre}
            onClick={() => onCambiar([...p.grados])}
            className={chip(esLaProgresion(p))}
          >
            {p.nombre}
          </button>
        ))}
      </div>

      <div className="mt-4 mb-2 flex flex-wrap items-center gap-2">
        <p className="text-sm text-humo">O armá la tuya grado por grado, como en el inventor:</p>
        {/* Tríada o cuatriada: la séptima de la clase 2, ahora en la secuencia.
            Cambia lo que agrega el próximo toque, así se puede mezclar. */}
        <span className="ml-auto flex items-center gap-1.5">
          <button onClick={() => setSeptima(false)} className={chip(!septima)}>
            tríadas
          </button>
          <button
            onClick={() => setSeptima(true)}
            className={chip(septima)}
            title="Las cuatriadas de la clase 2: el V se vuelve G7"
          >
            con séptima
          </button>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {TONALIDAD_MAYOR.map((_, g) => {
          const a: AcordeDeLaSecuencia = septima ? { grado: g, septima: true } : g;
          return (
            <button
              key={g}
              onClick={() => onCambiar([...acordes, a])}
              disabled={lleno}
              className={`rounded-xl px-3 py-1.5 text-center transition hover:brightness-110 disabled:opacity-40 ${COLOR[FUNCION_DE_GRADO[g]].chip}`}
            >
              <span className="block font-mono text-sm font-bold">{cifraDe(a)}</span>
              <span className="block text-[11px] opacity-80">{cifradoDelAcorde(a)}</span>
            </button>
          );
        })}
      </div>

      {/* Los préstamos de la clase 4: los acordes de las menores paralelas
          que el campo mayor no tiene, con el Fm —el recomendado— primero. */}
      <p className="mt-3 mb-2 text-sm text-humo">
        Y los <strong className="text-tiza">préstamos</strong> de las menores
        paralelas — la función la pone el grado, no el préstamo:
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESTAMOS.map((p) => {
          const a = { grado: p.grado, deEscala: p.deEscala };
          return (
            <button
              key={p.cifrado}
              onClick={() => onCambiar([...acordes, a])}
              disabled={lleno}
              title={`Prestado de la ${p.origen}`}
              className={`rounded-xl border border-dashed px-3 py-1.5 text-center transition hover:brightness-110 disabled:opacity-40 ${
                COLOR[FUNCION_DE_GRADO[p.grado]].suave
              } ${p.cifrado === "Fm" ? "border-current" : "border-borde"}`}
            >
              <span className="block font-mono text-sm font-bold">{cifraDe(a)}</span>
              <span className="block text-[11px] opacity-80">{p.cifrado}</span>
            </button>
          );
        })}
      </div>

      {acordes.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {acordes.map((a, n) => (
            <span
              key={n}
              className={`rounded-xl px-3 py-1.5 font-mono text-sm font-bold ${
                COLOR[FUNCION_DE_GRADO[gradoDe(a)]].suave
              } ${esPrestado(a) ? "border border-dashed border-current" : ""}`}
            >
              {cifraDe(a)}
              <span className="ml-1.5 text-[11px] opacity-75">{cifradoDelAcorde(a)}</span>
            </span>
          ))}
          <button
            onClick={() => onCambiar(acordes.slice(0, -1))}
            className="ml-2 rounded-full bg-carta-2 px-3 py-1.5 text-xs font-semibold text-humo transition hover:text-tiza"
          >
            ↩ sacar el último
          </button>
        </div>
      )}

      {lleno && (
        <p className="mt-2 text-xs text-humo">
          Hasta {max} compases: más que eso ya no es un ejercicio, es una obra.
        </p>
      )}
      {racha >= 4 && (
        <p className="mt-3 rounded-xl bg-brasa/15 px-4 py-2 text-sm text-brasa">
          Cuatro funciones iguales seguidas: la regla de oro pide variar.
        </p>
      )}
      {cadencia && (
        <p className="mt-3 text-sm text-menta">
          El final forma una cadencia{" "}
          {cadencia === "autentica" ? "auténtica" : cadencia === "rota" ? "rota" : "compuesta plagal"}
          : la melodía va a tener dónde aterrizar.
        </p>
      )}
    </div>
  );
}
