"use client";

import { useEffect, useMemo, useState } from "react";
import Tocador from "./Tocador";
import { rich } from "./rich";
import { cancionPorSlug, type Capa } from "@/content/canciones";
import { compasVacio, gradoEnMayor, leerGrupos, textoDeGrupos, cifradoDeVoicing } from "@/lib/capas";
import { FUNCIONES, type Funcion } from "@/lib/grados";
import { EVENTO, capasHechas, marcarCapa } from "@/lib/progresoCapas";

/**
 * Una canción practicada por capas: arriba las cinco en orden con cuáles ya
 * salen, abajo la elegida. Una por vez, como los ejercicios de la sala —cada
 * capa pide otra cosa y tenerlas todas montadas a la vez no ayuda a
 * ninguna—, y la elegida va en la dirección (`#capa-3`) para que quede abierta
 * en el teléfono arriba del piano.
 */

/** Los mismos tres colores de la armonía de las partituras (`Progresion`). */
const COLOR: Record<Funcion, string> = {
  reposo: "border-menta bg-menta/15 text-menta",
  subdominante: "border-sol bg-sol/15 text-sol",
  dominante: "border-brasa bg-brasa/15 text-brasa",
};

export default function CancionPorCapas({ slug }: { slug: string }) {
  const cancion = cancionPorSlug(slug)!;
  const [elegida, setElegida] = useState(0);
  const [hechas, setHechas] = useState<number[]>([]);

  useEffect(() => {
    const leer = () => setHechas(capasHechas(slug));
    const irAlHash = () => {
      const m = /^#capa-(\d)$/.exec(window.location.hash);
      if (m) setElegida(Math.min(Number(m[1]) - 1, cancion.capas.length - 1));
    };
    leer();
    irAlHash();
    window.addEventListener(EVENTO, leer);
    window.addEventListener("hashchange", irAlHash);
    return () => {
      window.removeEventListener(EVENTO, leer);
      window.removeEventListener("hashchange", irAlHash);
    };
  }, [slug, cancion.capas.length]);

  const elegir = (i: number) => {
    setElegida(i);
    history.replaceState(null, "", `#capa-${i + 1}`);
  };

  const capa = cancion.capas[elegida];
  const hecha = hechas.includes(elegida);

  return (
    <div className="flex flex-col gap-6">
      <ol className="grid gap-2 sm:grid-cols-5">
        {cancion.capas.map((c, i) => (
          <li key={i}>
            <button
              onClick={() => elegir(i)}
              className={`card flex h-full w-full flex-col gap-1 px-4 py-3 text-left transition ${
                i === elegida ? "border-sol/70" : "hover:border-sol/40"
              }`}
            >
              <span className="flex items-center gap-2 font-mono text-xs text-humo">
                capa {i + 1}
                {hechas.includes(i) && <span className="text-menta">✓ sale</span>}
              </span>
              <span className={`font-display text-lg leading-tight font-black ${i === elegida ? "text-sol" : ""}`}>
                {c.titulo}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p className="-mt-3 font-mono text-xs text-humo">
        {hechas.length} de {cancion.capas.length} capas ya salen
      </p>

      <section className="card p-5 sm:p-6" id={`capa-${elegida + 1}`}>
        <p className="text-xs tracking-[0.2em] text-humo uppercase">Capa {elegida + 1}</p>
        <h2 className="font-display mt-1 text-3xl font-black tracking-tight">{capa.titulo}</h2>
        <p className="mt-2 text-lg leading-relaxed text-humo">{capa.bajada}</p>
        <ul className="mt-4 space-y-1.5">
          {capa.como.map((t, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed text-tiza">
              <span className="text-sol">▸</span>
              <span>{rich(t)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6">
          <CuerpoDeCapa key={elegida} capa={capa} tempo={cancion.tempo} tonica={cancion.tonica} />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-borde/60 pt-4">
          <button
            onClick={() => marcarCapa(slug, elegida, !hecha)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              hecha ? "bg-menta text-noche" : "bg-carta-2 text-tiza hover:text-sol"
            }`}
          >
            {hecha ? "✓ ya me sale" : "ya me sale"}
          </button>
          <span className="ml-auto flex gap-2">
            {elegida > 0 && (
              <button onClick={() => elegir(elegida - 1)} className="text-sm text-humo transition hover:text-sol">
                ← capa {elegida}
              </button>
            )}
            {elegida < cancion.capas.length - 1 && (
              <button onClick={() => elegir(elegida + 1)} className="text-sm text-humo transition hover:text-sol">
                capa {elegida + 2}: {cancion.capas[elegida + 1].titulo} →
              </button>
            )}
          </span>
        </div>
      </section>
    </div>
  );
}

function CuerpoDeCapa({ capa, tempo, tonica }: { capa: Capa; tempo: number; tonica: number }) {
  switch (capa.tipo) {
    case "acordes":
      return (
        <>
          <p className="mb-3 text-sm text-humo">
            Tocá un acorde para escucharlo. La tecla en amarillo con <span className="font-mono text-sol">=</span> es la
            que ya estaba apretada en el anterior: ésa no se mueve.
          </p>
          <Tocador compases={capa.vuelta} tempo={tempo} click={false} />
        </>
      );
    case "riff":
      return <Tocador compases={capa.compases} tempo={tempo} />;
    case "ritmo":
      return <Ritmo compases={capa.compases} tempo={tempo} />;
    case "progresion":
      return <Puente capa={capa} tempo={tempo} tonica={tonica} />;
    case "todo":
      return <Todo capa={capa} tempo={tempo} />;
    default: {
      const nunca: never = capa;
      return nunca;
    }
  }
}

/** El metrónomo de acentos por grupos, con los compases de la canción y un editor para armar otros. */
function Ritmo({ compases, tempo }: { compases: { nombre: string; grupos: number[] }[]; tempo: number }) {
  const [grupos, setGrupos] = useState(compases[0].grupos);
  const [texto, setTexto] = useState(textoDeGrupos(compases[0].grupos));
  const lista = useMemo(() => [compasVacio(grupos)], [grupos]);
  const valido = leerGrupos(texto) !== null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {compases.map((c) => (
          <button
            key={c.nombre}
            onClick={() => {
              setGrupos(c.grupos);
              setTexto(textoDeGrupos(c.grupos));
            }}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              textoDeGrupos(grupos) === textoDeGrupos(c.grupos)
                ? "bg-tiza text-noche"
                : "bg-carta-2 text-humo hover:text-tiza"
            }`}
          >
            {c.nombre}
            {c.nombre !== textoDeGrupos(c.grupos) && (
              <span className="ml-1.5 font-mono text-xs opacity-70">{textoDeGrupos(c.grupos)}</span>
            )}
          </button>
        ))}
        <label className="flex items-center gap-2 text-sm text-humo">
          o armalo:
          <input
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              const g = leerGrupos(e.target.value);
              if (g) setGrupos(g);
            }}
            className={`w-28 rounded-lg border bg-noche-2 px-2 py-1 font-mono text-tiza ${
              valido ? "border-borde" : "border-brasa"
            }`}
            aria-label="grupos del compás"
          />
        </label>
      </div>
      <Tocador compases={lista} tempo={tempo} teclado={false} conClick={false} />
    </div>
  );
}

function Puente({
  capa,
  tempo,
  tonica,
}: {
  capa: Extract<Capa, { tipo: "progresion" }>;
  tempo: number;
  tonica: number;
}) {
  const [tecnica, setTecnica] = useState(false);
  const grados = capa.acordes.map((v) => gradoEnMayor(v, tonica));

  return (
    <div className="flex flex-col gap-5">
      {/* La progresión pintada por tensión, como la armonía de las partituras. */}
      <div className="flex flex-wrap items-stretch gap-2">
        {capa.acordes.map((v, i) => (
          <div key={i} className={`flex min-w-20 flex-col items-center rounded-xl border px-3 py-2 ${COLOR[grados[i].funcion]}`}>
            <span className="font-display text-2xl font-black">{cifradoDeVoicing(v)}</span>
            {tecnica && <span className="font-mono text-sm">{grados[i].romano}</span>}
            <span className="text-xs">{grados[i].prestado ? "prestado" : FUNCIONES[grados[i].funcion].nombre.toLowerCase()}</span>
          </div>
        ))}
      </div>

      <ul className="space-y-1.5">
        {(tecnica ? [...capa.simple, ...capa.tecnica] : capa.simple).map((t, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-tiza">
            <span className="text-sol">▸</span>
            <span>{rich(t)}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={() => setTecnica((t) => !t)}
        className="self-start text-sm text-humo underline decoration-dotted underline-offset-4 transition hover:text-sol"
      >
        {tecnica ? "ocultar la explicación técnica" : "explicación técnica"}
      </button>

      <Tocador compases={capa.compases} tempo={tempo} />
    </div>
  );
}

function Todo({ capa, tempo }: { capa: Extract<Capa, { tipo: "todo" }>; tempo: number }) {
  // Cada sección se anuncia en su primer compás: el chip dice dónde estás y cómo va la mano.
  const compases = useMemo(
    () =>
      capa.secciones.flatMap((s) =>
        s.compases.map((c, i) => (i === 0 ? { ...c, etiqueta: `${s.nombre} (${s.caracter}) · ${c.etiqueta}` } : c)),
      ),
    [capa],
  );
  return (
    <div className="flex flex-col gap-5">
      <ul className="space-y-1.5">
        {capa.notas.map((t, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-tiza">
            <span className="text-sol">▸</span>
            <span>{rich(t)}</span>
          </li>
        ))}
      </ul>
      <Tocador compases={compases} tempo={tempo} />
    </div>
  );
}
