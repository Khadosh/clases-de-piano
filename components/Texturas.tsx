"use client";

import { useEffect, useRef, useState } from "react";
import { PROGRESIONES, TONALIDAD_MAYOR, raizDelGrado } from "@/lib/grados";
import { chordSymbol, qualityById } from "@/lib/music";
import {
  FRASE_ACORDES,
  PULSOS_DE_FRASE,
  TEXTURAS_PIANO,
  TIPOS_DE_TEXTURA,
  compasDe,
  repartir,
  vestir,
  type Evento,
  type TexturaPiano,
  type TipoDeTextura,
} from "@/lib/texturas";
import { getAudioContext, playChord, wakeAudio } from "@/lib/audio";
import Keyboard, { type Mark } from "./Keyboard";

/**
 * Las texturas de la clase 7, en dos mitades.
 *
 * Los cuatro tipos: la misma frase de cuatro compases vestida de monofonía,
 * melodía acompañada, homofonía y polifonía. Cambia todo menos la melodía,
 * que es la manera de escuchar qué es cada cosa.
 *
 * En el piano: una progresión tocada en plaqué, pum-chá o arpegios, en loop,
 * con el teclado mostrando qué mano pone qué. Es lo que se hace con la
 * izquierda mientras la derecha canta, y es lo que hay que tener en los dedos.
 */

/** Cuánto para adelante se agenda, en segundos. Mucho más que el tick del timer. */
const VENTANA = 0.25;
const TICK_MS = 60;

interface Pasada {
  eventos: Evento[];
  /** Cuánto dura la vuelta entera, en pulsos. */
  largo: number;
  bpm: number;
  loop: boolean;
  mostrar: (sonando: Evento[], pulso: number) => void;
  alTerminar: () => void;
}

/**
 * Los dos relojes, en chico: un timer impreciso agenda contra el reloj del
 * audio lo que cae en la ventana que viene, y un requestAnimationFrame mira
 * qué está sonando para pintarlo. Devuelve cómo pararlo.
 */
function arrancar({ eventos, largo, bpm, loop, mostrar, alTerminar }: Pasada): () => void {
  const ctx = getAudioContext();
  if (!ctx) return () => {};
  const orden = [...eventos].sort((a, b) => a.t - b.t);
  const segPorPulso = 60 / bpm;
  const arranque = ctx.currentTime + 0.15;
  let proximo = 0;
  let vuelta = 0;
  let agotado = false;

  const agendar = () => {
    while (!agotado) {
      const e = orden[proximo];
      const cuando = arranque + (vuelta * largo + e.t) * segPorPulso;
      if (cuando > ctx.currentTime + VENTANA) break;
      playChord(e.pitches, Math.max(0.12, e.dur * segPorPulso * 0.95), cuando);
      proximo++;
      if (proximo >= orden.length) {
        proximo = 0;
        vuelta++;
        if (!loop) agotado = true;
      }
    }
  };
  agendar();
  const timer = setInterval(agendar, TICK_MS);

  let raf = 0;
  const mirar = () => {
    const pulsos = (ctx.currentTime - arranque) / segPorPulso;
    if (pulsos >= 0) {
      if (!loop && pulsos >= largo) {
        clearInterval(timer);
        mostrar([], -1);
        alTerminar();
        return;
      }
      const p = loop ? pulsos % largo : pulsos;
      mostrar(
        orden.filter((e) => e.t <= p && p < e.t + e.dur),
        p,
      );
    }
    raf = requestAnimationFrame(mirar);
  };
  raf = requestAnimationFrame(mirar);

  return () => {
    clearInterval(timer);
    cancelAnimationFrame(raf);
    // Lo ya agendado se apaga solo: playChord lleva su duración, y es a lo
    // sumo un compás.
  };
}

const marcasDe = (sonando: Evento[]): Mark[] =>
  sonando.flatMap((e) =>
    e.pitches.map((p) => ({ pitch: p, tone: e.mano === "izquierda" ? ("izq" as const) : ("der" as const) })),
  );

export default function Texturas() {
  const [modo, setModo] = useState<"tipos" | "piano">("piano");
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-borde/60 p-4">
        {(["piano", "tipos"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setModo(m)}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
              modo === m ? "bg-tiza text-noche" : "bg-carta-2 text-humo hover:text-tiza"
            }`}
          >
            {m === "piano" ? "en el piano" : "los cuatro tipos"}
          </button>
        ))}
        <span className="ml-auto hidden text-xs text-humo sm:block">
          {modo === "piano" ? "plaqué, pum-chá y arpegios sobre una vuelta" : "una frase, cuatro maneras de vestirla"}
        </span>
      </div>
      {modo === "piano" ? <EnElPiano /> : <LosCuatroTipos />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Los cuatro tipos
// ---------------------------------------------------------------------------

const BPM_FRASE = 92;

function LosCuatroTipos() {
  const [tocando, setTocando] = useState<TipoDeTextura | null>(null);
  const [marcas, setMarcas] = useState<Mark[]>([]);
  const [compas, setCompas] = useState(-1);
  const pararRef = useRef<() => void>(() => {});

  useEffect(() => () => pararRef.current(), []);

  const parar = () => {
    pararRef.current();
    pararRef.current = () => {};
    setTocando(null);
    setMarcas([]);
    setCompas(-1);
  };

  const tocar = async (tipo: TipoDeTextura) => {
    parar();
    await wakeAudio();
    setTocando(tipo);
    pararRef.current = arrancar({
      eventos: vestir(tipo),
      largo: FRASE_ACORDES.length * PULSOS_DE_FRASE,
      bpm: BPM_FRASE,
      loop: false,
      mostrar: (sonando, pulso) => {
        setMarcas(marcasDe(sonando));
        setCompas(pulso < 0 ? -1 : Math.floor(pulso / PULSOS_DE_FRASE));
      },
      alTerminar: () => {
        setTocando(null);
        setCompas(-1);
      },
    });
  };

  return (
    <div className="p-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {TIPOS_DE_TEXTURA.map((t) => {
          const activo = tocando === t.id;
          return (
            <button
              key={t.id}
              onClick={() => (activo ? parar() : tocar(t.id))}
              className={`rounded-2xl border p-3 text-left transition ${
                activo ? "border-sol/60 bg-sol/10" : "border-borde/60 bg-carta-2 hover:bg-borde"
              }`}
            >
              <span className="flex items-baseline gap-2">
                <span className={`font-display text-lg font-black ${activo ? "text-sol" : "text-tiza"}`}>
                  {activo ? "■ " : "▶ "}
                  {t.nombre}
                </span>
              </span>
              <span className="mt-1 block text-sm leading-snug text-humo">{t.bajada}</span>
              <span className="mt-1.5 block text-xs text-humo/70 italic">{t.quien}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl bg-noche-2 p-3">
        <Keyboard from={36} to={84} marks={marcas} />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 font-mono text-sm">
        {FRASE_ACORDES.map((c, i) => (
          <span
            key={i}
            className={`rounded-lg px-2.5 py-1 transition ${
              compas === i ? "bg-sol text-noche" : "bg-carta-2 text-humo"
            }`}
          >
            {chordSymbol(c.root, c.quality)}
          </span>
        ))}
      </div>
      <p className="mt-3 text-center text-xs leading-relaxed text-humo">
        <span className="text-menta">■ izquierda</span> · <span className="text-rosa">■ derecha</span>. La
        melodía es la misma en las cuatro: lo que cambia es qué hace todo lo demás. En la homofonía las
        voces de abajo cambian de nota cuando cambia la de arriba; en la polifonía la izquierda tiene su
        propio ritmo y su propia frase.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// En el piano
// ---------------------------------------------------------------------------

function EnElPiano() {
  const [progresion, setProgresion] = useState(0);
  const [conSeptima, setConSeptima] = useState(false);
  const [textura, setTextura] = useState<TexturaPiano>("pum-cha");
  const [bpm, setBpm] = useState(88);
  const [loop, setLoop] = useState(true);
  const [tocando, setTocando] = useState(false);
  const [marcas, setMarcas] = useState<Mark[]>([]);
  const [compas, setCompas] = useState(-1);
  const pararRef = useRef<() => void>(() => {});

  useEffect(() => () => pararRef.current(), []);

  const { grados } = PROGRESIONES[progresion];
  const acordes = grados.map((g) => {
    const q = qualityById(conSeptima ? TONALIDAD_MAYOR[g].cuatriada : TONALIDAD_MAYOR[g].triada)!;
    const raiz = raizDelGrado(0, g);
    return { cifrado: chordSymbol(raiz, q), repartido: repartir(raiz, q), cifra: TONALIDAD_MAYOR[g].cifra };
  });

  /** La vuelta entera: un compás por acorde, con la textura elegida. */
  const eventos = acordes.flatMap((a, i) =>
    compasDe(textura, a.repartido).map((e) => ({ ...e, t: e.t + i * 4 })),
  );

  const parar = () => {
    pararRef.current();
    pararRef.current = () => {};
    setTocando(false);
    setMarcas([]);
    setCompas(-1);
  };

  const tocar = async () => {
    parar();
    await wakeAudio();
    setTocando(true);
    pararRef.current = arrancar({
      eventos,
      largo: acordes.length * 4,
      bpm,
      loop,
      mostrar: (sonando, pulso) => {
        setMarcas(marcasDe(sonando));
        setCompas(pulso < 0 ? -1 : Math.floor(pulso / 4));
      },
      alTerminar: () => setTocando(false),
    });
  };

  // Cambiar algo mientras suena rearma la pasada con lo nuevo, sin que haya
  // que parar y volver a apretar.
  const cambiar = (fn: () => void) => {
    const estaba = tocando;
    parar();
    fn();
    if (estaba) setTimeout(tocar, 0);
  };

  return (
    <div className="p-4">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {PROGRESIONES.map((p, i) => (
          <button
            key={p.nombre}
            onClick={() => cambiar(() => setProgresion(i))}
            className={`rounded-xl px-3 py-1.5 font-mono text-xs font-bold transition ${
              progresion === i ? "bg-tiza text-noche" : "bg-carta-2 text-humo hover:text-tiza"
            }`}
          >
            {p.nombre}
          </button>
        ))}
        <button
          onClick={() => cambiar(() => setConSeptima((s) => !s))}
          className={`ml-auto rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
            conSeptima ? "bg-uva/25 text-uva" : "bg-carta-2 text-humo hover:text-tiza"
          }`}
        >
          {conSeptima ? "con séptima" : "tríadas"}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TEXTURAS_PIANO.map((t) => (
          <button
            key={t.id}
            onClick={() => cambiar(() => setTextura(t.id))}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
              textura === t.id ? "bg-tiza text-noche" : "bg-carta-2 text-humo hover:text-tiza"
            }`}
          >
            {t.nombre}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-humo">{TEXTURAS_PIANO.find((t) => t.id === textura)?.bajada}</p>

      {/* Desde Sol1: el bajo de La♭, La, Si♭ y Si cae abajo del Do2, y una
          tecla que no entra no se dibuja mal, no se dibuja. */}
      <div className="mt-4 rounded-2xl bg-noche-2 p-3">
        <Keyboard from={31} to={84} marks={marcas} />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 font-mono text-sm">
        {acordes.map((a, i) => (
          <span
            key={i}
            className={`rounded-lg px-2.5 py-1 transition ${
              compas === i ? "bg-sol text-noche" : "bg-carta-2 text-humo"
            }`}
          >
            {a.cifrado}
            <span className="ml-1 text-[10px] opacity-70">{a.cifra}</span>
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => (tocando ? parar() : tocar())}
          className={`rounded-full px-5 py-2 text-sm font-bold transition ${
            tocando ? "bg-brasa text-noche" : "bg-sol text-noche hover:brightness-110"
          }`}
        >
          {tocando ? "■ Parar" : "▶ Tocar la vuelta"}
        </button>
        <button
          onClick={() => cambiar(() => setLoop((l) => !l))}
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
            loop ? "bg-tiza text-noche" : "bg-carta-2 text-humo hover:text-tiza"
          }`}
        >
          en loop
        </button>
        <label className="flex items-center gap-2 text-xs text-humo">
          <span className="font-mono">{bpm} bpm</span>
          <input
            type="range"
            min={56}
            max={140}
            value={bpm}
            onChange={(e) => cambiar(() => setBpm(Number(e.target.value)))}
            className="w-28 accent-sol"
          />
        </label>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-humo">
        <span className="text-menta">■ izquierda</span> · <span className="text-rosa">■ derecha</span>. En el
        pum-chá el acorde de la derecha va girado para caer cerca del anterior; en los arpegios el orden es
        el de la clase, 1 · 5 · 3 · 7, y con tríadas la octava hace de séptima.
      </p>
    </div>
  );
}
