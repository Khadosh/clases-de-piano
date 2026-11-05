"use client";

import { useEffect, useRef, useState } from "react";
import Keyboard, { type Mark } from "./Keyboard";
import { getAudioContext, playChord, playClick, pararTodo, wakeAudio } from "@/lib/audio";
import {
  acentosDeGrupos,
  arrancanEn,
  corcheasDe,
  cuentaDeGrupos,
  rangoDeCompases,
  sonandoEn,
  teclasDeVoicing,
  teclasQueSeQuedan,
  type CompasDeCapa,
} from "@/lib/capas";

/**
 * El reproductor de las capas: compases de corcheas en loop, con el tempo
 * regulable y el click con los acentos de cada compás.
 *
 * Los dos relojes de siempre (`useMetronomo`, `lib/reloj.ts`): un timer que
 * agenda contra el reloj del audio lo que cae en la ventana que viene, y un
 * `requestAnimationFrame` que destapa lo visual cuando el audio llega. Avanza
 * de a una corchea, que es la unidad de todo en `lib/capas.ts`: así el mismo
 * reloj sirve para el 4/4 de la estrofa y el 3+3+2 del puente, y un compás que
 * cambia en el medio (el editor de grupos) entra en la vuelta siguiente.
 *
 * El tempo va de 50 % a 100 % del de la canción y se lee por ref: mover el
 * slider acelera lo que suena en vez de cortarlo.
 */

const TICK_MS = 25;
const VENTANA = 0.12;

interface Posicion {
  compas: number;
  corchea: number;
}

export default function Tocador({
  compases,
  tempo,
  teclado = true,
  click: clickInicial = true,
  conClick = true,
}: {
  compases: CompasDeCapa[];
  /** Negras por minuto al 100 %. */
  tempo: number;
  /** Sin teclado: la capa del ritmo es sólo contar. */
  teclado?: boolean;
  click?: boolean;
  /** Si el click se puede apagar. En la capa del ritmo el click es todo lo que hay. */
  conClick?: boolean;
}) {
  const [porcentaje, setPorcentaje] = useState(50);
  const [sonando, setSonando] = useState(false);
  const [click, setClick] = useState(clickInicial);
  const [pos, setPos] = useState<Posicion>({ compas: 0, corchea: 0 });

  const compasesRef = useRef(compases);
  compasesRef.current = compases;
  const porcentajeRef = useRef(porcentaje);
  porcentajeRef.current = porcentaje;
  const clickRef = useRef(click);
  clickRef.current = click;
  const posRef = useRef(pos);
  posRef.current = pos;

  // Si cambian los compases (otro compás en el editor del ritmo) y la posición quedó afuera, vuelve al principio.
  useEffect(() => {
    if (pos.compas >= compases.length || pos.corchea >= corcheasDe(compases[pos.compas]?.grupos ?? [])) {
      setPos({ compas: 0, corchea: 0 });
    }
  }, [compases, pos]);

  useEffect(() => {
    if (!sonando) return;
    const ac = getAudioContext();
    if (!ac) return;

    const corchea = () => 30 / (tempo * (porcentajeRef.current / 100));
    let { compas, corchea: c } = posRef.current;
    let proxima = ac.currentTime + 0.08;
    const pendientes: { cuando: number; pos: Posicion }[] = [];

    const mirarAdelante = () => {
      while (proxima < ac.currentTime + VENTANA) {
        const lista = compasesRef.current;
        if (compas >= lista.length) compas = 0;
        const actual = lista[compas];
        if (c >= corcheasDe(actual.grupos)) c = 0;
        const seg = corchea();
        for (const e of arrancanEn(actual, c)) playChord(e.teclas, e.dur * seg * 0.96, proxima);
        if (clickRef.current) playClick(acentosDeGrupos(actual.grupos)[c], proxima);
        pendientes.push({ cuando: proxima, pos: { compas, corchea: c } });
        c++;
        if (c >= corcheasDe(actual.grupos)) {
          c = 0;
          compas = (compas + 1) % lista.length;
        }
        proxima += seg;
      }
    };
    mirarAdelante();
    const timer = setInterval(mirarAdelante, TICK_MS);

    let raf = 0;
    const dibujar = () => {
      raf = requestAnimationFrame(dibujar);
      let ultimo: Posicion | null = null;
      while (pendientes.length && pendientes[0].cuando <= ac.currentTime) ultimo = pendientes.shift()!.pos;
      if (ultimo) setPos(ultimo);
    };
    raf = requestAnimationFrame(dibujar);

    return () => {
      clearInterval(timer);
      cancelAnimationFrame(raf);
      pararTodo();
    };
  }, [sonando, tempo]);

  const actual = compases[Math.min(pos.compas, compases.length - 1)];
  const anterior = compases[(pos.compas - 1 + compases.length) % compases.length];
  const grupos = actual.grupos;
  const acentos = acentosDeGrupos(grupos);
  const cuenta = cuentaDeGrupos(grupos);
  const bpm = Math.round((tempo * porcentaje) / 100);

  const marks: Mark[] = [];
  if (actual.voicing) {
    // El acorde de fondo apagado, lo que suena encendido, y la tecla que se
    // queda del acorde anterior en amarillo: es la que no hay que mover.
    const quedan =
      anterior !== actual && anterior.voicing !== actual.voicing
        ? teclasQueSeQuedan(anterior.voicing, actual.voicing)
        : [];
    const suenan = new Set(sonando ? sonandoEn(actual, pos.corchea).flatMap((e) => e.teclas) : teclasDeVoicing(actual.voicing));
    for (const p of actual.voicing.izquierda) marks.push({ pitch: p, tone: "izq", ghost: !suenan.has(p), active: suenan.has(p) });
    const derecha = new Set([...actual.voicing.derecha, ...[...suenan].filter((p) => !actual.voicing!.izquierda.includes(p))]);
    for (const p of derecha) {
      const queda = quedan.includes(p);
      marks.push({
        pitch: p,
        tone: queda ? "sol" : "der",
        label: queda ? "=" : undefined,
        ghost: !suenan.has(p),
        active: suenan.has(p),
      });
    }
  }
  const rango = rangoDeCompases(compases);
  // Las dos manos con la misma cantidad de blancas: si no, la de menos teclas se dibuja más grande.
  const porMano = (() => {
    const r = { der: rangoDeCompases(compases, "der"), izq: rangoDeCompases(compases, "izq") };
    const blancas = (x: { from: number; to: number }) =>
      Array.from({ length: x.to - x.from + 1 }, (_, i) => x.from + i).filter((p) => ![1, 3, 6, 8, 10].includes(p % 12)).length;
    const n = Math.max(blancas(r.der), blancas(r.izq));
    for (const m of ["der", "izq"] as const) {
      while (blancas(r[m]) < n) {
        r[m] = { from: r[m].from - 1, to: r[m].to };
        if ([1, 3, 6, 8, 10].includes(r[m].from % 12)) r[m] = { from: r[m].from - 1, to: r[m].to };
      }
    }
    return r;
  })();
  const hayAcordes = compases.some((c) => c.etiqueta);

  return (
    <div className="flex flex-col gap-4">
      {hayAcordes && (
        <ol className="flex flex-wrap gap-1.5">
          {compases.map((c, i) => (
            <li key={i}>
              <button
                onClick={() => {
                  if (sonando) return;
                  setPos({ compas: i, corchea: 0 });
                  // Parado, el chip es para escuchar ese acorde suelto.
                  if (c.voicing) {
                    wakeAudio();
                    playChord(teclasDeVoicing(c.voicing), 1.4);
                  }
                }}
                className={`rounded-lg px-2.5 py-1 font-mono text-sm transition ${
                  i === pos.compas ? "bg-tiza text-noche" : "bg-carta-2 text-humo hover:text-tiza"
                }`}
              >
                {c.etiqueta}
              </button>
            </li>
          ))}
        </ol>
      )}

      {teclado && actual.voicing && (
        <>
          <div className="hidden rounded-2xl bg-noche-2 p-3 sm:block">
            <Keyboard from={rango.from} to={rango.to} marks={marks} />
          </div>
          {/* En el celular, una mano arriba de la otra: el teclado entero no entra sin cortar la derecha. */}
          <div className="flex flex-col gap-2 rounded-2xl bg-noche-2 p-3 sm:hidden">
            {(["der", "izq"] as const).map((m) => (
              <div key={m}>
                <p className="mb-1 text-xs text-humo">{m === "der" ? "derecha" : "izquierda"}</p>
                <Keyboard {...porMano[m]} marks={marks} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* La cuenta del compás: un casillero por corchea, más grande donde cae el acento. */}
      <div className="flex items-end gap-1" aria-label={`compás ${grupos.join("+")}`}>
        {cuenta.map((n, i) => {
          const ahora = sonando && i === pos.corchea;
          const alto = acentos[i] === "fuerte" ? "h-14" : acentos[i] === "medio" ? "h-11" : "h-8";
          return (
            <span
              key={i}
              className={`flex max-w-9 min-w-0 flex-1 items-center justify-center rounded-lg font-display font-black transition-colors ${alto} ${
                acentos[i] !== "debil" ? "text-xl" : "text-sm"
              } ${
                ahora
                  ? acentos[i] === "debil"
                    ? "bg-tiza text-noche"
                    : "bg-sol text-noche"
                  : acentos[i] === "debil"
                    ? "bg-carta-2 text-humo"
                    : "bg-carta-2 text-sol"
              } ${n === 1 && i > 0 ? "ml-1 sm:ml-2" : ""}`}
            >
              {n}
            </span>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <button
          onClick={() => {
            wakeAudio();
            setSonando((s) => !s);
          }}
          className={`rounded-full px-5 py-2 text-sm font-bold text-noche transition hover:brightness-110 ${
            sonando ? "bg-brasa" : "bg-sol"
          }`}
        >
          {sonando ? "■ Parar" : "▶ Tocar en loop"}
        </button>

        <label className="flex items-center gap-3 text-sm text-humo">
          <span className="whitespace-nowrap">tempo</span>
          <input
            type="range"
            min={50}
            max={100}
            step={5}
            value={porcentaje}
            onChange={(e) => setPorcentaje(Number(e.target.value))}
            className="w-36 accent-sol"
            aria-label="tempo en porcentaje"
          />
          <span className="w-24 font-mono text-tiza">
            {porcentaje} % <span className="text-humo">· {bpm}</span>
          </span>
        </label>

        {conClick && (
          <button
            onClick={() => setClick((c) => !c)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              click ? "bg-tiza text-noche" : "bg-carta-2 text-humo hover:text-tiza"
            }`}
          >
            click {click ? "prendido" : "apagado"}
          </button>
        )}
      </div>
    </div>
  );
}
