"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Pentagrama from "./Pentagrama";
import Midi from "./Midi";
import { getAudioContext, playNote, wakeAudio } from "@/lib/audio";
import { useMidi } from "@/lib/useMidi";
import { mod12 } from "@/lib/music";
import { duracionDeCompas, duracionDeEvento, ubicar } from "@/lib/pentagrama";
import type { Pieza } from "@/content/partituras";

/**
 * Una pieza: el pentagrama, el reproductor y el modo de seguirte.
 *
 * Lo que hace que valga la pena que la partitura sea *datos* y no una imagen:
 * la app sabe qué nota es cada cosa, así que puede tocarla, marcarte dónde va
 * mientras suena, empezar desde el compás que le señales y —con el teclado
 * enchufado— esperarte a vos en vez de irse sola.
 */

interface Momento {
  /** En redondas desde el arranque. */
  t: number;
  compas: number;
  /** Las teclas que caen justo en este instante, de las dos manos. */
  midis: number[];
  duracion: number;
}

export default function Partitura({ pieza }: { pieza: Pieza }) {
  const [sonando, setSonando] = useState<number | null>(null);
  const [tocando, setTocando] = useState(false);
  const [siguiendo, setSiguiendo] = useState(false);
  const [i, setI] = useState(0);
  const [errores, setErrores] = useState(0);
  const [bpm, setBpm] = useState(pieza.bpm);
  const [desdeCompas, setDesdeCompas] = useState(0);
  const pararRef = useRef<(() => void) | null>(null);

  /** La pieza vista como una fila de instantes: es lo que se toca y lo que se espera. */
  const momentos = useMemo<Momento[]>(() => {
    const arriba = ubicar(pieza.derecha, pieza.compas);
    const abajo = ubicar(pieza.izquierda, pieza.compas);
    const por = new Map<number, Momento>();
    for (const n of [...arriba, ...abajo]) {
      if (n.midis.length === 0) continue;
      const clave = Math.round(n.t * 1e6);
      const previo = por.get(clave);
      if (previo) {
        previo.midis.push(...n.midis);
        previo.duracion = Math.max(previo.duracion, duracionDeEvento(n));
      } else {
        por.set(clave, {
          t: n.t,
          compas: n.compas,
          midis: [...n.midis],
          duracion: duracionDeEvento(n),
        });
      }
    }
    return [...por.values()].sort((a, b) => a.t - b.t);
  }, [pieza]);

  const totalCompases =
    Math.ceil(
      (momentos.length
        ? momentos[momentos.length - 1].t + momentos[momentos.length - 1].duracion
        : 0) / duracionDeCompas(pieza.compas) - 1e-9,
    ) || 1;

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
    (desde: number) => {
      pararRef.current?.();
      wakeAudio();
      const ctx = getAudioContext();
      if (!ctx) return;
      setSiguiendo(false);
      setTocando(true);

      const t0Musical = desde * largoCompas;
      const arranque = ctx.currentTime + 0.15;
      const aSegundos = (t: number) => arranque + (t - t0Musical) * segundosPorRedonda;

      for (const m of momentos) {
        if (m.t < t0Musical - 1e-9) continue;
        for (const midi of m.midis) {
          playNote(midi, m.duracion * segundosPorRedonda * 0.95, aSegundos(m.t));
        }
      }

      const ultimo = momentos[momentos.length - 1];
      const finMusical = ultimo ? ultimo.t + ultimo.duracion : t0Musical;
      let raf = 0;
      const mirar = () => {
        const t = t0Musical + (ctx.currentTime - arranque) / segundosPorRedonda;
        if (t >= finMusical) {
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
        // Los samples ya agendados se dejan morir solos: cortarlos a mitad de
        // nota suena peor que dejar que se apaguen.
      };
    },
    [momentos, largoCompas, segundosPorRedonda],
  );

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
  const terminada = siguiendo && i >= momentos.length;

  const arrancarSeguimiento = () => {
    wakeAudio();
    parar();
    setSiguiendo(true);
    setI(indiceDelCompas(momentos, desdeCompas));
    setErrores(0);
    puestasRef.current = new Set();
  };

  return (
    <div ref={caja} className="card overflow-hidden">
      <div className="overflow-x-auto p-4">
        <Pentagrama
          derecha={pieza.derecha}
          izquierda={pieza.izquierda}
          compas={pieza.compas}
          tonalidad={pieza.tonalidad}
          sonando={siguiendo ? (momentoActual?.t ?? null) : sonando}
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

      <div className="flex flex-wrap items-center gap-3 border-t border-borde/60 p-4">
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
            className="rounded-full bg-menta px-5 py-2.5 font-bold text-noche transition hover:brightness-110"
          >
            ▶ Escucharla
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
          <div className="mt-3 rounded-2xl bg-noche-2 px-5 py-4">
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
