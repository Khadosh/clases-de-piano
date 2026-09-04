import Link from "next/link";
import Icono from "@/components/Icono";
import type { Metadata } from "next";
import { LESSONS, latestLesson, slugOf } from "@/content";
import { PIEZAS } from "@/content/partituras";
import { AREAS, acordesAprendidos, catalogo } from "@/content/practica";
import SalaIndice, { type PasoDeLaSala } from "@/components/SalaIndice";
import SeguirCon from "@/components/SeguirCon";
import { rich } from "@/components/Blocks";

export const metadata: Metadata = {
  title: "Práctica",
  description:
    "Todos los ejercicios de todas las clases, agrupados por tipo y en orden de rutina, para machacarlos entre miércoles y miércoles.",
};

/**
 * El índice de la sala de práctica, como lo que es: un lugar para elegir.
 *
 * El patrón real es practicar uno o dos ejercicios por vez y volver al mismo
 * varios días seguidos, así que arriba de todo va **seguir con** (lo último
 * que se abrió, guardado en el aparato) y **la tarea de esta semana** (lo que
 * pidió el profe el miércoles), que es lo que decide qué se practica. Recién
 * después el mapa entero, en cards por paso de la rutina con los ejercicios
 * agrupados adentro por lo que se hace en cada uno. Y cierra donde cierra
 * una práctica de verdad: en el repertorio.
 *
 * Cada ejercicio tiene su página y su dirección estable para dejar abierta
 * arriba del piano.
 */
export default function PracticaPage() {
  const todo = catalogo();
  const acordes = acordesAprendidos();
  const ultima = latestLesson();
  const piezasFaciles = [...PIEZAS].sort((a, b) => a.dificultad - b.dificultad).slice(0, 2);

  const pasos: PasoDeLaSala[] = AREAS.map((a) => ({
    id: a.id,
    titulo: a.titulo,
    emoji: a.emoji,
    bajada: a.bajada,
    ejercicios: todo
      .filter((e) => e.area === a.id)
      .map((e) => ({
        slug: e.slug,
        titulo: e.titulo,
        bajada: resumir(e.bajada),
        emoji: e.emoji,
        forma: e.forma,
        clase: e.lesson.n,
      })),
  })).filter((p) => p.ejercicios.length > 0);

  const fichas = todo.map((e) => ({ slug: e.slug, titulo: e.titulo, emoji: e.emoji }));

  return (
    <div className="pt-10">
      <header className="mb-8">
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
          clase, y en <strong className="text-tiza">orden de rutina</strong>:
          primero lo que pide dedos, después lo que pide cabeza, y al final una
          pieza de verdad. Uno o dos por vez alcanzan.
        </p>
      </header>

      <div className="mb-10 flex flex-col gap-3">
        <SeguirCon fichas={fichas} />

        {/* La tarea del miércoles: es lo que decide qué se practica esta semana. */}
        {ultima.homework && ultima.homework.length > 0 && (
          <section className="card px-5 py-4">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-xs tracking-[0.2em] text-humo uppercase">
                La tarea de esta semana
              </span>
              <Link
                href={`/clases/${slugOf(ultima)}`}
                className="text-sm text-humo underline decoration-dotted underline-offset-4 transition hover:text-sol"
              >
                clase {ultima.n} · {ultima.title} →
              </Link>
            </div>
            <ul className="mt-2 space-y-1.5">
              {ultima.homework.map((h, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed text-tiza">
                  <span className="text-sol">▸</span>
                  <span>{rich(h)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <SalaIndice pasos={pasos} />

      {/* El paso que faltaba decir: la rutina termina tocando música. */}
      <section className="card mt-4 mb-14 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="font-display w-7 text-center text-3xl font-black text-borde">
            {pasos.length + 1}
          </span>
          <span className="text-2xl text-sol"><Icono de="pentagrama" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl font-black tracking-tight">El repertorio</h2>
            <p className="mt-0.5 text-sm text-humo">
              Para cerrar, donde los ejercicios se juntan: una pieza de verdad. Las
              partituras suenan, te marcan dónde vas y te esperan si tenés el teclado
              enchufado.
            </p>
          </div>
          <span className="font-mono text-sm text-humo">{PIEZAS.length}</span>
        </div>
        <ul className="border-t border-borde/60 py-2">
          {piezasFaciles.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/partituras/${p.slug}`}
                className="group flex items-start gap-3 px-5 py-2 transition hover:bg-carta-2/60"
              >
                <span className="mt-0.5 text-lg text-sol"><Icono de="pentagrama" /></span>
                <span className="min-w-0 flex-1">
                  <span className="font-display flex flex-wrap items-baseline gap-x-2 font-bold">
                    {p.titulo}
                    <span className="rounded-full bg-carta-2 px-2 py-0.5 font-mono text-[11px] font-normal text-humo">
                      {"●".repeat(p.dificultad)}
                      <span className="opacity-30">{"●".repeat(5 - p.dificultad)}</span>
                    </span>
                  </span>
                  <span className="block text-sm leading-relaxed text-humo">
                    {p.compositor} · {resumir(p.sobre)}
                  </span>
                </span>
                <span className="self-center text-humo transition group-hover:text-sol">→</span>
              </Link>
            </li>
          ))}
          <li className="px-5 pt-2 pb-1 text-sm text-humo">
            <Link
              href="/partituras"
              className="font-semibold text-tiza underline decoration-dotted underline-offset-4 transition hover:text-sol"
            >
              Todas las partituras →
            </Link>{" "}
            <span className="text-humo/70">ordenadas por lo que se puede intentar hoy.</span>
          </li>
        </ul>
      </section>
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
