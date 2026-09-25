import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { aliases, buscar, catalogo } from "@/content/practica";
import PaginaDeEjercicio from "@/components/PaginaDeEjercicio";

/**
 * Una herramienta del taller: de las que no te contestan nada.
 *
 * Genera también las direcciones de los ejercicios de la sala, para que una
 * dirección escrita a mano caiga en su lugar en vez de dar 404: un slug es lo
 * que queda abierto en el teléfono arriba del piano, y eso no se rompe porque
 * nosotros hayamos reordenado el sitio.
 */
export function generateStaticParams() {
  return [...catalogo().map((e) => e.slug), ...Object.keys(aliases())].map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const encontrado = buscar(slug);
  if (!encontrado || encontrado.entrada.casa !== "taller") return {};
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
  // Se mudó al taller: la dirección vieja sigue llevando ahí, con su alias.
  if (encontrado.entrada.casa === "sala") redirect(`/practica/${slug}`);
  return <PaginaDeEjercicio {...encontrado} />;
}
