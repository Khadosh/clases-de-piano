"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Keyboard, { type Mark } from "./Keyboard";
import Midi from "./Midi";
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
import { useMidi } from "@/lib/useMidi";
import { evaluarNota } from "@/lib/puntaje";
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
  const [siguiendo, setSiguiendo] = useState(false);
  /** Forzar el micrófono aunque haya teclado, para probarlo. */
  const [forzarMic, setForzarMic] = useState(false);
  const [puntaje, setPuntaje] = useState({ bien: 0, mal: 0 });
  const [ultimoError, setUltimoError] = useState<number | null>(null);
  const [ultimaTocada, setUltimaTocada] = useState<number | null>(null);
  const [completo, setCompleto] = useState(false);
  const v = variants[vi];

  // El micrófono sólo distingue una nota por vez: con las dos manos juntas
  // sonando en simultáneo no hay nada que hacer. El MIDI sí podría, pero el
  // ejercicio se sigue nota por nota, así que por ahora es igual.
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
    setUltimaTocada(null);
    setCompleto(false);
  }, []);

  // Reinicia al cambiar de variante.
  useEffect(() => {
    reiniciar();
    setPlaying(false);
    setSiguiendo(false);
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

  // El ejercicio visto como lo ve el micrófono: una nota por paso, por clase y
  // no por octava. Es una figura de dedos, da igual en qué octava la toques.
  const esperadoRef = useRef<number[][]>([]);
  esperadoRef.current = useMemo(
    () => ((izq ?? der) ?? []).map((paso) => [mod12(paso.pitch)]),
    [izq, der],
  );

  /**
   * Una nota tocada, venga de donde venga.
   *
   * `ventanaResync` es la diferencia entre las dos entradas y no es un detalle:
   * la ventana existe para tapar las notas que el micrófono se come, y sin ella
   * una sola nota perdida hacía que todo lo que seguía saliera en rojo. El
   * teclado MIDI no se come nada — dice exactamente qué apretaste — así que ahí
   * la ventana sólo serviría para dejar pasar un error de verdad.
   */
  const contar = useCallback(
    (midi: number, ventanaResync?: number) => {
      const v = evaluarNota([mod12(midi)], esperadoRef.current, iRef.current, {
        ventanaResync,
      });
      if (v.tipo === "avanza") avanzar(v.cuantas);
      else if (v.tipo === "mal") {
        setUltimoError(midi);
        setPuntaje((p) => ({ ...p, mal: p.mal + 1 }));
      }
      // "rebote" no hace nada: es la misma tecla sonando entrecortada.
    },
    [avanzar],
  );

  const caja = useRef<HTMLDivElement>(null);
  // El guardia va por ref porque quién manda depende de `estadoMidi`, que sale
  // de esta misma llamada: adentro del callback todavía no se puede leer.
  const midiMandaRef = useRef(false);
  const { estado: estadoMidi, dispositivos } = useMidi({
    caja,
    onNota: ({ midi }) => {
      if (!midiMandaRef.current) return;
      setUltimaTocada(midi);
      contar(midi, 0);
    },
  });

  // Con el teclado enchufado no hace falta escuchar nada: sabemos qué tocaste.
  // El micrófono sigue estando por si se lo quiere probar, y es el único camino
  // cuando no hay teclado.
  const hayTeclado = estadoMidi === "conectado";
  const porMidi = hayTeclado && !forzarMic;
  midiMandaRef.current = siguiendo && porMidi;

  const { estado: estadoMic, lectura } = useMicPitch({
    activo: siguiendo && !porMidi && micPosible,
    // Sin ventana explícita: el micrófono se queda con la de por defecto, que
    // es la que existe justamente para él.
    onNota: (midi) => contar(midi),
  });

  // El micrófono y reproducir solo son incompatibles: se escucharía a sí mismo
  // por los parlantes. Con MIDI eso no pasa, pero tocar encima de la app tampoco
  // es lo que el ejercicio pide, así que se corta igual.
  useEffect(() => {
    if (siguiendo) setPlaying(false);
  }, [siguiendo]);

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
  if (siguiendo && ultimoError !== null) {
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
    <div ref={caja} className="card overflow-hidden">
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

        {micPosible && !siguiendo && (
          <Midi
            estado={estadoMidi}
            dispositivos={dispositivos}
            pista="— dale a Seguime en el piano y tocá"
            invitacion="¿Tenés un teclado? Conectalo y seguí el ejercicio sin micrófono"
            cierre="Con el teclado conectado, el ejercicio avanza cuando tocás la nota que va — sin micrófono, sin permisos y sin equivocarse de octava."
          />
        )}

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

          {(micPosible || hayTeclado) && (
            <button
              onClick={() => {
                wakeAudio();
                setSiguiendo((e) => !e);
                if (!siguiendo) reiniciar();
              }}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                siguiendo
                  ? "bg-brasa text-noche"
                  : "bg-uva text-noche hover:brightness-110"
              }`}
            >
              {siguiendo
                ? "⏹ Parar"
                : porMidi
                  ? "🎹 Seguime en el piano"
                  : "🎤 Escuchame tocar"}
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

        {siguiendo && (
          <>
            <PanelDeSeguir
              porMidi={porMidi}
              estado={estadoMic}
              lectura={lectura}
              ultimaTocada={ultimaTocada}
              esperado={esperado}
              puntaje={puntaje}
              ultimoError={ultimoError}
              completo={completo}
              restantes={total - i}
              onReiniciar={reiniciar}
            />
            {hayTeclado && micPosible && (
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-humo">
                <input
                  type="checkbox"
                  checked={forzarMic}
                  onChange={(e) => setForzarMic(e.target.checked)}
                  className="accent-uva"
                />
                Usar el micrófono igual (para probarlo: con el teclado enchufado
                no hace falta)
              </label>
            )}
          </>
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

/**
 * El panel que aparece abajo del teclado mientras el ejercicio te sigue.
 *
 * Sirve para las dos entradas y la diferencia se nota poco a propósito: lo que
 * importa es siempre lo mismo —cuál va ahora y cómo venís—, y sólo cambia la
 * columna del medio. Con el micrófono hay que mostrar el vúmetro y los cents,
 * porque ahí no se sabe si está entrando algo; con el teclado eso no existe.
 */
function PanelDeSeguir({
  porMidi,
  estado,
  lectura,
  ultimaTocada,
  esperado,
  puntaje,
  ultimoError,
  completo,
  restantes,
  onReiniciar,
}: {
  porMidi: boolean;
  estado: EstadoMic;
  lectura: PitchReading | null;
  ultimaTocada: number | null;
  esperado: ExerciseStep;
  puntaje: { bien: number; mal: number };
  ultimoError: number | null;
  completo: boolean;
  restantes: number;
  onReiniciar: () => void;
}) {
  const mensaje = porMidi ? "" : MENSAJES[estado];
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
            {porMidi ? "Tocaste" : "Te escucho"}
          </p>
          <p
            className={`font-display text-3xl font-black ${
              ultimoError !== null ? "text-brasa" : "text-tiza"
            }`}
          >
            {porMidi ? (
              ultimaTocada !== null ? (
                noteName(ultimaTocada)
              ) : (
                <span className="text-humo">—</span>
              )
            ) : lectura ? (
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

        {/* Vúmetro: sirve para saber si el micrófono te está llegando. Con el
            teclado no hay nada que dudar, así que no va. */}
        {!porMidi && (
          <div className="h-2 w-24 overflow-hidden rounded-full bg-carta-2">
            <div
              className="h-full rounded-full bg-menta transition-[width] duration-75"
              style={{
                width: `${Math.min(100, Math.round((lectura?.rms ?? 0) * 400))}%`,
              }}
            />
          </div>
        )}

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
        {porMidi &&
          " Va por el teclado MIDI, así que lo que se marca mal está mal de verdad."}
      </p>
    </div>
  );
}
