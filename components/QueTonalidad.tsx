"use client";

import { useEffect, useRef, useState } from "react";
import Icono from "./Icono";
import Marcador from "./Marcador";
import Pistas, { type Pista } from "./Pistas";
import { ArmaduraSola } from "./Pentagrama";
import { escribirNota } from "@/lib/music";
import { azarSembrado } from "@/lib/compasQuiz";
import { anotar, elegirConMemoria } from "@/lib/memoria";
import { useRonda } from "@/lib/useRonda";
import {
  TONALIDADES,
  armaduraDeTono,
  armadurasConfundiblesCon,
  confundiblesCon,
  leerArmadura,
  nombreDeTono,
  signosDeArmadura,
  teclasDeTono,
  tonoDeArmadura,
  type Modo,
  type Tono,
} from "@/lib/tonalidades";
import { playNote, wakeAudio } from "@/lib/audio";

/**
 * ¿En qué tonalidad está? La armadura dibujada, y hay que nombrarla — o al
 * revés, el nombre y hay que elegir los signos.
 *
 * Son las dos direcciones de la misma lectura y hacen falta las dos: del papel
 * al nombre es lo que se hace abriendo una partitura, y del nombre al papel es
 * lo que se hace escribiendo una. La segunda es la que se olvida.
 *
 * Los distractores no son al azar: la relativa (misma armadura, otra casa), la
 * vecina de un signo y la del signo opuesto. Un distractor lejano no enseña
 * nada porque nadie confunde Do con Fa♯ — `confundiblesCon` los elige.
 *
 * La memoria cuenta **por armadura** y no por tonalidad: lo que se olvida es
 * cuántos signos van, no si esa vez preguntó la mayor o la menor.
 */

type Direccion = "papel" | "nombre";

interface Pregunta {
  direccion: Direccion;
  correcto: Tono;
  /** En "papel" son tonalidades; en "nombre", armaduras. */
  opciones: { tono?: Tono; armadura: number; texto: string }[];
  correcta: number;
}

/**
 * `conMemoria` está afuera del azar a propósito: la primera pregunta se dibuja
 * en el servidor y otra vez en el cliente, y tiene que dar igual las dos
 * veces. La memoria vive en `localStorage`, así que en el servidor no existe —
 * y `elegirConMemoria` usa su propio azar, que tampoco se puede sembrar. Por
 * eso la primera sale del azar sembrado y sin memoria, y recién al pedir otra
 * entra el bombo cargado con lo que te cuesta.
 */
function armarPregunta(azar: () => number, conMemoria: boolean): Pregunta {
  const armaduras = TONALIDADES.map((t) => t.armadura);
  const armadura = conMemoria
    ? elegirConMemoria(armaduras, (n) => `armadura:${n}`)
    : armaduras[Math.floor(azar() * armaduras.length)];
  const modo: Modo = azar() < 0.5 ? "mayor" : "menor";
  const correcto = tonoDeArmadura(armadura, modo)!;
  const direccion: Direccion = azar() < 0.5 ? "papel" : "nombre";

  const opciones: Pregunta["opciones"] =
    direccion === "papel"
      ? [correcto, ...confundiblesCon(correcto, 3)].map((t) => ({
          tono: t,
          armadura: armaduraDeTono(t),
          texto: nombreDeTono(t),
        }))
      : [armadura, ...armadurasConfundiblesCon(armadura, 3)].map((n) => ({
          armadura: n,
          texto: n === 0 ? "sin alteraciones" : `${Math.abs(n)} ${n > 0 ? "♯" : "♭"}`,
        }));

  // Mezcla con el mismo azar, para que la primera ronda sea igual en el
  // servidor y en el cliente.
  const mezcladas = opciones
    .map((o, i) => ({ o, i, r: azar() }))
    .sort((a, b) => a.r - b.r)
    .map(({ o }) => o);
  return {
    direccion,
    correcto,
    opciones: mezcladas,
    correcta: mezcladas.findIndex((o) =>
      direccion === "papel" ? o.tono === correcto : o.armadura === armadura,
    ),
  };
}

export default function QueTonalidad() {
  const ronda = useRonda();
  const [pregunta, setPregunta] = useState<Pregunta>(() => armarPregunta(azarSembrado(7), false));
  const [elegida, setElegida] = useState<number | null>(null);
  const [fallidas, setFallidas] = useState<Set<number>>(new Set());

  const armadura = armaduraDeTono(pregunta.correcto);
  const { pista, regla } = leerArmadura(armadura);
  const signos = signosDeArmadura(armadura);
  const resaltado = pista ? signos.findIndex((s) => s.letra === pista.letra) : null;
  const resuelta = elegida !== null;

  // La ronda 1 se cuenta al montar, no al contestar: la pregunta ya está en
  // pantalla, así que el marcador tiene que decir "ronda 1" y no "ronda 0".
  // El ref es por el modo estricto, que corre el efecto dos veces en dev y si
  // no contaría dos rondas de una.
  const contada = useRef(false);
  useEffect(() => {
    if (contada.current) return;
    contada.current = true;
    ronda.arrancar();
  }, [ronda]);

  const elegir = (i: number) => {
    if (resuelta || fallidas.has(i)) return;
    if (i === pregunta.correcta) {
      setElegida(i);
      const limpia = fallidas.size === 0 && ronda.pistas === 0;
      anotar(`armadura:${armadura}`, limpia);
      ronda.cerrar(limpia);
      wakeAudio();
      teclasDeTono(pregunta.correcto, 48).forEach((p, n) =>
        setTimeout(() => playNote(p, 0.35), n * 180),
      );
    } else {
      setFallidas((f) => new Set(f).add(i));
      anotar(`armadura:${armadura}`, false);
    }
  };

  const otra = () => {
    setPregunta(armarPregunta(Math.random, true));
    setElegida(null);
    setFallidas(new Set());
    ronda.arrancar();
  };

  const lista: Pista[] = resuelta
    ? []
    : [
        {
          que: "cuántos son",
          contenido:
            armadura === 0 ? (
              <>no hay ninguna alteración.</>
            ) : (
              <>
                son <strong>{Math.abs(armadura)}</strong>{" "}
                {armadura > 0 ? "sostenidos" : "bemoles"}:{" "}
                {signos.map((s) => escribirNota(s)).join(" · ")}.
              </>
            ),
        },
        { que: "la regla", contenido: regla },
        {
          que: "la tónica",
          contenido: (
            <>
              es <strong>{escribirNota(pregunta.correcto.tonica)}</strong>, y la
              pregunta es por la {pregunta.correcto.modo}.
            </>
          ),
        },
      ];

  return (
    <div className="card overflow-hidden">
      <Marcador ronda={ronda} />

      <div className="p-5">
        <p className="mb-4 text-center text-sm text-humo">
          {pregunta.direccion === "papel" ? (
            <>
              ¿Qué tonalidad anuncia esta armadura? Ojo con la relativa: tiene
              los mismos signos.
            </>
          ) : (
            <>¿Con qué armadura se escribe esta tonalidad?</>
          )}
        </p>

        {/* La consigna */}
        <div className="mx-auto mb-5 w-fit rounded-2xl bg-noche p-4">
          {pregunta.direccion === "papel" ? (
            <ArmaduraSola
              armadura={armadura}
              dosClaves
              alto={1.3}
              resaltar={resuelta || ronda.pistas >= 2 ? resaltado : null}
            />
          ) : (
            <p className="font-display px-6 py-3 text-4xl font-black text-sol">
              {escribirNota(pregunta.correcto.tonica)}{" "}
              <span className="text-2xl">{pregunta.correcto.modo}</span>
            </p>
          )}
        </div>

        {/* Las opciones */}
        <div className="mx-auto grid w-full max-w-lg grid-cols-2 gap-2">
          {pregunta.opciones.map((o, i) => {
            const estado = resuelta
              ? i === pregunta.correcta
                ? "bien"
                : "apagada"
              : fallidas.has(i)
                ? "mal"
                : "viva";
            return (
              <button
                key={i}
                onClick={() => elegir(i)}
                disabled={estado === "apagada" || estado === "mal"}
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                  estado === "bien"
                    ? "bg-menta text-noche"
                    : estado === "mal"
                      ? "bg-brasa/25 text-brasa"
                      : estado === "apagada"
                        ? "bg-carta-2 opacity-40"
                        : "bg-carta-2 hover:bg-borde"
                }`}
              >
                {pregunta.direccion === "nombre" && (
                  <span className="rounded-lg bg-noche/40 p-1">
                    <ArmaduraSola armadura={o.armadura} alto={0.8} />
                  </span>
                )}
                <span className={pregunta.direccion === "nombre" ? "text-xs" : ""}>
                  {o.texto}
                </span>
              </button>
            );
          })}
        </div>

        {!resuelta && (
          <Pistas lista={lista} dadas={ronda.pistas} onPedir={ronda.pedirPista} />
        )}

        {resuelta && (
          <div className="mt-5 text-center">
            <p className="font-display text-2xl font-black text-menta">
              {escribirNota(pregunta.correcto.tonica)} {pregunta.correcto.modo}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-humo">
              {regla}{" "}
              {armadura !== 0 && (
                <>
                  La relativa{" "}
                  {pregunta.correcto.modo === "mayor" ? "menor" : "mayor"} lleva
                  los mismos signos: es{" "}
                  <strong className="text-tiza">
                    {nombreDeTono(
                      tonoDeArmadura(
                        armadura,
                        pregunta.correcto.modo === "mayor" ? "menor" : "mayor",
                      )!,
                    )}
                  </strong>
                  .
                </>
              )}
            </p>
            <button
              onClick={otra}
              className="mt-3 rounded-full bg-menta px-5 py-2 text-sm font-bold text-noche transition hover:brightness-110"
            >
              <Icono de="dado" /> Otra
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
