"use client";

import { useEffect, useRef, useState } from "react";
import { SUSTITUTOS_TRITONALES, type SustitutoTritonal as Sustituto } from "@/lib/grados";
import { chordPitches, deletrearAcorde, escribirNota, mod12, qualityById } from "@/lib/music";
import { playChord, wakeAudio } from "@/lib/audio";
import Keyboard, { type Mark } from "./Keyboard";

/**
 * La sustitución tritonal de la clase 7: cada X7 de Do mayor y el X7 que
 * está a un tritono, que puede ir en su lugar porque comparten las dos notas
 * que empujan. La tabla sale de `DOMINANTES`, no se escribe.
 *
 * Abajo, la ii-V-I con el V7 de siempre y con el sustituto, para escuchar la
 * diferencia que importa: el bajo, que en vez de saltar la quinta baja un
 * semitono hasta la casa.
 */

const BASE = 48; // Do3
const DOM7 = qualityById("dom7")!;
const MIN7 = qualityById("min7")!;
const MAJ = qualityById("maj")!;

export default function SustitucionTritonal() {
  const [marcas, setMarcas] = useState<Mark[]>([]);
  const [sonando, setSonando] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const limpiar = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  /** Suena el dominante (original o sustituto) y un segundo después adonde lleva. */
  const tocar = (s: Sustituto, cual: "original" | "sustituto") => {
    limpiar();
    wakeAudio();
    const raiz = cual === "original" ? s.original.raiz : s.raiz;
    const pitches = chordPitches(BASE + raiz, DOM7);
    const llegada = chordPitches(BASE + s.original.raizDestino, qualityById(s.original.calidadDestino)!);
    playChord(pitches, 1.2);
    setMarcas(
      pitches.map((p) => ({
        pitch: p,
        tone: s.compartidas.includes(mod12(p)) ? "sol" : cual === "original" ? "brasa" : "uva",
      })),
    );
    setSonando(`${s.cifrado}-${cual}`);
    timers.current.push(
      setTimeout(() => {
        playChord(llegada, 1.6);
        setMarcas(llegada.map((p) => ({ pitch: p, tone: "menta" })));
      }, 1000),
    );
    timers.current.push(setTimeout(() => setSonando(null), 2400));
  };

  const Notas = ({ raiz, base, compartidas }: { raiz: number; base?: Parameters<typeof deletrearAcorde>[2]; compartidas: number[] }) => (
    <span className="flex gap-1">
      {deletrearAcorde(raiz, DOM7, base).map((n, i) => {
        const comun = compartidas.includes(n.pc);
        return (
          <span
            key={i}
            className={`rounded-md px-1.5 py-0.5 font-mono text-xs ${
              comun ? "bg-sol/20 font-bold text-sol" : "bg-noche text-tiza"
            }`}
            title={comun ? "La comparten los dos: es lo que hace que se puedan cambiar" : undefined}
          >
            {escribirNota(n)}
          </span>
        );
      })}
    </span>
  );

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-1.5 p-4">
        {SUSTITUTOS_TRITONALES.map((s) => {
          const d = s.original;
          const activoO = sonando === `${s.cifrado}-original`;
          const activoS = sonando === `${s.cifrado}-sustituto`;
          return (
            <div
              key={s.cifrado}
              className={`grid gap-x-3 gap-y-1.5 rounded-xl px-3 py-2 transition sm:grid-cols-[1fr_auto_1fr] sm:items-center ${
                activoO || activoS ? "bg-sol/10" : "bg-carta-2"
              }`}
            >
              <button
                onClick={() => tocar(s, "original")}
                className="flex flex-wrap items-center gap-2 rounded-lg px-1 text-left transition hover:brightness-125"
                title={`Escuchar ${d.cifrado} → ${d.cifradoDestino}`}
              >
                <span className={`font-mono text-xl font-black ${activoO ? "text-sol" : "text-brasa"}`}>{d.cifrado}</span>
                <Notas raiz={d.raiz} compartidas={s.compartidas} />
              </button>
              <span className="text-center font-mono text-sm text-humo">
                → <span className="font-bold text-menta">{d.cifradoDestino}</span> ←
              </span>
              <button
                onClick={() => tocar(s, "sustituto")}
                className="flex flex-wrap items-center gap-2 rounded-lg px-1 text-left transition hover:brightness-125 sm:justify-end"
                title={`Escuchar ${s.cifrado} → ${d.cifradoDestino}`}
              >
                <Notas raiz={s.raiz} base={s.base} compartidas={s.compartidas} />
                <span className={`font-mono text-xl font-black ${activoS ? "text-sol" : "text-uva"}`}>{s.cifrado}</span>
              </button>
            </div>
          );
        })}
      </div>

      <div className="border-t border-borde/60 px-4 pt-3 pb-4">
        <Keyboard from={BASE} to={BASE + 24} marks={marcas} />
        <p className="mt-2 text-center text-[11px] text-humo">
          <span className="text-brasa">■ el dominante</span> · <span className="text-uva">■ el sustituto</span> ·{" "}
          <span className="text-sol">■ las dos que comparten</span> · <span className="text-menta">■ adonde llegan</span>
        </p>
        <p className="mt-3 text-xs leading-relaxed text-humo">
          Las dos notas en amarillo son la tercera y la séptima del uno, que son la séptima y la tercera del
          otro: el mismo tritono adentro, la misma tensión. Por eso el D♭7 se escribe con Do♭ y no con Si
          —es la séptima de Re♭, la letra de abajo— aunque sea la misma tecla. Lo que cambia es el bajo:
          el sustituto está un semitono arriba de adonde va, y baja.
        </p>
      </div>

      <LaVuelta />
    </div>
  );
}

// ---------------------------------------------------------------------------
// La ii-V-I con y sin
// ---------------------------------------------------------------------------

const SLOT = 1000;

function LaVuelta() {
  const [sonando, setSonando] = useState<string | null>(null);
  const [marcas, setMarcas] = useState<Mark[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const g7 = SUSTITUTOS_TRITONALES.find((s) => s.original.cifrado === "G7")!;

  const vueltas = {
    original: [
      { cifrado: "Dm7", bajo: "Re", pitches: chordPitches(BASE + 2, MIN7), tone: "luna" as const },
      { cifrado: "G7", bajo: "Sol", pitches: chordPitches(BASE + 7, DOM7), tone: "brasa" as const },
      { cifrado: "C", bajo: "Do", pitches: chordPitches(BASE + 12, MAJ), tone: "menta" as const },
    ],
    sustituto: [
      { cifrado: "Dm7", bajo: "Re", pitches: chordPitches(BASE + 2, MIN7), tone: "luna" as const },
      // El D♭7 una octava arriba de su Do♯3 para que el bajo baje de verdad: Re → Re♭ → Do.
      { cifrado: g7.cifrado, bajo: escribirNota(g7.base), pitches: chordPitches(BASE + 13, DOM7), tone: "uva" as const },
      { cifrado: "C", bajo: "Do", pitches: chordPitches(BASE + 12, MAJ), tone: "menta" as const },
    ],
  };

  const escuchar = (cual: keyof typeof vueltas) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    wakeAudio();
    vueltas[cual].forEach((a, i) => {
      timers.current.push(
        setTimeout(() => {
          playChord(a.pitches, (SLOT / 1000) * (i === 2 ? 1.8 : 1.05));
          setMarcas(a.pitches.map((p) => ({ pitch: p, tone: a.tone })));
          setSonando(`${cual}-${i}`);
        }, i * SLOT),
      );
    });
    timers.current.push(
      setTimeout(() => {
        setSonando(null);
        setMarcas([]);
      }, 3 * SLOT + 600),
    );
  };

  return (
    <div className="border-t border-borde/60 p-4">
      <p className="mb-3 text-sm font-semibold text-tiza">La ii – V – I, con el de siempre y con el sustituto</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["original", "sustituto"] as const).map((cual) => (
          <div key={cual} className="rounded-2xl border border-borde/60 bg-carta-2 p-3">
            <div className="flex flex-wrap items-center gap-1.5 font-mono">
              {vueltas[cual].map((a, i) => (
                <span
                  key={i}
                  className={`rounded-lg px-2.5 py-1 text-base font-bold transition ${
                    sonando === `${cual}-${i}` ? "bg-sol text-noche" : "bg-noche text-tiza"
                  }`}
                >
                  {a.cifrado}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-humo">
              el bajo:{" "}
              <span className="font-mono text-tiza">
                {vueltas[cual].map((a) => a.bajo).join(" · ")}
              </span>
              {cual === "original" ? " — salta la quinta para caer en casa." : " — baja de a semitonos hasta la casa."}
            </p>
            <button
              onClick={() => escuchar(cual)}
              className={`mt-3 rounded-full px-4 py-2 text-sm font-bold transition ${
                cual === "original" ? "bg-carta text-tiza hover:bg-borde" : "bg-sol text-noche hover:brightness-110"
              }`}
            >
              ▶ {cual === "original" ? "Con el G7" : `Con el ${g7.cifrado}`}
            </button>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl bg-noche-2 p-3">
        <Keyboard from={BASE} to={BASE + 24} marks={marcas} />
      </div>
    </div>
  );
}
