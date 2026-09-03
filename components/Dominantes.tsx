"use client";

import { useEffect, useRef, useState } from "react";
import {
  DOMINANTES,
  PROGRESIONES,
  TONALIDAD_MAYOR,
  destinoDadoVuelta,
  dominanteDelGrado,
  raizDelGrado,
  type Dominante,
} from "@/lib/grados";
import {
  chordPitches,
  chordSymbol,
  deletrearAcorde,
  escribirNota,
  mod12,
  qualityById,
} from "@/lib/music";
import { playChord, wakeAudio } from "@/lib/audio";
import Keyboard, { type Mark } from "./Keyboard";

/**
 * Los dominantes secundarios de la clase 5, en dos mitades.
 *
 * La tabla: sobre cada nota de Do mayor el X7 y adónde lleva, para escuchar
 * la llegada de a una. El teclado de abajo muestra el acorde que está sonando
 * con la nota ajena a la escala pintada distinto — el Fa♯ del D7, el Do♯ del
 * A7 — porque esa nota es toda la gracia: es lo que el dominante trae de la
 * tonalidad adonde apunta. Cada fila tiene además el destino dado vuelta
 * (el D en vez del Dm), que es la manera de oír cuándo un dominante se va
 * del campo — lo que el profe llamó *efectivo*.
 *
 * La vuelta: una progresión de las de siempre, y entre acorde y acorde el
 * botón para meter el dominante del que viene. Se escucha con y sin, que es
 * la única forma de entender para qué sirve un acorde de paso. El de paso
 * ocupa la segunda mitad del compás anterior: no agrega compases, los parte.
 */

const BASE = 48; // Do3
const DOM7 = qualityById("dom7")!;

const TIPO: Record<Dominante["tipo"], { nombre: string; chip: string; detalle: string }> = {
  principal: {
    nombre: "principal",
    chip: "bg-menta/20 text-menta",
    detalle: "El V7 de la tonalidad: el de siempre.",
  },
  secundario: {
    nombre: "secundario",
    chip: "bg-sol/20 text-sol",
    detalle: "Lleva a otro acorde del campo, como el G7 lleva a Do.",
  },
  efectivo: {
    nombre: "efectivo",
    chip: "bg-brasa/20 text-brasa",
    detalle: "Lleva a un acorde que Do mayor no tiene: se va a otro campo armónico.",
  },
};

export default function Dominantes() {
  const [modo, setModo] = useState<"tabla" | "vuelta">("tabla");

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-borde/60 p-4">
        {(["tabla", "vuelta"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setModo(m)}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
              modo === m ? "bg-tiza text-noche" : "bg-carta-2 text-humo hover:text-tiza"
            }`}
          >
            {m === "tabla" ? "la tabla" : "meterlos en la vuelta"}
          </button>
        ))}
        <span className="ml-auto hidden text-xs text-humo sm:block">
          {modo === "tabla"
            ? "cada X7 de Do mayor y adónde lleva"
            : "una progresión, con y sin los de paso"}
        </span>
      </div>

      {modo === "tabla" ? <Tabla /> : <Vuelta />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// La tabla
// ---------------------------------------------------------------------------

function Tabla() {
  const [marcas, setMarcas] = useState<Mark[]>([]);
  const [sonando, setSonando] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const limpiar = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  /** Suena el X7 y, un segundo después, adonde lleva. */
  const tocar = (d: Dominante, dadoVuelta = false) => {
    limpiar();
    wakeAudio();
    const clave = `${d.cifrado}${dadoVuelta ? "-vuelta" : ""}`;
    const x7 = chordPitches(BASE + d.raiz, DOM7);
    const calidad = dadoVuelta ? destinoDadoVuelta(d).calidad : d.calidadDestino;
    const llegada = chordPitches(BASE + d.raizDestino, qualityById(calidad)!);

    playChord(x7, 1.2);
    setMarcas(
      x7.map((p) => ({ pitch: p, tone: d.ajenas.includes(mod12(p)) ? "brasa" : "sol" })),
    );
    setSonando(clave);
    timers.current.push(
      setTimeout(() => {
        playChord(llegada, 1.6);
        setMarcas(llegada.map((p) => ({ pitch: p, tone: "menta" })));
      }, 1000),
    );
    timers.current.push(setTimeout(() => setSonando(null), 2400));
  };

  return (
    <div>
      <div className="flex flex-col gap-1.5 p-4">
        {DOMINANTES.map((d) => {
          const tipo = TIPO[d.tipo];
          const vuelta = destinoDadoVuelta(d);
          const activo = sonando === d.cifrado;
          const activoVuelta = sonando === `${d.cifrado}-vuelta`;
          return (
            <div
              key={d.cifrado}
              className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl px-3 py-2 transition ${
                activo || activoVuelta ? "bg-sol/10" : "bg-carta-2"
              }`}
            >
              <button
                onClick={() => tocar(d)}
                className="flex items-baseline gap-2 rounded-lg px-1 text-left transition hover:brightness-125"
                title={`Escuchar ${d.cifrado} → ${d.cifradoDestino}`}
              >
                <span className="font-mono text-xl font-black text-brasa">{d.cifrado}</span>
                <span className="text-humo">→</span>
                <span
                  className={`font-mono text-xl font-bold ${
                    d.tipo === "efectivo" ? "text-brasa/80" : "text-menta"
                  }`}
                >
                  {d.cifradoDestino}
                </span>
              </button>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase ${tipo.chip}`}
                title={tipo.detalle}
              >
                {tipo.nombre}
              </span>

              {/* Las notas del X7, con la ajena pintada */}
              <span className="flex gap-1 sm:ml-auto">
                {deletrearAcorde(d.raiz, DOM7).map((n, i) => {
                  const ajena = d.ajenas.includes(n.pc);
                  return (
                    <span
                      key={i}
                      className={`rounded-md px-1.5 py-0.5 font-mono text-xs ${
                        ajena ? "bg-brasa/20 font-bold text-brasa" : "bg-noche text-tiza"
                      }`}
                      title={ajena ? "No está en Do mayor: es la nota que el dominante trae" : undefined}
                    >
                      {escribirNota(n)}
                    </span>
                  );
                })}
              </span>

              {d.tipo !== "efectivo" && (
                <button
                  onClick={() => tocar(d, true)}
                  className={`rounded-lg px-2 py-1 font-mono text-xs transition ${
                    activoVuelta
                      ? "bg-brasa/20 text-brasa"
                      : "bg-noche text-humo hover:text-tiza"
                  }`}
                  title={`El destino dado vuelta: ${vuelta.cifrado} no está en Do mayor, así que acá el ${d.cifrado} se vuelve efectivo`}
                >
                  → {vuelta.cifrado}
                  <span className="ml-1 text-[10px] tracking-wider uppercase opacity-70">efectivo</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-borde/60 px-4 pt-3 pb-4">
        <Keyboard from={BASE} to={BASE + 24} marks={marcas} />
        <p className="mt-2 text-center text-[11px] text-humo">
          <span className="text-sol">■ el X7</span> ·{" "}
          <span className="text-brasa">■ la nota que Do mayor no tiene</span> ·{" "}
          <span className="text-menta">■ adonde llega</span>
        </p>
        <p className="mt-3 text-xs leading-relaxed text-humo">
          El F7 está en la tabla y no en la lista de la clase: la cuenta sobre Fa da un
          dominante igual que los demás, pero cae en Si♭, que Do mayor no tiene. Del
          Bdim no hay X7, porque el que le tocaría —Fa♯7— no se arma sobre ninguna
          nota de la escala.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// La vuelta
// ---------------------------------------------------------------------------

const SLOT = 1000; // ms por acorde de la progresión

function Vuelta() {
  const [prog, setProg] = useState(2); // I – IV – V – I: la más fácil de oír
  /** Antes de qué acordes (por índice) va metido su dominante. */
  const [puestos, setPuestos] = useState<Set<number>>(new Set());
  const [sonando, setSonando] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const grados = PROGRESIONES[prog].grados;

  const acordeDe = (g: number) => {
    const quality = qualityById(TONALIDAD_MAYOR[g].triada)!;
    const raiz = raizDelGrado(0, g);
    return { pitches: chordPitches(BASE + raiz, quality), cifrado: chordSymbol(raiz, quality) };
  };

  const limpiar = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setSonando(null);
  };

  const elegir = (i: number) => {
    limpiar();
    setProg(i);
    setPuestos(new Set());
  };

  const alternar = (i: number) => {
    limpiar();
    wakeAudio();
    const d = dominanteDelGrado(grados[i]);
    if (!d) return;
    setPuestos((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else {
        n.add(i);
        playChord(chordPitches(BASE + d.raiz, DOM7), 0.9);
      }
      return n;
    });
  };

  const todos = () => {
    limpiar();
    const todosLosQueSePueden = grados
      .map((g, i) => (i > 0 && dominanteDelGrado(g) ? i : -1))
      .filter((i) => i >= 0);
    setPuestos(
      puestos.size === todosLosQueSePueden.length ? new Set() : new Set(todosLosQueSePueden),
    );
  };

  /**
   * La progresión, con o sin los de paso. El de paso va en la segunda mitad
   * del compás anterior, así que el acorde de antes se acorta y el total no
   * cambia: la vuelta sigue midiendo lo mismo, sólo que más llena.
   */
  const escuchar = (conPaso: boolean) => {
    limpiar();
    wakeAudio();
    let t = 0;
    grados.forEach((g, i) => {
      const d = conPaso && puestos.has(i + 1) ? dominanteDelGrado(grados[i + 1]) : null;
      const dur = d ? SLOT / 2 : SLOT;
      const { pitches } = acordeDe(g);
      const ti = t;
      timers.current.push(
        setTimeout(() => {
          playChord(pitches, (dur / 1000) * 1.05);
          setSonando(`${i}`);
        }, ti),
      );
      t += dur;
      if (d) {
        const x7 = chordPitches(BASE + d.raiz, DOM7);
        const td = t;
        timers.current.push(
          setTimeout(() => {
            playChord(x7, (SLOT / 2 / 1000) * 1.05);
            setSonando(`d${i + 1}`);
          }, td),
        );
        t += SLOT / 2;
      }
    });
    timers.current.push(setTimeout(() => setSonando(null), t + 300));
  };

  const linea = grados.flatMap((g, i) => {
    const d = i > 0 && puestos.has(i) ? dominanteDelGrado(g) : null;
    return d ? [d.cifrado, acordeDe(g).cifrado] : [acordeDe(g).cifrado];
  });

  return (
    <div className="p-4">
      {/* Qué progresión */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {PROGRESIONES.map((p, i) => (
          <button
            key={p.nombre}
            onClick={() => elegir(i)}
            className={`rounded-xl px-3 py-1.5 font-mono text-xs font-bold transition ${
              prog === i ? "bg-tiza text-noche" : "bg-carta-2 text-humo hover:text-tiza"
            }`}
          >
            {p.nombre}
          </button>
        ))}
      </div>

      {/* La vuelta, con el botón de paso entre acorde y acorde */}
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {grados.map((g, i) => {
          const { cifrado } = acordeDe(g);
          const d = i > 0 ? dominanteDelGrado(g) : null;
          const puesto = d !== null && puestos.has(i);
          return (
            <div key={i} className="flex items-center gap-1.5">
              {d && (
                <button
                  onClick={() => alternar(i)}
                  className={`rounded-xl border px-2.5 py-1.5 font-mono text-sm font-bold transition ${
                    puesto
                      ? sonando === `d${i}`
                        ? "border-brasa bg-brasa text-noche"
                        : "border-brasa/60 border-dashed bg-brasa/15 text-brasa"
                      : "border-borde/60 border-dashed bg-transparent text-humo/50 hover:text-humo"
                  }`}
                  title={
                    puesto
                      ? `Sacar el ${d.cifrado}`
                      : `Meter el ${d.cifrado} antes del ${cifrado}${
                          d.tipo === "principal" ? " (es el principal)" : ""
                        }`
                  }
                >
                  {puesto ? d.cifrado : `+ ${d.cifrado}`}
                </button>
              )}
              <span
                className={`rounded-xl px-3 py-2 font-mono text-base font-bold transition ${
                  sonando === `${i}` ? "bg-sol text-noche" : "bg-carta-2 text-tiza"
                }`}
              >
                {cifrado}
                <span className="ml-1.5 text-[11px] font-normal opacity-70">
                  {TONALIDAD_MAYOR[g].cifra}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-center font-mono text-sm text-humo">
        {linea.join(" · ")}
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => escuchar(false)}
          className="rounded-full bg-carta-2 px-4 py-2 text-sm font-semibold text-humo transition hover:text-tiza"
        >
          ▶ Sin los de paso
        </button>
        <button
          onClick={() => escuchar(true)}
          disabled={puestos.size === 0}
          className="rounded-full bg-sol px-5 py-2 text-sm font-bold text-noche transition hover:brightness-110 disabled:opacity-40"
        >
          ▶ Con los de paso
        </button>
        <button
          onClick={todos}
          className="rounded-xl bg-carta-2 px-3 py-1.5 text-xs font-semibold text-humo transition hover:text-tiza"
        >
          {puestos.size > 0 ? "sacar todos" : "meter todos"}
        </button>
      </div>
      <p className="mt-4 text-center text-xs leading-relaxed text-humo">
        El de paso ocupa la segunda mitad del compás anterior: la vuelta dura lo mismo,
        pero cada llegada viene preparada. Con todos puestos se escucha por qué son de
        paso y no de quedarse.
      </p>
    </div>
  );
}
