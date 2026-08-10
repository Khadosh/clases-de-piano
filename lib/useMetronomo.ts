"use client";

import { useEffect, useRef } from "react";
import { getAudioContext } from "./audio";

/**
 * El metrónomo del ejercicio.
 *
 * Antes esto era un `setInterval` que, cada vez que saltaba, tocaba la nota
 * "ahora" y de paso hacía re-renderizar un teclado SVG entero. O sea que el
 * jitter del event loop y el tiempo de render de React se iban derecho al
 * audio: el pulso tambaleaba, y peor cuanto más rápido.
 *
 * Ahora hay dos relojes, que es la forma canónica de hacer esto:
 *
 * - Un timer impreciso que cada 25ms se pregunta "¿qué notas caen en los
 *   próximos 120ms?" y las **agenda en el reloj del audio**, que es exacto y
 *   corre en otro hilo. Que este timer llegue tarde no mueve el pulso; sólo
 *   hay que despertarse más seguido de lo que dura la ventana.
 * - Un requestAnimationFrame que va destapando la parte visual recién cuando
 *   el reloj del audio llega a cada nota. Si un frame se pierde, la imagen se
 *   atrasa un poquito; el sonido no.
 */

/** Cada cuánto se despierta el timer a mirar qué viene. */
const TICK_MS = 25;
/** Cuánto para adelante se agenda. Tiene que ser bastante más que TICK_MS. */
const VENTANA = 0.12;

interface Opciones {
  activo: boolean;
  bpm: number;
  total: number;
  /** Desde qué paso arrancar cuando se aprieta play. */
  desde: () => number;
  /** Agendar el sonido del paso `indice` para el instante `cuando`. */
  agendar: (indice: number, cuando: number) => void;
  /** Mover la UI al paso `indice`. Se llama cuando el audio llega ahí. */
  mostrar: (indice: number) => void;
}

export function useMetronomo({
  activo,
  bpm,
  total,
  desde,
  agendar,
  mostrar,
}: Opciones) {
  // Todo por ref: si el efecto dependiera del bpm, mover el slider cortaría y
  // rearmaría el pulso en vez de acelerarlo.
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;
  const totalRef = useRef(total);
  totalRef.current = total;
  const desdeRef = useRef(desde);
  desdeRef.current = desde;
  const agendarRef = useRef(agendar);
  agendarRef.current = agendar;
  const mostrarRef = useRef(mostrar);
  mostrarRef.current = mostrar;

  useEffect(() => {
    if (!activo) return;
    const ac = getAudioContext();
    if (!ac) return;

    let indice = desdeRef.current();
    // Un respiro antes de la primera nota, para que la ventana no arranque en
    // rojo y la primera caiga a tiempo como todas.
    let proxima = ac.currentTime + 0.06;
    const pendientes: { indice: number; cuando: number }[] = [];

    const mirarAdelante = () => {
      while (proxima < ac.currentTime + VENTANA) {
        agendarRef.current(indice, proxima);
        pendientes.push({ indice, cuando: proxima });
        indice = (indice + 1) % totalRef.current;
        proxima += 60 / bpmRef.current;
      }
    };
    mirarAdelante();
    const timer = setInterval(mirarAdelante, TICK_MS);

    let raf = 0;
    const dibujar = () => {
      raf = requestAnimationFrame(dibujar);
      const ahora = ac.currentTime;
      while (pendientes.length && pendientes[0].cuando <= ahora) {
        mostrarRef.current(pendientes.shift()!.indice);
      }
    };
    raf = requestAnimationFrame(dibujar);

    return () => {
      clearInterval(timer);
      cancelAnimationFrame(raf);
    };
  }, [activo]);
}
