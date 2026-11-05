import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CANCIONES, cancionPorSlug } from "@/content/canciones";
import CancionPorCapas from "@/components/CancionPorCapas";

/**
 * Una canción por capas. Vive en `/practica/cancion/<slug>` y no en
 * `/practica/<slug>` porque ahí están los ejercicios: una canción no es un
 * ejercicio del catálogo, es una rutina propia con sus cinco pasos.
 */

export function generateStaticParams() {
  return CANCIONES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = cancionPorSlug((await params).slug);
  return c ? { title: `${c.titulo} · Práctica`, description: c.bajada } : {};
}

export default async function CancionPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = cancionPorSlug((await params).slug);
  if (!c) notFound();

  return (
    <div className="pt-10">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-humo">
        <Link href="/practica" className="transition hover:text-sol">
          ← Práctica
        </Link>
        <span className="opacity-40">/</span>
        <span>canción por capas</span>
      </nav>

      <header className="mb-8">
        <p className="text-xs tracking-[0.25em] text-humo uppercase">
          {c.autor} · {c.origen} · en {c.tonalidad}
        </p>
        <h1 className="font-display mt-2 text-5xl font-black tracking-tight sm:text-6xl">{c.titulo}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-humo">{c.bajada}</p>
      </header>

      <CancionPorCapas slug={c.slug} />

      <footer className="mt-10 max-w-2xl text-sm leading-relaxed text-humo">
        <p>
          La canción tiene derechos: acá van los acordes, el análisis y ejercicios sobre ella, no la melodía, la letra
          ni la grabación. Para tocar encima, ponela desde donde la escuches.
        </p>
        {c.revisar.length > 0 && (
          <>
            <p className="mt-3 text-xs tracking-[0.2em] uppercase">Para chequear con la grabación</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {c.revisar.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </>
        )}
      </footer>
    </div>
  );
}
