"use client";

import { useCallback, useRef, useState } from "react";
import FiguraSVG from "./FiguraSVG";
import { FIGURAS, duracionDe, type Figura } from "@/lib/ritmo";
import { playClick, wakeAudio, getAudioContext } from "@/lib/audio";

/**
 * El árbol: una redonda partiéndose en dos, en cuatro, en ocho.
 *
 * La tabla sola es una lista de nombres para memorizar; lo que se entiende es
 * *escuchar* que la fila de abajo entra justo el doble de veces en el mismo
 * tiempo. Por eso cada fila suena, y todas duran exactamente lo mismo.
 */

/** Hasta dónde se dibuja el árbol. De 16 para arriba no entra ni se lee. */
const EN_EL_ARBOL = 4;

export default function Figuras() {
  const [sonando, setSonando] = useState<string | null>(null);
  const [encendida, setEncendida] = useState<number>(-1);
  const timers = useRef<number[]>([]);

  const parar = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setSonando(null);
    setEncendida(-1);
  }, []);

  /**
   * Toca una fila entera: tantos golpes como veces entra esa figura en la
   * redonda, repartidos en los mismos segundos siempre. Ahí está el punto.
   */
  const tocar = useCallback(
    (figura: Figura) => {
      parar();
      wakeAudio();
      const ac = getAudioContext();
      if (!ac) return;

      const COMPAS = 2.4; // lo que dura una redonda entera, en segundos
      const golpes = figura.divide;
      const paso = COMPAS / golpes;
      const t0 = ac.currentTime + 0.06;

      setSonando(figura.id);
      for (let i = 0; i < golpes; i++) {
        playClick(i === 0 ? "fuerte" : "debil", t0 + i * paso);
        // La parte visual va por su lado: si se pierde un frame se atrasa la
        // imagen, nunca el sonido.
        timers.current.push(
          window.setTimeout(
            () => setEncendida(i),
            (t0 - ac.currentTime + i * paso) * 1000,
          ),
        );
      }
      timers.current.push(window.setTimeout(parar, (COMPAS + 0.3) * 1000));
    },
    [parar],
  );

  return (
    <div className="space-y-4">
      {/* El árbol */}
      <div className="card space-y-2 p-4 sm:p-5">
        {FIGURAS.slice(0, EN_EL_ARBOL).map((f) => {
          const activa = sonando === f.id;
          return (
            <button
              key={f.id}
              onClick={() => (activa ? parar() : tocar(f))}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition ${
                activa ? "bg-carta-2" : "hover:bg-carta-2/60"
              }`}
            >
              <span className="w-24 shrink-0 text-sm">
                <span className="block font-semibold">{f.nombre}</span>
                <span className="font-mono text-xs text-humo">
                  {f.divide} {f.divide === 1 ? "vez" : "veces"}
                </span>
              </span>
              <span className="flex min-w-0 flex-1 items-end justify-start gap-1 overflow-hidden">
                {Array.from({ length: f.divide }, (_, i) => (
                  <FiguraSVG
                    key={i}
                    figura={f}
                    alto={38}
                    color={
                      activa && encendida === i
                        ? "#ffcb3d"
                        : activa
                          ? "#8d8778"
                          : "#f7f4ee"
                    }
                  />
                ))}
              </span>
              <span className="shrink-0 text-xl">{activa ? "■" : "▶"}</span>
            </button>
          );
        })}
        <p className="px-3 pt-1 text-sm text-humo">
          Las cuatro filas duran <em>lo mismo</em>. Tocá una y después la de
          abajo: no se acelera la música, se parte más fino el mismo tiempo.
        </p>
      </div>

      {/* La tabla entera */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-borde/60 text-left text-xs tracking-wider text-humo uppercase">
              <th className="px-4 py-2 font-medium">Figura</th>
              <th className="px-2 py-2 font-medium">Se dibuja</th>
              <th className="px-2 py-2 text-right font-medium">
                Veces en la redonda
              </th>
              <th className="px-4 py-2 text-right font-medium">Dura</th>
            </tr>
          </thead>
          <tbody>
            {FIGURAS.map((f) => (
              <tr key={f.id} className="border-b border-borde/30 last:border-0">
                <td className="px-4 py-2 font-semibold">{f.nombre}</td>
                <td className="px-2 py-1">
                  <FiguraSVG figura={f} alto={34} />
                </td>
                <td className="px-2 py-2 text-right font-mono text-sol">
                  {f.divide}
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs text-humo">
                  {duracionDe(f) === 1
                    ? "1 redonda"
                    : `1/${f.divide} de redonda`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
