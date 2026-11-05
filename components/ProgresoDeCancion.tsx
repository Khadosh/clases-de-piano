"use client";

import { useEffect, useState } from "react";
import { EVENTO, capasHechas } from "@/lib/progresoCapas";

/** "2 de 5 capas": se lee del aparato, así que el servidor no lo sabe y dibuja sólo el total. */
export default function ProgresoDeCancion({ slug, total }: { slug: string; total: number }) {
  const [hechas, setHechas] = useState<number[] | null>(null);
  useEffect(() => {
    const leer = () => setHechas(capasHechas(slug));
    leer();
    window.addEventListener(EVENTO, leer);
    return () => window.removeEventListener(EVENTO, leer);
  }, [slug]);

  return (
    <span className="flex items-center gap-1.5" aria-label={hechas ? `${hechas.length} de ${total} capas ya salen` : `${total} capas`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-2 w-6 rounded-full ${hechas?.includes(i) ? "bg-menta" : "bg-borde"}`} />
      ))}
      <span className="ml-1 font-mono text-xs text-humo">
        {hechas ? `${hechas.length} de ${total}` : total} capas
      </span>
    </span>
  );
}
