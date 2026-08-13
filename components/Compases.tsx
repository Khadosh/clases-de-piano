"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import FiguraSVG from "./FiguraSVG";
import {
  aCompuesto,
  figuraQueDivide,
  aSimple,
  duracionDe,
  duracionDeCompas,
  hermanosDe,
  rellenosDe,
  compasTexto,
  esCompuesto,
  figuraDeSubdivision,
  partesPorTiempo,
  patronDe,
  pulsoDe,
  subdivisionDe,
  tiemposDe,
  type Compas,
} from "@/lib/ritmo";
import { getAudioContext, playClick, wakeAudio } from "@/lib/audio";
import { useMetronomo } from "@/lib/useMetronomo";

/**
 * La máquina de compases: elegís uno y lo escuchás.
 *
 * El botón que importa es el de la constante. 3/4 y 9/8 tienen las mismas notas
 * y suenan a dos cosas distintas, y eso no se explica con palabras — se aprieta
 * y se escucha dónde caen los golpes. Es lo mismo que decir "esto es europeo,
 * esto es chacarera".
 */

const SIMPLES: Compas[] = [
  { numerador: 2, denominador: 4 },
  { numerador: 3, denominador: 4 },
  { numerador: 4, denominador: 4 },
  { numerador: 3, denominador: 2 },
];

export default function Compases() {
  const [compas, setCompas] = useState<Compas>({ numerador: 3, denominador: 4 });
  const [sonando, setSonando] = useState(false);
  const [paso, setPaso] = useState(-1);
  const [pulso, setPulso] = useState(80);
  const [rellenoSonando, setRellenoSonando] = useState<string | null>(null);
  const [golpeRelleno, setGolpeRelleno] = useState(-1);
  const timers = useRef<number[]>([]);

  const patron = useMemo(() => patronDe(compas), [compas]);
  const rellenos = useMemo(() => rellenosDe(compas), [compas]);
  const hermanos = useMemo(() => hermanosDe(compas), [compas]);
  const compuesto = esCompuesto(compas);
  const { figura: figuraPulso, conPuntillo } = pulsoDe(compas);
  const subdiv = figuraDeSubdivision(compas);
  // La figura que NOMBRA el denominador, que no es la misma que la de la
  // subdivisión: en 3/4 el 4 es la negra y la subdivisión es la corchea. Decía
  // "la redonda se divide 4 veces: la corchea", que es justo el error que este
  // bloque tiene que sacar de la cabeza.
  const figuraDelNumero = figuraQueDivide(compas.denominador);
  const porTiempo = partesPorTiempo(compas);

  // El metrónomo cuenta subdivisiones, no tiempos: por eso el bpm que se le
  // pasa es el pulso multiplicado por en cuántas partes se parte cada tiempo.
  useMetronomo({
    activo: sonando,
    bpm: pulso * porTiempo,
    total: patron.length,
    desde: () => 0,
    agendar: (i, cuando) => playClick(patron[i], cuando),
    mostrar: setPaso,
  });

  const arrancar = useCallback(() => {
    wakeAudio();
    setSonando((s) => !s);
    setPaso(-1);
  }, []);

  const pararRelleno = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRellenoSonando(null);
    setGolpeRelleno(-1);
  }, []);

  const elegir = (c: Compas) => {
    pararRelleno();
    setCompas(c);
    setPaso(-1);
  };

  /**
   * Toca un relleno con el pulso marcado por debajo.
   *
   * Los dos a la vez es el punto: si sólo sonaran las figuras, una blanca en
   * 3/4 sería un golpe suelto y no se entendería que ocupa dos tiempos. Con el
   * pulso abajo se oye que el compás sigue latiendo igual mientras la figura
   * dura.
   */
  const tocarRelleno = useCallback(
    (r: (typeof rellenos)[number]) => {
      if (rellenoSonando === r.nombre) return pararRelleno();
      pararRelleno();
      wakeAudio();
      const ac = getAudioContext();
      if (!ac) return;
      const segundosPorTiempo = 60 / pulso;
      // Una redonda dura tantos tiempos como partes tenga el compás.
      const segundosPorRedonda =
        segundosPorTiempo * (duracionDeCompas(compas) === 0 ? 1 : tiemposDe(compas) / duracionDeCompas(compas));
      const t0 = ac.currentTime + 0.08;

      setRellenoSonando(r.nombre);
      // El pulso, flojito.
      for (let t = 0; t < tiemposDe(compas); t++) {
        playClick(t === 0 ? "medio" : "debil", t0 + t * segundosPorTiempo);
      }
      // Y las figuras, fuerte, cada una donde empieza.
      let acumulado = 0;
      r.puestas.forEach((p, n) => {
        const cuando = t0 + acumulado * segundosPorRedonda;
        playClick("fuerte", cuando);
        timers.current.push(
          window.setTimeout(
            () => setGolpeRelleno(n),
            (cuando - ac.currentTime) * 1000,
          ),
        );
        acumulado += duracionDe(p.figura, p.conPuntillo);
      });
      timers.current.push(
        window.setTimeout(
          pararRelleno,
          (acumulado * segundosPorRedonda + 0.4) * 1000,
        ),
      );
    },
    [compas, pulso, rellenoSonando, pararRelleno],
  );

  return (
    <div className="space-y-4">
      {/* Elegir el compás */}
      <div className="card p-4 sm:p-5">
        <p className="mb-2 text-xs tracking-[0.2em] text-humo uppercase">
          Compás simple
        </p>
        <div className="flex flex-wrap gap-2">
          {SIMPLES.map((c) => {
            const activo = compasTexto(c) === compasTexto(compas);
            return (
              <button
                key={compasTexto(c)}
                onClick={() => elegir(c)}
                className={`rounded-xl px-3 py-1.5 font-mono text-sm font-bold transition ${
                  activo ? "bg-sol text-noche" : "bg-carta-2 text-humo hover:text-tiza"
                }`}
              >
                {compasTexto(c)}
              </button>
            );
          })}
        </div>

        <p className="mt-4 mb-2 text-xs tracking-[0.2em] text-humo uppercase">
          Y su compuesto (×3 arriba, ×2 abajo)
        </p>
        <div className="flex flex-wrap gap-2">
          {SIMPLES.map((s) => {
            const c = aCompuesto(s);
            const activo = compasTexto(c) === compasTexto(compas);
            return (
              <button
                key={compasTexto(c)}
                onClick={() => elegir(c)}
                className={`rounded-xl px-3 py-1.5 font-mono text-sm font-bold transition ${
                  activo ? "bg-uva text-noche" : "bg-carta-2 text-humo hover:text-tiza"
                }`}
              >
                {compasTexto(c)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lectura del compás elegido */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="text-center">
            <p className="font-display text-6xl leading-none font-black text-sol">
              {compas.numerador}
            </p>
            <div className="my-1 h-px w-12 bg-borde" />
            <p className="font-display text-6xl leading-none font-black text-sol">
              {compas.denominador}
            </p>
          </div>
          <div className="min-w-0 flex-1 space-y-1.5 text-sm">
            <p>
              <span className="font-mono text-sol">{compas.numerador}</span>{" "}
              <span className="text-humo">
                → {compuesto ? "corcheas escritas, agrupadas de a tres" : "tiempos por compás"}
              </span>
            </p>
            <p>
              <span className="font-mono text-sol">{compas.denominador}</span>{" "}
              <span className="text-humo">
                → la redonda se divide {compas.denominador}{" "}
                {compas.denominador === 1 ? "vez" : "veces"}: la{" "}
                {figuraDelNumero?.nombre}
              </span>
            </p>
            <p className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-humo">Se cuentan</span>
              <span className="font-bold">{tiemposDe(compas)}</span>
              <span className="text-humo">tiempos de</span>
              {figuraPulso && (
                <FiguraSVG figura={figuraPulso} conPuntillo={conPuntillo} alto={30} />
              )}
              <span className="text-humo">
                {conPuntillo && "(con puntillo) "}y cada uno se parte en{" "}
                <strong className="text-tiza">{porTiempo}</strong>
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  compuesto ? "bg-uva/25 text-uva" : "bg-sol/20 text-sol"
                }`}
              >
                subdivisión {subdivisionDe(compas)}
              </span>
            </p>
          </div>
        </div>

        {/* El compás dibujado */}
        <div className="mt-5 rounded-2xl bg-noche-2 p-4">
          <div className="flex flex-wrap items-end gap-x-1 gap-y-2">
            {patron.map((acento, i) => {
              const nuevoTiempo = i % porTiempo === 0;
              const activo = sonando && paso === i;
              return (
                <span
                  key={i}
                  className={`flex flex-col items-center ${
                    nuevoTiempo && i > 0 ? "ml-4" : ""
                  }`}
                >
                  {subdiv && (
                    <FiguraSVG
                      figura={subdiv}
                      alto={40}
                      color={
                        activo
                          ? "#ffcb3d"
                          : acento === "fuerte"
                            ? "#f7f4ee"
                            : acento === "medio"
                              ? "#c9c3b5"
                              : "#6d6759"
                      }
                    />
                  )}
                  <span
                    className={`mt-1 h-1.5 w-1.5 rounded-full ${
                      acento === "debil"
                        ? "bg-transparent"
                        : acento === "fuerte"
                          ? "bg-sol"
                          : "bg-humo"
                    }`}
                  />
                </span>
              );
            })}
          </div>
        </div>

        {/* Qué entra en el compás. Es la otra cara de los dos números y la que
            más se olvida: no dicen sólo cómo se cuenta, dicen cuánto entra. */}
        <div className="mt-5 rounded-2xl border border-borde/60 p-4">
          <p className="mb-1 text-xs tracking-[0.2em] text-humo uppercase">
            Qué entra en un compás
          </p>
          <p className="mb-3 text-sm text-humo">
            {compasTexto(compas)} son{" "}
            <strong className="text-tiza">
              {tiemposDe(compas)}{" "}
              {figuraPulso?.[tiemposDe(compas) === 1 ? "nombre" : "plural"]}
              {conPuntillo && " con puntillo"}
            </strong>{" "}
            de presupuesto, y lo gastás como quieras. Cualquiera de estas tres
            llena el mismo compás:
          </p>
          <div className="space-y-2">
            {rellenos.map((r) => (
              <button
                key={r.nombre}
                onClick={() => tocarRelleno(r)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                  rellenoSonando === r.nombre ? "bg-carta-2" : "hover:bg-carta-2/60"
                }`}
              >
                <span className="w-4 shrink-0 text-sm">
                  {rellenoSonando === r.nombre ? "■" : "▶"}
                </span>
                <span className="flex flex-1 items-end gap-1">
                  {r.puestas.map((p, n) => (
                    <FiguraSVG
                      key={n}
                      figura={p.figura}
                      conPuntillo={p.conPuntillo}
                      alto={34}
                      color={
                        rellenoSonando === r.nombre && golpeRelleno === n
                          ? "#ffcb3d"
                          : "#f7f4ee"
                      }
                    />
                  ))}
                </span>
                <span className="shrink-0 text-xs text-humo">{r.nombre}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-humo">
            Debajo va el pulso marcado, para escuchar que una figura larga se
            come dos tiempos y el compás sigue durando lo mismo.
          </p>
        </div>

        {/* Mismo total, otro acento */}
        {hermanos.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-uva/30 bg-uva/5 p-4">
            <p className="min-w-0 flex-1 text-sm text-humo">
              <strong className="text-tiza">Mismo total, otro acento.</strong>{" "}
              {hermanos.map(compasTexto).join(" y ")} dura{hermanos.length > 1 ? "n" : ""}{" "}
              exactamente lo mismo que {compasTexto(compas)} — la misma cantidad
              de música. Lo que cambia es{" "}
              <em>dónde caen los golpes</em>, y con eso cambia todo.
            </p>
            {hermanos.map((h) => (
              <button
                key={compasTexto(h)}
                onClick={() => elegir(h)}
                className="rounded-full bg-carta-2 px-4 py-2 font-mono text-sm font-bold transition hover:bg-borde"
              >
                → {compasTexto(h)}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={arrancar}
            className={`rounded-full px-5 py-2 text-sm font-bold transition hover:brightness-110 ${
              sonando ? "bg-tiza text-noche" : "bg-menta text-noche"
            }`}
          >
            {sonando ? "■ Parar" : "▶ Escuchar"}
          </button>
          <label className="flex items-center gap-2 text-sm text-humo">
            <span className="font-mono">{pulso} bpm</span>
            <input
              type="range"
              min={40}
              max={160}
              value={pulso}
              onChange={(e) => setPulso(Number(e.target.value))}
              className="w-28 accent-sol"
            />
          </label>
          {compuesto ? (
            <button
              onClick={() => elegir(aSimple(compas))}
              className="ml-auto rounded-full bg-carta-2 px-4 py-2 text-sm font-bold transition hover:bg-borde"
            >
              ÷ Volver a {compasTexto(aSimple(compas))}
            </button>
          ) : (
            <button
              onClick={() => elegir(aCompuesto(compas))}
              className="ml-auto rounded-full bg-carta-2 px-4 py-2 text-sm font-bold transition hover:bg-borde"
            >
              × 3/2 → {compasTexto(aCompuesto(compas))}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
