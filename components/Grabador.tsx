"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Icono from "./Icono";
import { getAudioContext } from "@/lib/audio";
import { aWav, unir } from "@/lib/wav";
import { noteNameWithOctave } from "@/lib/music";
import { useMidi } from "@/lib/useMidi";
import Midi from "./Midi";

/**
 * Graba el micrófono y, si hay un teclado MIDI conectado, lo que tocaste de
 * verdad — las dos cosas con el mismo reloj.
 *
 * Eso último es todo el motivo de que esto exista. `npm run calibrar` hoy tiene
 * que suponer que la grabación es una interpretación perfecta del ejercicio,
 * así que cualquier error tuyo se le carga al detector y no hay forma de
 * separar una cosa de la otra. Con el MIDI al lado, el supuesto desaparece:
 * sabemos qué nota, en qué milisegundo.
 *
 * Si el audio se grabara en el celular y el MIDI en la compu habría que alinear
 * dos relojes a mano, y cincuenta milisegundos de error ahí arruinan justo lo
 * que se quiere medir. Por eso una sola página hace las dos cosas.
 */

interface NotaMidi {
  /** Milisegundos desde que arrancó la grabación. */
  t: number;
  midi: number;
  velocity: number;
}

type Estado = "listo" | "grabando" | "terminado";

export default function Grabador() {
  const [estado, setEstado] = useState<Estado>("listo");
  const [error, setError] = useState<string | null>(null);
  const [notas, setNotas] = useState<NotaMidi[]>([]);
  const [segundos, setSegundos] = useState(0);
  const [nivel, setNivel] = useState(0);
  const [resultado, setResultado] = useState<{
    wav: string;
    json: string;
    nombre: string;
    duracion: number;
    notas: number;
  } | null>(null);

  const trozosRef = useRef<Float32Array[]>([]);
  const notasRef = useRef<NotaMidi[]>([]);
  /** El instante cero, en la escala de `performance.now()`, que es la del MIDI. */
  const inicioRef = useRef(0);
  const grabandoRef = useRef(false);
  const limpiarRef = useRef<(() => void) | null>(null);

  // ---- MIDI ---------------------------------------------------------------

  // Sólo los ataques: lo que se compara contra el detector es cuándo empezó
  // cada nota, así que los note-off no se anotan (`useMidi` los avisa aparte y
  // acá no se pide).
  const { estado: estadoMidi, dispositivos } = useMidi({
    onNota: ({ midi, velocity, t }) => {
      if (!grabandoRef.current) return;
      // `t` viene en la escala de `performance.now()`, la misma con la que se
      // marcó el inicio. Por eso las dos cosas quedan en el mismo reloj sin
      // hacer nada: ésa es toda la razón de que esta página exista.
      const nota = { t: Math.round(t - inicioRef.current), midi, velocity };
      notasRef.current.push(nota);
      setNotas((prev) => [...prev, nota]);
    },
  });

  // ---- Grabar -------------------------------------------------------------

  const arrancar = useCallback(async () => {
    setError(null);
    setResultado(null);
    setNotas([]);
    notasRef.current = [];
    trozosRef.current = [];

    const ctx = getAudioContext();
    if (!ctx) {
      setError("Este navegador no tiene Web Audio.");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // Lo mismo que en el modo escuchar: están pensados para voz en
          // videollamadas y se comen justo las notas que se apagan. Una
          // grabación con eso prendido no representa lo que la app oye.
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
    } catch {
      setError("No me diste el micrófono (o no hay).");
      return;
    }

    try {
      await ctx.audioWorklet.addModule("/grabador-worklet.js");
    } catch {
      setError("No pude cargar el grabador de audio.");
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    const fuente = ctx.createMediaStreamSource(stream);
    const nodo = new AudioWorkletNode(ctx, "grabador");
    nodo.port.onmessage = (e: MessageEvent<Float32Array>) => {
      trozosRef.current.push(e.data);
    };
    // El worklet no va a los parlantes: el micrófono se escucharía a sí mismo.
    fuente.connect(nodo);

    // Un vúmetro aparte, para saber que está entrando algo antes de tocar
    // cuarenta segundos al pedo.
    const analizador = ctx.createAnalyser();
    analizador.fftSize = 1024;
    fuente.connect(analizador);
    const buf = new Float32Array(analizador.fftSize);
    let raf = 0;
    const mirar = () => {
      raf = requestAnimationFrame(mirar);
      analizador.getFloatTimeDomainData(buf);
      let suma = 0;
      for (const x of buf) suma += x * x;
      setNivel(Math.sqrt(suma / buf.length));
      setSegundos((performance.now() - inicioRef.current) / 1000);
    };

    inicioRef.current = performance.now();
    grabandoRef.current = true;
    setEstado("grabando");
    raf = requestAnimationFrame(mirar);

    limpiarRef.current = () => {
      cancelAnimationFrame(raf);
      grabandoRef.current = false;
      nodo.port.onmessage = null;
      fuente.disconnect();
      nodo.disconnect();
      analizador.disconnect();
      stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const parar = useCallback(() => {
    const ctx = getAudioContext();
    limpiarRef.current?.();
    limpiarRef.current = null;

    const muestras = unir(trozosRef.current);
    const sampleRate = ctx?.sampleRate ?? 48000;
    const duracion = muestras.length / sampleRate;
    const sello = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

    const wav = aWav(muestras, sampleRate);
    const json = new Blob(
      [
        JSON.stringify(
          {
            sampleRate,
            duracionMs: Math.round(duracion * 1000),
            // El instante cero es el mismo para las dos cosas: acá no hay nada
            // que alinear después.
            notas: notasRef.current,
          },
          null,
          1,
        ),
      ],
      { type: "application/json" },
    );

    setResultado({
      wav: URL.createObjectURL(wav),
      json: URL.createObjectURL(json),
      nombre: `piano-${sello}`,
      duracion,
      notas: notasRef.current.length,
    });
    setEstado("terminado");
  }, []);

  useEffect(() => () => limpiarRef.current?.(), []);

  // ---- UI -----------------------------------------------------------------

  const ultimas = notas.slice(-12);

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-3">
          {estado !== "grabando" ? (
            <button
              onClick={arrancar}
              className="rounded-full bg-brasa px-5 py-2.5 font-bold text-noche transition hover:brightness-110"
            >
              ● Grabar
            </button>
          ) : (
            <button
              onClick={parar}
              className="rounded-full bg-tiza px-5 py-2.5 font-bold text-noche transition hover:brightness-110"
            >
              ■ Parar
            </button>
          )}

          {estado === "grabando" && (
            <>
              <span className="font-mono text-2xl">
                {Math.floor(segundos / 60)}:
                {String(Math.floor(segundos % 60)).padStart(2, "0")}
              </span>
              <div className="h-2 w-32 overflow-hidden rounded-full bg-carta-2">
                <div
                  className={`h-full transition-[width] ${
                    nivel > 0.02 ? "bg-menta" : "bg-brasa"
                  }`}
                  style={{ width: `${Math.min(100, nivel * 400)}%` }}
                />
              </div>
              <span className="text-sm text-humo">
                {nivel > 0.02 ? "entra bien" : "muy bajito, acercá el micrófono"}
              </span>
            </>
          )}

          <span className="ml-auto font-mono text-sm text-humo">
            <Icono de="piano" /> {notas.length} notas
          </span>
        </div>

        {error && <p className="mt-3 text-sm text-brasa">{error}</p>}
      </div>

      {/* Estado del MIDI. Las instrucciones son las mismas que en los
          ejercicios: una sola copia, que además es la que se mantiene. */}
      <div className="card px-5 py-3 text-sm">
        <Midi
          estado={estadoMidi}
          dispositivos={dispositivos}
          pista="— se va a grabar lo que toques"
          invitacion="¿Tenés un teclado? Conectalo y la grabación sabe qué tocaste"
          cierre="Con el teclado conectado, la grabación guarda además qué nota tocaste y en qué milisegundo. Eso es lo que después le saca el supuesto a la calibración."
        />
        {estadoMidi !== "conectado" && estadoMidi !== "buscando" && (
          <p className="mt-2 text-humo">
            Sin MIDI se puede grabar igual, sólo el audio: alcanza para todo
            salvo para saber si el error fue del detector o de los dedos.
          </p>
        )}
      </div>

      {/* Lo que va entrando, para ver que el MIDI está vivo */}
      {estado === "grabando" && ultimas.length > 0 && (
        <div className="card p-5">
          <p className="mb-2 text-xs tracking-[0.2em] text-humo uppercase">
            Últimas notas
          </p>
          <p className="font-mono text-sm">
            {ultimas.map((n, i) => (
              <span key={i} className="mr-3 inline-block">
                <span className="text-sol">{noteNameWithOctave(n.midi)}</span>
                <span className="text-humo"> {(n.t / 1000).toFixed(1)}s</span>
              </span>
            ))}
          </p>
        </div>
      )}

      {resultado && (
        <div className="card p-5">
          <p className="font-display mb-1 text-xl font-bold">
            {resultado.duracion.toFixed(1)}s grabados
          </p>
          <p className="mb-4 text-sm text-humo">
            {resultado.notas > 0
              ? `Con ${resultado.notas} notas de MIDI: la verdad exacta de qué tocaste.`
              : "Sin MIDI: sirve igual, pero hay que suponer que tocaste el ejercicio perfecto."}
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={resultado.wav}
              download={`${resultado.nombre}.wav`}
              className="rounded-full bg-sol px-4 py-2 text-sm font-bold text-noche transition hover:brightness-110"
            >
              ↓ {resultado.nombre}.wav
            </a>
            {resultado.notas > 0 && (
              <a
                href={resultado.json}
                download={`${resultado.nombre}.json`}
                className="rounded-full bg-menta px-4 py-2 text-sm font-bold text-noche transition hover:brightness-110"
              >
                ↓ {resultado.nombre}.json
              </a>
            )}
          </div>
          <p className="mt-4 rounded-xl bg-noche-2 p-3 font-mono text-xs text-humo">
            npm run calibrar -- {resultado.nombre}.wav
            {resultado.notas > 0 && ` --midi ${resultado.nombre}.json`}
          </p>
        </div>
      )}
    </div>
  );
}
