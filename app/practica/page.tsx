import Link from "next/link";
import Icono from "@/components/Icono";
import type { Metadata } from "next";
import { LESSONS } from "@/content";
import {
  AREAS,
  acordesAprendidos,
  catalogo,
  type Area,
  type Entrada,
} from "@/content/practica";

export const metadata: Metadata = {
  title: "Práctica",
  description:
    "Todos los ejercicios de todas las clases, agrupados por tipo, para machacarlos entre miércoles y miércoles.",
};

/**
 * El índice de la sala de práctica.
 *
 * Antes esto era una sola página con todos los ejercicios montados uno abajo
 * del otro, y eso está bien para hojear y mal para practicar: cada ejercicio
 * pide otra cosa —uno el piano, otro la cabeza, otro el metrónomo— y tenerlos
 * todos a la vez no ayuda a ninguno. Encima con tres pianos en pantalla el MIDI
 * tenía que adivinar a cuál le hablabas.
 *
 * Así que acá sólo se elige, y cada ejercicio tiene su página y su dirección.
 */
export default function PracticaPage() {
  const todo = catalogo();
  const porArea = (a: Area) => todo.filter((e) => e.area === a.id);
  const areasConAlgo = AREAS.filter((a) => porArea(a).length > 0);
  const acordes = acordesAprendidos();

  return (
    <div className="pt-10">
      <header className="mb-12">
        <p className="text-xs tracking-[0.25em] text-humo uppercase">
          {todo.length} ejercicios · {LESSONS.length}{" "}
          {LESSONS.length === 1 ? "clase" : "clases"} · {acordes.length} acordes
        </p>
        <h1 className="font-display mt-2 text-5xl font-black tracking-tight sm:text-6xl">
          Sala de práctica
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-humo">
          Todo lo que hay para machacar entre un miércoles y el otro,{" "}
          <strong className="text-tiza">agrupado por tipo</strong> y no por
          clase. Elegí uno: cada ejercicio tiene su página, para tenerla abierta
          y sola arriba del piano.
        </p>
      </header>

      {areasConAlgo.map((a) => (
        <section key={a.id} className="mb-14">
          <div className="mb-5 flex items-center gap-3 border-b-2 border-borde pb-3">
            <span className="text-3xl text-sol"><Icono de={a.emoji} /></span>
            <div className="min-w-0">
              <h2 className="font-display text-3xl font-black tracking-tight">
                {a.titulo}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-humo">{a.bajada}</p>
            </div>
            <span className="ml-auto self-start font-mono text-sm text-humo">
              {porArea(a).length}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {porArea(a).map((e) => (
              <Tarjeta key={e.slug} e={e} />
            ))}
          </div>
        </section>
      ))}
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

function Tarjeta({ e }: { e: Entrada }) {
  return (
    <Link
      href={`/practica/${e.slug}`}
      className="card group flex items-start gap-4 p-5 transition hover:border-sol/40"
    >
      <span className="text-3xl text-sol"><Icono de={e.emoji} /></span>
      <span className="min-w-0">
        <span className="font-display flex flex-wrap items-baseline gap-x-2 text-xl font-bold">
          {e.titulo}
          <span className="rounded-full bg-carta-2 px-2 py-0.5 text-[11px] font-normal text-humo">
            clase {e.lesson.n}
          </span>
        </span>
        {/* En una tarjeta el resaltado no resalta nada, y las bajadas que
            vienen de una clase son párrafos enteros: acá va la primera oración
            y el resto se lee adentro. */}
        <span className="mt-1.5 block text-sm leading-relaxed text-humo">
          {resumir(e.bajada)}
        </span>
      </span>
      <span className="ml-auto self-center text-humo transition group-hover:text-sol">
        →
      </span>
    </Link>
  );
}
