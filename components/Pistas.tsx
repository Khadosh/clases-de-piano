"use client";

import type { ReactNode } from "react";
import Icono from "./Icono";

export interface Pista {
  /** De qué es la pista: "la receta", "el bajo". */
  que: string;
  contenido: ReactNode;
}

/**
 * Las pistas de un ejercicio, de a una y en orden.
 *
 * La alternativa era el botón de ver la respuesta a secas, y ahí el que se
 * traba tiene dos opciones: adivinar o rendirse. Con las pistas hay un escalón
 * en el medio — te falta el bajo, no el acorde entero — y quedás resolviéndolo
 * vos.
 *
 * Van en orden de menos a más y **se cuentan**: el que llama decide qué hacer
 * con ese número, pero acertar con tres pistas no es lo mismo que acertar sin
 * ninguna y esconderlo sería mentir un poquito.
 */
export default function Pistas({
  lista,
  dadas,
  onPedir,
}: {
  lista: Pista[];
  dadas: number;
  onPedir: () => void;
}) {
  if (!lista.length) return null;
  const quedan = lista.length - dadas;

  return (
    <div className="mt-3">
      {dadas > 0 && (
        <ul className="mb-2 space-y-1.5">
          {lista.slice(0, dadas).map((p, i) => (
            <li
              key={i}
              className="flex flex-wrap items-baseline gap-x-2 rounded-xl bg-sol/10 px-3 py-2 text-sm"
            >
              <span className="text-xs tracking-wider text-sol uppercase">
                {p.que}
              </span>
              <span className="text-tiza">{p.contenido}</span>
            </li>
          ))}
        </ul>
      )}
      {quedan > 0 && (
        <button
          onClick={onPedir}
          className="rounded-full bg-carta-2 px-3.5 py-1.5 text-sm font-bold text-humo transition hover:bg-borde hover:text-tiza"
        >
          <Icono de="foco" /> {dadas === 0 ? "Una pista" : "Otra pista"}
          <span className="ml-1.5 font-mono text-xs opacity-60">
            quedan {quedan}
          </span>
        </button>
      )}
    </div>
  );
}
