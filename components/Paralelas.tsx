"use client";

import { useState } from "react";
import { ESCALAS, notasDeEscala, triadasDeEscala, type Escala } from "@/lib/escalas";
import {
  LETRAS_PC,
  chordSymbol,
  escribirNota,
  identificarAcorde,
  mod12,
  parseCifrado,
  chordPitches,
} from "@/lib/music";
import { playChord, playNote, wakeAudio } from "@/lib/audio";

/**
 * Las armonías paralelas sobre Do: la mayor y las tres menores construidas
 * sobre **la misma tónica**. De ahí salen los préstamos melódicos — acordes
 * que se piden prestados de la paralela menor sin mudarse de tonalidad.
 *
 * Cada escala muestra sus notas (con las que se corren respecto de la mayor
 * marcadas) y los siete acordes que le salen solos con la regla de siempre,
 * nota sí nota no. Las calidades no las elige nadie: las nombra el mismo
 * identificador del teclado libre sobre lo que la escala arma.
 */

const BASE = 48; // Do3

/**
 * El nombre escrito de cada grado: una letra por grado, siempre en orden
 * (Do Re Mi Fa Sol La Si), y la alteración sale de comparar con la nota
 * natural de esa letra. Así la menor antigua dice Mi♭ y no Re♯.
 */
function nombreDelGrado(i: number, semitonos: number): string {
  return escribirNota({ letra: i, alter: semitonos - LETRAS_PC[i], pc: mod12(semitonos) });
}

function acordesDe(escala: Escala) {
  return triadasDeEscala(BASE, escala).map((midis) => {
    const id = identificarAcorde(midis);
    return { midis, nombre: id ? chordSymbol(id.root, id.quality) : "?" };
  });
}

export default function Paralelas() {
  const [abierta, setAbierta] = useState("mayor");
  const [sonando, setSonando] = useState<string | null>(null);

  const suena = (clave: string, ms: number) => {
    setSonando(clave);
    setTimeout(() => setSonando((s) => (s === clave ? null : s)), ms);
  };

  const tocarEscala = (escala: Escala) => {
    wakeAudio();
    const notas = notasDeEscala(BASE, escala);
    notas.forEach((n, i) => setTimeout(() => playNote(n, 0.5), i * 320));
    suena(`escala-${escala.id}`, notas.length * 320);
  };

  const tocarAcorde = (escalaId: string, i: number, midis: number[]) => {
    wakeAudio();
    playChord(midis, 1.4);
    suena(`${escalaId}-${i}`, 900);
  };

  const tocarPrestamo = () => {
    wakeAudio();
    const c = parseCifrado("C")!;
    const fm = parseCifrado("Fm")!;
    const acordes = [c, fm, c];
    acordes.forEach((a, i) =>
      setTimeout(() => playChord(chordPitches(BASE + a.root, a.quality), 1.3), i * 950),
    );
    suena("prestamo", acordes.length * 950);
  };

  return (
    <div className="card overflow-hidden">
      {ESCALAS.map((escala) => {
        const esta = abierta === escala.id;
        const acordes = esta ? acordesDe(escala) : [];
        return (
          <div key={escala.id} className="border-b border-borde/40 last:border-b-0">
            <button
              onClick={() => setAbierta(esta ? "" : escala.id)}
              className="flex w-full flex-wrap items-baseline gap-x-3 px-4 py-3 text-left transition hover:bg-carta-2/60"
            >
              <span className="font-display text-lg font-bold">{escala.nombre}</span>
              <span className="font-mono text-xs text-humo">{escala.receta}</span>
              <span className="ml-auto text-xs text-humo">{esta ? "▲" : "▼"}</span>
            </button>
            {esta && (
              <div className="px-4 pb-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  {escala.grados.map((s, i) => {
                    // Se marca lo que se corrió respecto de la mayor: es lo
                    // que hay que mirar para pasar de una escala a otra.
                    const corrida = s !== ESCALAS[0].grados[i];
                    return (
                      <span
                        key={i}
                        className={`rounded-lg px-2 py-1 font-mono text-sm ${
                          corrida ? "bg-sol/15 font-bold text-sol" : "bg-carta-2 text-tiza"
                        }`}
                      >
                        {nombreDelGrado(i, s)}
                      </span>
                    );
                  })}
                  <button
                    onClick={() => tocarEscala(escala)}
                    className={`ml-1 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      sonando === `escala-${escala.id}`
                        ? "bg-brasa text-noche"
                        : "bg-sol text-noche hover:brightness-110"
                    }`}
                  >
                    ▶ subir la escala
                  </button>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-humo">{escala.vibe}</p>
                <p className="mt-3 mb-1.5 text-xs tracking-[0.2em] text-humo uppercase">
                  Sus acordes, nota sí nota no
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {acordes.map((a, i) => (
                    <button
                      key={i}
                      onClick={() => tocarAcorde(escala.id, i, a.midis)}
                      className={`rounded-xl px-3 py-2 text-center transition ${
                        sonando === `${escala.id}-${i}`
                          ? "bg-sol text-noche"
                          : "bg-carta-2 hover:bg-borde"
                      }`}
                    >
                      <span className="block font-mono text-sm font-bold">{a.nombre}</span>
                      <span className="block text-[11px] opacity-70">
                        {["I", "II", "III", "IV", "V", "VI", "VII"][i]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="bg-carta-2/40 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={tocarPrestamo}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              sonando === "prestamo"
                ? "bg-brasa text-noche"
                : "bg-sol text-noche hover:brightness-110"
            }`}
          >
            ▶ C → Fm → C
          </button>
          <p className="min-w-[200px] flex-1 text-sm leading-relaxed text-humo">
            El préstamo estrella: el <strong className="text-tiza">Fm</strong> es el IV de Do
            menor metido en Do mayor. Escuchá cómo oscurece el medio sin irse de casa.
          </p>
        </div>
      </div>
    </div>
  );
}
