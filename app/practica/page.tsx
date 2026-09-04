import Link from "next/link";
import Icono from "@/components/Icono";
import type { Metadata } from "next";
import { LESSONS, latestLesson, slugOf } from "@/content";
import { PIEZAS } from "@/content/partituras";
import { AREAS, acordesAprendidos, catalogo } from "@/content/practica";
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
 * pidió el profe el miércoles), que es lo que decide qué se practica. Abajo,
 * **una card por paso de la rutina** y nada más: título, dibujo, una línea.
 * Los ejercicios de cada paso viven en su propia página. Se probó tenerlos
 * todos acá, plegados en el teléfono y abiertos en desktop, y en desktop era
 * el índice viejo con otro sombrero: veinticinco renglones que marean para
 * elegir uno.
 */
export default function PracticaPage() {
  const todo = catalogo();
  const acordes = acordesAprendidos();
  const ultima = latestLesson();
  const fichas = todo.map((e) => ({ slug: e.slug, titulo: e.titulo, emoji: e.emoji }));
  const pasos = AREAS.map((a) => ({ ...a, cuantos: todo.filter((e) => e.area === a.id).length })).filter(
    (a) => a.cuantos > 0,
  );

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
          Todo lo que hay para machacar entre un miércoles y el otro, en{" "}
          <strong className="text-tiza">orden de rutina</strong>: primero lo que
          pide dedos, después lo que pide cabeza, y al final una pieza de verdad.
          Uno o dos por vez alcanzan.
        </p>
      </header>

      <div className="mb-8 flex flex-col gap-3">
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

      {/* Los pasos de la rutina, una card cada uno. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pasos.map((a, i) => (
          <Link
            key={a.id}
            href={`/practica/paso/${a.id}`}
            className="card group relative flex flex-col gap-3 p-6 transition hover:border-sol/40"
          >
            <span className="font-display absolute top-4 right-5 text-4xl font-black text-borde">
              {i + 1}
            </span>
            <span className="text-5xl text-sol"><Icono de={a.emoji} /></span>
            <span className="font-display text-2xl font-black tracking-tight group-hover:text-sol">
              {a.titulo}
            </span>
            <span className="text-sm leading-relaxed text-humo">{a.bajada}</span>
            <span className="mt-auto font-mono text-xs text-humo">
              {a.cuantos} {a.cuantos === 1 ? "ejercicio" : "ejercicios"} →
            </span>
          </Link>
        ))}

        {/* El paso que faltaba decir: la rutina termina tocando música. */}
        <Link
          href="/partituras"
          className="card group relative flex flex-col gap-3 p-6 transition hover:border-sol/40"
        >
          <span className="font-display absolute top-4 right-5 text-4xl font-black text-borde">
            {pasos.length + 1}
          </span>
          <span className="text-5xl text-sol"><Icono de="pentagrama" /></span>
          <span className="font-display text-2xl font-black tracking-tight group-hover:text-sol">
            El repertorio
          </span>
          <span className="text-sm leading-relaxed text-humo">
            Para cerrar, donde los ejercicios se juntan: una pieza de verdad. Las
            partituras suenan, te marcan dónde vas y te esperan si tenés el teclado
            enchufado.
          </span>
          <span className="mt-auto font-mono text-xs text-humo">
            {PIEZAS.length} {PIEZAS.length === 1 ? "pieza" : "piezas"} →
          </span>
        </Link>
      </div>
    </div>
  );
}
