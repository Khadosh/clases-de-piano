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
 * Cuánto tiene que durar una nota para creerle, en milisegundos.
 *
 * Es *la* regla del micrófono, y es de Joaquín: si en "la si la" el si duró
 * veinte milisegundos, ese si no existió. Una nota de piano de verdad dura
 * cientos de milisegundos; lo que dura treinta es el golpe del ataque, una
 * tecla vecina rozada, o el detector enganchando un armónico por un instante.
 *
 * Antes esto se contaba en lecturas seguidas ("tres iguales y va"), y no
 * alcanzaba, por un motivo que no se ve a simple vista: la ventana del
 * analizador son 2048 muestras (~46ms) y avanzamos de a un frame (~17ms), así
 * que **las ventanas se pisan casi enteras**. Un blip de 20ms cae adentro de
 * tres o cuatro ventanas consecutivas y junta sus tres confirmaciones solo.
 * Tres lecturas nunca fueron 50ms de evidencia: eran el mismo instante mirado
 * tres veces. Por eso ahora se mide el tiempo del tramo y no la cantidad de
 * lecturas.
 *
 * Medido contra una grabación real del ejercicio (`npm run calibrar`): las
 * notas inventadas se van a cero a los 50ms y se quedan en cero por más que se
 * suba. Subir igual tiene un costo —se empiezan a comer notas de verdad— y una
 * nota comida sale más cara que una inventada ahora que el ejercicio se
 * re-sincroniza: la basura la absorbe la ventana, el silencio no. Por eso 50 y
 * no 100, que fue la primera respuesta y era peor.
 */
const DURACION_MINIMA_MS = 50;

/**
 * Y además, al menos dos lecturas. Es para el caso raro de un browser que
 * corra el loop muy lento: con una sola lectura, "duró 100ms" no significa
 * nada porque nadie miró el medio.
 */
const LECTURAS_MINIMAS = 2;

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
      /** El tramo que viene sonando: una corrida de lecturas de la misma clase. */
      let tramo: {
        clase: number;
        desde: number;
        lecturas: number;
        /** La lectura más limpia del tramo, que es la que se avisa. */
        mejor: PitchReading;
        avisado: boolean;
      } | null = null;
      let silencios = 0;
      let ultimoRefresco = 0;

      setEstado("escuchando");

      const loop = () => {
        if (cancelado) return;
        raf = requestAnimationFrame(loop);

        analyser.getFloatTimeDomainData(buf);
        const r = detectPitch(buf, ctx.sampleRate);

        const ahora = performance.now();

        if (!r) {
          silencios++;
          // Un bache de uno o dos frames en el medio de una nota tenida no
          // corta el tramo: el sonido decae, pasa por debajo del umbral y
          // vuelve. Recién con silencio sostenido se da la nota por soltada y
          // se permite que la misma vuelva a contar.
          if (silencios >= SOLTAR_TRAS) {
            ultimaClase = null;
            tramo = null;
          }
        } else {
          silencios = 0;
          // Se agrupa por *clase* de nota (do, re, mi…) y no por nota con su
          // octava, a propósito: el detector se equivoca de octava seguido —
          // una nota real parpadea entre La3 y La4 varias veces mientras
          // suena— y si se mirara la octava, cada parpadeo cortaría el tramo.
          // Con la clase, el parpadeo es invisible. Además es lo mismo que
          // compara el ejercicio, así que no se pierde nada.
          const clase = ((r.midi % 12) + 12) % 12;

          if (tramo?.clase !== clase) {
            tramo = {
              clase,
              desde: ahora,
              lecturas: 1,
              mejor: r,
              avisado: false,
            };
          } else {
            tramo.lecturas++;
            if (r.clarity > tramo.mejor.clarity) tramo.mejor = r;
          }

          // Se avisa recién cuando el tramo duró lo suficiente, no cuando
          // apareció. Un tramo corto muere sin avisar nada y sin tocar
          // `ultimaClase`, y por eso "la si la" con el si cortito se colapsa
          // solo: el si no llega a avisar, y el la que viene después es la
          // misma clase que la última avisada, así que tampoco cuenta.
          if (
            !tramo.avisado &&
            tramo.lecturas >= LECTURAS_MINIMAS &&
            ahora - tramo.desde >= DURACION_MINIMA_MS
          ) {
            tramo.avisado = true;
            if (clase !== ultimaClase) {
              ultimaClase = clase;
              onNotaRef.current?.(tramo.mejor.midi, tramo.mejor);
            }
          }
        }

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
