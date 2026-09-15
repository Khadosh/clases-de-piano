"use client";

import { getAudioContext, playClick } from "./audio";
import type { Compas } from "./ritmo";

/**
 * El metrónomo de la partitura: un reloj propio, que no es de "escucharla"
 * ni de "seguirte" sino de los dos.
 *
 * Antes los clicks vivían adentro del reproductor, mezclados con las notas
 * en la misma lista de eventos. Sonaban bien ahí, y en ningún otro lado: en
 * el modo de seguirte no había reloj, y prender el chip con la pieza sonando
 * no hacía nada hasta la pasada siguiente. Desde afuera eso se lee como "el
 * metrónomo no anda", y es la lectura correcta.
 *
 * Ahora es un corredor aparte, con los dos relojes de siempre: un timer
 * impreciso que agenda los clicks contra el reloj del audio, y un
 * `requestAnimationFrame` que destapa la parte visual cuando el audio llega a
 * cada pulso. Quien lo arranca le dice dónde cae el primer pulso del compás
 * de arranque (`arranque`) y si hay un compás de cuenta antes.
 *
 * Los dos modos lo usan distinto y por eso `segundosPorRedonda` es una
 * función: escuchando la pieza, el tempo queda clavado al de la pasada para
 * que el click y las notas no se separen; siguiéndote no hay pasada, el
 * reloj es el único tempo que hay, y el slider lo mueve en vivo.
 */
export interface Pulso {
  /** Durante la cuenta previa: 1, 2, 3, 4. Después, `null`. */
  cuenta: number | null;
  /** El pulso dentro del compás, de 0 a numerador - 1. */
  pulso: number;
}

interface Opciones {
  compas: Compas;
  /** El instante del reloj del audio en que cae el primer pulso del compás de arranque. */
  arranque: number;
  segundosPorRedonda: () => number;
  /** Un compás de cuenta antes de `arranque`. */
  cuenta: boolean;
  /** Se llama cuando el audio llega a cada pulso. */
  mostrar: (p: Pulso) => void;
}

const TICK_MS = 25;
const VENTANA = 0.15;

/** Arranca el reloj y devuelve cómo pararlo. */
export function arrancarReloj({
  compas,
  arranque,
  segundosPorRedonda,
  cuenta,
  mostrar,
}: Opciones): () => void {
  const ac = getAudioContext();
  if (!ac) return () => {};

  // El click va en la figura del denominador: en 3/4 son negras, en 6/8
  // corcheas. Es lo que marca el reproductor desde siempre.
  const tiempo = 1 / compas.denominador;
  const paso = () => tiempo * segundosPorRedonda();

  // `i` cuenta pulsos desde el arranque; negativos son la cuenta previa. Si
  // el arranque ya pasó —el chip se prendió con la pieza sonando— se salta
  // hasta el próximo pulso que todavía no cayó, así el click se suma a la
  // grilla de la pasada en vez de arrancar una grilla propia.
  let i = cuenta ? -compas.numerador : 0;
  let proxima = arranque + i * paso();
  while (proxima < ac.currentTime + 0.05) {
    i++;
    proxima += paso();
  }

  const pendientes: { cuando: number; pulso: Pulso }[] = [];
  const mirarAdelante = () => {
    while (proxima < ac.currentTime + VENTANA) {
      const enElCompas = ((i % compas.numerador) + compas.numerador) % compas.numerador;
      const enCuenta = i < 0;
      // La cuenta previa se marca más fuerte que el pulso de después: es lo
      // único que suena en ese compás y tiene que contarse solo.
      playClick(enElCompas === 0 ? "fuerte" : enCuenta ? "medio" : "debil", proxima);
      pendientes.push({
        cuando: proxima,
        pulso: { cuenta: enCuenta ? enElCompas + 1 : null, pulso: enElCompas },
      });
      i++;
      proxima += paso();
    }
  };
  mirarAdelante();
  const timer = setInterval(mirarAdelante, TICK_MS);

  let raf = 0;
  const dibujar = () => {
    raf = requestAnimationFrame(dibujar);
    const ahora = ac.currentTime;
    let ultimo: Pulso | null = null;
    while (pendientes.length && pendientes[0].cuando <= ahora) {
      ultimo = pendientes.shift()!.pulso;
    }
    if (ultimo) mostrar(ultimo);
  };
  raf = requestAnimationFrame(dibujar);

  return () => {
    clearInterval(timer);
    cancelAnimationFrame(raf);
  };
}
