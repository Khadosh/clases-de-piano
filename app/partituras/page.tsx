import Link from "next/link";
import type { Metadata } from "next";
import { PIEZAS, type Pieza } from "@/content/partituras";

export const metadata: Metadata = {
  title: "Partituras",
  description:
    "Piezas escritas como datos: se leen, suenan y te siguen mientras las tocás.",
};

/**
 * La biblioteca, en dos estantes: **las propias y las externas**, y adentro
 * de cada uno **por dificultad**, no por fecha ni por fama: arriba va lo que
 * se puede intentar hoy. Las propias van primero porque son las del
 * cuaderno; las externas incluyen las de un libro (Burgmüller) mezcladas con
 * las sueltas, porque acá lo que ordena es cuánto cuesta y no el número de
 * página — el número se lee en la tarjeta.
 */
export default function PartiturasPage() {
  const porDificultad = (a: Pieza, b: Pieza) =>
    a.dificultad - b.dificultad ||
    (a.coleccion?.numero ?? 0) - (b.coleccion?.numero ?? 0);
  const propias = PIEZAS.filter((p) => p.propia).sort(porDificultad);
  const externas = PIEZAS.filter((p) => !p.propia).sort(porDificultad);
  const estantes: { titulo: string; bajada: string; piezas: Pieza[] }[] = [
    {
      titulo: "Propias",
      bajada: "Las del cuaderno: improvisadas, grabadas y transcriptas acá. Nadie más las toca.",
      piezas: propias,
    },
    {
      titulo: "Externas",
      bajada: "De dominio público, importadas de partituras escritas como datos. De lo que se puede intentar hoy a lo que va a haber que ganarse.",
      piezas: externas,
    },
  ].filter((e) => e.piezas.length);

  const tarjeta = (p: Pieza) => (
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
        {p.compositor} · {p.anio} · {p.compas.numerador}/{p.compas.denominador}
        {p.coleccion && ` · ${p.coleccion.titulo}, nº ${p.coleccion.numero}`}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-humo">{p.sobre}</p>
      <p className="mt-3 text-xs text-humo/70">{p.hasta}</p>
    </Link>
  );

  return (
    <div className="pt-10">
      <header className="mb-10">
        <p className="text-xs tracking-[0.25em] text-humo uppercase">
          {PIEZAS.length} piezas ·{" "}
          {propias.length === 0
            ? "dominio público"
            : `${externas.length} de dominio público y ${propias.length === 1 ? "una propia" : `${propias.length} propias`}`}
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
          la dificultad, y cada estante va de lo que se puede intentar hoy a lo
          que va a haber que ganarse.
        </p>
      </header>

      {estantes.map((e, i) => (
        <section key={e.titulo} className={i ? "mt-14" : ""}>
          <p className="text-xs tracking-[0.25em] text-humo uppercase">{e.piezas.length} piezas</p>
          <h2 className="font-display mt-2 text-3xl font-black tracking-tight">{e.titulo}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-humo">{e.bajada}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">{e.piezas.map(tarjeta)}</div>
        </section>
      ))}
    </div>
  );
}
