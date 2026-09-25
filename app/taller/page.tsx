import Link from "next/link";
import Icono from "@/components/Icono";
import type { Metadata } from "next";
import { AREAS, acordesAprendidos, catalogoDe, rutaDe } from "@/content/practica";
import { CHORD_QUALITIES } from "@/lib/music";

export const metadata: Metadata = {
  title: "Taller",
  description:
    "Las herramientas del cuaderno: el círculo de quintas, las armaduras, el laboratorio de acordes, las texturas. Para abrir con una duda y cerrar cuando se contestó.",
};

/**
 * El taller: las herramientas, agrupadas por tema.
 *
 * Son las que no te contestan nada —se mira, se toca, se prueba— y por eso
 * viven acá y no en la sala de práctica: se abren con una duda puntual,
 * muchas veces sin el piano cerca, y se cierran a los diez segundos. La sala
 * es el otro momento del día, con tiempo y el teléfono apoyado arriba del
 * piano.
 *
 * El orden es por tema y no por rutina, que es la otra diferencia: acá nadie
 * empieza por arriba y sigue hasta abajo — se viene a buscar una cosa.
 */
export default function TallerPage() {
  const herramientas = catalogoDe("taller");
  const acordes = acordesAprendidos();
  const temas = AREAS.map((a) => ({
    ...a,
    herramientas: herramientas.filter((e) => e.area === a.id),
  })).filter((a) => a.herramientas.length > 0 || a.id === "acordes");

  return (
    <div className="pt-10">
      <header className="mb-10">
        <p className="text-xs tracking-[0.25em] text-humo uppercase">
          {herramientas.length + 1} herramientas
        </p>
        <h1 className="font-display mt-2 text-5xl font-black tracking-tight sm:text-6xl">
          El taller
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-humo">
          Lo que se abre con una duda: el círculo de quintas, la tabla de
          acordes, las armaduras, las texturas. Ninguna te toma examen —
          <strong className="text-tiza"> se miran, se tocan y se cierran</strong>
          , y varias funcionan sin el piano al lado. Salieron de una clase pero
          no se quedaron ahí.
        </p>
        <p className="mt-2 max-w-2xl text-sm text-humo">
          Los ejercicios que te corrigen o te puntúan están en{" "}
          <Link href="/practica" className="text-sol underline decoration-dotted underline-offset-4">
            la sala de práctica
          </Link>
          .
        </p>
      </header>

      {temas.map((tema) => (
        <section key={tema.id} id={tema.id} className="mb-12 scroll-mt-20">
          <div className="mb-4 flex flex-col gap-x-3 gap-y-1 border-b border-borde pb-2 sm:flex-row sm:items-baseline">
            <h2 className="font-display flex items-center gap-2 text-2xl font-black tracking-tight">
              <span className="text-sol"><Icono de={tema.emoji} /></span>
              {tema.titulo}
            </h2>
            <p className="text-sm text-humo">{tema.bajada}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* La tabla de acordes no sale de ninguna clase: son todos los que
                hay, y es la herramienta más vieja del cuaderno. */}
            {tema.id === "acordes" && (
              <Tarjeta
                href="/acordes"
                emoji="🎹"
                titulo="Todos los acordes"
                bajada={`Las ${CHORD_QUALITIES.length} recetas en semitonos, con su cifrado, su teclado y su sonido${
                  acordes.length === CHORD_QUALITIES.length
                    ? " — todas vistas en clase"
                    : `, de las que ${acordes.length} se vieron en clase`
                }.`}
              />
            )}
            {tema.herramientas.map((e) => (
              <Tarjeta
                key={e.slug}
                href={rutaDe(e)}
                emoji={e.emoji}
                titulo={e.titulo}
                bajada={resumir(e.bajada)}
                clase={e.lesson.n}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Tarjeta({
  href,
  emoji,
  titulo,
  bajada,
  clase,
}: {
  href: string;
  emoji: string;
  titulo: string;
  bajada: string;
  clase?: number;
}) {
  return (
    <Link href={href} className="card group flex flex-col gap-3 p-5 transition hover:border-sol/40">
      <span className="flex items-center justify-between">
        <span className="text-4xl text-sol"><Icono de={emoji} /></span>
        {clase !== undefined && (
          <span className="rounded-full bg-carta-2 px-2 py-0.5 text-[11px] text-humo">
            clase {clase}
          </span>
        )}
      </span>
      <span className="font-display text-xl font-bold tracking-tight group-hover:text-sol">
        {titulo}
      </span>
      <span className="text-sm leading-relaxed text-humo">{bajada}</span>
    </Link>
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
