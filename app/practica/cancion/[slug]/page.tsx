import { notFound, redirect } from "next/navigation";
import { APRENDER, aprenderDe, rutaDeAprender } from "@/content/aprender";

/**
 * Donde vivía Here Comes the Sun por capas antes de mudarse a la sección
 * «Aprender» de las partituras (#11). La dirección quedó abierta en algún
 * teléfono, así que redirige en vez de dar 404; el `#capa-3` lo conserva el
 * navegador.
 */

export function generateStaticParams() {
  return APRENDER.map((a) => ({ slug: a.slug }));
}

export default async function CancionVieja({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!aprenderDe(slug)) notFound();
  redirect(rutaDeAprender(slug));
}
