"use client";

import { useCallback, useRef, useState } from "react";
import { useMidi } from "./useMidi";
import { playNote, wakeAudio } from "./audio";

/**
 * Las notas que vas apretando para armar un acorde.
 *
 * Existe porque el mismo puñado de reglas estaba copiado en cada ejercicio que
 * pide armar algo —el laboratorio, el enlace, el examen— y eran cuatro pianos
 * apenas distintos entre sí. Las reglas son las mismas en todos, y son éstas:
 *
 * - **La pantalla alterna, el piano suma.** Clickear una tecla que ya está la
 *   saca, porque en la pantalla no hay otra forma de deshacer. En el piano de
 *   verdad apretar dos veces la misma tecla mientras armás es normal, así que
 *   si la segunda la sacara no habría manera de tocar nada.
 * - **Soltar no borra.** El veredicto tiene que seguir en pantalla después de
 *   que levantás la mano.
 * - **La tecla de la pantalla suena, la del piano no.** El piano ya sonó.
 */

export interface Armado {
  notas: number[];
  /** La caja del ejercicio: es con esto que el MIDI sabe a quién mandarle la nota. */
  caja: React.RefObject<HTMLDivElement | null>;
  midi: ReturnType<typeof useMidi>;
  /** Una tecla de la pantalla. */
  alternar: (p: number) => void;
  quitar: (p: number) => void;
  borrar: () => void;
}

export function useArmado({
  /** Mientras esté en `false` no entra nada: el ejercicio está resuelto o en pausa. */
  activo = true,
}: { activo?: boolean } = {}): Armado {
  const [notas, setNotas] = useState<number[]>([]);
  const caja = useRef<HTMLDivElement>(null);

  // Van por ref para que las funciones de abajo no cambien en cada render, que
  // es lo que las hace servibles como dependencias.
  const activoRef = useRef(activo);
  activoRef.current = activo;
  const notasRef = useRef(notas);
  notasRef.current = notas;

  const midi = useMidi({
    caja,
    onNota: ({ midi }) => {
      if (!activoRef.current) return;
      wakeAudio();
      setNotas((prev) =>
        prev.includes(midi) ? prev : [...prev, midi].sort((a, b) => a - b),
      );
    },
  });

  const alternar = useCallback((p: number) => {
    if (!activoRef.current) return;
    wakeAudio();
    // El sonido va afuera del updater: adentro se dispara dos veces en modo
    // estricto y la nota suena doble. Y sólo al poner, no al sacar.
    if (!notasRef.current.includes(p)) playNote(p, 0.9);
    setNotas((prev) =>
      prev.includes(p)
        ? prev.filter((x) => x !== p)
        : [...prev, p].sort((a, b) => a - b),
    );
  }, []);

  const quitar = useCallback(
    (p: number) => setNotas((prev) => prev.filter((x) => x !== p)),
    [],
  );

  const borrar = useCallback(() => setNotas([]), []);

  return { notas, caja, midi, alternar, quitar, borrar };
}
