"use client";

import { useEffect } from "react";
import { anotarVisita } from "@/lib/recientes";

/** Abrir la página de un ejercicio lo deja anotado como lo último practicado. */
export default function Visita({ slug }: { slug: string }) {
  useEffect(() => {
    anotarVisita(slug);
  }, [slug]);
  return null;
}
