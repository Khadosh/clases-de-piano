"use client";

import { useEffect, useRef, useState } from "react";
import Icono from "./Icono";
import Keyboard from "./Keyboard";
import Midi from "./Midi";
import SelectorDeAcordes from "./SelectorDeAcordes";
import {
  PROGRESIONES,
  cifradoDelAcorde,
  clasesDelAcorde,
  midisDelAcorde,
  raizDelAcorde,
  type AcordeDeLaSecuencia,
} from "@/lib/grados";
import { candidatosDelAcorde, midiDeNota, notaDeTecla } from "@/lib/melodia";
import { LETRAS_ES, mod12, noteName } from "@/lib/music";

/** El nombre de una tecla, con el bemol que el modelo sabe escribir. */
const nombreDeTeclaLocal = (midi: number) => {
  const n = notaDeTecla(midi);
  if (n) return `${LETRAS_ES[((n.d % 7) + 7) % 7]}${n.b ? "♭" : ""}`;
  return noteName(midi);
};
import { useMidi } from "@/lib/useMidi";
import {
  getAudioContext,
  playChord,
  playClick,
  playNote,
  wakeAudio,
} from "@/lib/audio";

/**
 * Tocarla encima: la progresión suena en loop y la melodía la ponés vos, en
 * el piano de verdad o en el teclado de la pantalla.
 *
 * Es la otra mitad del ejercicio de melodía — la de los dedos. La idea es la
 * de las pistas de acompañamiento de toda la vida (iReal Pro y familia), con
 * nuestro veredicto arriba: cada nota que tocás se puntúa en vivo contra el
 * acorde que está sonando —del acorde, de paso o en el aire— y en cada cambio
 * se mira el aterrizaje: si la primera nota del compás es del acorde que
 * llega. Puntúa y no corrige, como todo acá: muchas melodías están igual de
 * bien.
 *
 * La cuenta previa y el pulso van con el metrónomo de siempre; el loop se
 * agenda contra el reloj del audio, compás por compás, así parar puede parar.
 */

const BPM_MIN = 40;
const BPM_MAX = 120;
const BAJO = 48;

type Veredicto = "acorde" | "paso" | "aire";

const VEREDICTO: Record<Veredicto, { clase: string; nombre: string }> = {
  acorde: { clase: "bg-menta/15 text-menta", nombre: "del acorde" },
  paso: { clase: "bg-sol/15 text-sol", nombre: "de paso" },
  aire: { clase: "bg-brasa/15 text-brasa", nombre: "en el aire" },
};

interface NotaJuzgada {
  nombre: string;
  veredicto: Veredicto;
  aterrizaje: boolean;
}

export default function Encima() {
  const [acordes, setAcordes] = useState<AcordeDeLaSecuencia[]>([...PROGRESIONES[2].grados]);
  const [bpm, setBpm] = useState(70);
  const [tocando, setTocando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [compasActual, setCompasActual] = useState<number | null>(null);
  const [vuelta, setVuelta] = useState(0);
  const [historial, setHistorial] = useState<NotaJuzgada[]>([]);
  const [tanteo, setTanteo] = useState({ acorde: 0, paso: 0, aire: 0, aterrizajes: 0, cambios: 0 });

  const caja = useRef<HTMLDivElement>(null);
  const pararRef = useRef<(() => void) | null>(null);
  // Lo que el handler de notas necesita saber del loop, por ref: el handler
  // vive más que cada render y el compás cambia sin re-render de por medio.
  const estadoRef = useRef({
    tocando: false,
    compas: -1,
    /** ¿Ya hubo una nota en este compás? Para contar el aterrizaje una vez. */
    estrenado: true,
    ultimaTecla: null as number | null,
    acordes: [] as AcordeDeLaSecuencia[],
  });
  estadoRef.current.acordes = acordes;

  useEffect(() => () => pararRef.current?.(), []);

  const parar = () => {
    pararRef.current?.();
    pararRef.current = null;
    setTocando(false);
    setCompasActual(null);
    estadoRef.current.tocando = false;
  };

  const arrancar = async () => {
    parar();
    if (acordes.length === 0) return;
    setCargando(true);
    await wakeAudio();
    setCargando(false);
    const ctx = getAudioContext();
    if (!ctx) return;
    setTocando(true);
    setVuelta(0);
    setHistorial([]);
    setTanteo({ acorde: 0, paso: 0, aire: 0, aterrizajes: 0, cambios: 0 });
    estadoRef.current = { ...estadoRef.current, tocando: true, compas: -1, estrenado: true, ultimaTecla: null };

    const segundosPorCompas = (60 / bpm) * 4;
    const arranque = ctx.currentTime + 0.2;

    // El loop se agenda compás por compás contra el reloj del audio — el
    // patrón de los dos relojes, en chico: un timer impreciso va agendando lo
    // que cae dentro del próximo medio compás, y la imagen mira aparte.
    const pulso = segundosPorCompas / 4;
    let proximoCompas = 0;
    const agendar = () => {
      while (
        arranque + proximoCompas * segundosPorCompas <=
        ctx.currentTime + segundosPorCompas * 0.6
      ) {
        const t = arranque + proximoCompas * segundosPorCompas;
        for (let p = 0; p < 4; p++) {
          playClick(p === 0 ? "fuerte" : "debil", t + pulso * p);
        }
        const a = acordes[proximoCompas % acordes.length];
        const salto = raizDelAcorde(a);
        playChord(
          midisDelAcorde(a, BAJO + (salto <= 7 ? salto : salto - 12)),
          segundosPorCompas * 0.95,
          t,
        );
        proximoCompas++;
      }
    };

    // La cuenta previa: cuatro clicks el compás anterior al arranque.
    for (let p = 0; p < 4; p++) {
      playClick(p === 0 ? "fuerte" : "medio", arranque - segundosPorCompas + pulso * p);
    }
    agendar();
    const timer = setInterval(agendar, 120);

    let raf = 0;
    const mirar = () => {
      const t = (ctx.currentTime - arranque) / segundosPorCompas;
      if (t >= 0) {
        const total = Math.floor(t);
        const c = total % acordes.length;
        if (c !== estadoRef.current.compas) {
          estadoRef.current.compas = c;
          estadoRef.current.estrenado = false;
          setCompasActual(c);
          setVuelta(Math.floor(total / acordes.length) + 1);
        }
      }
      raf = requestAnimationFrame(mirar);
    };
    raf = requestAnimationFrame(mirar);

    pararRef.current = () => {
      cancelAnimationFrame(raf);
      clearInterval(timer);
      // Los acordes agendados se apagan solos: playChord ya lleva su duración.
    };
  };

  /** Una tecla tuya, del MIDI o de la pantalla: se juzga contra lo que suena. */
  const alTocar = (midi: number, dePantalla = false) => {
    if (dePantalla) {
      wakeAudio();
      playNote(midi, 0.6);
    }
    const e = estadoRef.current;
    if (!e.tocando || e.compas < 0) return;
    const a = e.acordes[e.compas];
    if (!a && a !== 0) return;

    const clases = clasesDelAcorde(a);
    const pc = mod12(midi);
    const dist = e.ultimaTecla === null ? null : Math.abs(midi - e.ultimaTecla);
    const veredicto: Veredicto = clases.has(pc)
      ? "acorde"
      : dist !== null && dist >= 1 && dist <= 2
        ? "paso"
        : "aire";
    const aterrizaje = !e.estrenado;
    e.ultimaTecla = midi;

    setTanteo((s) => ({
      ...s,
      [veredicto]: s[veredicto] + 1,
      cambios: s.cambios + (aterrizaje ? 1 : 0),
      aterrizajes: s.aterrizajes + (aterrizaje && veredicto === "acorde" ? 1 : 0),
    }));
    if (!e.estrenado) e.estrenado = true;
    setHistorial((h) => [
      ...h.slice(-15),
      { nombre: nombreDeTeclaLocal(midi), veredicto, aterrizaje },
    ]);
  };

  const { estado: estadoMidi, dispositivos } = useMidi({
    caja,
    onNota: ({ midi }) => alTocar(midi),
  });

  return (
    <div ref={caja} className="card overflow-hidden">
      <div className="border-b border-borde/60 p-5">
        <p className="text-xs tracking-[0.2em] text-humo uppercase">
          Los acordes que van a sonar en loop · en Do mayor
        </p>
        <div className="mt-3">
          <SelectorDeAcordes acordes={acordes} onCambiar={(a) => { parar(); setAcordes(a); }} />
        </div>
      </div>

      {/* La fila de acordes con el que suena iluminado, y el menú de cordales
          de cada uno: el mapa de dónde aterrizar. */}
      {acordes.length > 0 && (
        <div className="border-b border-borde/60 p-5">
          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-1.5">
              {acordes.map((a, c) => (
                <div
                  key={c}
                  className={`min-w-[84px] rounded-xl border px-3 py-2 text-center transition ${
                    compasActual === c
                      ? "border-sol/70 bg-sol/15"
                      : "border-borde/60 bg-carta-2"
                  }`}
                >
                  <p className={`font-mono text-lg font-black ${compasActual === c ? "text-sol" : "text-tiza"}`}>
                    {cifradoDelAcorde(a)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-humo">
                    {candidatosDelAcorde(a)
                      .filter((n) => n.d >= 0 && n.d <= 6)
                      .map((n) => nombreDeTeclaLocal(midiDeNota(n)))
                      .join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {tocando ? (
              <button
                onClick={parar}
                className="rounded-full bg-brasa px-5 py-2 font-bold text-noche transition hover:brightness-110"
              >
                ■ Parar
              </button>
            ) : (
              <button
                onClick={arrancar}
                disabled={cargando}
                className="rounded-full bg-sol px-5 py-2 font-bold text-noche transition hover:brightness-110 disabled:opacity-60"
              >
                {cargando ? "…" : "▶ Arrancá el loop"}
              </button>
            )}
            <span className="text-xs text-humo">
              un compás de clicks para entrar, y la vuelta no corta nunca
            </span>
            {tocando && vuelta > 0 && (
              <span className="rounded-full bg-carta-2 px-3 py-1.5 font-mono text-xs text-humo">
                vuelta {vuelta}
              </span>
            )}
            <label className="ml-auto flex items-center gap-2 whitespace-nowrap text-sm text-humo">
              <span className="font-mono">{bpm} bpm</span>
              <input
                type="range"
                min={BPM_MIN}
                max={BPM_MAX}
                value={bpm}
                disabled={tocando}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="w-24 accent-sol sm:w-36"
              />
            </label>
          </div>
        </div>
      )}

      {/* Lo que fuiste tocando, juzgado en vivo. */}
      {(historial.length > 0 || tocando) && (
        <div className="border-b border-borde/60 p-5">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <div>
              <p className="text-xs tracking-[0.2em] text-humo uppercase">Aterrizajes</p>
              <p className="font-display text-3xl font-black text-sol">
                {tanteo.aterrizajes}
                <span className="text-base text-humo">/{tanteo.cambios}</span>
              </p>
            </div>
            <p className="font-mono text-sm">
              <span className="text-menta">{tanteo.acorde} del acorde</span>
              {" · "}
              <span className="text-sol">{tanteo.paso} de paso</span>
              {" · "}
              <span className="text-brasa">{tanteo.aire} en el aire</span>
            </p>
          </div>
          {historial.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {historial.map((n, i) => (
                <span
                  key={i}
                  className={`rounded-lg px-2 py-1 font-mono text-xs font-bold ${VEREDICTO[n.veredicto].clase} ${
                    n.aterrizaje ? "ring-1 ring-current" : ""
                  }`}
                  title={n.aterrizaje ? "La primera del compás: el aterrizaje" : VEREDICTO[n.veredicto].nombre}
                >
                  {n.nombre}
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 text-[11px] text-humo">
            La primera nota de cada compás lleva anillo: es el aterrizaje. El
            veredicto es contra el acorde que suena — puntúa, no corrige.
          </p>
        </div>
      )}

      {/* El teclado de la pantalla, para cuando no hay piano enchufado. */}
      <div className="p-5">
        <Keyboard from={55} to={84} onKeyPress={(p) => alTocar(p, true)} paraTocar />
        <div className="mt-4">
          <Midi
            estado={estadoMidi}
            dispositivos={dispositivos}
            pista="— tocá la melodía sobre el loop"
            invitacion="¿Tenés un teclado? Conectalo y tocá la melodía en el piano de verdad"
            cierre="Con el teclado conectado, el loop suena y vos tocás encima: cada nota se juzga contra el acorde del momento, y la primera de cada compás es el aterrizaje."
          />
        </div>
      </div>
    </div>
  );
}
