"use client";

import { useCallback, useMemo, useState } from "react";
import FiguraSVG from "./FiguraSVG";
import {
  aCompuesto,
  aSimple,
  compasTexto,
  esCompuesto,
  figuraDeSubdivision,
  partesPorTiempo,
  patronDe,
  pulsoDe,
  subdivisionDe,
  tiemposDe,
  type Compas,
} from "@/lib/ritmo";
import { playClick, wakeAudio } from "@/lib/audio";
import { useMetronomo } from "@/lib/useMetronomo";

/**
 * La máquina de compases: elegís uno y lo escuchás.
 *
 * El botón que importa es el de la constante. 3/4 y 9/8 tienen las mismas notas
 * y suenan a dos cosas distintas, y eso no se explica con palabras — se aprieta
 * y se escucha dónde caen los golpes. Es lo mismo que decir "esto es europeo,
 * esto es chacarera".
 */

const SIMPLES: Compas[] = [
  { numerador: 2, denominador: 4 },
  { numerador: 3, denominador: 4 },
  { numerador: 4, denominador: 4 },
  { numerador: 3, denominador: 8 },
];

export default function Compases() {
  const [compas, setCompas] = useState<Compas>({ numerador: 3, denominador: 4 });
  const [sonando, setSonando] = useState(false);
  const [paso, setPaso] = useState(-1);
  const [pulso, setPulso] = useState(80);

  const patron = useMemo(() => patronDe(compas), [compas]);
  const compuesto = esCompuesto(compas);
  const { figura: figuraPulso, conPuntillo } = pulsoDe(compas);
  const subdiv = figuraDeSubdivision(compas);
  const porTiempo = partesPorTiempo(compas);

  // El metrónomo cuenta subdivisiones, no tiempos: por eso el bpm que se le
  // pasa es el pulso multiplicado por en cuántas partes se parte cada tiempo.
  useMetronomo({
    activo: sonando,
    bpm: pulso * porTiempo,
    total: patron.length,
    desde: () => 0,
    agendar: (i, cuando) => playClick(patron[i], cuando),
    mostrar: setPaso,
  });

  const arrancar = useCallback(() => {
    wakeAudio();
    setSonando((s) => !s);
    setPaso(-1);
  }, []);

  const elegir = (c: Compas) => {
    setCompas(c);
    setPaso(-1);
  };

  return (
    <div className="space-y-4">
      {/* Elegir el compás */}
      <div className="card p-4 sm:p-5">
        <p className="mb-2 text-xs tracking-[0.2em] text-humo uppercase">
          Compás simple
        </p>
        <div className="flex flex-wrap gap-2">
          {SIMPLES.map((c) => {
            const activo = compasTexto(c) === compasTexto(compas);
            return (
              <button
                key={compasTexto(c)}
                onClick={() => elegir(c)}
                className={`rounded-xl px-3 py-1.5 font-mono text-sm font-bold transition ${
                  activo ? "bg-sol text-noche" : "bg-carta-2 text-humo hover:text-tiza"
                }`}
              >
                {compasTexto(c)}
              </button>
            );
          })}
        </div>

        <p className="mt-4 mb-2 text-xs tracking-[0.2em] text-humo uppercase">
          Y su compuesto (×3 arriba, ×2 abajo)
        </p>
        <div className="flex flex-wrap gap-2">
          {SIMPLES.map((s) => {
            const c = aCompuesto(s);
            const activo = compasTexto(c) === compasTexto(compas);
            return (
              <button
                key={compasTexto(c)}
                onClick={() => elegir(c)}
                className={`rounded-xl px-3 py-1.5 font-mono text-sm font-bold transition ${
                  activo ? "bg-uva text-noche" : "bg-carta-2 text-humo hover:text-tiza"
                }`}
              >
                {compasTexto(c)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lectura del compás elegido */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="text-center">
            <p className="font-display text-6xl leading-none font-black text-sol">
              {compas.numerador}
            </p>
            <div className="my-1 h-px w-12 bg-borde" />
            <p className="font-display text-6xl leading-none font-black text-sol">
              {compas.denominador}
            </p>
          </div>
          <div className="min-w-0 flex-1 space-y-1.5 text-sm">
            <p>
              <span className="font-mono text-sol">{compas.numerador}</span>{" "}
              <span className="text-humo">
                → {compuesto ? "corcheas escritas, agrupadas de a tres" : "tiempos por compás"}
              </span>
            </p>
            <p>
              <span className="font-mono text-sol">{compas.denominador}</span>{" "}
              <span className="text-humo">
                → la redonda se divide {compas.denominador}{" "}
                {compas.denominador === 1 ? "vez" : "veces"}: la{" "}
                {subdiv?.nombre}
              </span>
            </p>
            <p className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-humo">Se cuentan</span>
              <span className="font-bold">{tiemposDe(compas)}</span>
              <span className="text-humo">tiempos de</span>
              {figuraPulso && (
                <FiguraSVG figura={figuraPulso} conPuntillo={conPuntillo} alto={30} />
              )}
              <span className="text-humo">
                {conPuntillo && "(con puntillo) "}y cada uno se parte en{" "}
                <strong className="text-tiza">{porTiempo}</strong>
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  compuesto ? "bg-uva/25 text-uva" : "bg-sol/20 text-sol"
                }`}
              >
                subdivisión {subdivisionDe(compas)}
              </span>
            </p>
          </div>
        </div>

        {/* El compás dibujado */}
        <div className="mt-5 rounded-2xl bg-noche-2 p-4">
          <div className="flex flex-wrap items-end gap-x-1 gap-y-2">
            {patron.map((acento, i) => {
              const nuevoTiempo = i % porTiempo === 0;
              const activo = sonando && paso === i;
              return (
                <span
                  key={i}
                  className={`flex flex-col items-center ${
                    nuevoTiempo && i > 0 ? "ml-4" : ""
                  }`}
                >
                  {subdiv && (
                    <FiguraSVG
                      figura={subdiv}
                      alto={40}
                      color={
                        activo
                          ? "#ffcb3d"
                          : acento === "fuerte"
                            ? "#f7f4ee"
                            : acento === "medio"
                              ? "#c9c3b5"
                              : "#6d6759"
                      }
                    />
                  )}
                  <span
                    className={`mt-1 h-1.5 w-1.5 rounded-full ${
                      acento === "debil"
                        ? "bg-transparent"
                        : acento === "fuerte"
                          ? "bg-sol"
                          : "bg-humo"
                    }`}
                  />
                </span>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={arrancar}
            className={`rounded-full px-5 py-2 text-sm font-bold transition hover:brightness-110 ${
              sonando ? "bg-tiza text-noche" : "bg-menta text-noche"
            }`}
          >
            {sonando ? "■ Parar" : "▶ Escuchar"}
          </button>
          <label className="flex items-center gap-2 text-sm text-humo">
            <span className="font-mono">{pulso} bpm</span>
            <input
              type="range"
              min={40}
              max={160}
              value={pulso}
              onChange={(e) => setPulso(Number(e.target.value))}
              className="w-28 accent-sol"
            />
          </label>
          {compuesto ? (
            <button
              onClick={() => elegir(aSimple(compas))}
              className="ml-auto rounded-full bg-carta-2 px-4 py-2 text-sm font-bold transition hover:bg-borde"
            >
              ÷ Volver a {compasTexto(aSimple(compas))}
            </button>
          ) : (
            <button
              onClick={() => elegir(aCompuesto(compas))}
              className="ml-auto rounded-full bg-carta-2 px-4 py-2 text-sm font-bold transition hover:bg-borde"
            >
              × 3/2 → {compasTexto(aCompuesto(compas))}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
