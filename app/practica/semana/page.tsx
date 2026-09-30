import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { formatDate } from "@/content";
import { destinoDe, minutosDe, semanaVigente, SEMANAS } from "@/content/semanas";
import { rich } from "@/components/Blocks";
import Hoy from "@/components/Hoy";

/**
 * La semana armada: día por día, cada tramo con sus minutos y cómo
 * encararlo, y el enlace a lo que se practica. Muestra la vigente y, si no
 * hay ninguna, la última que se armó — una dirección que alguien guardó no
 * tiene que dar 404 porque ya pasó la semana.
 */

const semana = () => semanaVigente() ?? SEMANAS[SEMANAS.length - 1] ?? null;

export function generateMetadata(): Metadata {
  const s = semana();
  return s ? { title: `${s.titulo} · Práctica`, description: s.bajada } : {};
}

export default function SemanaPage() {
  const s = semana();
  if (!s) notFound();
  const total = s.dias.reduce((t, d) => t + minutosDe(d), 0);

  return (
    <div className="pt-10">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-humo">
        <Link href="/practica" className="transition hover:text-sol">
          ← Práctica
        </Link>
        <span className="opacity-40">/</span>
        <span>la semana</span>
      </nav>

      <header className="mb-8">
        <p className="text-xs tracking-[0.25em] text-humo uppercase">
          {s.dias.length} días · {Math.floor(total / 60)} h {total % 60 ? `${total % 60} min` : ""} en total
        </p>
        <h1 className="font-display mt-2 text-5xl font-black tracking-tight sm:text-6xl">
          {s.titulo}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-humo">{s.bajada}</p>
      </header>

      <section className="card mb-10 px-5 py-4">
        <p className="text-xs tracking-[0.2em] text-humo uppercase">Cómo se encara</p>
        <ul className="mt-2 space-y-1.5">
          {s.reglas.map((r, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed text-tiza">
              <span className="text-sol">▸</span>
              <span>{rich(r)}</span>
            </li>
          ))}
        </ul>
      </section>

      <ol className="flex flex-col gap-6">
        {s.dias.map((d) => (
          <li key={d.fecha} id={d.fecha} className="card scroll-mt-24 p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-sm text-humo">{formatDate(d.fecha, { weekday: true })}</span>
              <Hoy fecha={d.fecha} />
              <span className="ml-auto font-mono text-sm text-humo">{minutosDe(d)} min</span>
            </div>
            <h2 className="font-display mt-1 text-3xl font-black tracking-tight">{d.titulo}</h2>

            <ol className="mt-4 flex flex-col divide-y divide-borde/60">
              {d.tramos.map((t, i) => {
                const destino = t.ir ? destinoDe(t.ir) : null;
                return (
                  <li key={i} className="flex gap-4 py-3">
                    <span className="w-12 shrink-0 pt-0.5 text-right font-mono text-sm text-sol">
                      {t.minutos}′
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-tiza">{t.que}</p>
                      <p className="mt-1 text-sm leading-relaxed text-humo">{rich(t.como)}</p>
                      {destino && (
                        <Link
                          href={destino.href}
                          className="mt-1.5 inline-block text-sm text-humo underline decoration-dotted underline-offset-4 transition hover:text-sol"
                        >
                          {destino.titulo} →
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
    </div>
  );
}
