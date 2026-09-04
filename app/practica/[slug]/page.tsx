import Link from "next/link";
import Icono from "@/components/Icono";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { slugOf } from "@/content";
import { AREAS, aliases, buscar, catalogo, type Entrada } from "@/content/practica";
import Visita from "@/components/Visita";
import { rich } from "@/components/Blocks";
import EjercicioDePractica from "@/components/EjercicioDePractica";

export function generateStaticParams() {
  // Las direcciones alias también se generan: siguen abiertas en algún teléfono.
  return [...catalogo().map((e) => e.slug), ...Object.keys(aliases())].map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const encontrado = buscar(slug);
  if (!encontrado) return {};
  return {
    title: encontrado.entrada.titulo,
    description: encontrado.entrada.bajada.replace(/\*/g, ""),
  };
}

export default async function EjercicioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const encontrado = buscar(slug);
  if (!encontrado) notFound();
  const { entrada, anterior, siguiente, renglon } = encontrado;
  const area = AREAS.find((a) => a.id === entrada.area);

  return (
    <div className="pt-10">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-humo">
        <Link href="/practica" className="transition hover:text-sol">
          ← Práctica
        </Link>
        {area && (
          <>
            <span className="opacity-40">/</span>
            <Link href={`/practica/paso/${area.id}`} className="transition hover:text-sol">
              <Icono de={area.emoji} className="mr-1 text-sol" />
              {area.titulo}
            </Link>
          </>
        )}
        <Link
          href={`/clases/${slugOf(entrada.lesson)}`}
          className="ml-auto rounded-full bg-carta-2 px-3 py-1 text-xs transition hover:text-sol"
        >
          clase {entrada.lesson.n} →
        </Link>
      </nav>

      <header className="mb-7">
        <h1 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
          {entrada.titulo}
        </h1>
        {/* Las bajadas que vienen de una clase traen *asteriscos*, igual que allá. */}
        {entrada.bajada && (
          <p className="mt-3 max-w-3xl leading-relaxed text-humo">
            {rich(entrada.bajada)}
          </p>
        )}
      </header>

      {/* Lo último practicado se anota por el slug real, no por el alias. */}
      <Visita slug={entrada.slug} />
      <EjercicioDePractica e={entrada} renglon={renglon} />

      <nav className="mt-14 grid gap-3 border-t border-borde pt-6 sm:grid-cols-2">
        <Vecino e={anterior} lado="anterior" />
        <Vecino e={siguiente} lado="siguiente" />
      </nav>
    </div>
  );
}

/** El de al lado en el catálogo, que es el orden de una rutina. */
function Vecino({
  e,
  lado,
}: {
  e: Entrada | null;
  lado: "anterior" | "siguiente";
}) {
  if (!e) return <span />;
  return (
    <Link
      href={`/practica/${e.slug}`}
      className={`card p-4 transition hover:border-sol/40 ${
        lado === "siguiente" ? "text-right sm:col-start-2" : ""
      }`}
    >
      <span className="block text-xs tracking-[0.2em] text-humo uppercase">
        {lado === "anterior" ? "← Anterior" : "Siguiente →"}
      </span>
      <span className="font-display mt-1 block text-lg font-bold">
        <Icono de={e.emoji} className="mr-1.5 text-sol" />
        {e.titulo}
      </span>
    </Link>
  );
}
