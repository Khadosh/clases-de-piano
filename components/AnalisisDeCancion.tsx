"use client";

import { useState, type ReactNode } from "react";
import { rich } from "./rich";
import type { Aprendizaje } from "@/content/aprender";
import {
  PASOS_DEL_ANALISIS,
  armaduraEscrita,
  campoArmonico,
  leerDominante,
  leerPrestamo,
  tonoMayorDe,
  type ClaveDePaso,
} from "@/lib/analisis";
import { escribirNota } from "@/lib/music";
import { playChord, wakeAudio } from "@/lib/audio";
import { gradoEnMayor, teclasDeVoicing } from "@/lib/capas";
import { FUNCIONES, type Funcion } from "@/lib/grados";

/**
 * La ficha «Analizar»: los seis pasos del profe en su orden, cada uno con su
 * respuesta corta, lo simple y la técnica detrás del botón. Los acordes que
 * cada paso nombra se ven y suenan; los que son la tarea de la clase van
 * destacados.
 */

/** Los tres colores de la armonía, los mismos de la capa del puente. */
const COLOR: Record<Funcion, string> = {
  reposo: "border-menta bg-menta/15 text-menta",
  subdominante: "border-sol bg-sol/15 text-sol",
  dominante: "border-brasa bg-brasa/15 text-brasa",
};

function Ficha({
  color,
  nombre,
  abajo,
  teclas,
}: {
  color: string;
  nombre: string;
  abajo?: ReactNode;
  teclas?: number[];
}) {
  const tocar = () => {
    if (!teclas) return;
    wakeAudio();
    playChord(teclas, 1.4);
  };
  return (
    <button
      type="button"
      onClick={tocar}
      disabled={!teclas}
      className={`flex min-w-16 flex-col items-center rounded-xl border px-3 py-1.5 transition ${color} ${
        teclas ? "hover:brightness-125" : "cursor-default"
      }`}
    >
      <span className="font-display text-xl font-black">{nombre}</span>
      {abajo && <span className="text-xs">{abajo}</span>}
    </button>
  );
}

export default function AnalisisDeCancion({ cancion }: { cancion: Aprendizaje }) {
  const [tecnica, setTecnica] = useState(false);
  const ana = cancion.analisis;
  const tono = tonoMayorDe(cancion.tonica);

  const muestra: Partial<Record<ClaveDePaso, ReactNode>> = {
    campo: campoArmonico(tono).map((a) => (
      <Ficha
        key={a.romano}
        color={COLOR[a.funcion]}
        nombre={a.nombre}
        abajo={tecnica ? a.romano : FUNCIONES[a.funcion].nombre.toLowerCase()}
        teclas={a.teclas}
      />
    )),
    armadura: armaduraEscrita(tono).map((n, i) => (
      <Ficha key={i} color="border-borde bg-carta-2 text-tiza" nombre={escribirNota(n)} abajo={`${i + 1}º`} />
    )),
    dominantes: ana.dominantes.acordes.map((v, i) => {
      const d = leerDominante(v, tono);
      return (
        <Ficha
          key={i}
          color={COLOR.dominante}
          nombre={`${d.nombre} → ${d.va}`}
          abajo={tecnica ? d.romano : d.tipo === "principal" ? "dominante" : `dominante ${d.tipo}`}
          teclas={teclasDeVoicing(v)}
        />
      );
    }),
    prestamo: ana.prestamo.acordes.map((v, i) => {
      const p = leerPrestamo(v, tono);
      const desde = p.de ? `de ${escribirNota(p.de.tonica)} ${p.de.modo}` : "prestado";
      return (
        <Ficha
          key={i}
          color={COLOR[gradoEnMayor(v, cancion.tonica).funcion]}
          nombre={p.nombre}
          abajo={tecnica ? `${p.romano} · ${desde}` : desde}
          teclas={teclasDeVoicing(v)}
        />
      );
    }),
  };

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => setTecnica((t) => !t)}
        className="self-start text-sm text-humo underline decoration-dotted underline-offset-4 transition hover:text-sol"
      >
        {tecnica ? "ocultar la explicación técnica" : "explicación técnica"}
      </button>
      <ol className="flex flex-col gap-3">
        {PASOS_DEL_ANALISIS.map(({ clave, pregunta }, i) => {
          const paso = ana[clave];
          return (
            <li
              key={clave}
              className={`rounded-2xl border p-4 sm:p-5 ${paso.tarea ? "border-sol/60 bg-sol/5" : "border-borde/60"}`}
            >
              <div className="flex items-baseline gap-3">
                <span className="shrink-0 font-mono text-sm text-humo">{i + 1}</span>
                <h3 className="font-display text-xl font-black tracking-tight">
                  {pregunta}
                  {paso.tarea && (
                    <span className="ml-2 inline-block rounded-full bg-sol px-2 py-0.5 align-middle font-sans text-xs font-bold tracking-normal text-noche">
                      tarea
                    </span>
                  )}
                </h3>
              </div>
              <p className={`mt-2 text-lg leading-snug font-semibold ${paso.tarea ? "text-sol" : "text-tiza"}`}>
                {paso.respuesta}
              </p>
              {(muestra[clave] as ReactNode[] | undefined)?.length ? <div className="mt-3 flex flex-wrap gap-2">{muestra[clave]}</div> : null}
              <ul className="mt-3 space-y-1.5">
                {(tecnica ? [...paso.simple, ...paso.tecnica] : paso.simple).map((t, j) => (
                  <li key={j} className="flex gap-2 text-sm leading-relaxed text-tiza">
                    <span className="text-sol">▸</span>
                    <span>{rich(t)}</span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
