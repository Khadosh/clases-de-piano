import Link from "next/link";
import Icono from "@/components/Icono";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AREAS, FORMAS, catalogo, type AreaId, type Forma } from "@/content/practica";

/**
 * Un paso de la rutina, con sus ejercicios como cards: título, dibujo, una
 * línea. Agrupadas por lo que se hace en cada uno —para mirar y escuchar,
 * para probar, te corrige, te puntúa— que es "primero entendé, después
 * probá, después que te corrijan".
 *
 * Vive en `/practica/paso/<id>` y no en `/practica/<id>` porque ahí están los
 * ejercicios, y `manos` y `melodia` ya son direcciones de ejercicios.
 */

const ORDEN_FORMA: Forma[] = ["mirar", "probar", "corrige", "puntua"];

export function generateStaticParams() {
  return AREAS.map((a) => ({ area: a.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ area: string }>;
}): Promise<Metadata> {
  const { area } = await params;
  const a = AREAS.find((x) => x.id === area);
  return a ? { title: `${a.titulo} · Práctica`, description: a.bajada } : {};
}

export default async function PasoPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  const paso = AREAS.find((a) => a.id === area);
  if (!paso) notFound();
  const i = AREAS.findIndex((a) => a.id === (paso.id as AreaId));
  const ejercicios = catalogo().filter((e) => e.area === paso.id);
  const grupos = ORDEN_FORMA.map((f) => ({
    forma: f,
    ejercicios: ejercicios.filter((e) => e.forma === f),
  })).filter((g) => g.ejercicios.length > 0);
  const anterior = AREAS[i - 1];
  const siguiente = AREAS[i + 1];

  return (
    <div className="pt-10">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-humo">
        <Link href="/practica" className="transition hover:text-sol">
          ← Práctica
        </Link>
        <span className="opacity-40">/</span>
        <span>paso {i + 1}</span>
      </nav>

      <header className="mb-8 flex items-start gap-5">
        <span className="text-6xl text-sol"><Icono de={paso.emoji} /></span>
        <div>
          <h1 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
            {paso.titulo}
          </h1>
          <p className="mt-3 max-w-2xl text-lg leading-relaxed text-humo">{paso.bajada}</p>
        </div>
      </header>

      {grupos.map((g) => (
        <section key={g.forma} className="mb-10">
          <div className="mb-4 flex flex-col gap-x-3 gap-y-1 border-b border-borde pb-2 sm:flex-row sm:items-baseline">
            <h2 className="font-display text-xl font-bold">{FORMAS[g.forma].titulo}</h2>
            <p className="text-sm text-humo">{FORMAS[g.forma].bajada}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {g.ejercicios.map((e) => (
              <Link
                key={e.slug}
                href={`/practica/${e.slug}`}
                className="card group flex flex-col gap-3 p-5 transition hover:border-sol/40"
              >
                <span className="flex items-center justify-between">
                  <span className="text-4xl text-sol"><Icono de={e.emoji} /></span>
                  <span className="rounded-full bg-carta-2 px-2 py-0.5 text-[11px] text-humo">
                    clase {e.lesson.n}
                  </span>
                </span>
                <span className="font-display text-xl font-bold tracking-tight group-hover:text-sol">
                  {e.titulo}
                </span>
                <span className="text-sm leading-relaxed text-humo">{resumir(e.bajada)}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <nav className="mt-14 grid gap-3 border-t border-borde pt-6 sm:grid-cols-2">
        {anterior ? (
          <Link href={`/practica/paso/${anterior.id}`} className="card p-4 transition hover:border-sol/40">
            <span className="block text-xs tracking-[0.2em] text-humo uppercase">← Antes</span>
            <span className="font-display mt-1 block text-lg font-bold">
              <Icono de={anterior.emoji} className="mr-1.5 text-sol" />
              {anterior.titulo}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {siguiente ? (
          <Link
            href={`/practica/paso/${siguiente.id}`}
            className="card p-4 text-right transition hover:border-sol/40 sm:col-start-2"
          >
            <span className="block text-xs tracking-[0.2em] text-humo uppercase">Después →</span>
            <span className="font-display mt-1 block text-lg font-bold">
              <Icono de={siguiente.emoji} className="mr-1.5 text-sol" />
              {siguiente.titulo}
            </span>
          </Link>
        ) : (
          <Link
            href="/partituras"
            className="card p-4 text-right transition hover:border-sol/40 sm:col-start-2"
          >
            <span className="block text-xs tracking-[0.2em] text-humo uppercase">Después →</span>
            <span className="font-display mt-1 block text-lg font-bold">
              <Icono de="pentagrama" className="mr-1.5 text-sol" />
              El repertorio
            </span>
          </Link>
        )}
      </nav>
    </div>
  );
}

/** La primera oración, sin pasarse de largo. */
function resumir(bajada: string) {
  const limpio = bajada.replace(/\*/g, "").trim();
  if (limpio.length <= 150) return limpio;
  const corte = limpio.slice(0, 150);
  const punto = corte.lastIndexOf(". ");
  return punto > 60 ? corte.slice(0, punto + 1) : `${corte.trimEnd()}…`;
}
