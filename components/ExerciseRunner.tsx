"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Keyboard, { type Mark } from "./Keyboard";
import {
  buildExercise,
  buildExerciseCompleto,
  manoEn,
  mod12,
  noteName,
  type ExerciseStep,
  type Hand,
} from "@/lib/music";
import { playNote, wakeAudio } from "@/lib/audio";
import { useMetronomo } from "@/lib/useMetronomo";
import { useMicPitch, type EstadoMic } from "@/lib/useMicPitch";
import type { PitchReading } from "@/lib/pitch";

export interface Variant {
  label: string;
  hand: Hand | "ambas";
  recorrido: "completo" | "sube" | "baja";
  note?: string;
}

const BASE_IZQ = 48; // Do3
const BASE_DER = 60; // Do4
const POSICIONES = 8; // una octava por tramo

/** Arma el recorrido pedido para una mano. */
function armar(hand: Hand, recorrido: Variant["recorrido"], base: number) {
  if (recorrido === "completo")
    return buildExerciseCompleto({ hand, base, positions: POSICIONES });
  if (recorrido === "sube")
    return buildExercise({
      hand,
      gap: "abajo",
      sentido: "sube",
      positions: POSICIONES,
      base,
    });
  // La bajada suelta arranca arriba y vuelve, con el hueco del lado del agudo.
  return buildExercise({
    hand,
    gap: "arriba",
    sentido: "baja",
    positions: POSICIONES,
    startDegree: POSICIONES - 1,
    base,
  });
}

export default function ExerciseRunner({ variants }: { variants: Variant[] }) {
  const [vi, setVi] = useState(0);
  const [bpm, setBpm] = useState(72);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [puntaje, setPuntaje] = useState({ bien: 0, mal: 0 });
  const [ultimoError, setUltimoError] = useState<number | null>(null);
  const [completo, setCompleto] = useState(false);
  const v = variants[vi];

  // El micrófono sólo distingue una nota por vez: con las dos manos juntas
  // sonando en simultáneo no hay nada que hacer.
  const micPosible = v.hand !== "ambas";

  const { izq, der } = useMemo(() => {
    const izq =
      v.hand === "derecha" ? null : armar("izquierda", v.recorrido, BASE_IZQ);
    const der =
      v.hand === "izquierda" ? null : armar("derecha", v.recorrido, BASE_DER);
    return { izq, der };
  }, [v]);

  const total = (izq ?? der)!.length;
  const totalPosiciones = v.recorrido === "completo" ? POSICIONES * 2 : POSICIONES;

  const reiniciar = useCallback(() => {
    setI(0);
    setPuntaje({ bien: 0, mal: 0 });
    setUltimoError(null);
    setCompleto(false);
  }, []);

  // Reinicia al cambiar de variante.
  useEffect(() => {
    reiniciar();
    setPlaying(false);
    setEscuchando(false);
  }, [vi, reiniciar]);

  const izqRef = useRef(izq);
  const derRef = useRef(der);
  izqRef.current = izq;
  derRef.current = der;

  // ---- Modo escuchar: la app espera a que toques la nota que toca ----------

  const esperado = (izq ?? der)![i];

  const iRef = useRef(i);
  iRef.current = i;
  const totalRef = useRef(total);
  totalRef.current = total;

  const avanzar = useCallback((cuantas: number) => {
    setUltimoError(null);
    setPuntaje((p) => ({ ...p, bien: p.bien + cuantas }));
    setI((prev) => {
      const next = prev + cuantas;
      if (next >= totalRef.current) {
        setCompleto(true);
        return prev;
      }
      return next;
    });
  }, []);

  const onNota = useCallback(
    (midi: number) => {
      const pasos = (izqRef.current ?? derRef.current)!;
      const i = iRef.current;
      // Se compara por nota, no por octava: el ejercicio es una figura de
      // dedos, y da igual en qué octava del piano la estés haciendo.
      const clase = mod12(midi);
      const claseDe = (n: number) =>
        n >= 0 && n < pasos.length ? mod12(pasos[n].pitch) : -1;

      if (clase === claseDe(i)) {
        avanzar(1);
      } else if (clase === claseDe(i - 1)) {
        // La nota que acabamos de dar por buena, otra vez: es un rebote del
        // detector (la misma tecla que suena entrecortada), no un error tuyo.
        // Se ignora en silencio.
      } else if (clase === claseDe(i + 1)) {
        // Tocaste la que sigue: la anterior sonó y no la escuchamos. El error
        // es nuestro, no tuyo, así que se saltea sin penalizar. Sin esto, una
        // sola nota que el micrófono se pierde te deja trabado tocando algo
        // que la app ya pasó.
        avanzar(2);
      } else {
        setUltimoError(midi);
        setPuntaje((p) => ({ ...p, mal: p.mal + 1 }));
      }
    },
    [avanzar],
  );

  const { estado: estadoMic, lectura } = useMicPitch({
    activo: escuchando && micPosible,
    onNota,
  });

  // Escuchar y reproducir solo son incompatibles: el micrófono se escucharía a
  // sí mismo por los parlantes.
  useEffect(() => {
    if (escuchando) setPlaying(false);
  }, [escuchando]);

  useMetronomo({
    activo: playing,
    bpm,
    total,
    // Arranca en la nota donde estás parado, no en la siguiente: antes,
    // apretar play desde el principio se comía el primer Do.
    desde: () => iRef.current,
    agendar: (indice, cuando) => {
      const l = izqRef.current?.[indice];
      const r = derRef.current?.[indice];
      if (l) playNote(l.pitch, 0.42, cuando);
      if (r) playNote(r.pitch, 0.42, cuando);
    },
    mostrar: setI,
  });

  const marks: Mark[] = [];
  const pushHand = (
    steps: ExerciseStep[] | null,
    tone: "izq" | "der",
    base: number,
  ) => {
    if (!steps) return;
    const step = steps[i];
    // La "casa" de la mano acá y ahora: las cinco teclas apoyadas.
    for (const pitch of manoEn(step, base)) {
      marks.push({ pitch, tone, ghost: true });
    }
    marks.push({
      pitch: step.pitch,
      tone,
      label: String(step.finger),
      active: true,
    });
  };
  pushHand(izq, "izq", BASE_IZQ);
  pushHand(der, "der", BASE_DER);

  // Mientras escucha, la nota equivocada se pinta donde caiga en el teclado.
  if (escuchando && ultimoError !== null) {
    const dentro = [ultimoError - 12, ultimoError, ultimoError + 12].find(
      (p) => p >= 45 && p <= 84,
    );
    if (dentro !== undefined && dentro !== esperado.pitch) {
      marks.push({ pitch: dentro, tone: "brasa", label: "✗" });
    }
  }

  const actual = [izq?.[i], der?.[i]].filter(Boolean) as ExerciseStep[];
  const paso = (izq ?? der)![i];
  const posicion = paso.position + 1;
  const desplazando = actual.some((s) => s.isNewPosition);
  const tramo =
    v.recorrido === "completo"
      ? paso.gap === "abajo"
        ? "subiendo · hueco abajo"
        : "bajando · hueco arriba"
      : null;

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap gap-1.5 border-b border-borde/60 p-4">
        {variants.map((variant, idx) => (
          <button
            key={variant.label}
            onClick={() => setVi(idx)}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
              vi === idx
                ? "bg-tiza text-noche"
                : "bg-carta-2 text-humo hover:text-tiza"
            }`}
          >
            {variant.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {v.note && <p className="mb-4 text-sm text-humo italic">{v.note}</p>}

        <div className="rounded-2xl bg-noche-2 p-3">
          <Keyboard from={45} to={84} marks={marks} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              wakeAudio();
              setPlaying((p) => !p);
            }}
            className="rounded-full bg-menta px-5 py-2 text-sm font-bold text-noche transition hover:brightness-110"
          >
            {playing ? "⏸ Pausa" : "▶ Arrancar"}
          </button>
          <button
            onClick={() => {
              setPlaying(false);
              reiniciar();
            }}
            className="rounded-full bg-carta-2 px-4 py-2 text-sm font-bold transition hover:bg-borde"
          >
            ↺ Volver al principio
          </button>
          <button
            onClick={() => {
              setPlaying(false);
              setI((p) => {
                const next = (p + 1) % total;
                const l = izq?.[next];
                const r = der?.[next];
                wakeAudio();
                if (l) playNote(l.pitch, 0.42);
                if (r) playNote(r.pitch, 0.42);
                return next;
              });
            }}
            className="rounded-full bg-carta-2 px-4 py-2 text-sm font-bold transition hover:bg-borde"
          >
            → Una nota
          </button>

          {micPosible && (
            <button
              onClick={() => {
                wakeAudio();
                setEscuchando((e) => !e);
                if (!escuchando) reiniciar();
              }}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                escuchando
                  ? "bg-brasa text-noche"
                  : "bg-uva text-noche hover:brightness-110"
              }`}
            >
              {escuchando ? "⏹ Dejar de escuchar" : "🎤 Escuchame tocar"}
            </button>
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

        {escuchando && (
          <MicPanel
            estado={estadoMic}
            lectura={lectura}
            esperado={esperado}
            puntaje={puntaje}
            ultimoError={ultimoError}
            completo={completo}
            restantes={total - i}
            onReiniciar={reiniciar}
          />
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-noche-2 px-4 py-3 text-sm">
          <span
            className={`rounded-lg px-2 py-1 text-xs tracking-wider uppercase transition ${
              desplazando
                ? "bg-sol font-bold text-noche"
                : "bg-carta-2 text-humo"
            }`}
          >
            {desplazando
              ? `→ se corre a la posición ${posicion}`
              : `posición ${posicion} de ${totalPosiciones}`}
          </span>
          {tramo && (
            <span
              className={`rounded-lg px-2 py-1 text-xs tracking-wider uppercase ${
                paso.gap === "abajo"
                  ? "bg-menta/15 text-menta"
                  : "bg-uva/15 text-uva"
              }`}
            >
              {tramo}
            </span>
          )}
          {actual.map((s, idx) => (
            <span key={idx} className="font-mono">
              <span className="text-humo">dedo</span>{" "}
              <span className="font-bold text-sol">{s.finger}</span>{" "}
              <span className="text-humo">→</span> {noteName(s.pitch)}
            </span>
          ))}
          <span className="ml-auto flex gap-3 text-xs text-humo">
            {izq && (
              <span className="flex items-center gap-1.5">
                <i className="inline-block h-2.5 w-2.5 rounded-full bg-menta" />
                izquierda
              </span>
            )}
            {der && (
              <span className="flex items-center gap-1.5">
                <i className="inline-block h-2.5 w-2.5 rounded-full bg-rosa" />
                derecha
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

const MENSAJES: Record<EstadoMic, string> = {
  apagado: "",
  pidiendo: "Pidiéndole permiso al navegador…",
  escuchando: "",
  denegado:
    "El navegador bloqueó el micrófono. Hay que habilitarlo en el candadito de la barra de direcciones y volver a intentar.",
  "sin-soporte":
    "Este navegador no da acceso al micrófono. Suele pasar en conexiones sin HTTPS.",
  error: "No se pudo abrir el micrófono. ¿Lo está usando otro programa?",
};

/** El panel que aparece abajo del teclado cuando el ejercicio te está escuchando. */
function MicPanel({
  estado,
  lectura,
  esperado,
  puntaje,
  ultimoError,
  completo,
  restantes,
  onReiniciar,
}: {
  estado: EstadoMic;
  lectura: PitchReading | null;
  esperado: ExerciseStep;
  puntaje: { bien: number; mal: number };
  ultimoError: number | null;
  completo: boolean;
  restantes: number;
  onReiniciar: () => void;
}) {
  const mensaje = MENSAJES[estado];
  const total = puntaje.bien + puntaje.mal;
  const limpio = total > 0 ? Math.round((puntaje.bien / total) * 100) : null;

  if (completo) {
    return (
      <div className="mt-4 rounded-2xl border border-menta/40 bg-menta/10 px-5 py-4">
        <p className="font-display text-2xl font-bold text-menta">
          ¡Octava completa! 🎉
        </p>
        <p className="mt-1 text-sm text-humo">
          {puntaje.bien} notas bien
          {puntaje.mal > 0 && ` y ${puntaje.mal} al lado`}
          {limpio !== null && ` · ${limpio}% limpio`}.
        </p>
        <button
          onClick={onReiniciar}
          className="mt-3 rounded-full bg-menta px-4 py-2 text-sm font-bold text-noche transition hover:brightness-110"
        >
          Otra vez
        </button>
      </div>
    );
  }

  if (mensaje) {
    return (
      <div className="mt-4 rounded-2xl border border-brasa/30 bg-brasa/10 px-5 py-4 text-sm text-tiza/90">
        {mensaje}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl bg-noche-2 px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-humo uppercase">
            Tocá esta
          </p>
          <p className="font-display text-3xl font-black text-sol">
            {noteName(esperado.pitch)}
            <span className="ml-2 text-base font-bold text-humo">
              dedo {esperado.finger}
            </span>
          </p>
        </div>

        <div className="min-w-32">
          <p className="text-xs tracking-[0.2em] text-humo uppercase">
            Te escucho
          </p>
          <p
            className={`font-display text-3xl font-black ${
              ultimoError !== null ? "text-brasa" : "text-tiza"
            }`}
          >
            {lectura ? (
              <>
                {noteName(lectura.midi)}
                <span className="ml-2 font-mono text-xs font-normal text-humo">
                  {lectura.cents > 0 ? "+" : ""}
                  {lectura.cents}¢
                </span>
              </>
            ) : (
              <span className="text-humo">—</span>
            )}
          </p>
        </div>

        {/* Vúmetro: sirve para saber si el micrófono te está llegando. */}
        <div className="h-2 w-24 overflow-hidden rounded-full bg-carta-2">
          <div
            className="h-full rounded-full bg-menta transition-[width] duration-75"
            style={{
              width: `${Math.min(100, Math.round((lectura?.rms ?? 0) * 400))}%`,
            }}
          />
        </div>

        <div className="ml-auto text-right text-sm">
          <p className="font-mono">
            <span className="text-menta">{puntaje.bien}</span>
            <span className="text-humo"> / </span>
            <span className="text-brasa">{puntaje.mal}</span>
          </p>
          <p className="text-xs text-humo">faltan {restantes}</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-humo">
        Tocá tranquilo, no hay reloj: la nota avanza cuando la acertás. La
        octava no importa, sí la nota.
      </p>
    </div>
  );
}
