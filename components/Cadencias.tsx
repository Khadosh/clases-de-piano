"use client";

import { useState } from "react";
import { CADENCIAS_CON_NOMBRE, TONALIDAD_MAYOR, raizDelGrado, type Cadencia } from "@/lib/grados";
import { chordPitches, chordSymbol, pickRandom, qualityById, shuffle } from "@/lib/music";
import { playChord, wakeAudio } from "@/lib/audio";

/**
 * Las cadencias con nombre y apellido, en dos mitades que son las dos mitades
 * de la clase: el mapa (cada cadencia con su nombre, para escucharla) y el
 * juego (suena o se muestra una, hay que nombrarla — el ejercicio del profe
 * tal cual, con los roles dados vuelta).
 *
 * Todo suena en Do, como el resto de la teoría del cuaderno: la gracia de una
 * cadencia está en las funciones, no en la tonalidad.
 */

const BASE = 48; // Do3

const cifras = (c: Cadencia) =>
  c.grados.map((g) => TONALIDAD_MAYOR[g].cifra).join(" → ");

function tocarCadencia(c: Cadencia, alTerminar?: () => void) {
  wakeAudio();
  c.grados.forEach((g, n) => {
    const quality = qualityById(TONALIDAD_MAYOR[g].triada)!;
    setTimeout(() => {
      playChord(chordPitches(BASE + raizDelGrado(0, g), quality), 1.3);
    }, n * 950);
  });
  if (alTerminar) setTimeout(alTerminar, c.grados.length * 950);
}

export default function Cadencias() {
  const [modo, setModo] = useState<"mapa" | "juego">("mapa");

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-borde/60 p-4">
        {(["mapa", "juego"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setModo(m)}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
              modo === m ? "bg-tiza text-noche" : "bg-carta-2 text-humo hover:text-tiza"
            }`}
          >
            {m === "mapa" ? "el mapa" : "el juego: nombrala"}
          </button>
        ))}
        <span className="ml-auto hidden text-xs text-humo sm:block">
          {modo === "mapa"
            ? "cada una con su nombre, para escucharla"
            : "suena una cadencia y hay que ponerle el nombre"}
        </span>
      </div>

      {modo === "mapa" ? <Mapa /> : <Juego />}
    </div>
  );
}

function Mapa() {
  const [sonando, setSonando] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2 p-4">
      {CADENCIAS_CON_NOMBRE.map((c) => (
        <button
          key={c.nombre}
          onClick={() => {
            setSonando(c.nombre);
            tocarCadencia(c, () => setSonando((s) => (s === c.nombre ? null : s)));
          }}
          className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl px-4 py-2.5 text-left transition ${
            sonando === c.nombre ? "bg-sol/15" : "bg-carta-2 hover:bg-borde"
          }`}
        >
          <span className="font-mono text-sm font-bold text-sol">{cifras(c)}</span>
          <span className="font-bold">{c.nombre}</span>
          <span className="w-full text-sm text-humo sm:w-auto sm:flex-1">{c.detalle}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * El juego de la clase. Dos maneras de preguntar, para que trabajen cosas
 * distintas: viendo los grados (la lectura) o sólo escuchando (el oído). En
 * el modo de oído los grados se muestran recién con el veredicto.
 */
function Juego() {
  const [ronda, setRonda] = useState(() => armarRonda());
  const [aOido, setAOido] = useState(false);
  const [elegida, setElegida] = useState<string | null>(null);
  const [puntaje, setPuntaje] = useState({ bien: 0, total: 0 });

  const responder = (nombre: string) => {
    if (elegida) return;
    setElegida(nombre);
    setPuntaje((p) => ({
      bien: p.bien + (nombre === ronda.cadencia.nombre ? 1 : 0),
      total: p.total + 1,
    }));
  };

  const otra = () => {
    setElegida(null);
    setRonda(armarRonda());
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => tocarCadencia(ronda.cadencia)}
          className="rounded-full bg-sol px-4 py-2 text-sm font-bold text-noche transition hover:brightness-110"
        >
          ▶ Escuchala
        </button>
        <button
          onClick={() => setAOido(!aOido)}
          className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
            aOido ? "bg-tiza text-noche" : "bg-carta-2 text-humo hover:text-tiza"
          }`}
          title="Esconde los grados: hay que nombrarla sólo con el oído"
        >
          a oído
        </button>
        {(!aOido || elegida) && (
          <span className="font-mono text-2xl font-black text-sol">
            {cifras(ronda.cadencia)}
          </span>
        )}
        <span className="ml-auto font-mono text-sm text-humo">
          {puntaje.bien}/{puntaje.total}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {ronda.opciones.map((nombre) => {
          const esCorrecta = nombre === ronda.cadencia.nombre;
          const estado = !elegida
            ? "bg-carta-2 hover:bg-borde"
            : esCorrecta
              ? "bg-menta/20 text-menta"
              : nombre === elegida
                ? "bg-brasa/20 text-brasa"
                : "bg-carta-2 opacity-50";
          return (
            <button
              key={nombre}
              onClick={() => responder(nombre)}
              className={`rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition ${estado}`}
            >
              {nombre}
            </button>
          );
        })}
      </div>

      {elegida && (
        <div className="mt-4 rounded-2xl bg-noche px-4 py-3">
          <p className="text-sm leading-relaxed text-humo">
            <span className="font-bold text-tiza">{ronda.cadencia.nombre}.</span>{" "}
            {ronda.cadencia.detalle}{" "}
            <span className="text-humo/70">
              En Do: {ronda.cadencia.grados
                .map((g) => chordSymbol(raizDelGrado(0, g), qualityById(TONALIDAD_MAYOR[g].triada)!))
                .join(" → ")}
              .
            </span>
          </p>
          <button
            onClick={otra}
            className="mt-3 rounded-full bg-sol px-4 py-2 text-sm font-bold text-noche transition hover:brightness-110"
          >
            Otra
          </button>
        </div>
      )}
    </div>
  );
}

function armarRonda() {
  const cadencia = pickRandom(CADENCIAS_CON_NOMBRE);
  const otras = shuffle(
    CADENCIAS_CON_NOMBRE.filter((c) => c.nombre !== cadencia.nombre).map((c) => c.nombre),
  ).slice(0, 3);
  return { cadencia, opciones: shuffle([cadencia.nombre, ...otras]) };
}
