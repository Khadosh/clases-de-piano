"use client";

import { useEffect, useState } from "react";

/** La fecha de hoy en el aparato, en ISO. Sin UTC: el miércoles es el de acá. */
function hoyISO() {
  const d = new Date();
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

/**
 * Una marca de "hoy" al lado del día que corresponde. Se decide después de
 * montar: el servidor dibujó la página el día del build y no sabe qué día es
 * en el teléfono arriba del piano, así que hasta entonces no se dibuja nada y
 * la hidratación no tiene de qué quejarse.
 */
export default function Hoy({ fecha, children }: { fecha: string; children?: React.ReactNode }) {
  const [hoy, setHoy] = useState<string | null>(null);
  useEffect(() => setHoy(hoyISO()), []);
  if (hoy !== fecha) return null;
  return (
    <span className="rounded-full bg-sol px-2.5 py-0.5 text-xs font-bold tracking-wide text-noche uppercase">
      {children ?? "hoy"}
    </span>
  );
}
