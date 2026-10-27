"use client";

import { useRef, useState } from "react";
import { FUNCIONES, type Funcion } from "@/lib/grados";
import { chordPitches, mod12 } from "@/lib/music";
import { playChord, wakeAudio } from "@/lib/audio";
import {
  NIVEL,
  acordesDeFrase,
  cadenciaDe,
  nombreDeTonalidad,
  type AcordeLeido,
  type ArmoniaDePieza,
} from "@/lib/armonia";
import type { Tonalidad } from "@/lib/pentagrama";

/**
 * La armonía de una pieza, frase por frase, pintada por tensión.
 *
 * Los mismos tres colores del mapa de funciones de la clase 3 —reposo en
 * menta, media tensión en sol, tensión en brasa— así que lo que se aprendió
 * ahí se reconoce acá sin leyenda. Arriba la curva de toda la pieza (se ve de
 * un golpe dónde sube y dónde descansa), abajo cada frase con sus compases,
 * sus acordes para tocar y lo que pasa contado en castellano. El botón de la
 * explicación técnica agrega los grados y las cadencias con su nombre: no
 * reemplaza el texto simple, se suma.
 */

const ORDEN: Funcion[] = ["reposo", "subdominante", "dominante"];

const COLOR: Record<Funcion, { fondo: string; borde: string; texto: string; lleno: string; trazo: string }> = {
  reposo: { fondo: "bg-menta/15", borde: "border-menta", texto: "text-menta", lleno: "bg-menta text-noche", trazo: "var(--color-menta)" },
  subdominante: { fondo: "bg-sol/15", borde: "border-sol", texto: "text-sol", lleno: "bg-sol text-noche", trazo: "var(--color-sol)" },
  dominante: { fondo: "bg-brasa/15", borde: "border-brasa", texto: "text-brasa", lleno: "bg-brasa text-noche", trazo: "var(--color-brasa)" },
};

/**
 * El cifrado partido para que entre en un tiempo: el acorde arriba y el bajo
 * de la barra abajo, chiquito. Con los signos de verdad (B♭, F♯) y el dim
 * como °, que es como se escribe cuando no hay lugar.
 */
function partirCifrado(cifrado: string): { acorde: string; bajo: string | null } {
  const signos = (s: string) => s.replace(/([A-G])b/g, "$1♭").replace(/#/g, "♯").replace("dim", "°");
  const [acorde, bajo] = cifrado.split("/");
  return { acorde: signos(acorde), bajo: bajo ? `/${signos(bajo)}` : null };
}

/** El acorde en el registro de una mano izquierda que lo planta: el bajo abajo, el acorde cerrado arriba. */
function teclasDe(a: AcordeLeido): number[] {
  const bajo = 40 + mod12(a.bajo - 40);
  const raiz = 55 + mod12(a.root - 55);
  return [bajo, ...chordPitches(raiz, a.quality)];
}

const mismaTonalidad = (a: Tonalidad, b: Tonalidad) => a.tonica === b.tonica && a.modo === b.modo;

export default function Progresion({
  armonia,
  tonalidad,
  tiempos,
  bpm,
}: {
  armonia: ArmoniaDePieza;
  /** La de la pieza: una frase en otra se marca. */
  tonalidad: Tonalidad;
  /** Tiempos por compás. */
  tiempos: number;
  bpm: number;
}) {
  const [tecnica, setTecnica] = useState(false);
  /** Qué acorde suena: frase y posición. */
  const [sonando, setSonando] = useState<[number, number] | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const frases = armonia.frases.map((f) => {
    const acordes = acordesDeFrase(f, tiempos);
    return { ...f, acordes, cadencia: cadenciaDe(acordes) };
  });
  const total = frases[frases.length - 1].hasta;

  const parar = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setSonando(null);
  };

  const tocar = (fi: number, ai: number) => {
    parar();
    wakeAudio();
    playChord(teclasDe(frases[fi].acordes[ai]), 1.4);
    setSonando([fi, ai]);
    timers.current.push(setTimeout(() => setSonando(null), 1000));
  };

  /**
   * La frase entera al ritmo de la pieza, más lenta: un tiempo de acorde es
   * un tiempo del compás. Al tempo original los cambios del tiempo 2 y 3
   * pasan volando y no se llega a oír qué hace cada uno.
   */
  const tocarFrase = (fi: number) => {
    parar();
    wakeAudio();
    const tiempo = 60 / Math.min(bpm, 72);
    let t = 0;
    frases[fi].acordes.forEach((a, ai) => {
      timers.current.push(
        setTimeout(() => {
          playChord(teclasDe(a), Math.max(0.6, a.dura * tiempo));
          setSonando([fi, ai]);
        }, t * 1000),
      );
      t += a.dura * tiempo;
    });
    timers.current.push(setTimeout(() => setSonando(null), t * 1000 + 300));
  };

  return (
    <section id="armonia" className="mt-10 scroll-mt-6 print:hidden">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.25em] text-humo uppercase">Entenderla</p>
          <h2 className="font-display mt-1 text-3xl font-black tracking-tight">La armonía, frase por frase</h2>
        </div>
        <button
          onClick={() => setTecnica(!tecnica)}
          aria-pressed={tecnica}
          className={`rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition ${
            tecnica ? "bg-tiza text-noche" : "bg-carta-2 text-humo hover:text-tiza"
          }`}
        >
          {tecnica ? "Ocultar la explicación técnica" : "Explicación técnica"}
        </button>
      </div>

      {/* La leyenda: los tres colores con lo que quieren decir. */}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {ORDEN.map((f) => (
          <span key={f} className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${COLOR[f].lleno}`} />
            <span className={`font-semibold ${COLOR[f].texto}`}>{FUNCIONES[f].nombre}</span>
            <span className="text-humo">
              {f === "reposo" ? "la casa" : f === "subdominante" ? "se aleja sin apuro" : "pide volver"}
              {tecnica && ` · ${FUNCIONES[f].alias}`}
            </span>
          </span>
        ))}
      </div>

      <p className="mt-4 max-w-3xl leading-relaxed">{armonia.simple}</p>
      {tecnica && (
        <p className="mt-3 max-w-3xl border-l-2 border-borde pl-4 text-sm leading-relaxed text-humo">
          {armonia.tecnica}
        </p>
      )}

      <Curva frases={frases} total={total} tiempos={tiempos} sonando={sonando} />

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {frases.map((f, fi) => {
          const otraCasa = !mismaTonalidad(f.en, tonalidad);
          const compases = Array.from({ length: f.hasta - f.desde + 1 }, (_, i) => f.desde + i);
          return (
            <article key={f.desde} id={`frase-${f.desde}`} className="card flex flex-col p-4">
              <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="font-display text-lg font-bold">{f.titulo}</h3>
                <span className="text-xs text-humo">
                  compases {f.desde}–{f.hasta}
                </span>
              </header>
              <div className="mt-1 flex flex-wrap gap-2 text-xs">
                {f.cadencia && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-semibold ${
                      f.cadencia.cierra ? "bg-menta/20 text-menta" : "bg-brasa/20 text-brasa"
                    }`}
                  >
                    {tecnica ? f.cadencia.nombre : f.cadencia.cierra ? "termina en casa" : "termina en pregunta"}
                  </span>
                )}
                {otraCasa && (
                  <span className="rounded-full bg-uva/20 px-2.5 py-0.5 font-semibold text-uva">
                    en {nombreDeTonalidad(f.en)}
                  </span>
                )}
              </div>

              {/* Los compases como en el papel: una barra entre cada uno, y
                  cada acorde ocupa los tiempos que dura. */}
              <div className="mt-3 flex flex-wrap overflow-hidden rounded-xl border border-borde">
                {compases.map((c) => (
                  <div key={c} className="flex min-w-0 basis-1/2 flex-col border-l border-borde sm:flex-1 sm:basis-0 [&:nth-child(odd)]:max-sm:border-l-0 sm:first:border-l-0">
                    <span className="bg-noche/40 px-1.5 py-0.5 text-[10px] text-humo">{c}</span>
                    <div className="flex flex-1">
                      {f.acordes.map((a, ai) =>
                        a.compas !== c ? null : (
                          <button
                            key={ai}
                            onClick={() => tocar(fi, ai)}
                            title={`${a.nombre} · ${a.romano} · ${FUNCIONES[a.funcion].nombre}`}
                            style={{ flexGrow: a.dura }}
                            className={`min-w-0 basis-0 border-t-4 px-0.5 py-1.5 text-center transition ${COLOR[a.funcion].borde} ${
                              sonando?.[0] === fi && sonando[1] === ai ? COLOR[a.funcion].lleno : `${COLOR[a.funcion].fondo} hover:brightness-150`
                            }`}
                          >
                            <span className="block truncate text-sm leading-tight font-bold">
                              {partirCifrado(a.cifrado).acorde}
                            </span>
                            <span className="block h-3.5 truncate text-[11px] leading-tight opacity-80">
                              {partirCifrado(a.cifrado).bajo}
                            </span>
                            {tecnica && (
                              <span className="block truncate font-mono text-[11px] opacity-80">{a.romano}</span>
                            )}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-sm leading-relaxed">{f.simple}</p>
              {tecnica && (
                <p className="mt-2 border-l-2 border-borde pl-3 text-sm leading-relaxed text-humo">{f.tecnica}</p>
              )}

              <button
                onClick={() => tocarFrase(fi)}
                className="mt-auto self-start pt-3 text-sm font-semibold text-sol transition hover:text-tiza"
              >
                ▶ Escuchar los acordes de la frase
              </button>
            </article>
          );
        })}
      </div>

      {tecnica && armonia.revisar && (
        <p className="mt-4 max-w-3xl text-sm text-humo">
          <strong className="text-tiza">Lo que es interpretación.</strong> {armonia.revisar}
        </p>
      )}
    </section>
  );
}

/**
 * La tensión de la pieza entera como un perfil: abajo la casa, arriba lo que
 * pide volver. Es para ver la forma de un golpe —dónde sube, dónde descansa,
 * que la pieza respira— sin leer un solo acorde. Las líneas punteadas son los
 * límites de frase, y cada número lleva a su frase.
 */
function Curva({
  frases,
  total,
  tiempos,
  sonando,
}: {
  frases: { desde: number; hasta: number; acordes: AcordeLeido[]; cadencia: ReturnType<typeof cadenciaDe> }[];
  total: number;
  tiempos: number;
  sonando: [number, number] | null;
}) {
  const ancho = total * tiempos;
  const ALTO = 3;
  const y = (f: Funcion) => ALTO - NIVEL[f] - 1;
  const tramos = frases.flatMap((f, fi) =>
    f.acordes.map((a, ai) => ({ x: (a.compas - 1) * tiempos + a.desde, w: a.dura, a, fi, ai })),
  );
  // El perfil: un escalón por acorde, unido con verticales.
  const camino = tramos
    .map((t, i) => `${i === 0 ? "M" : "L"}${t.x} ${y(t.a.funcion) + 0.5} H${t.x + t.w}`)
    .join(" ");

  return (
    <div className="mt-6">
      <div className="flex gap-2">
        <div className="flex w-12 shrink-0 flex-col justify-between py-0.5 text-right text-[10px] leading-none text-humo">
          <span className="text-brasa">tensión</span>
          <span className="text-sol">media</span>
          <span className="text-menta">reposo</span>
        </div>
        <svg
          viewBox={`0 0 ${ancho} ${ALTO}`}
          preserveAspectRatio="none"
          className="h-20 w-full rounded-lg bg-noche/40"
          role="img"
          aria-label="La tensión de la pieza, compás por compás"
        >
          {tramos.map((t) => (
            <rect
              key={`${t.fi}-${t.ai}`}
              x={t.x}
              y={y(t.a.funcion)}
              width={t.w}
              height={ALTO - y(t.a.funcion)}
              fill={COLOR[t.a.funcion].trazo}
              opacity={sonando?.[0] === t.fi && sonando[1] === t.ai ? 0.9 : 0.4}
            />
          ))}
          {frases.slice(1).map((f) => (
            <line
              key={f.desde}
              x1={(f.desde - 1) * tiempos}
              x2={(f.desde - 1) * tiempos}
              y1={0}
              y2={ALTO}
              stroke="var(--color-humo)"
              strokeOpacity={0.5}
              strokeDasharray="0.15 0.15"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path d={camino} fill="none" stroke="var(--color-tiza)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      {/* Los números de compás y cómo cierra cada frase, en HTML: adentro del
          SVG estirado las letras saldrían deformadas. */}
      <div className="ml-14 flex text-[10px] text-humo">
        {frases.map((f) => (
          <a
            key={f.desde}
            href={`#frase-${f.desde}`}
            style={{ flexGrow: f.hasta - f.desde + 1 }}
            className="basis-0 px-0.5 pt-1 transition hover:text-tiza"
          >
            {f.desde}
          </a>
        ))}
      </div>
    </div>
  );
}
