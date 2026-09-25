"use client";

import { useMemo, useState } from "react";
import Icono from "./Icono";
import Keyboard, { type Mark } from "./Keyboard";
import { ArmaduraSola } from "./Pentagrama";
import { escribirNota, rangoParaAcorde } from "@/lib/music";
import { saltosDeEscala } from "@/lib/escalas";
import {
  TONALIDADES,
  armaduraDeTono,
  escalaDeModo,
  notasDeTono,
  signosDeArmadura,
  teclasDeTono,
  type Modo,
  type Tonalidad,
} from "@/lib/tonalidades";
import { playNote, wakeAudio } from "@/lib/audio";

/**
 * Las escalas de la clase: la misma receta arrancando de cada nota, y el signo
 * que se suma cada vez.
 *
 * Está armado como el cuaderno —dos listas, una de sostenidos y otra de
 * bemoles, numeradas por cuántos llevan— porque ésa es la imagen que enseña:
 * cada fila es la anterior con un signo más, y el signo nuevo siempre es una
 * letra nueva. Lo que el papel no puede hacer es sonar, así que acá cada fila
 * se toca.
 *
 * Ninguna de las quince está escrita: salen de `lib/tonalidades.ts`, que las
 * deletrea letra por letra. Por eso Do♯ mayor muestra su Si♯ y Do♭ mayor su
 * Fa♭ sin ninguna excepción a mano.
 */

const BASE = 48; // Do3

export default function Tonalidades() {
  const [modo, setModo] = useState<Modo>("mayor");
  const [armadura, setArmadura] = useState(0);

  const tonalidad = TONALIDADES.find((t) => t.armadura === armadura)!;
  const tono = modo === "mayor" ? tonalidad.mayor : tonalidad.menor;
  const notas = notasDeTono(tono);
  const teclas = useMemo(() => teclasDeTono(tono, BASE), [tono]);
  const saltos = saltosDeEscala(escalaDeModo(modo));
  const { from, to } = rangoParaAcorde(teclas);

  const tocar = () => {
    wakeAudio();
    teclas.forEach((p, i) => setTimeout(() => playNote(p, 0.45), i * 300));
  };

  const marks: Mark[] = teclas.slice(0, 7).map((p, i) => ({
    pitch: p,
    tone: notas[i].alter === 0 ? "menta" : "sol",
    label: escribirNota(notas[i]),
  }));
  marks.push({ pitch: teclas[7], tone: "menta", ghost: true });

  const conSostenidos = TONALIDADES.filter((t) => t.armadura >= 0);
  // Los bemoles van de uno a siete, como en el cuaderno: cada fila es la
  // anterior con un signo más. Ordenados por armadura saldrían al revés,
  // porque son números negativos.
  const conBemoles = TONALIDADES.filter((t) => t.armadura < 0).reverse();

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-borde/60 p-4">
        {(["mayor", "menor"] as Modo[]).map((m) => (
          <button
            key={m}
            onClick={() => setModo(m)}
            className={`rounded-xl px-3.5 py-2 text-sm font-bold capitalize transition ${
              modo === m ? "bg-tiza text-noche" : "bg-carta-2 text-humo hover:text-tiza"
            }`}
          >
            {m === "mayor" ? "Escalas mayores" : "Escalas menores"}
          </button>
        ))}
        <span className="text-xs text-humo">
          {modo === "mayor"
            ? "T T s T T T s — los dos semitonos entre el III-IV y el VII-VIII."
            : "T s T T s T T — los semitonos se corren al II-III y al V-VI."}
        </span>
      </div>

      {/* Las dos listas del cuaderno */}
      <div className="grid gap-4 border-b border-borde/60 p-4 lg:grid-cols-2">
        <Lista
          titulo="Con sostenidos"
          orden="fa · do · sol · re · la · mi · si"
          tonalidades={conSostenidos}
          modo={modo}
          elegida={armadura}
          onElegir={setArmadura}
        />
        <Lista
          titulo="Con bemoles"
          orden="si · mi · la · re · sol · do · fa"
          tonalidades={conBemoles}
          modo={modo}
          elegida={armadura}
          onElegir={setArmadura}
        />
      </div>

      {/* La elegida, con todo */}
      <div className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.25em] text-humo uppercase">
              {Math.abs(armadura) === 0
                ? "Sin alteraciones"
                : `${Math.abs(armadura)} ${armadura > 0 ? "sostenido" : "bemol"}${Math.abs(armadura) > 1 ? "es" : ""}`}
            </p>
            <p className="font-display text-4xl font-black text-sol">
              {escribirNota(tono.tonica)} {modo}
            </p>
            <p className="mt-1 text-sm text-humo">
              Su relativa {modo === "mayor" ? "menor" : "mayor"} es{" "}
              <strong className="text-tiza">
                {escribirNota((modo === "mayor" ? tonalidad.menor : tonalidad.mayor).tonica)}{" "}
                {modo === "mayor" ? "menor" : "mayor"}
              </strong>
              : las mismas siete notas, otra casa.
            </p>
          </div>
          <div className="rounded-2xl bg-noche-2 p-3">
            <ArmaduraSola armadura={armadura} alto={1.2} />
          </div>
        </div>

        <div className="mb-4 overflow-x-auto rounded-2xl bg-noche-2 p-4">
          <div className="flex min-w-max items-center gap-1 font-mono text-sm">
            {notas.map((n, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className={n.alter === 0 ? "text-tiza" : "text-sol"}>
                  {escribirNota(n)}
                </span>
                <span className="rounded bg-carta-2 px-1.5 text-[11px] text-humo">
                  {saltos[i] === 1 ? "s" : saltos[i] === 2 ? "T" : "T+s"}
                </span>
              </span>
            ))}
            <span className="text-humo">{escribirNota(notas[0])}</span>
          </div>
        </div>

        <div className="rounded-2xl bg-noche-2 p-3">
          <Keyboard from={from} to={to} marks={marks} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={tocar}
            className="rounded-full bg-menta px-4 py-2 text-sm font-bold text-noche transition hover:brightness-110"
          >
            <Icono de="parlante" /> Escucharla
          </button>
          <button
            onClick={() => setArmadura(armadura >= 7 ? -7 : armadura + 1)}
            className="rounded-full bg-carta-2 px-4 py-2 text-sm font-bold transition hover:bg-borde"
          >
            Una quinta más arriba →
          </button>
        </div>

        <p className="mt-4 text-sm text-humo">
          Subiendo una quinta se suma un sostenido, y bajando una se suma un
          bemol: por eso la lista avanza de a un signo y nunca salta. El signo
          nuevo es siempre una letra que todavía no había aparecido, porque una
          escala usa las siete letras una sola vez cada una — eso es lo que
          decide si va sostenido o bemol, y no el gusto de nadie.
        </p>
      </div>
    </div>
  );
}

function Lista({
  titulo,
  orden,
  tonalidades,
  modo,
  elegida,
  onElegir,
}: {
  titulo: string;
  orden: string;
  tonalidades: Tonalidad[];
  modo: Modo;
  elegida: number;
  onElegir: (n: number) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-xs tracking-[0.2em] text-humo uppercase">{titulo}</p>
      <p className="mb-2 font-mono text-[11px] text-humo">en orden: {orden}</p>
      <div className="space-y-1">
        {tonalidades.map((t) => {
          const tono = modo === "mayor" ? t.mayor : t.menor;
          const notas = notasDeTono(tono);
          // El signo que esta tonalidad agrega respecto de la anterior: es
          // siempre el último de la armadura, y es lo que la hace distinta.
          const nuevo = signosDeArmadura(t.armadura).at(-1);
          return (
            <button
              key={t.armadura}
              onClick={() => onElegir(t.armadura)}
              className={`flex w-full items-baseline gap-2 rounded-xl px-2.5 py-1.5 text-left transition ${
                elegida === t.armadura ? "bg-carta-2 ring-1 ring-sol/50" : "hover:bg-carta-2/60"
              }`}
            >
              <span className="w-4 shrink-0 font-mono text-[11px] text-humo">
                {Math.abs(t.armadura)}
              </span>
              <span className="flex flex-wrap gap-x-1.5 font-mono text-[13px]">
                {notas.map((n, i) => (
                  <span
                    key={i}
                    className={
                      nuevo && n.letra === nuevo.letra
                        ? "font-bold text-sol"
                        : n.alter !== 0
                          ? "text-tiza"
                          : "text-humo"
                    }
                  >
                    {escribirNota(n)}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
