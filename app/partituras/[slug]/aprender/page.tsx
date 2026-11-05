import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { APRENDER, aprenderDe } from "@/content/aprender";
import { piezaPorSlug } from "@/content/partituras";
import CancionPorCapas from "@/components/CancionPorCapas";

/**
 * La sección «Aprender» de una partitura: la ficha «Analizar» y la práctica
 * por capas. Va en su propia página y no abajo de la partitura porque es otra
 * forma de estudiarla —la partitura se lee de corrido; esto se desarma en
 * capas— y aparte de la armonía técnica que algunas ya tienen. Una canción con
 * derechos (Here Comes the Sun) tiene «Aprender» sin partitura: la página es
 * la misma y sólo cambia el pie.
 */

export function generateStaticParams() {
  return APRENDER.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = aprenderDe((await params).slug);
  return a ? { title: `${a.titulo} · Aprender`, description: a.bajada } : {};
}

export default async function AprenderPage({ params }: { params: Promise<{ slug: string }> }) {
  const a = aprenderDe((await params).slug);
  if (!a) notFound();
  const pieza = piezaPorSlug(a.slug);

  return (
    <div className="pt-10">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-humo">
        <Link href="/partituras" className="transition hover:text-sol">
          ← Partituras
        </Link>
        {pieza && (
          <>
            <span className="opacity-40">/</span>
            <Link href={`/partituras/${pieza.slug}`} className="transition hover:text-sol">
              la partitura
            </Link>
          </>
        )}
        <span className="opacity-40">/</span>
        <span>aprender</span>
      </nav>

      <header className="mb-8">
        <p className="text-xs tracking-[0.25em] text-humo uppercase">
          {a.autor} · {a.origen} · en {a.tonalidad}
        </p>
        <h1 className="font-display mt-2 text-5xl font-black tracking-tight sm:text-6xl">{a.titulo}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-humo">{a.bajada}</p>
      </header>

      <CancionPorCapas slug={a.slug} />

      <footer className="mt-10 max-w-2xl text-sm leading-relaxed text-humo">
        {pieza ? (
          <p>
            Las capas salen de las notas de{" "}
            <Link href={`/partituras/${pieza.slug}`} className="text-tiza underline decoration-dotted underline-offset-4 hover:text-sol">
              la partitura
            </Link>
            : lo que suena en cada una es lo que está escrito ahí, desarmado.
          </p>
        ) : (
          <p>
            La canción tiene derechos: acá van los acordes, el análisis y ejercicios sobre ella, no la melodía, la letra
            ni la grabación. Para tocar encima, ponela desde donde la escuches.
          </p>
        )}
        {a.revisar.length > 0 && (
          <>
            <p className="mt-3 text-xs tracking-[0.2em] uppercase">{pieza ? "Para chequear" : "Para chequear con la grabación"}</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {a.revisar.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </>
        )}
      </footer>
    </div>
  );
}
