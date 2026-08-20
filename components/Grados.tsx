"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Icono from "./Icono";
import { type Mark } from "./Keyboard";
import Piano from "./Piano";
import Pistas, { type Pista } from "./Pistas";
import {
  chordPitches,
  chordSymbol,
  escribirNota,
  qualityById,
  raizEscrita,
} from "@/lib/music";
import { esElAcorde } from "@/lib/enlace";
import {
  PROGRESIONES,
  TONALIDAD_MAYOR,
  raizDelGrado,
  type Progresion,
} from "@/lib/grados";
import { playChord, wakeAudio } from "@/lib/audio";
import { useArmado } from "@/lib/useArmado";

/**
 * Progresiones por grados.
 *
 * Es el paso que sigue a armar acordes sueltos: en un tema nadie piensa "Sol
 * séptima", piensa "el quinto", y por eso la misma vuelta se muda de tono sin
 * volver a aprenderla. Acá se da la progresión en números y la tonalidad, y hay
 * que sacar los acordes.
 *
 * **Vale cualquier inversión.** Lo que se practica es saber cuál es el acorde,
 * no dónde ponerlo — eso es el otro ejercicio, el del enlace.
 */

const BASE = 48; // Do3

export default function Grados() {
  const [progresion, setProgresion] = useState<Progresion>(PROGRESIONES[0]);
  const [tonica, setTonica] = useState(0);
  const [cuatriadas, setCuatriadas] = useState(true);
  const [i, setI] = useState(0);
  const [pistas, setPistas] = useState(0);
  const [errores, setErrores] = useState(0);
  const [vueltas, setVueltas] = useState(0);

  const terminado = i >= progresion.grados.length;
  const armado = useArmado({ activo: !terminado });
  const puestas = armado.notas;

  /** Los acordes de esta vuelta, ya resueltos: grado + fundamental + calidad. */
  const acordes = useMemo(
    () =>
      progresion.grados.map((g) => {
        const grado = TONALIDAD_MAYOR[g];
        const quality = qualityById(cuatriadas ? grado.cuatriada : grado.triada);
        return { grado, root: raizDelGrado(tonica, g), quality: quality! };
      }),
    [progresion, tonica, cuatriadas],
  );

  const actual = terminado ? null : acordes[i];

  const nueva = useCallback(() => {
    wakeAudio();
    setProgresion(PROGRESIONES[Math.floor(Math.random() * PROGRESIONES.length)]);
    setTonica(Math.floor(Math.random() * 12));
    setI(0);
    setPistas(0);
    setErrores(0);
    armado.borrar();
    setVueltas((v) => v + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al cambiar de tríadas a cuatriadas se vuelve a empezar: si no, la mitad de
  // la progresión quedaría contestada con acordes de otra forma.
  useEffect(() => {
    setI(0);
    setPistas(0);
    setErrores(0);
    armado.borrar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuatriadas]);

  const completo =
    actual !== null &&
    puestas.length === chordPitches(0, actual.quality).length;
  const acerto =
    completo &&
    actual !== null &&
    esElAcorde(puestas, { root: actual.root, quality: actual.quality });

  useEffect(() => {
    if (!completo || !actual) return;
    if (!acerto) return;
    wakeAudio();
    playChord([...puestas].sort((a, b) => a - b));
    setI((x) => x + 1);
    setPistas(0);
    armado.borrar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completo, acerto, actual]);

  // Un acorde completo que no era: se cuenta y se deja a la vista para corregir.
  useEffect(() => {
    if (completo && !acerto) setErrores((e) => e + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completo, acerto]);

  const marks: Mark[] = puestas.map((p) => ({
    pitch: p,
    tone: (completo && !acerto ? "brasa" : "luna") as Mark["tone"],
  }));

  const listaDePistas: Pista[] = !actual
    ? []
    : [
        {
          que: `qué nota es el ${actual.grado.cifra}`,
          contenido: (
            <>
              el {actual.grado.cifra} de{" "}
              {escribirNota(raizEscrita(tonica), "en")} es{" "}
              <strong>{escribirNota(raizEscrita(actual.root), "en")}</strong> (
              {escribirNota(raizEscrita(actual.root))}). {actual.grado.papel}.
            </>
          ),
        },
        {
          que: "el cifrado",
          contenido: (
            <strong className="font-mono">
              {chordSymbol(actual.root, actual.quality)}
            </strong>
          ),
        },
      ];

  const escuchar = () => {
    wakeAudio();
    acordes.forEach(({ root, quality }, n) =>
      setTimeout(() => playChord(chordPitches(BASE + root, quality), 1.1), n * 950),
    );
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-borde/60 p-4">
        <span className="text-xs tracking-[0.2em] text-humo uppercase">
          Tonalidad
        </span>
        <span className="font-display text-2xl font-black text-sol">
          {escribirNota(raizEscrita(tonica), "en")} mayor
        </span>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-humo">
          <input
            type="checkbox"
            checked={cuatriadas}
            onChange={(e) => setCuatriadas(e.target.checked)}
            className="accent-uva"
          />
          Con séptimas
        </label>
        <button
          onClick={nueva}
          className="rounded-xl bg-carta-2 px-3 py-1.5 text-sm font-bold transition hover:bg-borde"
        >
          <Icono de="dado" /> Otra
        </button>
      </div>

      {/* La progresión en números, que es lo que hay que aprender a leer */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-borde/60 px-4 py-3">
        {acordes.map(({ grado }, n) => (
          <span
            key={n}
            className={`rounded-xl px-3 py-1.5 font-mono text-sm font-bold transition ${
              n < i
                ? "bg-menta/15 text-menta"
                : n === i
                  ? "bg-sol text-noche"
                  : "bg-carta-2 text-humo"
            }`}
          >
            {grado.cifra}
            {n < i && (
              <span className="ml-1.5 text-[11px] opacity-80">
                {chordSymbol(acordes[n].root, acordes[n].quality)}
              </span>
            )}
          </span>
        ))}
      </div>

      <div className="p-5">
        {terminado ? (
          <div className="mb-4 text-center">
            <p className="text-xs tracking-[0.25em] text-humo uppercase">
              {progresion.nombre} en {escribirNota(raizEscrita(tonica), "en")}
            </p>
            <p className="font-display my-2 text-4xl font-black text-menta">
              {errores === 0 ? <>Entera y sin errores <Icono de="festejo" /></> : "Completa"}
            </p>
            <p className="mx-auto max-w-lg text-sm text-humo">
              {progresion.porQue}
            </p>
          </div>
        ) : (
          <div className="mb-4 text-center">
            <p className="text-xs tracking-[0.25em] text-humo uppercase">
              Acorde {i + 1} de {acordes.length} · {progresion.nombre}
            </p>
            <p className="font-display my-2 text-6xl font-black text-sol">
              {actual!.grado.cifra}
            </p>
            <p className="text-sm text-humo">
              El {actual!.grado.cifra} grado de{" "}
              {escribirNota(raizEscrita(tonica), "en")} mayor
              {cuatriadas ? ", con séptima" : ""}. Cualquier inversión vale.
            </p>
          </div>
        )}

        <Piano
          from={45}
          to={84}
          marks={marks}
          armado={armado}
          respondiendo={!terminado}
          faltan={
            actual ? chordPitches(0, actual.quality).length - puestas.length : 0
          }
          pista="— tocá el acorde del grado en el piano"
        >
          {completo && !acerto && (
            <p className="mt-3 text-center text-sm text-brasa">
              Ése no es el {actual?.grado.cifra} de{" "}
              {escribirNota(raizEscrita(tonica), "en")}.
            </p>
          )}
          <Pistas
            lista={listaDePistas}
            dadas={pistas}
            onPedir={() => setPistas((x) => x + 1)}
          />
        </Piano>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            onClick={escuchar}
            className="rounded-full bg-menta px-4 py-2 text-sm font-bold text-noche transition hover:brightness-110"
          >
            <Icono de="parlante" /> Escuchar la vuelta entera
          </button>
          {terminado && (
            <button
              onClick={nueva}
              className="rounded-full bg-sol px-5 py-2.5 font-bold text-noche transition hover:brightness-110"
            >
              Otra progresión →
            </button>
          )}
          <span className="ml-auto font-mono text-sm text-humo">
            vuelta {vueltas + 1}
            {errores > 0 && (
              <span className="ml-2 text-brasa">{errores} al lado</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
