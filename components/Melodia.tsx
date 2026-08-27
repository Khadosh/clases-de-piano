"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icono from "./Icono";
import Pentagrama from "./Pentagrama";
import FiguraSVG from "./FiguraSVG";
import SelectorDeAcordes from "./SelectorDeAcordes";
import {
  PROGRESIONES,
  cifradoDelAcorde,
  esPrestado,
  midisDelAcorde,
  raizDelAcorde,
  type AcordeDeLaSecuencia,
} from "@/lib/grados";
import {
  analizarEscrita,
  candidatosDelAcorde,
  componerMelodia,
  esDelAcorde,
  eventosEscritos,
  figuraEntra,
  midiDeNota,
  mismaNota,
  posicionEscrita,
  resumenDeEscrita,
  sugerirGuias,
  type EventoEscrito,
  type NotaMelodia,
} from "@/lib/melodia";
import { LETRAS_ES } from "@/lib/music";
import { figuraQueDivide } from "@/lib/ritmo";
import { ubicar, duracionDeEvento, type Evento } from "@/lib/pentagrama";
import {
  getAudioContext,
  notaOff,
  notaOn,
  pararTodo,
  playChord,
  playNote,
  wakeAudio,
} from "@/lib/audio";

/**
 * Ponerle melodía a los acordes: el puente entre la sala y las partituras.
 *
 * Desde la clase 4 el ejercicio es el método completo del profe, en tres
 * pasos que son los tres paneles:
 *
 * 1. **Los acordes** — grados de Do mayor, ahora también con los préstamos de
 *    las menores paralelas (el Fm de la tarea).
 * 2. **Las guías** — la nota con la que la melodía recibe a cada acorde,
 *    elegida antes de escribir una sola nota. Es la fila de arriba del
 *    renglón del cuaderno de papel.
 * 3. **La melodía** — la compone la app (con las guías puestas, si las hay) o
 *    la escribís vos, ahora con figuras y silencios: sin ritmo no hay
 *    cantabile. El veredicto puntúa y no corrige: del acorde, de paso o en
 *    el aire, más los aterrizajes en las guías, la respiración y la variedad.
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

const VEREDICTO = {
  acorde: { clase: "bg-menta/15 text-menta", nombre: "del acorde" },
  paso: { clase: "bg-sol/15 text-sol", nombre: "de paso" },
  aire: { clase: "bg-brasa/15 text-brasa", nombre: "en el aire" },
} as const;

const chip = (activo: boolean) =>
  `rounded-xl px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition ${
    activo ? "bg-tiza text-noche" : "bg-carta-2 text-humo hover:text-tiza"
  }`;

/** El nombre de una nota de melodía: La♭, Do′. */
const nombreDeNota = (n: NotaMelodia) =>
  `${LETRAS_ES[((n.d % 7) + 7) % 7]}${n.b ? "♭" : ""}${n.d >= 7 ? "′" : ""}`;

/** Cuántos segundos suena cada figura al escribirla, para escucharla al poner. */
const DURACION_AL_ESCRIBIR: Record<number, number> = { 1: 1.8, 2: 1.3, 4: 0.7, 8: 0.35 };

export default function Melodia() {
  // La progresión de arranque es la cadencia clásica: melodía fácil de colgar.
  const [acordes, setAcordes] = useState<AcordeDeLaSecuencia[]>([...PROGRESIONES[2].grados]);
  const [guias, setGuias] = useState<(NotaMelodia | null)[]>([]);
  const [autor, setAutor] = useState<"app" | "vos">("app");
  const [semilla, setSemilla] = useState(1);
  const [semillaGuias, setSemillaGuias] = useState(1);
  const [escrita, setEscrita] = useState<EventoEscrito[]>([]);
  const [figura, setFigura] = useState(4);
  const [sonando, setSonando] = useState<number | null>(null);
  const [tocando, setTocando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const pararRef = useRef<(() => void) | null>(null);

  const guiasDe = (c: number) => guias[c] ?? null;
  const hayGuias = guias.some((g) => g);
  const conPrestamos = acordes.some(esPrestado);

  /** El acompañamiento: la tríada de cada acorde, una redonda por compás. */
  const izquierda = useMemo<Evento[]>(
    () =>
      acordes.map((a) => {
        // La fundamental cerca de Do3: las agudas bajan una octava para que
        // el bajo no se trepe al pentagrama de arriba.
        const salto = raizDelAcorde(a);
        return { midis: midisDelAcorde(a, BAJO + (salto <= 7 ? salto : salto - 12)), divide: 1 };
      }),
    [acordes],
  );

  const melodia = useMemo<Evento[]>(
    () =>
      autor === "app"
        ? componerMelodia(acordes, semilla, guias.length ? guias : undefined)
        : eventosEscritos(escrita),
    [autor, acordes, semilla, guias, escrita],
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
    if (acordes.length === 0) return;
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

    const fin = acordes.length; // un compás de 4/4 es una redonda
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

  const cambiarAcordes = (nuevos: AcordeDeLaSecuencia[]) => {
    parar();
    setAcordes(nuevos);
    setEscrita([]);
    // Las guías elegidas sobreviven mientras su compás siga existiendo con el
    // mismo acorde; al cambiar la progresión entera, se resetean solas porque
    // la guía de un acorde que ya no está no promete nada.
    setGuias((g) =>
      nuevos.map((a, i) => {
        const previa = g[i] ?? null;
        return previa && esDelAcorde(previa, a) ? previa : null;
      }),
    );
  };

  // ---- Las guías -------------------------------------------------------------

  const elegirGuia = (c: number, n: NotaMelodia) => {
    parar();
    wakeAudio();
    const actual = guiasDe(c);
    const nueva = actual && mismaNota(actual, n) ? null : n;
    if (nueva) {
      playChord(midisDelAcorde(acordes[c], BAJO + raizDelAcorde(acordes[c])), 1.1);
      playNote(midiDeNota(n), 1.1);
    }
    setGuias((g) => acordes.map((_, i) => (i === c ? nueva : (g[i] ?? null))));
  };

  // ---- La melodía escrita ----------------------------------------------------

  const pos = posicionEscrita(escrita, acordes.length);
  const veredictos = analizarEscrita(escrita, acordes);
  const resumen = pos.completa ? resumenDeEscrita(escrita, acordes, guias) : null;
  const acordeActual = acordes[pos.compas];

  /** Las figuras de la paleta; en el último compás manda la redonda final. */
  const PALETA = [2, 4, 8];
  const figuraElegida = pos.esUltimo ? 1 : figura;
  const puedeEscribir = !pos.completa && figuraEntra(escrita, figuraElegida, acordes.length);

  const escribir = (n: NotaMelodia | null) => {
    if (!puedeEscribir) return;
    parar();
    wakeAudio();
    if (n) playNote(midiDeNota(n), DURACION_AL_ESCRIBIR[figuraElegida] ?? 0.7);
    setEscrita((s) => [...s, { nota: n, divide: figuraElegida }]);
  };

  /** Los candidatos con bemol del acorde actual, para ofrecerlos al escribir. */
  const bemolesDelActual =
    autor === "vos" && !pos.completa && acordeActual !== undefined
      ? candidatosDelAcorde(acordeActual).filter((n) => n.b && n.d <= 7)
      : [];

  return (
    <div className="card overflow-hidden">
      {/* 1. Los acordes: la mitad que ya sabés armar, préstamos incluidos. */}
      <div className="border-b border-borde/60 p-5">
        <p className="text-xs tracking-[0.2em] text-humo uppercase">
          Primero, los acordes · en Do mayor
        </p>
        <div className="mt-3">
          <SelectorDeAcordes acordes={acordes} onCambiar={cambiarAcordes} max={MAX_COMPASES} />
        </div>
      </div>

      {/* 2. Las guías: la nota que recibe a cada acorde, como en el papel. */}
      {acordes.length > 0 && (
        <div className="border-b border-borde/60 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs tracking-[0.2em] text-humo uppercase">
              Después, las guías
            </span>
            <span className="ml-auto flex items-center gap-1.5">
              <button
                onClick={() => {
                  parar();
                  setGuias(sugerirGuias(acordes, semillaGuias));
                  setSemillaGuias((s) => s + 1);
                }}
                className={chip(false)}
              >
                <Icono de="dado" /> sugerime
              </button>
              {hayGuias && (
                <button
                  onClick={() => { parar(); setGuias([]); }}
                  className="rounded-full bg-carta-2 px-3 py-1.5 text-xs font-semibold text-humo transition hover:text-tiza"
                >
                  borrar
                </button>
              )}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-humo">
            El método de la clase 4: antes de inventar nada, elegí{" "}
            <strong className="text-tiza">la nota con la que la melodía va a
            recibir a cada acorde</strong>. Tocá una para prometerla (y
            escucharla sobre su acorde); son opcionales, pero con guías el
            veredicto también mira los aterrizajes.
          </p>
          <div className="mt-3 overflow-x-auto">
            <div className="flex min-w-max gap-1.5">
              {acordes.map((a, c) => (
                <div
                  key={c}
                  className="min-w-[84px] rounded-xl border border-borde/60 bg-carta-2 px-2 py-2 text-center"
                >
                  <p className="mb-1.5 font-mono text-xs font-bold text-humo">
                    {cifradoDelAcorde(a)}
                  </p>
                  <div className="flex flex-wrap justify-center gap-1">
                    {candidatosDelAcorde(a)
                      .filter((n) => n.d <= 7)
                      .map((n) => {
                        const elegida = guiasDe(c) && mismaNota(guiasDe(c)!, n);
                        return (
                          <button
                            key={nombreDeNota(n)}
                            onClick={() => elegirGuia(c, n)}
                            className={`rounded-lg px-1.5 py-1 text-xs font-bold transition ${
                              elegida
                                ? "bg-sol text-noche"
                                : "bg-noche/50 text-humo hover:text-tiza"
                            }`}
                          >
                            {nombreDeNota(n)}
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. La melodía: quién la escribe. */}
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
              Compone con las reglas de las clases y nada más: en los pulsos{" "}
              <strong className="text-tiza">1 y 3, una nota del acorde</strong>;
              entre medio, <strong className="text-tiza">pasos por la escala</strong>;
              respiraciones en el pulso débil; el final, largo y en la casa
              {hayGuias && (
                <>
                  ; y <strong className="text-tiza">tus guías, respetadas</strong>
                </>
              )}
              . Escuchala: las reglas solas ya suenan a música.
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
              Ahora con el ritmo de verdad: elegí la figura, después la nota — o
              un silencio, que la frase tiene que{" "}
              <strong className="text-tiza">respirar</strong>. Cada figura tiene
              que entrar en su compás, y el último es la redonda del final. Se
              puntúa y no se corrige: la melodía es tuya.
            </p>

            {!pos.completa && (
              <>
                <p className="mt-4 text-sm">
                  <span className="rounded-full bg-carta-2 px-3 py-1 font-mono text-xs text-humo">
                    compás {pos.compas + 1} · {pos.esUltimo ? "la redonda final" : `pulso ${Math.floor(pos.dentro * 4) + 1}`}
                  </span>{" "}
                  <span className="text-humo">
                    sobre{" "}
                    <strong className="text-tiza">{cifradoDelAcorde(acordeActual)}</strong>
                    {guiasDe(pos.compas) && pos.dentro === 0 && (
                      <> — la guía prometida es <strong className="text-sol">{nombreDeNota(guiasDe(pos.compas)!)}</strong></>
                    )}
                  </span>
                </p>

                {/* La paleta de figuras, como en cualquier editor: primero la
                    duración, después la altura. */}
                {!pos.esUltimo && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-xs tracking-[0.2em] text-humo uppercase">Figura</span>
                    {PALETA.map((d) => {
                      const entra = figuraEntra(escrita, d, acordes.length);
                      return (
                        <button
                          key={d}
                          onClick={() => setFigura(d)}
                          disabled={!entra}
                          title={figuraQueDivide(d)?.nombre}
                          className={`flex h-11 w-11 items-center justify-center rounded-xl transition disabled:opacity-30 ${
                            figura === d ? "bg-tiza text-noche" : "bg-carta-2 text-tiza hover:bg-borde"
                          }`}
                        >
                          <FiguraSVG figura={figuraQueDivide(d)!} alto={26} />
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {Array.from({ length: 8 }, (_, d) => {
                    const nota: NotaMelodia = { d };
                    const delAcorde = acordeActual !== undefined && esDelAcorde(nota, acordeActual);
                    return (
                      <button
                        key={d}
                        onClick={() => escribir(nota)}
                        disabled={!puedeEscribir}
                        className={`min-w-12 rounded-xl px-2.5 py-2 text-center text-sm font-bold transition hover:brightness-110 disabled:opacity-40 ${
                          delAcorde
                            ? "bg-menta/25 text-menta ring-1 ring-menta/50"
                            : "bg-carta-2 text-humo hover:text-tiza"
                        }`}
                      >
                        {nombreDeNota(nota)}
                      </button>
                    );
                  })}
                  {/* Los bemoles que presta el acorde de este compás: el La♭
                      del Fm aparece recién cuando el Fm está sonando abajo. */}
                  {bemolesDelActual.map((n) => (
                    <button
                      key={nombreDeNota(n)}
                      onClick={() => escribir(n)}
                      disabled={!puedeEscribir}
                      className="min-w-12 rounded-xl bg-uva/25 px-2.5 py-2 text-center text-sm font-bold text-uva ring-1 ring-uva/50 transition hover:brightness-110 disabled:opacity-40"
                    >
                      {nombreDeNota(n)}
                    </button>
                  ))}
                  {!pos.esUltimo && (
                    <button
                      onClick={() => escribir(null)}
                      disabled={!puedeEscribir}
                      className="min-w-12 rounded-xl bg-noche/60 px-2.5 py-2 text-center text-sm font-bold text-humo transition hover:text-tiza disabled:opacity-40"
                      title="Un silencio con la figura elegida: la frase respira"
                    >
                      silencio
                    </button>
                  )}
                </div>
              </>
            )}

            {escrita.length > 0 && (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  {escrita.map((e, i) => (
                    <span
                      key={i}
                      className={`flex items-center gap-1 rounded-lg px-2 py-1 font-mono text-xs font-bold ${
                        e.nota
                          ? VEREDICTO[veredictos[i] ?? "acorde"].clase
                          : "bg-noche/60 text-humo"
                      }`}
                    >
                      {e.nota ? nombreDeNota(e.nota) : "—"}
                      <span className="opacity-60">
                        <FiguraSVG figura={figuraQueDivide(e.divide)!} alto={13} />
                      </span>
                    </span>
                  ))}
                  <button
                    onClick={() => { parar(); setEscrita((s) => s.slice(0, -1)); }}
                    className="ml-1 rounded-full bg-carta-2 px-3 py-1 text-xs font-semibold text-humo transition hover:text-tiza"
                  >
                    ↩ sacar la última
                  </button>
                  <button
                    onClick={() => { parar(); setEscrita([]); }}
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
                <p className="mt-1 text-sm leading-relaxed text-humo">
                  {resumen.fuertesBien} de {resumen.fuertes} pulsos fuertes en
                  nota del acorde
                  {resumen.aterrizajes > 0 &&
                    ` · ${resumen.aterrizajesBien} de ${resumen.aterrizajes} aterrizajes en la guía prometida`}
                  {resumen.deAire > 0 &&
                    ` · ${resumen.deAire} ${resumen.deAire === 1 ? "nota" : "notas"} en el aire`}
                  {" · "}
                  {resumen.terminaEnCasa
                    ? "termina en la fundamental: en la casa."
                    : resumen.terminaEnAcorde
                      ? "termina en una nota del acorde."
                      : "termina afuera del acorde — escuchá cómo queda pidiendo una más."}
                </p>
                <p className="mt-1 text-sm text-humo">
                  {resumen.respira
                    ? "Respira — hay silencios entre las frases. "
                    : "No respira: ni un silencio de punta a punta, que era justo lo de la tarea. "}
                  {resumen.varia
                    ? "Y varía las figuras: eso es la rítmica del cantabile."
                    : "Y va toda en la misma figura — probá mezclar duraciones."}
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

      {/* 4. El resultado, escrito como partitura y sonando junto. */}
      {acordes.length > 0 && (
        <>
          <div className="overflow-x-auto p-4">
            <Pentagrama
              derecha={melodia}
              izquierda={izquierda}
              compas={COMPAS}
              tonalidad={TONALIDAD}
              sonando={sonando}
              bemoles={conPrestamos}
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
                className="rounded-full bg-sol px-5 py-2 font-bold text-noche transition hover:brightness-110 disabled:opacity-60"
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
