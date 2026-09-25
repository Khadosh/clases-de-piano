"use client";

import { useState } from "react";
import Icono from "./Icono";
import { ArmaduraSola } from "./Pentagrama";
import { escribirNota } from "@/lib/music";
import {
  ORDEN_BEMOLES,
  ORDEN_SOSTENIDOS,
  TONALIDADES,
  leerArmadura,
  nota,
  signosDeArmadura,
  teclasDeTono,
} from "@/lib/tonalidades";
import { playNote, wakeAudio } from "@/lib/audio";

/**
 * La armadura: los signos que van al principio del renglón y qué tonalidad
 * anuncian.
 *
 * Lo que enseña la clase no es la lista —ésa se olvida— sino **la cuenta**:
 * con sostenidos, la tónica está un semitono arriba del último; con bemoles,
 * es el anteúltimo. Por eso el signo que decide se pinta, y el texto dice de
 * dónde salió. La cuenta vive en `leerArmadura` y está verificada contra las
 * quince tonalidades, así que lo que se lee acá no es una promesa: si la regla
 * fallara en una sola, `test:tonalidades` no compila la clase.
 */

export default function Armaduras() {
  const [armadura, setArmadura] = useState(3);
  const tonalidad = TONALIDADES.find((t) => t.armadura === armadura)!;
  const { pista, regla } = leerArmadura(armadura);
  const signos = signosDeArmadura(armadura);
  const resaltado = pista ? signos.findIndex((s) => s.letra === pista.letra) : null;

  const tocar = () => {
    wakeAudio();
    teclasDeTono(tonalidad.mayor, 48).forEach((p, i) =>
      setTimeout(() => playNote(p, 0.4), i * 260),
    );
  };

  return (
    <div className="card overflow-hidden">
      {/* Cuántas alteraciones */}
      <div className="border-b border-borde/60 p-4">
        <p className="mb-2 text-xs tracking-[0.2em] text-humo uppercase">
          Cuántas alteraciones
        </p>
        <div className="flex flex-wrap gap-1">
          {TONALIDADES.map((t) => (
            <button
              key={t.armadura}
              onClick={() => setArmadura(t.armadura)}
              className={`min-w-10 rounded-lg px-2 py-1.5 font-mono text-sm font-bold transition ${
                armadura === t.armadura
                  ? "bg-sol text-noche"
                  : "bg-carta-2 text-humo hover:text-tiza"
              }`}
            >
              {t.armadura === 0
                ? "—"
                : `${Math.abs(t.armadura)}${t.armadura > 0 ? "♯" : "♭"}`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 p-5 md:grid-cols-[auto_1fr]">
        <div className="rounded-2xl bg-noche-2 p-3">
          <ArmaduraSola armadura={armadura} dosClaves resaltar={resaltado} alto={1.4} />
        </div>

        <div>
          <p className="text-xs tracking-[0.25em] text-humo uppercase">
            Esta armadura anuncia
          </p>
          <p className="font-display text-3xl font-black text-sol">
            {escribirNota(tonalidad.mayor.tonica)} mayor
          </p>
          <p className="text-sm text-humo">
            o su relativa,{" "}
            <strong className="text-tiza">
              {escribirNota(tonalidad.menor.tonica)} menor
            </strong>
            . Las dos tienen los mismos signos: el papel no las distingue, y
            para saber cuál es hay que mirar dónde reposa la música.
          </p>
          <p className="mt-3 rounded-2xl border-l-4 border-sol bg-carta-2/60 px-4 py-3 text-sm">
            {regla}
          </p>
          <button
            onClick={tocar}
            className="mt-3 rounded-full bg-menta px-4 py-2 text-sm font-bold text-noche transition hover:brightness-110"
          >
            <Icono de="parlante" /> Escuchar la escala
          </button>
        </div>
      </div>

      {/* El orden, que es fijo */}
      <div className="border-t border-borde/60 p-5">
        <p className="mb-3 text-xs tracking-[0.2em] text-humo uppercase">
          El orden no se elige
        </p>
        <div className="space-y-2">
          {[
            { signo: 1, orden: ORDEN_SOSTENIDOS, titulo: "Sostenidos" },
            { signo: -1, orden: ORDEN_BEMOLES, titulo: "Bemoles" },
          ].map(({ signo, orden, titulo }) => (
            <div key={titulo} className="flex flex-wrap items-center gap-2">
              <span className="w-24 shrink-0 text-sm text-humo">{titulo}</span>
              {orden.map((letra, i) => {
                const puesto = Math.sign(armadura) === signo && i < Math.abs(armadura);
                return (
                  <span
                    key={letra}
                    className={`rounded-lg px-2 py-1 font-mono text-sm transition ${
                      puesto ? "bg-sol text-noche font-bold" : "bg-carta-2 text-humo"
                    }`}
                  >
                    {escribirNota(nota(letra, signo))}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-humo">
          Uno es el otro al revés, y no es casualidad: cada sostenido nuevo
          aparece una quinta arriba del anterior y cada bemol una quinta abajo.
          Los signos entran siempre en ese orden y nunca salteado — una armadura
          con un sol♯ y sin fa♯ no existe.
        </p>
      </div>
    </div>
  );
}
