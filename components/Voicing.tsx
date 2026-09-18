"use client";

import { useEffect, useRef, useState } from "react";
import {
  CHORD_QUALITIES,
  chordSymbol,
  deletrearAcorde,
  escribirNota,
  intervalsOf,
  mod12,
  qualityById,
  type ChordQuality,
} from "@/lib/music";
import {
  REPARTOS,
  abierta,
  cerrada,
  esAbierta,
  gradoDeTecla,
  nombreDeIntervalo,
  saltosEntreVecinas,
  teclasDe,
  unaMano,
  type GradoDeAcorde,
  type Reparto,
  type Voicing as Reparticion,
} from "@/lib/voicing";
import { playChord, wakeAudio } from "@/lib/audio";
import Keyboard, { type Mark } from "./Keyboard";

/**
 * El voicing de la clase 7: el mismo acorde repartido de distintas maneras
 * entre las dos manos, para escuchar que cerrado y grave suena denso y
 * abierto respira — sin que cambie ninguna nota.
 *
 * La tercera lleva un aro en el teclado porque es la nota de la que trata
 * todo: es la que dice mayor o menor, y en el voicing abierto se muda de la
 * izquierda a la derecha. Que no esté abajo no es que falte.
 */

type Disposicion = "cerrada" | Reparto | "una-mano";

const DISPOSICIONES: { id: Disposicion; nombre: string; detalle: string }[] = [
  { id: "cerrada", nombre: "cerrada", detalle: "1-3-5 apilado en la izquierda: denso, como un día nublado." },
  { id: "15-37", nombre: "abierta · 1-5 / 3-7", detalle: "La izquierda pone la base, la derecha el color." },
  { id: "17-35", nombre: "abierta · 1-7 / 3-5", detalle: "La séptima abajo, con la fundamental; arriba la tercera y la quinta." },
  { id: "una-mano", nombre: "a una mano", detalle: "Sin la fundamental y girado, como en el jazz." },
];

const RAICES = Array.from({ length: 12 }, (_, pc) => pc);

export default function Voicing({ qualityIds }: { qualityIds?: string[] }) {
  // Los que apilan terceras: el reparto por grados es de ésos. Los sus no
  // tienen tercera, que es justo de lo que trata el voicing.
  const calidades = (qualityIds ?? CHORD_QUALITIES.map((q) => q.id))
    .map((id) => qualityById(id))
    .filter((q): q is ChordQuality => Boolean(q) && !q!.grados);
  const [calidadId, setCalidadId] = useState(calidades.find((q) => q.id === "maj7")?.id ?? calidades[0]?.id ?? "maj");
  const [raiz, setRaiz] = useState(0);
  const [disposicion, setDisposicion] = useState<Disposicion>("15-37");
  const [duplicar, setDuplicar] = useState<GradoDeAcorde | null>(null);
  const [inversion, setInversion] = useState(0);
  const [sonando, setSonando] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const q = qualityById(calidadId) ?? calidades[0];
  const tieneSeptima = intervalsOf(q).length >= 4;

  // Sin séptima el 1-7 / 3-5 no existe: si estaba elegido, se vuelve al otro.
  const disp: Disposicion = !tieneSeptima && disposicion === "17-35" ? "15-37" : disposicion;

  const armar = (d: Disposicion): Reparticion => {
    if (d === "cerrada") return cerrada(raiz, q);
    if (d === "una-mano") return { izquierda: [], derecha: unaMano(raiz, q, inversion).derecha };
    return abierta(raiz, q, d, { duplicar }) ?? cerrada(raiz, q);
  };
  const v = armar(disp);
  const teclas = teclasDe(v);

  // El rango del teclado se calcula del acorde y no de la disposición: entra
  // todo lo que ese acorde puede ocupar en cualquiera de ellas, así cambiar
  // de cerrada a abierta no mueve el teclado — sólo las marcas.
  const todas = [
    ...teclasDe(cerrada(raiz, q)),
    ...REPARTOS.flatMap((r) => {
      const a = abierta(raiz, q, r.id, { duplicar: 1 });
      const b = abierta(raiz, q, r.id, { duplicar: 5 });
      return [...(a ? teclasDe(a) : []), ...(b ? teclasDe(b) : [])];
    }),
    ...[0, 1, 2].flatMap((i) => unaMano(raiz, q, i).derecha),
  ];
  const desde = Math.floor(Math.min(...todas) / 12) * 12;
  const hasta = Math.max(desde + 24, Math.ceil((Math.max(...todas) + 1) / 12) * 12);
  const notas = deletrearAcorde(raiz, q);
  const nombreDe = (p: number) => {
    const g = gradoDeTecla(p, raiz, q);
    const i = g === null ? -1 : [1, 3, 5, 7].indexOf(g);
    return i >= 0 && notas[i] ? escribirNota(notas[i]) : "";
  };

  const marcas: Mark[] = [
    ...v.izquierda.map((p) => ({
      pitch: p,
      tone: "izq" as const,
      label: String(gradoDeTecla(p, raiz, q) ?? ""),
      active: gradoDeTecla(p, raiz, q) === 3,
    })),
    ...v.derecha.map((p) => ({
      pitch: p,
      tone: "der" as const,
      label: String(gradoDeTecla(p, raiz, q) ?? ""),
      active: gradoDeTecla(p, raiz, q) === 3,
    })),
  ];

  const limpiar = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const escuchar = (d: Disposicion = disp) => {
    limpiar();
    wakeAudio();
    playChord(teclasDe(armar(d)), 2);
    setSonando(d);
    timers.current.push(setTimeout(() => setSonando(null), 1800));
  };

  /** Cerrada y después abierta, seguidas: es la comparación de la clase. */
  const comparar = () => {
    limpiar();
    wakeAudio();
    const abiertaElegida: Disposicion = disp === "cerrada" || disp === "una-mano" ? "15-37" : disp;
    playChord(teclasDe(armar("cerrada")), 1.6);
    setSonando("cerrada");
    timers.current.push(
      setTimeout(() => {
        playChord(teclasDe(armar(abiertaElegida)), 2);
        setSonando(abiertaElegida);
      }, 1700),
    );
    timers.current.push(setTimeout(() => setSonando(null), 3600));
  };

  const saltos = saltosEntreVecinas(teclas);
  const abiertaSegunLaClase = esAbierta(teclas);
  const terceraEnLaIzquierda = v.izquierda.some((p) => gradoDeTecla(p, raiz, q) === 3);
  const sinFundamental = disp === "una-mano" && !teclas.some((p) => mod12(p) === mod12(raiz));

  return (
    <div className="card overflow-hidden">
      {/* Qué acorde */}
      <div className="flex flex-wrap items-center gap-2 border-b border-borde/60 p-4">
        <div className="flex flex-wrap gap-1">
          {RAICES.map((pc) => (
            <button
              key={pc}
              onClick={() => setRaiz(pc)}
              className={`rounded-lg px-2 py-1 font-mono text-xs font-bold transition ${
                raiz === pc ? "bg-tiza text-noche" : "bg-carta-2 text-humo hover:text-tiza"
              }`}
            >
              {escribirNota(deletrearAcorde(pc, q)[0], "en")}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 sm:ml-auto">
          {calidades.map((c) => (
            <button
              key={c.id}
              onClick={() => setCalidadId(c.id)}
              className={`rounded-lg px-2 py-1 font-mono text-xs font-bold transition ${
                calidadId === c.id ? "bg-tiza text-noche" : "bg-carta-2 text-humo hover:text-tiza"
              }`}
              title={c.name}
            >
              {c.suffix || "maj"}
            </button>
          ))}
        </div>
      </div>

      {/* Cómo repartirlo */}
      <div className="flex flex-wrap gap-1.5 px-4 pt-4">
        {DISPOSICIONES.filter((d) => tieneSeptima || d.id !== "17-35").map((d) => (
          <button
            key={d.id}
            onClick={() => {
              setDisposicion(d.id);
              escuchar(d.id);
            }}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
              disp === d.id
                ? sonando === d.id
                  ? "bg-sol text-noche"
                  : "bg-tiza text-noche"
                : "bg-carta-2 text-humo hover:text-tiza"
            }`}
            title={d.detalle}
          >
            {d.nombre}
          </button>
        ))}
      </div>
      <p className="px-4 pt-2 text-xs text-humo">{DISPOSICIONES.find((d) => d.id === disp)?.detalle}</p>

      {/* Los ajustes de cada disposición */}
      {(disp === "15-37" || disp === "17-35") && (
        <div className="flex flex-wrap items-center gap-2 px-4 pt-3 text-xs text-humo">
          <span>duplicar en la derecha:</span>
          {([null, 1, 5] as const).map((g) => (
            <button
              key={String(g)}
              onClick={() => setDuplicar(g)}
              className={`rounded-lg px-2 py-1 font-mono font-bold transition ${
                duplicar === g ? "bg-tiza text-noche" : "bg-carta-2 text-humo hover:text-tiza"
              }`}
            >
              {g === null ? "nada" : g === 1 ? "la fundamental" : "la quinta"}
            </button>
          ))}
        </div>
      )}
      {disp === "una-mano" && (
        <div className="flex flex-wrap items-center gap-2 px-4 pt-3 text-xs text-humo">
          <span>girado:</span>
          {Array.from({ length: unaMano(raiz, q).derecha.length }, (_, i) => i).map((i) => (
            <button
              key={i}
              onClick={() => setInversion(i)}
              className={`rounded-lg px-2 py-1 font-mono font-bold transition ${
                inversion % unaMano(raiz, q).derecha.length === i
                  ? "bg-tiza text-noche"
                  : "bg-carta-2 text-humo hover:text-tiza"
              }`}
            >
              {i === 0 ? "sin girar" : `${i}ª vuelta`}
            </button>
          ))}
        </div>
      )}

      <div className="p-4">
        <div className="rounded-2xl bg-noche-2 p-3">
          <Keyboard from={desde} to={hasta} marks={marcas} />
        </div>
        <p className="mt-2 text-center text-[11px] text-humo">
          <span className="text-menta">■ izquierda</span> · <span className="text-rosa">■ derecha</span> ·
          el aro marca la tercera, la que dice mayor o menor
        </p>

        {/* Las notas y los saltos */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-borde/60 bg-carta-2 p-3">
            <p className="mb-1 text-xs tracking-wider text-humo uppercase">
              {chordSymbol(raiz, q)}, de grave a agudo
            </p>
            <p className="flex flex-wrap gap-1.5 font-mono text-base">
              {teclas.map((p, i) => (
                <span
                  key={i}
                  className={`rounded-md px-1.5 py-0.5 ${
                    v.izquierda.includes(p) ? "bg-menta/15 text-menta" : "bg-rosa/15 text-rosa"
                  } ${gradoDeTecla(p, raiz, q) === 3 ? "ring-2 ring-sol/70" : ""}`}
                >
                  {nombreDe(p)}
                  <span className="ml-1 text-[10px] opacity-70">{gradoDeTecla(p, raiz, q)}</span>
                </span>
              ))}
            </p>
          </div>
          <div className="rounded-2xl border border-borde/60 bg-carta-2 p-3">
            <p className="mb-1 text-xs tracking-wider text-humo uppercase">entre nota y nota</p>
            <p className="flex flex-wrap gap-1.5 font-mono text-sm">
              {saltos.map((s, i) => (
                <span
                  key={i}
                  className={`rounded-md px-1.5 py-0.5 ${s <= 4 ? "bg-brasa/15 text-brasa" : "bg-noche text-tiza"}`}
                  title={`${s} semitonos`}
                >
                  {nombreDeIntervalo(s)}
                </span>
              ))}
            </p>
            <p className="mt-2 text-xs text-humo">
              {abiertaSegunLaClase
                ? "Abierta: cuartas, quintas y sextas entre vecinas."
                : disp === "cerrada"
                  ? "Cerrada: todo a terceras, y grave. Es la más densa."
                  : "Las de la derecha quedan pegadas, pero el bajo está lejos de la tercera: ya no ensucia."}
            </p>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-humo">
          {terceraEnLaIzquierda && disp === "cerrada" && (
            <>La tercera está abajo, pegada a la fundamental: ahí es donde el acorde se carga y se oscurece.</>
          )}
          {!terceraEnLaIzquierda && (disp === "15-37" || disp === "17-35") && (
            <>
              La izquierda no toca la tercera y el acorde sigue siendo {q.name.toLowerCase()}: la tercera está,
              arriba, en la derecha. No falta ninguna nota — cada una está donde suena mejor.
            </>
          )}
          {sinFundamental && (
            <>
              Sin la fundamental: la pone el bajo, o el oído la completa. Lo que queda es{" "}
              {unaMano(raiz, q, inversion).derecha.map(nombreDe).join(" · ")}, que es la tercera, la quinta y la séptima
              giradas para que caigan cómodas.
            </>
          )}
          {disp === "una-mano" && !sinFundamental && (
            <>Con tres notas no hay qué esquivar: el voicing a una mano de una tríada es girarla.</>
          )}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => escuchar()}
            className="rounded-full bg-sol px-5 py-2 text-sm font-bold text-noche transition hover:brightness-110"
          >
            ▶ Escuchar
          </button>
          <button
            onClick={comparar}
            className="rounded-full bg-carta-2 px-4 py-2 text-sm font-semibold text-humo transition hover:text-tiza"
          >
            ▶ Cerrada y después abierta
          </button>
        </div>
      </div>
    </div>
  );
}
