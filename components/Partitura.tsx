"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Pentagrama from "./Pentagrama";
import EdicionCompleta from "./EdicionCompleta";
import Midi from "./Midi";
import { getAudioContext, notaOff, notaOn, pararTodo, wakeAudio } from "@/lib/audio";
import { useMidi } from "@/lib/useMidi";
import { mod12 } from "@/lib/music";
import { duracionDeCompas, duracionDeEvento, ubicar, vocesDe } from "@/lib/pentagrama";
import type { Pieza } from "@/content/partituras";

/**
 * Una pieza: el pentagrama, el reproductor y el modo de seguirte.
 *
 * Lo que hace que valga la pena que la partitura sea *datos* y no una imagen:
 * la app sabe qué nota es cada cosa, así que puede tocarla, marcarte dónde va
 * mientras suena, empezar desde el compás que le señales y —con el teclado
 * enchufado— esperarte a vos en vez de irse sola.
 */

export type Manos = "ambas" | "derecha" | "izquierda";

/** Una nota suelta, con la duración que le toca a ella y no a su vecina. */
interface NotaSuelta {
  t: number;
  midi: number;
  duracion: number;
}

/** Un instante: todo lo que hay que tocar junto para que la pieza avance. */
interface Momento {
  t: number;
  compas: number;
  midis: number[];
}

export default function Partitura({ pieza }: { pieza: Pieza }) {
  const [manos, setManos] = useState<Manos>("ambas");
  const [sonando, setSonando] = useState<number | null>(null);
  const [cargando, setCargando] = useState(false);
  const [tocando, setTocando] = useState(false);
  const [siguiendo, setSiguiendo] = useState(false);
  const [i, setI] = useState(0);
  const [errores, setErrores] = useState(0);
  const [bpm, setBpm] = useState(pieza.bpm);
  const [desdeCompas, setDesdeCompas] = useState(0);
  /** El pedazo que se está practicando, en compases (ambos inclusive). */
  const [recorte, setRecorte] = useState<{ desde: number; hasta: number } | null>(null);
  const [repetir, setRepetir] = useState(false);
  const [vista, setVista] = useState<"cuaderno" | "edicion">("cuaderno");
  const pararRef = useRef<(() => void) | null>(null);
  const repetirRef = useRef(repetir);
  repetirRef.current = repetir;
  const tocarRef = useRef<((desde: number) => void) | null>(null);

  /**
   * La pieza en dos vistas: las notas sueltas para tocarla y los instantes para
   * seguirte.
   *
   * Van separadas porque **cada nota conserva su duración**. Antes se juntaban
   * en un solo instante con la duración más larga, y en la Oda a la alegría eso
   * hacía que las negras de la derecha sonaran un compás entero, como la
   * redonda de la izquierda: quedaba todo pisado.
   */
  const { notas, momentos } = useMemo(() => {
    // Cada mano puede traer más de una voz, y para tocar y para seguirte da lo
    // mismo de cuál venga cada nota: lo que importa es cuándo suena.
    const filas: [Manos, ReturnType<typeof ubicar>][] = [
      ...vocesDe(pieza.derecha).map(
        (v) => ["derecha", ubicar(v, pieza.compas)] as [Manos, ReturnType<typeof ubicar>],
      ),
      ...vocesDe(pieza.izquierda).map(
        (v) => ["izquierda", ubicar(v, pieza.compas)] as [Manos, ReturnType<typeof ubicar>],
      ),
    ];
    const notas: NotaSuelta[] = [];
    const por = new Map<number, Momento>();
    for (const [mano, fila] of filas) {
      if (manos !== "ambas" && manos !== mano) continue;
      for (const n of fila) {
        if (n.midis.length === 0) continue;
        const duracion = duracionDeEvento(n);
        for (const midi of n.midis) notas.push({ t: n.t, midi, duracion });
        const clave = Math.round(n.t * 1e6);
        const previo = por.get(clave);
        if (previo) previo.midis.push(...n.midis);
        else por.set(clave, { t: n.t, compas: n.compas, midis: [...n.midis] });
      }
    }
    return {
      notas: notas.sort((a, b) => a.t - b.t),
      momentos: [...por.values()].sort((a, b) => a.t - b.t),
    };
  }, [pieza, manos]);

  const finMusical = notas.reduce((s, n) => Math.max(s, n.t + n.duracion), 0);
  const totalCompases =
    Math.ceil(finMusical / duracionDeCompas(pieza.compas) - 1e-9) || 1;

  const largoCompas = duracionDeCompas(pieza.compas);
  /** Una redonda dura cuatro negras, así que el bpm de negra manda. */
  const segundosPorRedonda = (60 / bpm) * 4;

  const parar = useCallback(() => {
    pararRef.current?.();
    pararRef.current = null;
    setTocando(false);
    setSonando(null);
  }, []);

  /**
   * Toca la pieza. Todo se agenda de una contra el reloj del audio y la imagen
   * va por `requestAnimationFrame` — los dos relojes de siempre. Si el navegador
   * se traba, se atrasa el dibujo y no el sonido.
   */
  const tocar = useCallback(
    async (desde: number) => {
      pararRef.current?.();
      setSiguiendo(false);
      // Con un pedazo recortado se toca el pedazo: el arranque se mete adentro
      // y el final llega hasta la barra del último compás del recorte.
      if (recorte) desde = Math.min(Math.max(desde, recorte.desde), recorte.hasta);
      const fin = recorte
        ? Math.min(finMusical, (recorte.hasta + 1) * largoCompas)
        : finMusical;
      // **Hay que esperar el piano.** Acá se agenda la pieza entera de una, así
      // que si los samples todavía no llegaron quedan cuarenta segundos
      // agendados con los osciladores y ya no hay vuelta atrás. Se nota
      // muchísimo en la mano izquierda: los graves con oscilador casi no suenan.
      setCargando(true);
      await wakeAudio();
      setCargando(false);
      const ctx = getAudioContext();
      if (!ctx) return;
      setTocando(true);

      const t0Musical = desde * largoCompas;
      const arranque = ctx.currentTime + 0.15;
      const aSegundos = (t: number) => arranque + (t - t0Musical) * segundosPorRedonda;

      // **No se agenda la pieza entera: se agenda lo que viene.** La primera
      // versión mandaba todo de una y el botón de parar no podía parar nada —
      // cada nota ya tenía su apagado agendado y Tone la había soltado de su
      // lista. Ahora cada nota son dos eventos, apretar y soltar, y un timer
      // los va despachando 150ms antes de su hora contra el reloj del audio
      // (los dos relojes de siempre, como el metrónomo). Parar es dejar de
      // despachar y soltar lo apretado: las notas que faltaban nunca llegan a
      // existir.
      const eventos: { t: number; tipo: "on" | "off"; midi: number; dur: number }[] = [];
      for (const n of notas) {
        if (n.t < t0Musical - 1e-9) continue;
        if (n.t >= fin - 1e-9) continue;
        const dur = n.duracion * segundosPorRedonda * 0.95;
        eventos.push({ t: aSegundos(n.t), tipo: "on", midi: n.midi, dur });
        eventos.push({ t: aSegundos(n.t) + dur, tipo: "off", midi: n.midi, dur });
      }
      eventos.sort((a, b) => a.t - b.t);
      let proximo = 0;
      const despachar = () => {
        const horizonte = ctx.currentTime + 0.15;
        while (proximo < eventos.length && eventos[proximo].t <= horizonte) {
          const e = eventos[proximo++];
          if (e.tipo === "on") notaOn(e.midi, e.t, e.dur);
          else notaOff(e.midi, e.t);
        }
      };
      despachar();
      const timer = setInterval(despachar, 25);

      let raf = 0;
      const mirar = () => {
        const t = t0Musical + (ctx.currentTime - arranque) / segundosPorRedonda;
        if (t >= fin) {
          // El pedazo en loop: al llegar a la barra vuelve a arrancar. Es para
          // lo que existe el recorte — el pasaje que no sale se repite hasta
          // que salga, sin volver a apuntarle al botón.
          if (repetirRef.current && recorte) {
            tocarRef.current?.(recorte.desde);
            return;
          }
          clearInterval(timer);
          setTocando(false);
          setSonando(null);
          return;
        }
        setSonando(t);
        raf = requestAnimationFrame(mirar);
      };
      raf = requestAnimationFrame(mirar);

      pararRef.current = () => {
        cancelAnimationFrame(raf);
        clearInterval(timer);
        pararTodo();
      };
    },
    [notas, largoCompas, segundosPorRedonda, finMusical, recorte],
  );
  tocarRef.current = tocar;

  useEffect(() => () => pararRef.current?.(), []);

  // ---- Seguirte a vos ------------------------------------------------------

  const caja = useRef<HTMLDivElement>(null);
  const puestasRef = useRef<Set<number>>(new Set());
  const esperadoRef = useRef<Momento[]>(momentos);
  esperadoRef.current = momentos;
  const iRef = useRef(i);
  iRef.current = i;
  const siguiendoRef = useRef(siguiendo);
  siguiendoRef.current = siguiendo;

  /**
   * Una tecla mientras te sigue.
   *
   * Se acepta el instante completo, no nota por nota: si el acorde tiene tres
   * notas hay que tocar las tres, en cualquier orden y en cualquier octava.
   * Las que sobran no se marcan como error hasta que el instante esté completo,
   * porque al armar un acorde con las dos manos las teclas nunca caen juntas.
   */
  const alTocar = useCallback((midi: number) => {
    if (!siguiendoRef.current) return;
    const m = esperadoRef.current[iRef.current];
    if (!m) return;
    puestasRef.current.add(mod12(midi));
    const faltan = new Set(m.midis.map(mod12));
    const puestas = puestasRef.current;
    const todas = [...faltan].every((c) => puestas.has(c));
    if (!todas) return;
    // Si además tocaste algo que no iba, cuenta como error pero se avanza igual:
    // quedarse trabado en un instante es peor que anotarlo y seguir.
    const sobra = [...puestas].some((c) => !faltan.has(c));
    if (sobra) setErrores((e) => e + 1);
    puestasRef.current = new Set();
    setI((n) => n + 1);
  }, []);

  const { estado: estadoMidi, dispositivos } = useMidi({ caja, onNota: ({ midi }) => alTocar(midi) });
  const hayTeclado = estadoMidi === "conectado";

  const momentoActual = siguiendo ? momentos[i] : null;
  // Con recorte, el seguimiento también termina en la barra del recorte.
  const terminada =
    siguiendo &&
    (i >= momentos.length ||
      (recorte !== null && (momentos[i]?.compas ?? Infinity) > recorte.hasta));

  const arrancarSeguimiento = () => {
    wakeAudio();
    parar();
    setSiguiendo(true);
    const desde = recorte
      ? Math.min(Math.max(desdeCompas, recorte.desde), recorte.hasta)
      : desdeCompas;
    setI(indiceDelCompas(momentos, desde));
    setErrores(0);
    puestasRef.current = new Set();
  };

  return (
    <div ref={caja} className="card">
      {/* La vista: nuestro cuaderno o la edición completa, si hay de dónde. */}
      {pieza.fuente && (
        <div className="flex flex-wrap items-center gap-2 px-4 pt-4">
          <span className="text-xs tracking-[0.2em] text-humo uppercase">Vista</span>
          {(["cuaderno", "edicion"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                vista === v ? "bg-tiza text-noche" : "bg-carta-2 text-humo hover:text-tiza"
              }`}
            >
              {v === "cuaderno" ? "el cuaderno" : "edición completa"}
            </button>
          ))}
          {vista === "edicion" && (
            <span className="text-xs text-humo">
              la partitura original, con lo que nuestra transcripción todavía no
              tiene — lo que suena sigue siendo lo nuestro
            </span>
          )}
        </div>
      )}

      {vista === "edicion" && pieza.fuente ? (
        <div className="p-4">
          <EdicionCompleta fuente={pieza.fuente} />
        </div>
      ) : (
        <div className="overflow-x-auto p-4">
          <Pentagrama
            derecha={pieza.derecha}
            izquierda={pieza.izquierda}
            compas={pieza.compas}
            tonalidad={pieza.tonalidad}
            sonando={siguiendo ? (momentoActual?.t ?? null) : sonando}
            apagada={
              manos === "derecha" ? "izquierda" : manos === "izquierda" ? "derecha" : undefined
            }
            rango={recorte ?? undefined}
            onCompas={(c) => {
              setDesdeCompas(c);
              if (siguiendo) {
                setI(indiceDelCompas(momentos, c));
                puestasRef.current = new Set();
              } else {
                tocar(c);
              }
            }}
          />
        </div>
      )}

      {/* Los controles quedan pegados al pie de la ventana mientras la
          partitura sigue para abajo: en una pieza larga estaban a dos pantallas
          de la música. */}
      <div className="sticky bottom-0 z-10 rounded-b-[inherit] border-t border-borde/60 bg-noche-2/95 backdrop-blur">

      {/* Con qué mano. Es lo primero que se estudia: una mano por vez y recién
          después las dos juntas, así que está arriba de todo lo demás. */}
      <div className="flex flex-wrap items-center gap-2 px-4 pt-4">
        <span className="text-xs tracking-[0.2em] text-humo uppercase">Manos</span>
        {(["izquierda", "derecha", "ambas"] as Manos[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              parar();
              setManos(m);
            }}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
              manos === m
                ? "bg-tiza text-noche"
                : "bg-carta-2 text-humo hover:text-tiza"
            }`}
          >
            {m === "ambas" ? "las dos" : `sólo ${m}`}
          </button>
        ))}

        {/* El pedazo: practicar sólo un rango de compases, con repetición. */}
        {totalCompases > 1 && (
          <span className="ml-auto flex items-center gap-2 text-sm text-humo">
            <span className="text-xs tracking-[0.2em] uppercase">Compases</span>
            <input
              type="number"
              min={1}
              max={totalCompases}
              value={recorte ? recorte.desde + 1 : 1}
              onChange={(e) => {
                parar();
                const desde = Math.min(
                  Math.max(Number(e.target.value) - 1, 0),
                  totalCompases - 1,
                );
                const hasta = Math.max(recorte?.hasta ?? totalCompases - 1, desde);
                setRecorte({ desde, hasta });
                setDesdeCompas(desde);
              }}
              className="w-14 rounded-lg bg-carta-2 px-2 py-1 text-center font-mono"
              aria-label="Desde el compás"
            />
            <span>al</span>
            <input
              type="number"
              min={1}
              max={totalCompases}
              value={recorte ? recorte.hasta + 1 : totalCompases}
              onChange={(e) => {
                parar();
                const hasta = Math.min(
                  Math.max(Number(e.target.value) - 1, 0),
                  totalCompases - 1,
                );
                const desde = Math.min(recorte?.desde ?? 0, hasta);
                setRecorte({ desde, hasta });
                setDesdeCompas(desde);
              }}
              className="w-14 rounded-lg bg-carta-2 px-2 py-1 text-center font-mono"
              aria-label="Hasta el compás"
            />
            {recorte && (
              <>
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={repetir}
                    onChange={(e) => setRepetir(e.target.checked)}
                    className="accent-sol"
                  />
                  en loop
                </label>
                <button
                  onClick={() => {
                    parar();
                    setRecorte(null);
                    setRepetir(false);
                    setDesdeCompas(0);
                  }}
                  className="text-xs underline decoration-dotted underline-offset-2 hover:text-tiza"
                >
                  toda la pieza
                </button>
              </>
            )}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 p-4">
        {tocando ? (
          <button
            onClick={parar}
            className="rounded-full bg-brasa px-5 py-2.5 font-bold text-noche transition hover:brightness-110"
          >
            ■ Parar
          </button>
        ) : (
          <button
            onClick={() => tocar(desdeCompas)}
            disabled={cargando}
            className="rounded-full bg-menta px-5 py-2.5 font-bold text-noche transition hover:brightness-110 disabled:opacity-60"
          >
            {cargando ? "…" : "▶ Escucharla"}
          </button>
        )}

        <button
          onClick={siguiendo ? () => setSiguiendo(false) : arrancarSeguimiento}
          className={`rounded-full px-4 py-2.5 text-sm font-bold transition ${
            siguiendo ? "bg-brasa text-noche" : "bg-uva text-noche hover:brightness-110"
          }`}
        >
          {siguiendo ? "⏹ Dejar de seguirme" : hayTeclado ? "🎹 Seguime" : "👆 Seguime"}
        </button>

        {totalCompases > 1 && (
          <span className="rounded-full bg-carta-2 px-3 py-1.5 font-mono text-sm text-humo">
            desde el compás {desdeCompas + 1}
            {desdeCompas > 0 && (
              <button
                onClick={() => setDesdeCompas(0)}
                className="ml-2 text-xs underline decoration-dotted underline-offset-2 hover:text-tiza"
              >
                al principio
              </button>
            )}
          </span>
        )}

        <label className="ml-auto flex items-center gap-2 text-sm text-humo">
          <span className="font-mono">{bpm} bpm</span>
          <input
            type="range"
            min={30}
            max={160}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="accent-sol"
          />
        </label>
      </div>

      {siguiendo && (
        <div className="border-t border-borde/60 px-4 pb-4">
          <div className="mt-3 rounded-2xl bg-noche px-5 py-4">
            {terminada ? (
              <>
                <p className="font-display text-2xl font-bold text-menta">
                  Hasta el final 🎉
                </p>
                <p className="mt-1 text-sm text-humo">
                  {errores === 0
                    ? "Sin una nota de más."
                    : `Con ${errores} ${errores === 1 ? "nota" : "notas"} que no iban.`}
                </p>
                <button
                  onClick={arrancarSeguimiento}
                  className="mt-3 rounded-full bg-menta px-4 py-2 text-sm font-bold text-noche transition hover:brightness-110"
                >
                  Otra vez
                </button>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                  <div>
                    <p className="text-xs tracking-[0.2em] text-humo uppercase">
                      Compás
                    </p>
                    <p className="font-display text-3xl font-black text-sol">
                      {(momentoActual?.compas ?? 0) + 1}
                      <span className="text-base text-humo">/{totalCompases}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs tracking-[0.2em] text-humo uppercase">
                      Van
                    </p>
                    <p className="font-mono text-lg">
                      {i}/{momentos.length}
                    </p>
                  </div>
                  {errores > 0 && (
                    <p className="font-mono text-sm text-brasa">
                      {errores} de más
                    </p>
                  )}
                </div>
                <p className="mt-2 text-xs text-humo">
                  No hay reloj: la partitura avanza cuando tocás todas las notas
                  de ese instante. La octava no importa. Tocá un compás del
                  pentagrama para saltar ahí.
                </p>
              </>
            )}
          </div>
        </div>
      )}
      </div>

      {siguiendo && (
        <div className="px-4 pb-4">
          <Midi
            estado={estadoMidi}
            dispositivos={dispositivos}
            pista="— tocá la pieza y te sigo"
            invitacion="¿Tenés un teclado? Conectalo y la partitura te espera a vos"
            cierre="Con el teclado conectado, la partitura no se va sola: avanza cuando tocás lo que dice, y se queda esperándote si te trabás."
          />
        </div>
      )}
    </div>
  );
}

/** El primer instante que cae en ese compás, para poder empezar desde ahí. */
function indiceDelCompas(momentos: Momento[], compas: number): number {
  const i = momentos.findIndex((m) => m.compas >= compas);
  return i < 0 ? 0 : i;
}
