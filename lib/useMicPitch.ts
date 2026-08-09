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

/**
 * Cuántas lecturas seguidas sin nota hacen falta para dar la nota por soltada.
 *
 * Con una sola alcanzaba para desastre: en el medio de una nota sostenida hay
 * baches de un frame o dos (el sonido decae, pasa por debajo del umbral y
 * vuelve), y cada bache hacía que la misma nota contara de nuevo. Seis frames
 * son unos 100ms de silencio real, que ninguna nota tenida tiene en el medio.
 */
const SOLTAR_TRAS = 6;

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
      /** La *clase* de la última nota contada, no su octava. Ver abajo. */
      let ultimaClase: number | null = null;
      let candidata: number | null = null;
      let repeticiones = 0;
      let silencios = 0;
      let ultimoRefresco = 0;

      setEstado("escuchando");

      const loop = () => {
        if (cancelado) return;
        raf = requestAnimationFrame(loop);

        analyser.getFloatTimeDomainData(buf);
        const r = detectPitch(buf, ctx.sampleRate);

        if (!r) {
          candidata = null;
          repeticiones = 0;
          silencios++;
          // Recién con silencio sostenido se da la nota por soltada y se
          // permite que la misma vuelva a contar.
          if (silencios >= SOLTAR_TRAS) ultimaClase = null;
        } else {
          silencios = 0;
          // Se recuerda la clase de nota (do, re, mi…) y no la nota con su
          // octava, a propósito: el detector se equivoca de octava seguido —
          // una nota real parpadea entre La3 y La4 varias veces mientras
          // suena— y si se recordara la octava, cada parpadeo contaría como
          // una nota nueva. Con la clase, el parpadeo es invisible. Además es
          // lo mismo que compara el ejercicio, así que no se pierde nada.
          const clase = ((r.midi % 12) + 12) % 12;
          if (r.midi === candidata) {
            repeticiones++;
            if (repeticiones === CONFIRMACIONES && clase !== ultimaClase) {
              ultimaClase = clase;
              onNotaRef.current?.(r.midi, r);
            }
          } else {
            candidata = r.midi;
            repeticiones = 1;
          }
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
