"use client";

import { useEffect, useRef, useState } from "react";
import { detectPitch, type PitchReading } from "./pitch";
import { getAudioContext } from "./audio";

export type EstadoMic =
  | "apagado"
  | "pidiendo"
  | "escuchando"
  | "denegado"
  | "sin-soporte"
  | "error";

/**
 * Cuántas lecturas seguidas iguales hacen falta para dar una nota por buena.
 * Con dos se colaban errores fantasma: el golpe inicial de cada nota es ruido
 * de banda ancha y por un frame se lee cualquier cosa. Tres (unos 50ms) filtra
 * el ataque sin agregar latencia perceptible.
 */
const CONFIRMACIONES = 3;

/** Cada cuánto se refresca lo que se muestra en pantalla (ms). */
const REFRESCO_UI = 70;

interface Opciones {
  activo: boolean;
  /**
   * Se llama una vez por nota tocada, no una vez por frame. Va en un ref
   * adentro, así que no hace falta memoizarla.
   */
  onNota?: (midi: number, lectura: PitchReading) => void;
}

/**
 * Escucha el micrófono y avisa qué nota se está tocando.
 *
 * La detección corre a ~60 por segundo, pero el estado de React se actualiza
 * mucho más lento a propósito: el que consume esto dibuja un teclado entero en
 * SVG y no tiene sentido re-renderizarlo sesenta veces por segundo. Las notas,
 * en cambio, se avisan por callback en el momento exacto en que se detectan.
 */
export function useMicPitch({ activo, onNota }: Opciones) {
  const [estado, setEstado] = useState<EstadoMic>("apagado");
  const [lectura, setLectura] = useState<PitchReading | null>(null);
  const onNotaRef = useRef(onNota);
  onNotaRef.current = onNota;

  useEffect(() => {
    if (!activo) {
      setEstado("apagado");
      setLectura(null);
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setEstado("sin-soporte");
      return;
    }

    let cancelado = false;
    let stream: MediaStream | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let raf = 0;

    setEstado("pidiendo");

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            // Todo esto está pensado para voz en videollamadas y acá hace daño:
            // el supresor de ruido se come las notas que se apagan y el control
            // de ganancia automático bombea el volumen entre nota y nota.
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
      } catch (e) {
        if (cancelado) return;
        const nombre = e instanceof DOMException ? e.name : "";
        setEstado(
          nombre === "NotAllowedError" || nombre === "SecurityError"
            ? "denegado"
            : "error",
        );
        return;
      }

      if (cancelado) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const ctx = getAudioContext();
      if (!ctx) {
        setEstado("error");
        return;
      }

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      // Ojo: el analyser NO se conecta a destination. Si se conectara, el
      // micrófono saldría por los parlantes y se escucharía a sí mismo.

      const buf = new Float32Array(analyser.fftSize);
      let ultimaConfirmada: number | null = null;
      let candidata: number | null = null;
      let repeticiones = 0;
      let ultimoRefresco = 0;

      setEstado("escuchando");

      const loop = () => {
        if (cancelado) return;
        raf = requestAnimationFrame(loop);

        analyser.getFloatTimeDomainData(buf);
        const r = detectPitch(buf, ctx.sampleRate);

        if (!r) {
          // Silencio: se suelta la nota, así la misma tecla puede volver a
          // contar cuando se la toca de nuevo.
          candidata = null;
          repeticiones = 0;
          ultimaConfirmada = null;
        } else if (r.midi === candidata) {
          repeticiones++;
          if (repeticiones === CONFIRMACIONES && r.midi !== ultimaConfirmada) {
            ultimaConfirmada = r.midi;
            onNotaRef.current?.(r.midi, r);
          }
        } else {
          candidata = r.midi;
          repeticiones = 1;
        }

        const ahora = performance.now();
        if (ahora - ultimoRefresco > REFRESCO_UI) {
          ultimoRefresco = ahora;
          setLectura(r);
        }
      };
      raf = requestAnimationFrame(loop);
    })();

    return () => {
      cancelado = true;
      cancelAnimationFrame(raf);
      source?.disconnect();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [activo]);

  return { estado, lectura };
}
