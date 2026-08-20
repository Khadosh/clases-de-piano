"use client";

import { useRef, useState } from "react";
import {
  FUNCION_DE_GRADO,
  FUNCIONES,
  TONALIDAD_MAYOR,
  cadenciaAlFinal,
  rachaDeFuncion,
  raizDelGrado,
  type Funcion,
} from "@/lib/grados";
import { chordPitches, chordSymbol, qualityById } from "@/lib/music";
import { playChord, wakeAudio } from "@/lib/audio";

/**
 * La tarea 1 de la clase 3, jugable: inventar secuencias de acordes en base a
 * la armonía funcional.
 *
 * Se arma grado por grado, cada acorde suena al agregarlo, y las funciones van
 * pintadas de colores para que se *vea* el viaje: verde la casa, amarillo los
 * intermedios, rojo la tensión. La regla de oro del profe corre sola — nunca
 * cuatro funciones iguales seguidas — y avisa justo cuando aparece la cuarta,
 * sin borrar nada: la regla es del profe, la secuencia es tuya. Si el final
 * forma una de las tres cadencias de la clase, te lo dice con el nombre.
 */

const BASE = 48; // Do3

const COLOR: Record<Funcion, { chip: string; suave: string }> = {
  reposo: { chip: "bg-menta text-noche", suave: "bg-menta/15 text-menta" },
  subdominante: { chip: "bg-sol text-noche", suave: "bg-sol/15 text-sol" },
  dominante: { chip: "bg-brasa text-noche", suave: "bg-brasa/15 text-brasa" },
};

const NOMBRE_CADENCIA = {
  autentica: "auténtica (V → I)",
  rota: "rota o de engaño (V → VIm)",
  plagal: "plagal (V → IV → I)",
} as const;

export default function InventorDeSecuencias() {
  const [secuencia, setSecuencia] = useState<number[]>([]);
  const [cuatriadas, setCuatriadas] = useState(false);
  const [sonando, setSonando] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const acordeDe = (g: number) => {
    const grado = TONALIDAD_MAYOR[g];
    const quality = qualityById(cuatriadas ? grado.cuatriada : grado.triada)!;
    return { grado, quality, root: raizDelGrado(0, g) };
  };

  const pararEscucha = () => {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
    setSonando(null);
  };

  const agregar = (g: number) => {
    pararEscucha();
    wakeAudio();
    const { quality, root } = acordeDe(g);
    playChord(chordPitches(BASE + root, quality), 1.2);
    setSecuencia((s) => [...s, g]);
  };

  const escuchar = () => {
    pararEscucha();
    wakeAudio();
    secuencia.forEach((g, n) => {
      timers.current.push(
        setTimeout(() => {
          const { quality, root } = acordeDe(g);
          playChord(chordPitches(BASE + root, quality), 1.1);
          setSonando(n);
        }, n * 950),
      );
    });
    timers.current.push(
      setTimeout(() => setSonando(null), secuencia.length * 950 + 300),
    );
  };

  const racha = rachaDeFuncion(secuencia);
  const cadencia = cadenciaAlFinal(secuencia);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-borde/60 px-4 py-3">
        <span className="text-xs tracking-[0.2em] text-humo uppercase">
          En Do mayor
        </span>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-humo">
          <input
            type="checkbox"
            checked={cuatriadas}
            onChange={(e) => setCuatriadas(e.target.checked)}
            className="accent-uva"
          />
          Con séptimas
        </label>
      </div>

      <div className="p-5">
        {/* Los siete grados para elegir, pintados por función */}
        <p className="mb-2 text-center text-sm text-humo">
          Tocá un grado para sumarlo a tu secuencia.
        </p>
        <div className="mb-1 flex flex-wrap justify-center gap-1.5">
          {TONALIDAD_MAYOR.map((grado, g) => {
            const f = FUNCION_DE_GRADO[g];
            const { quality, root } = acordeDe(g);
            return (
              <button
                key={g}
                onClick={() => agregar(g)}
                className={`rounded-xl px-3 py-2 text-center transition hover:brightness-110 ${COLOR[f].chip}`}
              >
                <span className="block font-mono text-sm font-bold">{grado.cifra}</span>
                <span className="block text-[11px] opacity-80">
                  {chordSymbol(root, quality)}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mb-5 text-center text-[11px] text-humo">
          <span className="text-menta">■ reposo</span> ·{" "}
          <span className="text-sol">■ media tensión</span> ·{" "}
          <span className="text-brasa">■ tensión</span>
        </p>

        {/* La secuencia armada */}
        {secuencia.length > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {secuencia.map((g, n) => {
              const f = FUNCION_DE_GRADO[g];
              const { quality, root } = acordeDe(g);
              return (
                <span
                  key={n}
                  className={`rounded-xl px-3 py-1.5 font-mono text-sm font-bold ${
                    sonando === n ? COLOR[f].chip : COLOR[f].suave
                  }`}
                >
                  {TONALIDAD_MAYOR[g].cifra}
                  <span className="ml-1.5 text-[11px] opacity-75">
                    {chordSymbol(root, quality)}
                  </span>
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-sm text-humo/70">
            La secuencia arranca vacía. La casa (el I) es un buen primer acorde
            — y un mejor último.
          </p>
        )}

        {/* La regla de oro y las cadencias, mirando lo que hay */}
        {racha >= 4 && (
          <p className="mt-4 rounded-xl bg-brasa/15 px-4 py-2.5 text-center text-sm text-brasa">
            Cuatro funciones iguales seguidas: la regla de oro pide variar entre
            las tres familias. (Tu secuencia, tus reglas — pero avisado estás.)
          </p>
        )}
        {racha === 3 && secuencia.length >= 3 && (
          <p className="mt-4 text-center text-xs text-humo">
            Van tres de la misma función: la regla de oro aguanta justo hasta acá.
          </p>
        )}
        {cadencia && (
          <p className="mt-4 rounded-xl bg-menta/15 px-4 py-2.5 text-center text-sm text-menta">
            Cerraste con la cadencia {NOMBRE_CADENCIA[cadencia]} ✓
          </p>
        )}

        {/* Controles */}
        {secuencia.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={escuchar}
              className="rounded-full bg-menta px-5 py-2 text-sm font-bold text-noche transition hover:brightness-110"
            >
              ▶ Escucharla
            </button>
            <button
              onClick={() => {
                pararEscucha();
                setSecuencia((s) => s.slice(0, -1));
              }}
              className="rounded-full bg-carta-2 px-4 py-2 text-sm font-semibold text-humo transition hover:text-tiza"
            >
              ↩ Sacar la última
            </button>
            <button
              onClick={() => {
                pararEscucha();
                setSecuencia([]);
              }}
              className="rounded-full bg-carta-2 px-4 py-2 text-sm font-semibold text-humo transition hover:text-tiza"
            >
              Borrar todo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
