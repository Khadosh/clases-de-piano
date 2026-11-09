"use client";

import { useState } from "react";
import Keyboard from "./Keyboard";
import { rich } from "./rich";
import { cuadroDe, porQueAfuera, type Aprendizaje } from "@/content/aprender";
import { queEs, type AcordeDeAfuera } from "@/lib/analisis";
import { cifradoDeVoicing, gradoEnMayor, identificarVoicing, teclasDeVoicing, type CompasDeCapa, type Voicing } from "@/lib/capas";
import { FUNCIONES, type Funcion } from "@/lib/grados";
import { nombreEnAcorde } from "@/lib/music";
import { playChord, wakeAudio } from "@/lib/audio";

/**
 * Los acordes que no son de la tonalidad, dichos donde aparecen (#16): al
 * lado del acorde en cada capa, en un cuadro con todos en el análisis, y la
 * décima de Blackbird con las dos manos. Joaquín, mirando Blackbird: «en un
 * momento hay un c#dim en las capas 2 y 3... qué papel cumple».
 */

const COLOR: Record<Funcion, string> = {
  reposo: "border-menta bg-menta/15 text-menta",
  subdominante: "border-sol bg-sol/15 text-sol",
  dominante: "border-brasa bg-brasa/15 text-brasa",
};

/** Un dominante disfrazado empuja igual: tensión. El resto, lo que diga su grado. */
const funcionDe = (v: Voicing, tonica: number, afuera: AcordeDeAfuera | null): Funcion =>
  afuera && ["dominante-secundario", "disminuido-de-paso"].includes(afuera.es) ? "dominante" : gradoEnMayor(v, tonica).funcion;

/** Abajo de la cuenta de una capa: si el acorde que suena es de casa, o de dónde sale. */
export function ParaQueEsta({ cancion, compas }: { cancion: Aprendizaje; compas: CompasDeCapa }) {
  const [tecnica, setTecnica] = useState(false);
  if (!compas.voicing) return null;
  const cifrado = cifradoDeVoicing(compas.voicing);
  const afuera = porQueAfuera(cancion, compas);
  if (!afuera) return <p className="text-sm text-humo">{cifrado} · de {cancion.tonalidad}</p>;
  return (
    <div className="rounded-xl border border-dashed border-sol/60 px-3 py-2">
      <p className="text-sm">
        <span className="font-mono font-bold text-tiza">{cifrado}</span>
        <span className="text-humo"> · fuera de {cancion.tonalidad} · </span>
        <span className="font-semibold text-sol">{queEs(afuera)}</span>
        {tecnica && <span className="ml-2 font-mono text-humo">{afuera.romano}</span>}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-tiza">{rich(afuera.simple)}</p>
      {tecnica && <p className="mt-1 text-sm leading-relaxed text-humo">{afuera.tecnica}</p>}
      <button
        onClick={() => setTecnica((t) => !t)}
        className="mt-1 text-xs text-humo underline decoration-dotted underline-offset-4 transition hover:text-sol"
      >
        {tecnica ? "ocultar lo técnico" : "técnico"}
      </button>
    </div>
  );
}

/** Lo que se le pasa al `Tocador` de una capa: la nota de abajo de la cuenta y qué chips van punteados. */
export const notasDeCapa = (cancion: Aprendizaje) => ({
  nota: (c: CompasDeCapa) => <ParaQueEsta cancion={cancion} compas={c} />,
  marcado: (c: CompasDeCapa) => porQueAfuera(cancion, c) !== null,
});

/**
 * La décima con las dos manos: el bajo (izquierda), la octava de paso
 * (apagada, para ver de dónde sale la cuenta) y la décima (pulgar derecho),
 * acorde por acorde.
 */
export function Decima({ decima }: { decima: { acordes: Voicing[]; texto: string[] } }) {
  const [i, setI] = useState(0);
  const v = decima.acordes[i];
  const bajo = v.izquierda[0];
  const arriba = v.derecha[0];
  const { root, quality } = identificarVoicing(v);
  const nombre = (p: number) => nombreEnAcorde(p, root, quality);
  const from = Math.min(...decima.acordes.map((a) => a.izquierda[0]));
  const to = Math.max(...decima.acordes.map((a) => a.derecha[0])) + 1;
  const mayor = arriba - bajo === 16;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-borde/60 p-4">
      <p className="font-display text-xl font-black tracking-tight">La décima, con las dos manos</p>
      <ul className="space-y-1.5">
        {decima.texto.map((t, j) => (
          <li key={j} className="flex gap-2 text-sm leading-relaxed text-tiza">
            <span className="text-sol">▸</span>
            <span>{rich(t)}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-1.5">
        {decima.acordes.map((a, j) => (
          <button
            key={j}
            onClick={() => {
              setI(j);
              wakeAudio();
              playChord([a.izquierda[0], a.derecha[0]], 1.4);
            }}
            className={`rounded-lg px-2.5 py-1 font-mono text-sm transition ${
              j === i ? "bg-tiza text-noche" : "bg-carta-2 text-humo hover:text-tiza"
            }`}
          >
            {cifradoDeVoicing(a)}
          </button>
        ))}
      </div>
      <div className="rounded-2xl bg-noche-2 p-3">
        <Keyboard
          from={from}
          to={to}
          marks={[
            { pitch: bajo, tone: "izq", label: "1", active: true },
            { pitch: bajo + 12, tone: "izq", label: "8", ghost: true },
            { pitch: arriba, tone: "der", label: "10", active: true },
          ]}
        />
      </div>
      <p className="text-sm text-tiza">
        <span className="font-semibold">{nombre(bajo)}</span> <span className="text-humo">(izquierda) → una octava,</span>{" "}
        {nombre(bajo + 12)} <span className="text-humo">→ una tercera más,</span>{" "}
        <span className="font-semibold">{nombre(arriba)}</span> <span className="text-humo">(pulgar de la derecha):</span> décima{" "}
        {mayor ? "mayor" : "menor"}.
      </p>
    </div>
  );
}

/** El cuadro del análisis: cada acorde que se practica, uno por renglón, de casa o de dónde sale. */
export function CuadroDeAcordes({ cancion, tecnica }: { cancion: Aprendizaje; tecnica: boolean }) {
  const renglones = cuadroDe(cancion);
  return (
    <section className="rounded-2xl border border-borde/60 p-4 sm:p-5">
      <h3 className="font-display text-xl font-black tracking-tight">Todos los acordes que se practican</h3>
      <p className="mt-1 text-sm text-humo">
        Uno por renglón, en el orden en que aparecen en las capas: si es de {cancion.tonalidad} y qué grado, o si no, de
        dónde sale.
      </p>
      <ul className="mt-3 flex flex-col divide-y divide-borde/50">
        {renglones.map((r) => (
          <li key={r.cifrado} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-start sm:gap-4">
            <span className="flex shrink-0 items-center gap-2 sm:w-44">
              <button
                onClick={() => {
                  wakeAudio();
                  playChord(teclasDeVoicing(r.voicing), 1.4);
                }}
                className={`min-w-16 rounded-xl border px-2.5 py-1 font-mono text-sm font-bold transition hover:brightness-125 ${
                  COLOR[funcionDe(r.voicing, cancion.tonica, r.afuera)]
                }`}
              >
                {r.cifrado}
              </button>
              <span className="font-mono text-sm text-humo">{r.romano}</span>
            </span>
            {r.afuera ? (
              <span className="text-sm leading-relaxed">
                <span className="font-semibold text-sol">{queEs(r.afuera)}</span>
                <span className="text-tiza"> · {rich(r.afuera.simple)}</span>
                {tecnica && <span className="block text-humo">{r.afuera.tecnica}</span>}
              </span>
            ) : (
              <span className="text-sm text-humo">
                de {cancion.tonalidad} · {FUNCIONES[gradoEnMayor(r.voicing, cancion.tonica).funcion].nombre.toLowerCase()}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
