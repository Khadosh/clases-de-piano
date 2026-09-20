"use client";

import type { ReactNode } from "react";
import Icono from "./Icono";
import type { Ronda } from "@/lib/useRonda";

/**
 * La barra de arriba de un dictado: la ronda, las limpias sobre las rondas,
 * la racha con sus llamas y el mejor. `children` va a la derecha, para lo que
 * cada dictado suma (el reloj del contrarreloj).
 */
export default function Marcador({ ronda, children }: { ronda: Ronda; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-borde/60 px-5 py-3 text-sm">
      <span className="text-xs tracking-[0.2em] text-humo uppercase">Ronda {ronda.n}</span>
      <span className="font-mono">
        <span className="text-menta">{ronda.limpias}</span>
        <span className="text-humo">/{ronda.rondas}</span>
        <span className="ml-1 text-xs text-humo">sin pistas</span>
      </span>
      <span className="font-mono">
        <span className={ronda.racha >= 3 ? "text-sol" : "text-humo"}>
          {Array.from({ length: Math.min(ronda.racha, 5) }, (_, i) => (
            <Icono key={i} de="llama" />
          ))}
          {ronda.racha === 0 ? "—" : ` ${ronda.racha}`}
        </span>
        {ronda.mejorRacha > 1 && <span className="ml-2 text-xs text-humo">mejor {ronda.mejorRacha}</span>}
      </span>
      {children}
    </div>
  );
}
