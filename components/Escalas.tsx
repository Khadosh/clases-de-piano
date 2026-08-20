"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icono from "./Icono";
import Keyboard, { type Mark } from "./Keyboard";
import Midi from "./Midi";
import Pistas, { type Pista } from "./Pistas";
import { escribirNota, mod12, noteName, raizEscrita } from "@/lib/music";
import {
  ESCALAS,
  notasDeEscala,
  saltosDeEscala,
  type Escala,
} from "@/lib/escalas";
import { playNote, wakeAudio } from "@/lib/audio";
import { useMidi } from "@/lib/useMidi";

/**
 * Las escalas: se dan el tono y el tipo, y hay que tocarlas de la tónica a la
 * octava.
 *
 * Se corrige **una nota por vez y en orden**, que es distinto de todos los
 * ejercicios de acordes: acá el orden es el ejercicio. La octava no importa —
 * es una figura de dedos igual que el de posiciones— y por eso se compara por
 * clase de altura.
 *
 * No hay digitación y no es un olvido: la digitación de una escala no sale de
 * la receta, es una tabla por tonalidad y por mano. Ponerla mal enseñaría algo
 * peor que no ponerla, así que queda para preguntarle al profe.
 */

const BASE = 48; // Do3

export default function Escalas() {
  const [escala, setEscala] = useState<Escala>(ESCALAS[0]);
  const [tonica, setTonica] = useState(0);
  const [i, setI] = useState(0);
  const [pistas, setPistas] = useState(0);
  const [errores, setErrores] = useState(0);
  const [ultimoError, setUltimoError] = useState<number | null>(null);

  const notas = useMemo(
    () => notasDeEscala(BASE + tonica, escala),
    [tonica, escala],
  );
  const terminada = i >= notas.length;

  const reiniciar = useCallback(() => {
    setI(0);
    setPistas(0);
    setErrores(0);
    setUltimoError(null);
  }, []);

  useEffect(reiniciar, [escala, tonica, reiniciar]);

  const notasRef = useRef(notas);
  notasRef.current = notas;
  const iRef = useRef(i);
  iRef.current = i;

  /**
   * Una nota tocada. Se compara por clase y **sólo con la que toca**: acá no va
   * la ventana de resync del micrófono, porque saltearse una nota de una escala
   * es exactamente el error que el ejercicio busca.
   */
  const contar = useCallback((midi: number) => {
    const n = iRef.current;
    const esperada = notasRef.current[n];
    if (esperada === undefined) return;
    if (mod12(midi) === mod12(esperada)) {
      setUltimoError(null);
      playNote(esperada, 0.5);
      setI(n + 1);
    } else {
      setUltimoError(midi);
      setErrores((e) => e + 1);
    }
  }, []);

  const caja = useRef<HTMLDivElement>(null);
  const { estado: estadoMidi, dispositivos } = useMidi({
    caja,
    onNota: ({ midi }) => contar(midi),
  });

  const tocarEntera = () => {
    wakeAudio();
    notas.forEach((p, n) => setTimeout(() => playNote(p, 0.45), n * 320));
  };

  const saltos = saltosDeEscala(escala);

  const marks: Mark[] = [];
  // Las que ya tocaste, en verde, y la que va, encendida.
  for (let n = 0; n < Math.min(i, notas.length); n++) {
    marks.push({ pitch: notas[n], tone: "menta", ghost: true });
  }
  if (!terminada) {
    marks.push({ pitch: notas[i], tone: "sol", active: true, label: String(i + 1) });
  }
  if (ultimoError !== null) {
    const dentro = [ultimoError - 12, ultimoError, ultimoError + 12].find(
      (p) => p >= 45 && p <= 84,
    );
    if (dentro !== undefined) marks.push({ pitch: dentro, tone: "brasa", label: "✗" });
  }

  const listaDePistas: Pista[] = terminada
    ? []
    : [
        {
          que: "la receta",
          contenido: (
            <>
              <strong className="font-mono">{escala.receta}</strong> — T es un
              tono (dos teclas) y s un semitono (la de al lado, sea blanca o
              negra). {escala.vibe}
            </>
          ),
        },
        {
          que: "la que va",
          contenido:
            i === 0 ? (
              <>
                la tónica: <strong>{escribirNota(raizEscrita(tonica))}</strong>.
              </>
            ) : (
              <>
                desde {noteName(notas[i - 1])}, subí{" "}
                <strong>
                  {saltos[i - 1] === 1 ? "un semitono" : `${saltos[i - 1] / 2 === 1 ? "un tono" : `${saltos[i - 1]} semitonos`}`}
                </strong>
                : es <strong>{noteName(notas[i])}</strong>.
              </>
            ),
        },
      ];

  return (
    <div ref={caja} className="card overflow-hidden">
      {/* Tipo de escala */}
      <div className="flex flex-wrap gap-1.5 border-b border-borde/60 p-4">
        {ESCALAS.map((e) => (
          <button
            key={e.id}
            onClick={() => setEscala(e)}
            className={`rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
              escala.id === e.id
                ? "bg-tiza text-noche"
                : "bg-carta-2 text-humo hover:text-tiza"
            }`}
          >
            {e.nombre}
            <span className="ml-1.5 font-mono text-[11px] opacity-70">
              {e.receta}
            </span>
          </button>
        ))}
      </div>

      {/* Tónica */}
      <div className="border-b border-borde/60 p-4">
        <p className="mb-2 text-xs tracking-[0.2em] text-humo uppercase">
          Tónica
        </p>
        <div className="space-y-1.5">
          <div className="flex gap-1.5 pl-[9%]">
            {[1, 3, null, 6, 8, 10].map((pc, n) =>
              pc === null ? (
                <span key={`h${n}`} className="w-[9%] shrink-0" />
              ) : (
                <BotonTonica
                  key={pc}
                  pc={pc}
                  activo={tonica === pc}
                  negra
                  onClick={() => setTonica(pc)}
                />
              ),
            )}
          </div>
          <div className="flex gap-1.5">
            {[0, 2, 4, 5, 7, 9, 11].map((pc) => (
              <BotonTonica
                key={pc}
                pc={pc}
                activo={tonica === pc}
                onClick={() => setTonica(pc)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="mb-4 text-center">
          <p className="text-xs tracking-[0.25em] text-humo uppercase">
            {escribirNota(raizEscrita(tonica), "en")} {escala.nombre.toLowerCase()}
          </p>
          {terminada ? (
            <>
              <p className="font-display my-2 text-4xl font-black text-menta">
                {errores === 0 ? <>Entera y limpia <Icono de="festejo" /></> : "Entera"}
              </p>
              <p className="text-sm text-humo">
                {errores === 0
                  ? "Ocho notas sin pisar una que no era."
                  : `Con ${errores} ${errores === 1 ? "nota" : "notas"} al lado.`}
              </p>
            </>
          ) : (
            <>
              <p className="font-display my-2 text-5xl font-black text-sol">
                {noteName(notas[i])}
              </p>
              <p className="text-sm text-humo">
                Nota {i + 1} de {notas.length}. Tocá la escala subiendo, de la
                tónica a la octava. La octava del piano no importa: importa la
                nota.
              </p>
            </>
          )}
        </div>

        <div className="rounded-2xl bg-noche-2 p-3">
          <Keyboard
            from={45}
            to={84}
            marks={marks}
            paraTocar
            onKeyPress={terminada ? undefined : contar}
          />
        </div>

        {!terminada && (
          <Pistas
            lista={listaDePistas}
            dadas={pistas}
            onPedir={() => setPistas((x) => x + 1)}
          />
        )}

        <Midi
          estado={estadoMidi}
          dispositivos={dispositivos}
          pista="— tocá la escala en el piano"
          invitacion="¿Tenés un teclado? Conectalo y tocá la escala de verdad"
          cierre="Con el teclado conectado, la escala se toca con los dedos y la app va marcando nota por nota."
        />

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            onClick={tocarEntera}
            className="rounded-full bg-menta px-4 py-2 text-sm font-bold text-noche transition hover:brightness-110"
          >
            <Icono de="parlante" /> Escucharla entera
          </button>
          <button
            onClick={reiniciar}
            className="rounded-full bg-carta-2 px-4 py-2 text-sm font-bold transition hover:bg-borde"
          >
            ↺ Desde la tónica
          </button>
          <button
            onClick={() => setTonica(Math.floor(Math.random() * 12))}
            className="rounded-full bg-carta-2 px-4 py-2 text-sm font-bold transition hover:bg-borde"
          >
            <Icono de="dado" /> Otra tónica
          </button>
        </div>

        {/* Las distancias, que es de donde sale todo */}
        <div className="mt-5 overflow-x-auto rounded-2xl bg-noche-2 p-4">
          <div className="flex min-w-max items-center gap-1 font-mono text-sm">
            {notas.map((p, n) => (
              <span key={n} className="flex items-center gap-1">
                <span
                  className={
                    n < i ? "text-menta" : n === i ? "text-sol" : "text-humo"
                  }
                >
                  {noteName(p)}
                </span>
                {n < saltos.length && (
                  <span className="rounded bg-carta-2 px-1.5 text-[11px] text-humo">
                    {saltos[n] === 1 ? "s" : saltos[n] === 2 ? "T" : "T+s"}
                  </span>
                )}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm text-humo">
            Una escala es una forma de repartir la octava: los saltos suman 12
            siempre. {escala.vibe}
          </p>
          <p className="mt-2 text-xs text-humo">
            La digitación no está y no es un olvido: no se deduce de la receta,
            es una tabla por tonalidad y por mano. Queda para preguntarle al
            profe.
          </p>
        </div>
      </div>
    </div>
  );
}

function BotonTonica({
  pc,
  activo,
  negra = false,
  onClick,
}: {
  pc: number;
  activo: boolean;
  negra?: boolean;
  onClick: () => void;
}) {
  const nota = raizEscrita(pc);
  return (
    <button
      onClick={onClick}
      className={`min-w-0 flex-1 rounded-xl px-1 py-2.5 transition ${
        activo
          ? "bg-sol text-noche"
          : negra
            ? "bg-noche-2 text-humo hover:text-tiza"
            : "bg-carta-2 text-humo hover:text-tiza"
      }`}
    >
      <span className="block text-sm font-bold">{escribirNota(nota, "en")}</span>
      <span className="block text-[10px] opacity-70">{escribirNota(nota)}</span>
    </button>
  );
}
