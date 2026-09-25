"use client";

import { useState } from "react";
import Icono from "./Icono";
import { ArmaduraSola } from "./Pentagrama";
import { escribirNota, mod12 } from "@/lib/music";
import {
  TONALIDADES,
  nombreDeTono,
  notasDeTono,
  teclasDeTono,
  type Modo,
  type Tonalidad,
} from "@/lib/tonalidades";
import { playNote, wakeAudio } from "@/lib/audio";

/**
 * El círculo de quintas: las quince tonalidades puestas en rueda.
 *
 * Las posiciones no están escritas — **son la armadura misma**. Una vuelta de
 * reloj son doce quintas y doce semitonos, así que el lugar de cada tonalidad
 * es su número de alteraciones módulo 12: por eso Fa♯ (seis sostenidos) y
 * Sol♭ (seis bemoles) caen en la misma casilla, que es exactamente lo que el
 * círculo viene a mostrar — que yendo para un lado o para el otro se llega al
 * mismo lugar con otros nombres.
 *
 * Afuera las mayores, adentro sus relativas menores. Están en el mismo radio
 * porque son la misma armadura: el círculo tiene doce casilleros y cada uno
 * sirve para dos tonalidades.
 */

const POSICIONES = Array.from({ length: 12 }, (_, i) =>
  TONALIDADES.filter((t) => mod12(t.armadura) === i),
);

export default function CirculoDeQuintas() {
  const [elegida, setElegida] = useState<Tonalidad>(TONALIDADES.find((t) => t.armadura === 0)!);
  const [modo, setModo] = useState<Modo>("mayor");

  const tono = modo === "mayor" ? elegida.mayor : elegida.menor;

  const elegir = (t: Tonalidad, m: Modo) => {
    setElegida(t);
    setModo(m);
    wakeAudio();
    const tocar = m === "mayor" ? t.mayor : t.menor;
    teclasDeTono(tocar, 48).forEach((p, i) => setTimeout(() => playNote(p, 0.35), i * 190));
  };

  return (
    <div className="card overflow-hidden">
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        {/* La rueda */}
        <div className="relative mx-auto aspect-square w-full max-w-md">
          <div className="absolute inset-[13%] rounded-full border border-borde/70" />
          <div className="absolute inset-[30%] rounded-full border border-borde/50" />

          {POSICIONES.map((enLaCasilla, i) => {
            // Do arriba y para la derecha los sostenidos, que es como se dibuja
            // siempre: cada paso horario suma una quinta y un sostenido.
            const angulo = (i / 12) * 2 * Math.PI - Math.PI / 2;
            // Redondeado a propósito: el servidor y el cliente serializan los
            // decimales de un porcentaje distinto (28.5% contra
            // 28.499999999999982%) y React lo canta como diferencia de
            // hidratación. Tres decimales son una milésima de la rueda.
            const punto = (r: number) => ({
              left: `${(50 + r * Math.cos(angulo)).toFixed(3)}%`,
              top: `${(50 + r * Math.sin(angulo)).toFixed(3)}%`,
            });
            return (
              <div key={i}>
                <div
                  className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
                  style={punto(43)}
                >
                  {enLaCasilla.map((t) => (
                    <Casilla
                      key={t.armadura}
                      texto={nombreDeTono(t.mayor, "en")}
                      activa={elegida === t && modo === "mayor"}
                      onClick={() => elegir(t, "mayor")}
                    />
                  ))}
                </div>
                <div
                  className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
                  style={punto(26)}
                >
                  {enLaCasilla.map((t) => (
                    <Casilla
                      key={t.armadura}
                      texto={nombreDeTono(t.menor, "en")}
                      menor
                      activa={elegida === t && modo === "menor"}
                      onClick={() => elegir(t, "menor")}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* El centro: qué está elegido */}
          <div className="absolute inset-[32%] flex flex-col items-center justify-center text-center">
            <p className="font-display text-2xl leading-none font-black text-sol">
              {escribirNota(tono.tonica)}
            </p>
            <p className="text-[11px] text-humo">{modo}</p>
            <p className="mt-1 font-mono text-[11px] text-humo">
              {elegida.armadura === 0
                ? "sin signos"
                : `${Math.abs(elegida.armadura)} ${elegida.armadura > 0 ? "♯" : "♭"}`}
            </p>
          </div>
        </div>

        {/* La ficha de la elegida */}
        <div>
          <div className="mb-3 rounded-2xl bg-noche-2 p-3">
            <ArmaduraSola armadura={elegida.armadura} alto={1.1} />
          </div>
          <p className="font-display text-2xl font-black">
            {escribirNota(tono.tonica)} {modo}
          </p>
          <p className="mb-3 font-mono text-sm text-humo">
            {notasDeTono(tono).map((n) => escribirNota(n)).join(" · ")}
          </p>
          <p className="text-sm text-humo">
            Relativa {modo === "mayor" ? "menor" : "mayor"}:{" "}
            <button
              onClick={() => elegir(elegida, modo === "mayor" ? "menor" : "mayor")}
              className="font-bold text-tiza underline decoration-dotted underline-offset-4"
            >
              {escribirNota((modo === "mayor" ? elegida.menor : elegida.mayor).tonica)}{" "}
              {modo === "mayor" ? "menor" : "mayor"}
            </button>
          </p>
          <button
            onClick={() => elegir(elegida, modo)}
            className="mt-3 rounded-full bg-menta px-4 py-2 text-sm font-bold text-noche transition hover:brightness-110"
          >
            <Icono de="parlante" /> Escucharla
          </button>
        </div>
      </div>

      <div className="border-t border-borde/60 p-5 text-sm text-humo">
        <p>
          Cada paso hacia la derecha es <strong className="text-tiza">una quinta
          arriba y un sostenido más</strong>; hacia la izquierda, una quinta
          abajo y un bemol más. Abajo del todo los dos caminos se cruzan: ahí la
          misma tecla tiene dos nombres —Fa♯ y Sol♭ son el mismo dedo con seis
          signos de cada lado— y cuál se escribe lo decide qué se lee más fácil.
        </p>
        <p className="mt-2">
          El anillo de adentro son las relativas menores, que comparten
          armadura con la de afuera porque son las mismas siete notas empezadas
          en otro lugar: La menor no tiene signos, como Do mayor.
        </p>
      </div>
    </div>
  );
}

function Casilla({
  texto,
  activa,
  menor = false,
  onClick,
}: {
  texto: string;
  activa: boolean;
  menor?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-1.5 py-0.5 font-mono leading-none font-bold whitespace-nowrap transition ${
        menor ? "text-[11px]" : "text-sm"
      } ${
        activa
          ? "bg-sol text-noche"
          : menor
            ? "text-humo hover:bg-carta-2 hover:text-tiza"
            : "bg-carta-2 text-tiza hover:bg-borde"
      }`}
    >
      {texto}
    </button>
  );
}
