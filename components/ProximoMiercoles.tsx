"use client";

import { useEffect, useState } from "react";

/**
 * Cuánto falta para el próximo miércoles. Se calcula en el browser: si lo
 * hiciéramos en el build, quedaría congelado en la fecha del deploy.
 */
export default function ProximoMiercoles() {
  const [texto, setTexto] = useState<string | null>(null);

  useEffect(() => {
    const hoy = new Date();
    const dia = hoy.getDay(); // 0 domingo … 3 miércoles
    const faltan = (3 - dia + 7) % 7;

    if (faltan === 0) {
      setTexto("Hoy hay clase 🎹");
      return;
    }
    const prox = new Date(hoy);
    prox.setDate(hoy.getDate() + faltan);
    const cuando = new Intl.DateTimeFormat("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(prox);
    setTexto(
      `Faltan ${faltan} ${faltan === 1 ? "día" : "días"} · ${cuando}`,
    );
  }, []);

  return (
    <span className="tabular-nums">
      {texto ?? <span className="opacity-0">cargando</span>}
    </span>
  );
}
