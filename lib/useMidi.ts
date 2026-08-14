"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * El teclado MIDI como forma de entrada.
 *
 * La app te hace armar acordes clickeando un teclado dibujado, y eso está bien
 * cuando estás en el colectivo. Sentado al piano es absurdo: tenés el
 * instrumento adelante. Con esto, tocás el acorde de verdad y la app corrige.
 *
 * **Hay una sola conexión y vive a nivel módulo.** No es una optimización: la
 * API del browser tiene un solo `onmidimessage` por entrada, así que si cada
 * componente se suscribiera por su cuenta, el último en montarse pisaría a
 * todos los demás y sólo uno —cuál, depende del orden de los efectos— recibiría
 * las notas. Acá la entrada se escucha una vez y la nota se reparte desde acá.
 *
 * Y se pide una sola vez por el mismo motivo del otro lado: `requestMIDIAccess`
 * dispara un permiso del browser, y tres ejercicios en la misma página no
 * pueden mostrar tres carteles.
 */

export type EstadoMidi =
  | "sin-soporte"
  | "buscando"
  | "sin-teclado"
  | "conectado"
  | "denegado";

export interface NotaMidi {
  midi: number;
  velocity: number;
  /** En la escala de `performance.now()`, igual que el resto de la app. */
  t: number;
}

interface Oyente {
  /** La caja del ejercicio, para saber si es el que estás mirando. */
  caja?: RefObject<HTMLElement | null>;
  onNota?: (nota: NotaMidi) => void;
  onSoltar?: (midi: number) => void;
}

const oyentes = new Set<Oyente>();
/** Los componentes montados, para avisarles cuando cambia el estado. */
const mirones = new Set<() => void>();

let acceso: Promise<MIDIAccess> | null = null;
let estadoGlobal: EstadoMidi = "buscando";
let dispositivosGlobal: string[] = [];

function avisar(estado: EstadoMidi, dispositivos: string[]) {
  estadoGlobal = estado;
  dispositivosGlobal = dispositivos;
  mirones.forEach((f) => f());
}

/**
 * A cuál de los ejercicios le llega la nota.
 *
 * Al que estás mirando: entre los que están en pantalla, el que tiene el centro
 * más cerca del centro de la ventana. Sin esto, tocar el dictado le arma
 * también el acorde al enlace de más abajo, que después aparece con notas
 * puestas que nadie tocó ahí.
 */
function destinatario(): Oyente | null {
  if (oyentes.size <= 1) return oyentes.values().next().value ?? null;
  const centro = window.innerHeight / 2;
  let mejor: Oyente | null = null;
  let distancia = Infinity;
  for (const o of oyentes) {
    const el = o.caja?.current;
    // Sin caja no se puede ubicar: entra al reparto, pero pierde contra
    // cualquiera que sí esté visible.
    if (!el) {
      if (distancia === Infinity) mejor = o;
      continue;
    }
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) continue;
    const d = Math.abs((r.top + r.bottom) / 2 - centro);
    if (d < distancia) {
      distancia = d;
      mejor = o;
    }
  }
  return mejor;
}

function mensaje(e: MIDIMessageEvent) {
  if (!e.data) return;
  const [status, midi, velocity] = e.data;
  const tipo = status & 0xf0;
  const quien = destinatario();
  if (!quien) return;
  // Un note-on con velocity 0 es un note-off disfrazado: lo mandan muchos
  // teclados y si no se contempla, soltar una tecla cuenta como volver a
  // apretarla.
  if (tipo === 0x90 && velocity > 0) {
    quien.onNota?.({ midi, velocity, t: e.timeStamp || performance.now() });
  } else if (tipo === 0x80 || (tipo === 0x90 && velocity === 0)) {
    quien.onSoltar?.(midi);
  }
}

function escuchar(a: MIDIAccess) {
  const nombres: string[] = [];
  a.inputs.forEach((entrada) => {
    nombres.push(entrada.name ?? "teclado");
    entrada.onmidimessage = mensaje;
  });
  avisar(nombres.length ? "conectado" : "sin-teclado", nombres);
}

function pedirAcceso() {
  if (acceso) return;
  if (typeof navigator === "undefined" || !navigator.requestMIDIAccess) {
    avisar("sin-soporte", []);
    return;
  }
  acceso = navigator.requestMIDIAccess();
  acceso
    .then((a) => {
      escuchar(a);
      // Se conecta solo cuando el teclado aparece: emparejar por Bluetooth
      // lleva un rato y nadie quiere tener que recargar la página.
      a.onstatechange = () => escuchar(a);
    })
    .catch(() => avisar("denegado", []));
}

interface Opciones {
  /** Se llama cuando se aprieta una tecla. Va por ref: no hace falta memoizarla. */
  onNota?: (nota: NotaMidi) => void;
  /** Y cuando se suelta. Casi nadie la necesita. */
  onSoltar?: (midi: number) => void;
  /**
   * La caja del ejercicio. Hace falta cuando hay más de uno en la página, que
   * es cómo se decide a quién le toca la nota.
   */
  caja?: RefObject<HTMLElement | null>;
}

export function useMidi({ onNota, onSoltar, caja }: Opciones = {}) {
  const [, redibujar] = useState(0);
  const oyenteRef = useRef<Oyente>({});
  oyenteRef.current.onNota = onNota;
  oyenteRef.current.onSoltar = onSoltar;
  oyenteRef.current.caja = caja;

  useEffect(() => {
    const oyente = oyenteRef.current;
    oyentes.add(oyente);
    const avisarme = () => redibujar((n) => n + 1);
    mirones.add(avisarme);
    pedirAcceso();
    // El estado puede haber llegado antes de montarse este componente.
    avisarme();
    return () => {
      oyentes.delete(oyente);
      mirones.delete(avisarme);
    };
  }, []);

  return { estado: estadoGlobal, dispositivos: dispositivosGlobal };
}
