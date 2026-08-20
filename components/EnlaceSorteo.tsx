"use client";

import { useState } from "react";
import Icono from "./Icono";
import Enlace from "./Enlace";
import { PROGRESIONES, TONALIDAD_MAYOR, raizDelGrado } from "@/lib/grados";
import { chordSymbol, escribirNota, qualityById, raizEscrita } from "@/lib/music";

/**
 * El enlace con el dado: la progresión de la clase, y un 🎲 para practicar
 * cualquier otra.
 *
 * No hay nada pre-generado: la progresión sale de sortear una tonalidad y una
 * de las `PROGRESIONES` (las que se usan de verdad — acordes al azar serían
 * ruido, no música), los acordes los arma `lib/grados.ts`, y el recorrido
 * óptimo lo calcula la programación dinámica del enlace al vuelo, para
 * cualquier progresión que le des. Son doce tonalidades por seis progresiones
 * por tríadas o cuatriadas: ciento cuarenta y cuatro ejercicios distintos que
 * no ocupan un byte.
 *
 * El sorteo vive en el estado del cliente y arranca en la progresión de la
 * clase: así el servidor y el cliente dibujan lo mismo y el azar aparece
 * recién cuando lo pedís.
 */
export default function EnlaceSorteo({ acordesDeLaClase }: { acordesDeLaClase: string[] }) {
  const [sorteo, setSorteo] = useState<{ tonica: number; progresion: number } | null>(null);
  const [cuatriadas, setCuatriadas] = useState(true);

  const otra = () => {
    setSorteo((previo) => {
      // Que el dado nunca repita lo que ya está en pantalla.
      let tonica = Math.floor(Math.random() * 12);
      let progresion = Math.floor(Math.random() * PROGRESIONES.length);
      while (previo && tonica === previo.tonica && progresion === previo.progresion) {
        tonica = Math.floor(Math.random() * 12);
        progresion = Math.floor(Math.random() * PROGRESIONES.length);
      }
      return { tonica, progresion };
    });
  };

  const elegida = sorteo ? PROGRESIONES[sorteo.progresion] : null;
  const acordes =
    sorteo && elegida
      ? elegida.grados.map((g) => {
          const grado = TONALIDAD_MAYOR[g];
          const quality = qualityById(cuatriadas ? grado.cuatriada : grado.triada)!;
          return chordSymbol(raizDelGrado(sorteo.tonica, g), quality);
        })
      : acordesDeLaClase;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-sm text-humo">
          {sorteo && elegida ? (
            <>
              <strong className="text-tiza">{elegida.nombre}</strong> en{" "}
              <strong className="text-tiza">
                {escribirNota(raizEscrita(sorteo.tonica), "en")}
              </strong>{" "}
              · {acordes.join(" · ")}
            </>
          ) : (
            "La progresión de la clase."
          )}
        </span>
        <span className="ml-auto flex items-center gap-3 whitespace-nowrap">
          {sorteo && (
            <label className="flex cursor-pointer items-center gap-1.5 text-sm text-humo">
              <input
                type="checkbox"
                checked={cuatriadas}
                onChange={(e) => setCuatriadas(e.target.checked)}
                className="accent-uva"
              />
              con séptimas
            </label>
          )}
          {sorteo && (
            <button
              onClick={() => setSorteo(null)}
              className="text-xs text-humo underline decoration-dotted underline-offset-2 hover:text-tiza"
            >
              la de la clase
            </button>
          )}
          <button
            onClick={otra}
            className="rounded-xl bg-carta-2 px-3 py-1.5 text-sm font-bold transition hover:bg-borde"
          >
            <Icono de="dado" /> Otra progresión
          </button>
        </span>
      </div>
      {/* La key rearma el ejercicio entero al cambiar la progresión: sin eso,
          el puntaje y los pasos del recorrido anterior quedaban colgados. */}
      <Enlace key={acordes.join("|")} acordes={acordes} />
    </div>
  );
}
