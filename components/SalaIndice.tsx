"use client";

import Link from "next/link";
import { useState } from "react";
import Icono from "@/components/Icono";
import { FORMAS, type Forma } from "@/content/practica";

export interface EjercicioResumido {
  slug: string;
  titulo: string;
  bajada: string;
  emoji: string;
  forma: Forma;
  clase: number;
}

export interface PasoDeLaSala {
  id: string;
  titulo: string;
  emoji: string;
  bajada: string;
  ejercicios: EjercicioResumido[];
}

const ORDEN_FORMA: Forma[] = ["mirar", "probar", "corrige", "puntua"];

/**
 * El índice como cards: una por paso de la rutina, y adentro los ejercicios
 * agrupados por lo que se hace en cada uno (mirar, probar, te corrige, te
 * puntúa). Con veinticinco tarjetas iguales en una columna, en el teléfono
 * había que scrollear hasta "el tiempo"; con cinco cards cerradas entra todo
 * en una pantalla y se abre la que toca.
 *
 * En desktop las cards están siempre abiertas y el botón no hace nada: hay
 * lugar de sobra y la sala se lee de un vistazo. El estado empieza cerrado
 * en el servidor y en el cliente por igual, así no hay nada que hidratar
 * distinto; la diferencia entre pantallas es sólo CSS.
 */
export default function SalaIndice({ pasos, desde = 1 }: { pasos: PasoDeLaSala[]; desde?: number }) {
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());

  const alternar = (id: string) =>
    setAbiertas((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="flex flex-col gap-4">
      {pasos.map((paso, i) => {
        const abierta = abiertas.has(paso.id);
        const grupos = ORDEN_FORMA.map((f) => ({
          forma: f,
          ejercicios: paso.ejercicios.filter((e) => e.forma === f),
        })).filter((g) => g.ejercicios.length > 0);
        return (
          <section key={paso.id} className="card overflow-hidden">
            <button
              onClick={() => alternar(paso.id)}
              aria-expanded={abierta}
              className="flex w-full items-center gap-3 px-5 py-4 text-left sm:cursor-default"
            >
              <span className="font-display w-7 text-center text-3xl font-black text-borde">
                {desde + i}
              </span>
              <span className="text-2xl text-sol"><Icono de={paso.emoji} /></span>
              <span className="min-w-0 flex-1">
                <span className="font-display block text-2xl font-black tracking-tight">
                  {paso.titulo}
                </span>
                <span className="mt-0.5 block text-sm text-humo">{paso.bajada}</span>
              </span>
              <span className="font-mono text-sm text-humo">{paso.ejercicios.length}</span>
              <span
                className={`text-humo transition sm:hidden ${abierta ? "rotate-180" : ""}`}
                aria-hidden
              >
                ▾
              </span>
            </button>

            <div className={`border-t border-borde/60 ${abierta ? "" : "max-sm:hidden"}`}>
              {grupos.map((g) => (
                <div key={g.forma} className="border-b border-borde/40 last:border-b-0">
                  <p
                    className="px-5 pt-3 pb-1 text-[11px] font-bold tracking-[0.2em] text-humo uppercase"
                    title={FORMAS[g.forma].bajada}
                  >
                    {FORMAS[g.forma].titulo}
                  </p>
                  <ul className="pb-2">
                    {g.ejercicios.map((e) => (
                      <li key={e.slug}>
                        <Link
                          href={`/practica/${e.slug}`}
                          className="group flex items-start gap-3 px-5 py-2 transition hover:bg-carta-2/60"
                        >
                          <span className="mt-0.5 text-lg text-sol"><Icono de={e.emoji} /></span>
                          <span className="min-w-0 flex-1">
                            <span className="font-display flex flex-wrap items-baseline gap-x-2 font-bold">
                              {e.titulo}
                              <span className="rounded-full bg-carta-2 px-2 py-0.5 text-[11px] font-normal text-humo">
                                clase {e.clase}
                              </span>
                            </span>
                            <span className="block text-sm leading-relaxed text-humo">{e.bajada}</span>
                          </span>
                          <span className="self-center text-humo transition group-hover:text-sol">→</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
