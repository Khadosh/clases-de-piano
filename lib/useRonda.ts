"use client";

import { useCallback, useState } from "react";

/**
 * Lo que todo dictado lleva de ronda en ronda: cuántas van, cuántas
 * salieron limpias, la racha y su mejor, y cuántas pistas se pidieron en
 * ésta.
 *
 * Existe porque el dictado de acordes y el de voicing tenían las mismas cien
 * líneas —seis estados, el marcador de arriba, la cuenta de pistas— copiadas
 * con dos diferencias que no eran decisiones. Es "cuatro pianos apenas
 * distintos" otra vez, en otra capa. Lo que sí es de cada dictado (qué se
 * pide, cómo se corrige, qué se anota en la memoria) queda afuera.
 *
 * El puntaje se pierde al recargar, a propósito: es un juguete de práctica,
 * no un boletín. Lo que sobrevive es la memoria de qué preguntar, y eso lo
 * anota cada dictado por su cuenta.
 */
export interface Ronda {
  /** El número de ronda, empezando en 1. */
  n: number;
  /** Cuántas pistas se pidieron en esta ronda. */
  pistas: number;
  racha: number;
  mejorRacha: number;
  limpias: number;
  rondas: number;
  /** Arranca una ronda más: cuenta y borra las pistas. */
  arrancar: () => void;
  /** Cierra la ronda: limpia es sin pistas y sin errores. */
  cerrar: (limpia: boolean) => void;
  pedirPista: () => void;
}

export function useRonda(): Ronda {
  const [n, setN] = useState(0);
  const [pistas, setPistas] = useState(0);
  const [racha, setRacha] = useState(0);
  const [mejorRacha, setMejorRacha] = useState(0);
  const [puntaje, setPuntaje] = useState({ limpias: 0, rondas: 0 });

  const arrancar = useCallback(() => {
    setPistas(0);
    setN((x) => x + 1);
    setPuntaje((p) => ({ ...p, rondas: p.rondas + 1 }));
  }, []);

  const cerrar = useCallback((limpia: boolean) => {
    if (!limpia) {
      setRacha(0);
      return;
    }
    setPuntaje((p) => ({ ...p, limpias: p.limpias + 1 }));
    setRacha((r) => {
      const siguiente = r + 1;
      setMejorRacha((m) => Math.max(m, siguiente));
      return siguiente;
    });
  }, []);

  const pedirPista = useCallback(() => setPistas((x) => x + 1), []);

  return { n, pistas, racha, mejorRacha, limpias: puntaje.limpias, rondas: puntaje.rondas, arrancar, cerrar, pedirPista };
}
