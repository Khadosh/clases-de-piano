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
  vecindadDe,
  type Modo,
  type Tonalidad,
  type Vecino,
} from "@/lib/tonalidades";
import { playNote, wakeAudio } from "@/lib/audio";

/**
 * El círculo de quintas: las quince tonalidades puestas en rueda.
 *
 * Las posiciones no están escritas — **son la armadura misma**. Una vuelta de
 * reloj son doce quintas y doce semitonos, así que el lugar de cada tonalidad
 * es su número de alteraciones módulo 12: por eso Fa♯ (seis sostenidos) y
 * Sol♭ (seis bemoles) caen solas en la misma casilla, que es exactamente lo
 * que el círculo viene a mostrar — que yendo para un lado o para el otro se
 * llega al mismo lugar con otros nombres. Las tres casillas de abajo tienen
 * dos tonalidades y por eso se parten al medio, como en los círculos impresos.
 *
 * Y lo que lo hace útil y no decorativo: **las casillas pegadas son los
 * acordes de la tonalidad**. La de al lado a la derecha es el V, la de la
 * izquierda el IV, y las tres de adentro el vi, el ii y el iii. Seis de los
 * siete acordes del campo armónico tocándose (`vecindadDe`, verificado contra
 * apilar terceras en `test:tonalidades`). El que falta es el VII°, que es
 * disminuido y no tiene casilla.
 */

// Los radios de los tres anillos, en unidades del dibujo.
// El anillo de las menores es el más alto de los tres: es el que se parte en
// dos en las tres casillas de abajo, y ahí los nombres son los más largos
// (Re♯m, Mi♭m). Medido en un teléfono, que es donde se mira.
const R = { armadura: [108, 122], mayor: [78, 108], menor: [46, 78] } as const;
const PASO = (2 * Math.PI) / 12;

/** Redondeado a propósito: un decimal suelto no sobrevive al viaje servidor → cliente. */
const n2 = (x: number) => x.toFixed(2);
const punto = (r: number, a: number) => `${n2(r * Math.cos(a))} ${n2(r * Math.sin(a))}`;

/** Un gajo de anillo: el pedazo de dona entre dos radios y dos ángulos. */
function gajo(r0: number, r1: number, a0: number, a1: number) {
  return [
    `M ${punto(r1, a0)}`,
    `A ${n2(r1)} ${n2(r1)} 0 0 1 ${punto(r1, a1)}`,
    `L ${punto(r0, a1)}`,
    `A ${n2(r0)} ${n2(r0)} 0 0 0 ${punto(r0, a0)}`,
    "Z",
  ].join(" ");
}

/** El ángulo del centro de una casilla: Do arriba y los sostenidos a la derecha. */
const anguloDe = (casilla: number) => casilla * PASO - Math.PI / 2;

export default function CirculoDeQuintas() {
  const [elegida, setElegida] = useState<Tonalidad>(
    TONALIDADES.find((t) => t.armadura === 0)!,
  );
  const [modo, setModo] = useState<Modo>("mayor");
  const [verVecindad, setVerVecindad] = useState(false);

  const tono = modo === "mayor" ? elegida.mayor : elegida.menor;
  const vecinos = vecindadDe(elegida.armadura);
  const gradoDe = (t: Tonalidad, m: Modo): Vecino | undefined =>
    vecinos.find((v) => v.modo === m && v.tono.tonica.pc === (m === "mayor" ? t.mayor : t.menor).tonica.pc);

  const elegir = (t: Tonalidad, m: Modo) => {
    setElegida(t);
    setModo(m);
    wakeAudio();
    const cual = m === "mayor" ? t.mayor : t.menor;
    teclasDeTono(cual, 48).forEach((p, i) => setTimeout(() => playNote(p, 0.35), i * 180));
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-borde/60 px-4 py-3">
        <button
          onClick={() => setVerVecindad((v) => !v)}
          className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition ${
            verVecindad ? "bg-sol text-noche" : "bg-carta-2 text-humo hover:text-tiza"
          }`}
        >
          Los acordes de la tonalidad
        </button>
        <span className="text-xs text-humo">
          {verVecindad
            ? "Las casillas pegadas son los seis acordes: el IV y el V al lado, los tres menores adentro."
            : "Prendelo y mirá qué queda alrededor de la que elegiste."}
        </span>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <svg
          viewBox="-126 -126 252 252"
          className="mx-auto w-full max-w-lg"
          role="img"
          aria-label="Círculo de quintas"
        >
          {Array.from({ length: 12 }, (_, casilla) => {
            const enLaCasilla = TONALIDADES.filter((t) => mod12(t.armadura) === casilla);
            const a0 = anguloDe(casilla) - PASO / 2;
            const a1 = anguloDe(casilla) + PASO / 2;
            const medio = anguloDe(casilla);
            return (
              <g key={casilla}>
                {/* El aro de afuera: cuántas alteraciones lleva esta casilla */}
                <path
                  d={gajo(R.armadura[0], R.armadura[1], a0, a1)}
                  fill="var(--color-carta-2)"
                  stroke="var(--color-noche)"
                  strokeWidth={1.2}
                  opacity={0.7}
                />
                <text
                  x={n2(115 * Math.cos(medio))}
                  y={n2(115 * Math.sin(medio) + 2.6)}
                  textAnchor="middle"
                  fontSize={7.5}
                  fontWeight={700}
                  fill="var(--color-humo)"
                >
                  {enLaCasilla.map((t) =>
                    t.armadura === 0 ? "—" : `${Math.abs(t.armadura)}${t.armadura > 0 ? "♯" : "♭"}`,
                  ).join(" / ")}
                </text>

                {(["mayor", "menor"] as Modo[]).map((m) => {
                  const [ri, ro] = m === "mayor" ? R.mayor : R.menor;
                  // Donde hay dos tonalidades el anillo se parte al medio: la
                  // de afuera y la de adentro, como en un círculo impreso.
                  const alto = (ro - ri) / enLaCasilla.length;
                  return enLaCasilla.map((t, i) => {
                    const r0 = ro - alto * (i + 1);
                    const r1 = ro - alto * i;
                    const suTono = m === "mayor" ? t.mayor : t.menor;
                    const activa = elegida === t && modo === m;
                    const vecino = verVecindad ? gradoDe(t, m) : undefined;
                    const apagada = verVecindad && !vecino;
                    const tinte = t.armadura > 0 ? "sol" : t.armadura < 0 ? "menta" : "tiza";
                    return (
                      <g
                        key={`${m}${t.armadura}`}
                        onClick={() => elegir(t, m)}
                        className="cursor-pointer"
                      >
                        {/* Un solo string: un <title> con dos hijos se
                            serializa distinto en el servidor y en el cliente. */}
                        <title>
                          {vecino
                            ? `${nombreDeTono(suTono)} — el ${vecino.grado} de ${nombreDeTono(elegida.mayor)}`
                            : nombreDeTono(suTono)}
                        </title>
                        <path
                          d={gajo(r0, r1, a0, a1)}
                          fill={`var(--color-${tinte})`}
                          fillOpacity={
                            activa
                              ? 1
                              : apagada
                                ? 0.05
                                : Number((0.1 + Math.abs(t.armadura) * 0.035).toFixed(3))
                          }
                          stroke={
                            vecino && !activa ? "var(--color-sol)" : "var(--color-noche)"
                          }
                          strokeWidth={vecino && !activa ? 1.4 : 1.2}
                          className="transition-all"
                        />
                        <text
                          x={n2(((r0 + r1) / 2) * Math.cos(medio))}
                          y={n2(((r0 + r1) / 2) * Math.sin(medio) + (m === "mayor" ? 3 : 2.4))}
                          textAnchor="middle"
                          fontSize={
                            enLaCasilla.length > 1
                              ? m === "mayor"
                                ? 7
                                : 6.2
                              : m === "mayor"
                                ? 10.5
                                : 8
                          }
                          fontWeight={m === "mayor" ? 800 : 600}
                          fill={
                            activa
                              ? "var(--color-noche)"
                              : apagada
                                ? "var(--color-humo)"
                                : "var(--color-tiza)"
                          }
                          opacity={apagada ? 0.45 : 1}
                          className="pointer-events-none select-none"
                        >
                          {nombreDeTono(suTono, "en")}
                        </text>
                        {vecino && !activa && (
                          <text
                            x={n2(((r0 + r1) / 2) * Math.cos(medio))}
                            y={n2(((r0 + r1) / 2) * Math.sin(medio) - 4.5)}
                            textAnchor="middle"
                            fontSize={5.5}
                            fontWeight={800}
                            fill="var(--color-sol)"
                            className="pointer-events-none select-none"
                          >
                            {vecino.grado}
                          </text>
                        )}
                      </g>
                    );
                  });
                })}
              </g>
            );
          })}

          {/* El centro: qué está elegido */}
          <circle r={46} fill="var(--color-noche-2)" stroke="var(--color-borde)" />
          <text
            textAnchor="middle"
            x={0}
            y={-6}
            fontSize={20}
            fontWeight={900}
            fill="var(--color-sol)"
            className="font-display select-none"
          >
            {escribirNota(tono.tonica)}
          </text>
          <text
            textAnchor="middle"
            x={0}
            y={6}
            fontSize={9}
            fill="var(--color-humo)"
            className="select-none"
          >
            {modo}
          </text>
          <text
            textAnchor="middle"
            x={0}
            y={20}
            fontSize={7.5}
            fill="var(--color-humo)"
            className="select-none"
          >
            {elegida.armadura === 0
              ? "sin alteraciones"
              : `${Math.abs(elegida.armadura)} ${elegida.armadura > 0 ? "♯" : "♭"}`}
          </text>
        </svg>

        {/* La ficha de la elegida */}
        <div>
          <div className="mb-3 rounded-2xl bg-noche-2 p-3">
            <ArmaduraSola armadura={elegida.armadura} alto={1.1} />
          </div>
          <p className="font-display text-2xl font-black">
            {escribirNota(tono.tonica)} {modo}
          </p>
          <p className="mb-3 font-mono text-sm text-humo">
            {notasDeTono(tono).map((x) => escribirNota(x)).join(" · ")}
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
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => elegir(elegida, modo)}
              className="rounded-full bg-menta px-4 py-2 text-sm font-bold text-noche transition hover:brightness-110"
            >
              <Icono de="parlante" /> Escucharla
            </button>
          </div>

          {/* Los seis acordes, escritos: la misma información que el dibujo */}
          <div className="mt-4 rounded-2xl bg-noche-2 p-3">
            <p className="mb-2 text-xs tracking-[0.2em] text-humo uppercase">
              Los acordes de {escribirNota(elegida.mayor.tonica)} mayor
            </p>
            <div className="flex flex-wrap gap-1.5">
              {["I", "ii", "iii", "IV", "V", "vi"].map((cifra) => {
                const v = vecinos.find((x) => x.grado === cifra)!;
                return (
                  <button
                    key={cifra}
                    onClick={() => {
                      const t = TONALIDADES.find(
                        (x) =>
                          (v.modo === "mayor" ? x.mayor : x.menor).tonica.pc === v.tono.tonica.pc,
                      );
                      if (t) elegir(t, v.modo);
                    }}
                    className="rounded-lg bg-carta-2 px-2 py-1 text-left transition hover:bg-borde"
                  >
                    <span className="block font-mono text-[10px] text-sol">{cifra}</span>
                    <span className="block text-sm font-bold">
                      {nombreDeTono(v.tono, "en")}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-humo">
              El VII° no está: es disminuido y no tiene casilla en el círculo.
            </p>
          </div>
        </div>
      </div>

      {/* Qué se lee en el dibujo */}
      <div className="grid gap-3 border-t border-borde/60 p-5 sm:grid-cols-2">
        <Ficha titulo="Por qué se llama de quintas">
          Cada paso hacia la derecha sube una quinta y agrega un sostenido; cada
          paso a la izquierda baja una quinta y agrega un bemol. Doce pasos dan
          la vuelta entera y vuelven a Do, que es otra forma de decir que doce
          quintas son siete octavas.
        </Ficha>
        <Ficha titulo="Las vecinas son los acordes de la tonalidad">
          Mirá {escribirNota(elegida.mayor.tonica)}: a los costados están{" "}
          <b className="text-tiza">
            {nombreDeTono(vecinos.find((v) => v.grado === "IV")!.tono, "en")}
          </b>{" "}
          (el IV) y{" "}
          <b className="text-tiza">
            {nombreDeTono(vecinos.find((v) => v.grado === "V")!.tono, "en")}
          </b>{" "}
          (el V), y justo adentro sus tres menores. Seis de los siete acordes
          de la tonalidad, todos tocándose. Por eso una canción que se mueve
          entre casillas vecinas suena en su casa, y una que salta al otro lado
          del círculo suena a mudanza.
        </Ficha>
        <Ficha titulo="El anillo de adentro son las relativas">
          Comparten armadura con la de afuera porque son las mismas siete notas
          empezadas en el sexto grado: La menor no tiene signos, como Do mayor.
          Cuál de las dos es lo dice la música, no el papel.
        </Ficha>
        <Ficha titulo="Abajo los dos caminos se cruzan">
          Las tres casillas de abajo están partidas al medio: ahí la misma tecla
          tiene dos nombres —Fa♯ y Sol♭ son el mismo dedo, con seis signos de
          cada lado— y cuál se escribe lo decide qué se lee más fácil. El aro de
          afuera dice cuántas alteraciones lleva cada camino.
        </Ficha>
        <Ficha titulo="Sirve para transportar">
          Una progresión es un dibujo de casillas: I–V–vi–IV en Do es la
          casilla, la de la derecha, la de adentro y la de la izquierda. Mové el
          dibujo entero un paso y tenés la misma canción en otra tonalidad, sin
          volver a aprenderla — que es exactamente lo que hacen los grados.
        </Ficha>
        <Ficha titulo="Y para medir distancias">
          Cuántas casillas hay entre dos tonalidades es cuántas alteraciones las
          separan. Do y Sol están a un paso: se diferencian en una sola nota. Do
          y Fa♯ están a seis: no comparten casi nada, y por eso ese salto suena
          tan lejos.
        </Ficha>
      </div>
    </div>
  );
}

function Ficha({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-noche-2 p-4">
      <p className="mb-1 text-sm font-bold text-sol">{titulo}</p>
      <p className="text-sm leading-relaxed text-humo">{children}</p>
    </div>
  );
}
