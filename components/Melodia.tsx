"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icono from "./Icono";
import Pentagrama from "./Pentagrama";
import {
  FUNCION_DE_GRADO,
  GRADOS_MAYOR,
  PROGRESIONES,
  TONALIDAD_MAYOR,
  cadenciaAlFinal,
  raizDelGrado,
  rachaDeFuncion,
  type Funcion,
} from "@/lib/grados";
import {
  analizarMelodia,
  componerMelodia,
  esDelAcorde,
  eventosDeMelodiaEscrita,
  lugaresDeMelodia,
  posicionDeLugar,
  resumenDeMelodia,
} from "@/lib/melodia";
import {
  LETRAS_ES,
  chordPitches,
  chordSymbol,
  qualityById,
  scaleDegreeToPitch,
} from "@/lib/music";
import { ubicar, duracionDeEvento, type Evento } from "@/lib/pentagrama";
import {
  getAudioContext,
  notaOff,
  notaOn,
  pararTodo,
  playNote,
  wakeAudio,
} from "@/lib/audio";

/**
 * Ponerle melodía a los acordes: el puente entre la sala y las partituras.
 *
 * Los acordes se arman como en el inventor de secuencias —grados de Do mayor,
 * pintados por función— y arriba va una melodía simple que sale **escrita en
 * pentagrama** y suena junta con ellos. La melodía tiene dos autores posibles,
 * que son los dos lados del mismo ejercicio:
 *
 * - **La app compone** siguiendo las reglas de la clase (nota del acorde en
 *   los pulsos fuertes, pasos por la escala entre medio, final largo en la
 *   casa). Sirve para *escuchar* que las reglas alcanzan para que suene bien.
 * - **La escribís vos**, pulso por pulso, y el veredicto te dice qué fue cada
 *   nota: del acorde, de paso, o en el aire. No corrige, puntúa — igual que
 *   el enlace: muchas melodías distintas están igual de bien.
 *
 * Las reglas y el generador viven en `lib/melodia.ts` y se prueban con
 * `npm run test:melodia`; acá sólo hay interfaz y sonido.
 */

const BPM = 92;
const COMPAS = { numerador: 4, denominador: 4 };
const TONALIDAD = { tonica: 0, modo: "mayor" as const };
/** El acompañamiento vive alrededor de Do3, donde el bajo se lee cómodo. */
const BAJO = 48;
/** Más de ocho compases no entran cómodos ni en el pentagrama ni en el oído. */
const MAX_COMPASES = 8;

const COLOR: Record<Funcion, { chip: string; suave: string }> = {
  reposo: { chip: "bg-menta text-noche", suave: "bg-menta/15 text-menta" },
  subdominante: { chip: "bg-sol text-noche", suave: "bg-sol/15 text-sol" },
  dominante: { chip: "bg-brasa text-noche", suave: "bg-brasa/15 text-brasa" },
};

const VEREDICTO = {
  acorde: { clase: "bg-menta/15 text-menta", nombre: "del acorde" },
  paso: { clase: "bg-sol/15 text-sol", nombre: "de paso" },
  aire: { clase: "bg-brasa/15 text-brasa", nombre: "en el aire" },
} as const;

const chip = (activo: boolean) =>
  `rounded-xl px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition ${
    activo ? "bg-tiza text-noche" : "bg-carta-2 text-humo hover:text-tiza"
  }`;

export default function Melodia() {
  // La progresión de arranque es la cadencia clásica: melodía fácil de colgar.
  const [grados, setGrados] = useState<number[]>([...PROGRESIONES[2].grados]);
  const [autor, setAutor] = useState<"app" | "vos">("app");
  const [semilla, setSemilla] = useState(1);
  const [escritas, setEscritas] = useState<number[]>([]);
  const [sonando, setSonando] = useState<number | null>(null);
  const [tocando, setTocando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const pararRef = useRef<(() => void) | null>(null);

  const acordeDe = (g: number) => {
    const quality = qualityById(TONALIDAD_MAYOR[g].triada)!;
    return { quality, root: raizDelGrado(0, g) };
  };

  /** El acompañamiento: la tríada de cada grado, una redonda por compás. */
  const izquierda = useMemo<Evento[]>(
    () =>
      grados.map((g) => {
        // La fundamental cerca de Do3: La y Si bajan una octava para que el
        // bajo no se trepe al pentagrama de arriba.
        const salto = GRADOS_MAYOR[g];
        const root = BAJO + (salto <= 7 ? salto : salto - 12);
        return { midis: chordPitches(root, acordeDe(g).quality), divide: 1 };
      }),
    [grados],
  );

  const melodia = useMemo<Evento[]>(
    () =>
      autor === "app"
        ? componerMelodia(grados, semilla)
        : eventosDeMelodiaEscrita(escritas, grados.length),
    [autor, grados, semilla, escritas],
  );

  // ---- Sonar ---------------------------------------------------------------

  const parar = () => {
    pararRef.current?.();
    pararRef.current = null;
    setTocando(false);
    setSonando(null);
  };
  useEffect(() => () => pararRef.current?.(), []);

  /**
   * Toca la melodía con sus acordes (o los acordes solos, para componer
   * encima). El mismo esquema del reproductor de partituras, en chico: se
   * agenda de a poco con `notaOn`/`notaOff` para que parar pueda parar, y la
   * imagen va por `requestAnimationFrame`.
   */
  const tocar = async (conMelodia: boolean) => {
    parar();
    if (grados.length === 0) return;
    // Se agenda todo junto, así que hay que esperar el piano de verdad.
    setCargando(true);
    await wakeAudio();
    setCargando(false);
    const ctx = getAudioContext();
    if (!ctx) return;
    setTocando(true);

    const segundosPorRedonda = (60 / BPM) * 4;
    const arranque = ctx.currentTime + 0.2;
    type Ev = { t: number; tipo: "on" | "off"; midi: number; dur: number };
    const evs: Ev[] = [];
    const filas = conMelodia ? [melodia, izquierda] : [izquierda];
    for (const fila of filas) {
      for (const n of ubicar(fila, COMPAS)) {
        const dur = duracionDeEvento(n) * segundosPorRedonda * 0.95;
        for (const midi of n.midis) {
          const t = arranque + n.t * segundosPorRedonda;
          evs.push({ t, tipo: "on", midi, dur });
          evs.push({ t: t + dur, tipo: "off", midi, dur });
        }
      }
    }
    evs.sort((a, b) => a.t - b.t);

    let proximo = 0;
    const despachar = () => {
      const horizonte = ctx.currentTime + 0.15;
      while (proximo < evs.length && evs[proximo].t <= horizonte) {
        const e = evs[proximo++];
        if (e.tipo === "on") notaOn(e.midi, e.t, e.dur);
        else notaOff(e.midi, e.t);
      }
    };
    despachar();
    const timer = setInterval(despachar, 25);

    const fin = grados.length; // un compás de 4/4 es una redonda
    let raf = 0;
    const mirar = () => {
      const t = (ctx.currentTime - arranque) / segundosPorRedonda;
      if (t >= fin) {
        clearInterval(timer);
        setTocando(false);
        setSonando(null);
        return;
      }
      setSonando(t < 0 ? null : t);
      raf = requestAnimationFrame(mirar);
    };
    raf = requestAnimationFrame(mirar);

    pararRef.current = () => {
      cancelAnimationFrame(raf);
      clearInterval(timer);
      pararTodo();
    };
  };

  // ---- Los acordes ----------------------------------------------------------

  const cambiarAcordes = (nuevos: number[]) => {
    parar();
    setGrados(nuevos);
    setEscritas([]);
  };

  const racha = rachaDeFuncion(grados);
  const cadencia = cadenciaAlFinal(grados);

  // ---- La melodía escrita ----------------------------------------------------

  const lugares = lugaresDeMelodia(grados.length);
  const completa = escritas.length >= lugares;
  const posicion = completa ? null : posicionDeLugar(escritas.length, grados.length);
  const veredictos = analizarMelodia(escritas, grados);
  const resumen = completa ? resumenDeMelodia(escritas, grados) : null;

  const escribir = (d: number) => {
    if (completa) return;
    parar();
    wakeAudio();
    playNote(scaleDegreeToPitch(d), posicion?.esFinal ? 1.8 : 0.7);
    setEscritas((s) => [...s, d]);
  };

  return (
    <div className="card overflow-hidden">
      {/* 1. Los acordes: la mitad que ya sabés armar. */}
      <div className="border-b border-borde/60 p-5">
        <p className="text-xs tracking-[0.2em] text-humo uppercase">
          Primero, los acordes · en Do mayor
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {PROGRESIONES.map((p) => (
            <button
              key={p.nombre}
              onClick={() => cambiarAcordes([...p.grados])}
              className={chip(p.grados.join(",") === grados.join(","))}
            >
              {p.nombre}
            </button>
          ))}
        </div>
        <p className="mt-4 mb-2 text-sm text-humo">
          O armá la tuya grado por grado, como en el inventor:
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {TONALIDAD_MAYOR.map((grado, g) => {
            const { quality, root } = acordeDe(g);
            return (
              <button
                key={g}
                onClick={() => {
                  if (grados.length >= MAX_COMPASES) return;
                  cambiarAcordes([...grados, g]);
                }}
                disabled={grados.length >= MAX_COMPASES}
                className={`rounded-xl px-3 py-1.5 text-center transition hover:brightness-110 disabled:opacity-40 ${COLOR[FUNCION_DE_GRADO[g]].chip}`}
              >
                <span className="block font-mono text-sm font-bold">{grado.cifra}</span>
                <span className="block text-[11px] opacity-80">
                  {chordSymbol(root, quality)}
                </span>
              </button>
            );
          })}
        </div>

        {grados.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {grados.map((g, n) => {
              const { quality, root } = acordeDe(g);
              return (
                <span
                  key={n}
                  className={`rounded-xl px-3 py-1.5 font-mono text-sm font-bold ${COLOR[FUNCION_DE_GRADO[g]].suave}`}
                >
                  {TONALIDAD_MAYOR[g].cifra}
                  <span className="ml-1.5 text-[11px] opacity-75">
                    {chordSymbol(root, quality)}
                  </span>
                </span>
              );
            })}
            <button
              onClick={() => cambiarAcordes(grados.slice(0, -1))}
              className="ml-2 rounded-full bg-carta-2 px-3 py-1.5 text-xs font-semibold text-humo transition hover:text-tiza"
            >
              ↩ sacar el último
            </button>
          </div>
        )}
        {grados.length >= MAX_COMPASES && (
          <p className="mt-2 text-xs text-humo">
            Hasta {MAX_COMPASES} compases: más que eso ya no es un ejercicio, es
            una obra.
          </p>
        )}
        {racha >= 4 && (
          <p className="mt-3 rounded-xl bg-brasa/15 px-4 py-2 text-sm text-brasa">
            Cuatro funciones iguales seguidas: la regla de oro pide variar.
          </p>
        )}
        {cadencia && (
          <p className="mt-3 text-sm text-menta">
            El final forma una cadencia{" "}
            {cadencia === "autentica" ? "auténtica" : cadencia === "rota" ? "rota" : "plagal"}
            : la melodía va a tener dónde aterrizar.
          </p>
        )}
      </div>

      {/* 2. La melodía: quién la escribe. */}
      <div className="border-b border-borde/60 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs tracking-[0.2em] text-humo uppercase">
            Después, la melodía
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <button onClick={() => { parar(); setAutor("app"); }} className={chip(autor === "app")}>
              la compone la app
            </button>
            <button onClick={() => { parar(); setAutor("vos"); }} className={chip(autor === "vos")}>
              la escribís vos
            </button>
          </span>
        </div>

        {autor === "app" ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="max-w-2xl text-sm leading-relaxed text-humo">
              Compone con las reglas de la clase y nada más: en los pulsos{" "}
              <strong className="text-tiza">1 y 3, una nota del acorde</strong>;
              entre medio, <strong className="text-tiza">pasos por la escala</strong>;
              y el final, largo y en la casa. Escuchala: las reglas solas ya
              suenan a música.
            </p>
            <button
              onClick={() => {
                parar();
                setSemilla(Math.floor(Math.random() * 1e9) + 1);
              }}
              className="ml-auto rounded-xl bg-carta-2 px-3 py-1.5 text-sm font-bold whitespace-nowrap transition hover:bg-borde"
            >
              <Icono de="dado" /> Otra melodía
            </button>
          </div>
        ) : (
          <div className="mt-3">
            <p className="max-w-2xl text-sm leading-relaxed text-humo">
              Una nota por pulso, y el último compás es una redonda. Las mismas
              reglas te sirven de brújula: en los pulsos fuertes conviene una
              del acorde (van marcadas), y entre medio caminá de a un paso — pero
              la melodía es tuya, acá se puntúa y no se corrige.
            </p>

            {posicion && (
              <p className="mt-4 text-sm">
                <span className="rounded-full bg-carta-2 px-3 py-1 font-mono text-xs text-humo">
                  compás {posicion.compas + 1} · {posicion.esFinal ? "la redonda final" : `pulso ${posicion.pulso + 1}`}
                </span>{" "}
                <span className="text-humo">
                  sobre{" "}
                  <strong className="text-tiza">
                    {chordSymbol(acordeDe(grados[posicion.compas]).root, acordeDe(grados[posicion.compas]).quality)}
                  </strong>
                  {posicion.pulso === 0 || posicion.pulso === 2 || posicion.esFinal
                    ? " — pulso fuerte: mejor una del acorde"
                    : " — pulso débil: cualquier paso vale"}
                </span>
              </p>
            )}

            {!completa && posicion && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {Array.from({ length: 8 }, (_, d) => {
                  const delAcorde = esDelAcorde(d, grados[posicion.compas]);
                  return (
                    <button
                      key={d}
                      onClick={() => escribir(d)}
                      className={`min-w-12 rounded-xl px-2.5 py-2 text-center text-sm font-bold transition hover:brightness-110 ${
                        delAcorde
                          ? "bg-menta/25 text-menta ring-1 ring-menta/50"
                          : "bg-carta-2 text-humo hover:text-tiza"
                      }`}
                    >
                      {LETRAS_ES[d % 7]}
                      {d === 7 && <span className="opacity-60">′</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {escritas.length > 0 && (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  {escritas.map((d, i) => (
                    <span
                      key={i}
                      className={`rounded-lg px-2 py-1 font-mono text-xs font-bold ${VEREDICTO[veredictos[i]].clase}`}
                    >
                      {LETRAS_ES[d % 7]}
                      {d === 7 && "′"}
                    </span>
                  ))}
                  <button
                    onClick={() => { parar(); setEscritas((s) => s.slice(0, -1)); }}
                    className="ml-1 rounded-full bg-carta-2 px-3 py-1 text-xs font-semibold text-humo transition hover:text-tiza"
                  >
                    ↩ sacar la última
                  </button>
                  <button
                    onClick={() => { parar(); setEscritas([]); }}
                    className="rounded-full bg-carta-2 px-3 py-1 text-xs font-semibold text-humo transition hover:text-tiza"
                  >
                    borrar todo
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-humo">
                  <span className="text-menta">■ del acorde</span> ·{" "}
                  <span className="text-sol">■ de paso</span> ·{" "}
                  <span className="text-brasa">■ en el aire</span> (ni del
                  acorde ni ganada caminando — escuchá cómo flota)
                </p>
              </>
            )}

            {resumen && (
              <div className="mt-4 rounded-2xl bg-noche px-4 py-3">
                <p className="font-display text-lg font-bold text-menta">
                  Melodía completa
                </p>
                <p className="mt-1 text-sm text-humo">
                  {resumen.fuertesBien} de {resumen.fuertes} pulsos fuertes en
                  nota del acorde
                  {resumen.deAire > 0 &&
                    ` · ${resumen.deAire} ${resumen.deAire === 1 ? "nota" : "notas"} en el aire`}
                  {" · "}
                  {resumen.terminaEnCasa
                    ? "y termina en la fundamental: en la casa."
                    : resumen.terminaEnAcorde
                      ? "y termina en una nota del acorde."
                      : "y termina afuera del acorde — escuchá cómo queda pidiendo una más."}
                </p>
                <p className="mt-1 text-xs text-humo/70">
                  Ahora escuchala abajo, con los acordes. Si algo suena raro, el
                  color te dice dónde mirar.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. El resultado, escrito como partitura y sonando junto. */}
      {grados.length > 0 && (
        <>
          <div className="overflow-x-auto p-4">
            <Pentagrama
              derecha={melodia}
              izquierda={izquierda}
              compas={COMPAS}
              tonalidad={TONALIDAD}
              sonando={sonando}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-borde/60 px-4 py-3">
            {tocando ? (
              <button
                onClick={parar}
                className="rounded-full bg-brasa px-5 py-2 font-bold text-noche transition hover:brightness-110"
              >
                ■ Parar
              </button>
            ) : (
              <button
                onClick={() => tocar(true)}
                disabled={cargando}
                className="rounded-full bg-menta px-5 py-2 font-bold text-noche transition hover:brightness-110 disabled:opacity-60"
              >
                {cargando ? "…" : "▶ Escucharla"}
              </button>
            )}
            <button
              onClick={() => tocar(false)}
              disabled={tocando || cargando}
              className="rounded-full bg-carta-2 px-4 py-2 text-sm font-semibold text-humo transition hover:text-tiza disabled:opacity-60"
            >
              los acordes solos
            </button>
            <span className="ml-auto font-mono text-xs text-humo">{BPM} bpm</span>
          </div>
        </>
      )}
    </div>
  );
}
