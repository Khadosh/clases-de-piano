import Link from "next/link";
import type { Metadata } from "next";
import { PIEZAS } from "@/content/partituras";

export const metadata: Metadata = {
  title: "Partituras",
  description:
    "Piezas de dominio público escritas como datos: se leen, suenan y te siguen mientras las tocás.",
};

/**
 * La biblioteca. Ordenada por dificultad y no por fecha ni por fama: arriba va
 * lo que se puede intentar hoy, que es lo único que importa cuando estás
 * empezando.
 */
export default function PartiturasPage() {
  const piezas = [...PIEZAS].sort((a, b) => a.dificultad - b.dificultad);
  return (
    <div className="pt-10">
      <header className="mb-10">
        <p className="text-xs tracking-[0.25em] text-humo uppercase">
          {piezas.length} piezas · dominio público
        </p>
        <h1 className="font-display mt-2 text-5xl font-black tracking-tight sm:text-6xl">
          Partituras
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-humo">
          Escritas como datos y no como imagen, así que la app{" "}
          <strong className="text-tiza">sabe qué nota es cada cosa</strong>: las
          toca, te marca dónde va, y con el teclado enchufado te espera a vos en
          vez de irse sola.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {piezas.map((p) => (
          <Link
            key={p.slug}
            href={`/partituras/${p.slug}`}
            className="card group p-5 transition hover:border-sol/40"
          >
            <div className="flex items-baseline gap-2">
              <h2 className="font-display text-2xl font-bold">{p.titulo}</h2>
              <span className="ml-auto font-mono text-xs text-humo">
                {"●".repeat(p.dificultad)}
                <span className="opacity-30">{"●".repeat(5 - p.dificultad)}</span>
              </span>
            </div>
            <p className="mt-0.5 text-sm text-humo">
              {p.compositor} · {p.anio} · {p.compas.numerador}/
              {p.compas.denominador}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-humo">{p.sobre}</p>
            <p className="mt-3 text-xs text-humo/70">{p.hasta}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
