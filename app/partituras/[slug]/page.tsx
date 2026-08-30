import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PIEZAS, piezaPorSlug } from "@/content/partituras";
import Partitura from "@/components/Partitura";

export function generateStaticParams() {
  return PIEZAS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pieza = piezaPorSlug(slug);
  if (!pieza) return {};
  return { title: `${pieza.titulo} — ${pieza.compositor}`, description: pieza.sobre };
}

export default async function PiezaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pieza = piezaPorSlug(slug);
  if (!pieza) notFound();

  return (
    <div className="pt-10">
      <nav className="mb-6 text-sm text-humo print:hidden">
        <Link href="/partituras" className="transition hover:text-sol">
          ← Partituras
        </Link>
      </nav>

      <header className="mb-7">
        <p className="text-xs tracking-[0.25em] text-humo uppercase">
          {pieza.compositor} · {pieza.anio}
        </p>
        <h1 className="font-display mt-1 text-4xl font-black tracking-tight sm:text-5xl">
          {pieza.titulo}
        </h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-humo print:hidden">
          {pieza.sobre}
        </p>
      </header>

      <Partitura pieza={pieza} />

      {/* La honestidad al pie: qué es esto exactamente y qué habría que chequear.
          No sirve en el papel: si algo no cierra, se pregunta mirando la pantalla. */}
      <div className="mt-6 rounded-2xl border border-borde bg-carta-2/40 px-5 py-4 text-sm text-humo print:hidden">
        <p>
          <strong className="text-tiza">{pieza.hasta}</strong>{" "}
          {pieza.propia
            ? "La obra es de acá — se compuso en estas clases — y la transcripción salió de su grabación, así que las notas son las que se tocaron."
            : "La obra es de dominio público; la transcripción la escribimos nosotros a mano y de memoria, así que puede tener errores."}
        </p>
        {pieza.revisar && <p className="mt-2">{pieza.revisar}</p>}
        <p className="mt-2 text-humo/70">
          Si algo no cierra, es material perfecto para preguntarle al profe.
        </p>
      </div>
    </div>
  );
}
