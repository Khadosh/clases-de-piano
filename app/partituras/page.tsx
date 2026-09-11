import Link from "next/link";
import type { Metadata } from "next";
import { PIEZAS } from "@/content/partituras";

export const metadata: Metadata = {
  title: "Partituras",
  description:
    "Piezas escritas como datos: se leen, suenan y te siguen mientras las tocás.",
};

/**
 * La biblioteca. Ordenada por dificultad y no por fecha ni por fama: arriba va
 * lo que se puede intentar hoy, que es lo único que importa cuando estás
 * empezando.
 */
export default function PartiturasPage() {
  const piezas = [...PIEZAS].sort((a, b) => a.dificultad - b.dificultad);
  const propias = piezas.filter((p) => p.propia).length;
  // Las sueltas van en la grilla de siempre. Las que forman un libro van
  // aparte, agrupadas por libro y en el orden del libro: mezclarlas con las
  // sueltas por dificultad ponía diecisiete estudios de Burgmüller en el
  // medio de todo, y lo que uno busca de un libro es el número.
  const sueltas = piezas.filter((p) => !p.coleccion);
  const libros = new Map<string, typeof piezas>();
  for (const p of piezas) {
    if (!p.coleccion) continue;
    if (!libros.has(p.coleccion.titulo)) libros.set(p.coleccion.titulo, []);
    libros.get(p.coleccion.titulo)!.push(p);
  }
  for (const lista of libros.values()) lista.sort((a, b) => a.coleccion!.numero - b.coleccion!.numero);
  return (
    <div className="pt-10">
      <header className="mb-10">
        <p className="text-xs tracking-[0.25em] text-humo uppercase">
          {piezas.length} piezas ·{" "}
          {propias === 0
            ? "dominio público"
            : `${piezas.length - propias} de dominio público y ${propias === 1 ? "una propia" : `${propias} propias`}`}
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
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-humo">
          Es el último paso de la{" "}
          <Link
            href="/practica"
            className="font-semibold text-tiza underline decoration-dotted underline-offset-4 transition hover:text-sol"
          >
            sala de práctica
          </Link>
          : los ejercicios entrenan las partes, acá se juntan. Los puntitos son
          la dificultad, y la lista va de lo que se puede intentar hoy a lo que
          va a haber que ganarse.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {sueltas.map((p) => (
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

      {[...libros.entries()].map(([titulo, lista]) => (
        <section key={titulo} className="mt-14">
          <p className="text-xs tracking-[0.25em] text-humo uppercase">
            {lista.length} piezas · {lista[0].compositor}
          </p>
          <h2 className="font-display mt-2 text-3xl font-black tracking-tight">{titulo}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-humo">
            Un libro entero va en el orden del libro y no por dificultad: los
            números ya están pensados para ir de a uno.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lista.map((p) => (
              <Link
                key={p.slug}
                href={`/partituras/${p.slug}`}
                className="card group p-4 transition hover:border-sol/40"
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-sm text-humo">{p.coleccion!.numero}.</span>
                  <h3 className="font-display text-xl font-bold">{p.titulo}</h3>
                  <span className="ml-auto font-mono text-xs text-humo">
                    {"●".repeat(p.dificultad)}
                    <span className="opacity-30">{"●".repeat(5 - p.dificultad)}</span>
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-humo">
                  {p.compas.numerador}/{p.compas.denominador}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-humo">{p.sobre}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
