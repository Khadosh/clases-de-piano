"use client";

import { useEffect, useRef, useState } from "react";

/**
 * La edición completa de una pieza importada, renderizada por
 * OpenSheetMusicDisplay (BSD-3) desde el mismo `.mxl` del que salió nuestra
 * transcripción.
 *
 * No reemplaza nuestro pentagrama: lo complementa. El nuestro es el que sabe
 * qué está sonando —toca, te sigue, arranca del compás que le señales—; éste
 * muestra **todo lo que nuestro modelo todavía no representa**: las ligaduras,
 * los matices, la digitación, las voces que el importador deja afuera. Tenerlo
 * al lado es también el chequeo honesto de qué pierde la transcripción, que
 * hasta ahora sólo estaba contado en el pie de página.
 *
 * **Se carga tarde, como Tone.** OSMD son ~340 KB comprimidos —seis veces
 * Tone entero— así que el `import()` corre recién cuando abrís la vista, y la
 * página no paga nada si no la abrís.
 */
export default function EdicionCompleta({ fuente }: { fuente: string }) {
  const caja = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [{ OpenSheetMusicDisplay }, respuesta] = await Promise.all([
          import("opensheetmusicdisplay"),
          fetch(fuente),
        ]);
        if (!respuesta.ok) throw new Error(`no está ${fuente}`);
        const bytes = new Uint8Array(await respuesta.arrayBuffer());
        // OSMD espera el .mxl como "cadena binaria": cada byte, un carácter.
        let binario = "";
        for (const b of bytes) binario += String.fromCharCode(b);
        if (!vivo || !caja.current) return;
        const osmd = new OpenSheetMusicDisplay(caja.current, {
          // Los colores de la app, no el darkMode de OSMD: ése pinta el fondo
          // negro puro y quedaba un rectángulo desentonado adentro de la carta.
          defaultColorMusic: "#f2efe6",
          pageBackgroundColor: "#12101f",
          drawTitle: false,
          drawComposer: false,
          drawLyricist: false,
          autoResize: true,
        });
        await osmd.load(binario);
        if (!vivo) return;
        osmd.render();
        setEstado("listo");
      } catch {
        if (vivo) setEstado("error");
      }
    })();
    return () => {
      vivo = false;
    };
  }, [fuente]);

  return (
    <div>
      {estado === "cargando" && (
        <p className="py-8 text-center text-sm text-zinc-400">
          Cargando la edición…
        </p>
      )}
      {estado === "error" && (
        <p className="py-8 text-center text-sm text-zinc-400">
          No se pudo cargar la edición completa.
        </p>
      )}
      <div ref={caja} />
    </div>
  );
}
