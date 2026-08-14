"use client";

import Piano from "./Piano";
import { type Mark } from "./Keyboard";
import {
  CHORD_QUALITIES,
  chordSymbol,
  deletrearAcorde,
  escribirNota,
  intervalsOf,
  mod12,
  noteName,
} from "@/lib/music";
import { useArmado } from "@/lib/useArmado";

/**
 * Tocás teclas y te dice si lo que armaste tiene nombre. Es el revés del
 * dictado: en vez de leer un cifrado, lo escribís con los dedos.
 *
 * Es el que más gana con el teclado MIDI: acá no hay respuesta que adivinar, se
 * trata de tocar cosas y ver cómo se llaman, y eso con el piano de verdad
 * adelante es otra cosa que clickeando teclas de trece píxeles.
 */
export default function TecladoLibre() {
  const armado = useArmado();
  const held = armado.notas;

  const marks: Mark[] = held.map((p) => ({ pitch: p, tone: "sol" }));
  const nombre = identificar(held);

  return (
    <div className="card overflow-hidden">
      <div className="p-5">
        <Piano
          from={48}
          to={84}
          marks={marks}
          armado={armado}
          pista="— tocá lo que quieras y mirá cómo se llama"
          invitacion="¿Tenés un teclado? Conectalo y probá acordes en el piano de verdad"
          cierre="Con el teclado conectado, tocás cualquier cosa y la app le busca el nombre. Es la forma más rápida de encontrar una inversión sin ir a buscarla."
        >
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="font-display text-2xl font-bold">
              {nombre ? (
                <span className="text-sol">{nombre}</span>
              ) : held.length ? (
                <span className="text-humo">
                  {held.map((p) => noteName(p)).join(" · ")}
                </span>
              ) : (
                <span className="text-humo">Tocá algunas teclas…</span>
              )}
            </p>
          </div>
          {held.length > 0 && !nombre && (
            <p className="mt-2 text-sm text-humo">
              Todavía no coincide con ninguna receta conocida. Puede ser una
              inversión, o algo que el profe todavía no nos contó.
            </p>
          )}
        </Piano>
      </div>
    </div>
  );
}

/** Busca la receta que coincida, probando cada nota como fundamental. */
function identificar(pitches: number[]): string | null {
  if (pitches.length < 3) return null;
  const pcs = [...new Set(pitches.map(mod12))].sort((a, b) => a - b);

  for (const root of pcs) {
    const rel = pcs.map((pc) => mod12(pc - root)).sort((a, b) => a - b);
    for (const q of CHORD_QUALITIES) {
      const target = intervalsOf(q)
        .map(mod12)
        .sort((a, b) => a - b);
      if (
        target.length === rel.length &&
        target.every((v, i) => v === rel[i])
      ) {
        const bajo = mod12(Math.min(...pitches));
        if (bajo === root) return chordSymbol(root, q);
        // El bajo se nombra como lo nombra el acorde: en un Mi♭ menor la tecla
        // negra del medio es Sol♭, aunque suelta se la llame Fa♯.
        const escrito = deletrearAcorde(root, q).find((n) => n.pc === bajo);
        return `${chordSymbol(root, q)} (invertido, bajo en ${
          escrito ? escribirNota(escrito) : noteName(bajo)
        })`;
      }
    }
  }
  return null;
}
