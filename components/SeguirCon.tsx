"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Icono from "@/components/Icono";
import { leerRecientes, olvidarRecientes } from "@/lib/recientes";

export interface FichaCorta {
  slug: string;
  titulo: string;
  emoji: string;
}

/**
 * "Seguir con": el ejercicio de la última vez, arriba de todo el índice.
 *
 * Se lee después de montar —el servidor no sabe qué hay en el localStorage
 * de cada aparato— y si no hay nada, no se dibuja nada: la sala de alguien
 * que entra por primera vez es la misma de siempre. Los nombres vienen del
 * catálogo por props, así el marcador sólo guarda slugs y si un ejercicio
 * desaparece el marcador lo ignora en vez de mostrar un enlace roto.
 */
export default function SeguirCon({ fichas }: { fichas: FichaCorta[] }) {
  const [recientes, setRecientes] = useState<FichaCorta[] | null>(null);

  useEffect(() => {
    const porSlug = new Map(fichas.map((f) => [f.slug, f]));
    setRecientes(
      leerRecientes()
        .map((s) => porSlug.get(s))
        .filter((f): f is FichaCorta => Boolean(f)),
    );
  }, [fichas]);

  if (!recientes || recientes.length === 0) return null;
  const [ultimo, ...otros] = recientes;

  return (
    <div className="card flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
      <span className="text-xs tracking-[0.2em] text-humo uppercase">Seguir con</span>
      <Link
        href={`/practica/${ultimo.slug}`}
        className="font-display flex items-center gap-2 text-xl font-bold transition hover:text-sol"
      >
        <span className="text-sol"><Icono de={ultimo.emoji} /></span>
        {ultimo.titulo}
        <span className="text-humo">→</span>
      </Link>
      {otros.length > 0 && (
        <span className="flex flex-wrap items-center gap-x-2 text-sm text-humo">
          <span className="opacity-70">antes:</span>
          {otros.map((f) => (
            <Link
              key={f.slug}
              href={`/practica/${f.slug}`}
              className="underline decoration-dotted underline-offset-4 transition hover:text-tiza"
            >
              {f.titulo}
            </Link>
          ))}
        </span>
      )}
      <button
        onClick={() => {
          olvidarRecientes();
          setRecientes([]);
        }}
        className="ml-auto text-xs text-humo/60 transition hover:text-tiza"
        title="Borrar el marcador"
      >
        borrar
      </button>
    </div>
  );
}
