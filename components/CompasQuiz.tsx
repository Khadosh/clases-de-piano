"use client";

import { useState } from "react";
import FiguraSVG from "./FiguraSVG";
import {
  type FiguraPuesta,
  type RondaCompletar,
  type RondaNumero,
  azarSembrado,
  duracionPuesta,
  enPalabras,
  nombreDeOpcion,
  rondaCompletar,
  rondaNumero,
  sumaDe,
} from "@/lib/compasQuiz";
import { duracionDe, duracionDeCompas, figuraQueDivide } from "@/lib/ritmo";

/**
 * Los dos quiz de compases, que son la misma ronda con la pregunta dada vuelta:
 * en uno el compás está lleno y hay que decir qué número le va; en el otro el
 * número está puesto y hay que elegir la figura que lo cierra. Los dos
 * practican la misma lectura —el compás como presupuesto: 3/4 son tres negras
 * para gastar— que es la que se usa tocando y la que se olvida.
 *
 * La primera ronda sale de un azar sembrado para que el servidor y el cliente
 * dibujen lo mismo; el azar de verdad aparece recién al pedir otra.
 */
export default function CompasQuiz({ modo }: { modo: "numero" | "completar" }) {
  const [rNumero, setRNumero] = useState<RondaNumero>(() =>
    rondaNumero(azarSembrado(3)),
  );
  const [rCompletar, setRCompletar] = useState<RondaCompletar>(() =>
    rondaCompletar(azarSembrado(5)),
  );
  const [elegida, setElegida] = useState<number | null>(null);
  const [fallidas, setFallidas] = useState<Set<number>>(new Set());
  const [aciertos, setAciertos] = useState(0);
  const [errores, setErrores] = useState(0);

  const ronda = modo === "numero" ? rNumero : rCompletar;
  const figuras = ronda.figuras;

  const esCorrecta = (i: number) =>
    modo === "numero"
      ? Math.abs(
          duracionDeCompas(rNumero.opciones[i]) - sumaDe(rNumero.figuras),
        ) < 1e-9
      : Math.abs(
          duracionPuesta(rCompletar.opciones[i]) -
            (duracionDeCompas(rCompletar.compas) - sumaDe(rCompletar.figuras)),
        ) < 1e-9;

  const resuelta = elegida !== null && esCorrecta(elegida);

  const elegir = (i: number) => {
    if (resuelta || fallidas.has(i)) return;
    if (esCorrecta(i)) {
      setElegida(i);
      setAciertos((a) => a + 1);
    } else {
      setFallidas((f) => new Set(f).add(i));
      setErrores((e) => e + 1);
    }
  };

  const otra = () => {
    if (modo === "numero") setRNumero(rondaNumero(Math.random));
    else setRCompletar(rondaCompletar(Math.random));
    setElegida(null);
    setFallidas(new Set());
  };

  const compasCorrecto = modo === "numero" ? rNumero.compas : rCompletar.compas;
  const delDenominador = figuraQueDivide(compasCorrecto.denominador)!;
  const presupuesto = Math.round(
    duracionDeCompas(compasCorrecto) / duracionDe(delDenominador),
  );

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-borde/60 px-4 py-3 text-sm text-humo">
        <span className="text-xs tracking-[0.2em] uppercase">
          {modo === "numero" ? "¿Qué compás es?" : "Completá el compás"}
        </span>
        <span className="ml-auto font-mono text-xs">
          ✓ {aciertos}
          {errores > 0 && <span className="ml-2 text-brasa">✗ {errores}</span>}
        </span>
      </div>

      <div className="p-5">
        <p className="mb-4 text-center text-sm text-humo">
          {modo === "numero"
            ? "Este compás cierra justo. ¿Qué número le va adelante?"
            : "A este compás le falta una figura para cerrar. ¿Cuál?"}
        </p>

        {/* El compás dibujado: figuras entre barras, y el hueco si falta una */}
        <div className="mx-auto mb-5 flex w-fit items-center gap-4 rounded-2xl bg-noche px-6 py-4">
          {modo === "numero" ? (
            <span className="font-display w-8 text-center text-3xl font-black text-sol">
              ?
            </span>
          ) : (
            <span className="font-display flex w-8 flex-col items-center text-2xl leading-none font-black text-sol">
              <span>{rCompletar.compas.numerador}</span>
              <span>{rCompletar.compas.denominador}</span>
            </span>
          )}
          <span className="h-16 w-px bg-humo/40" />
          {figuras.map((f, i) => (
            <FiguraSVG key={i} figura={f.figura} conPuntillo={f.puntillo} alto={52} />
          ))}
          {modo === "completar" && (
            <span className="flex h-13 w-9 items-center justify-center rounded-lg border-2 border-dashed border-sol/60 text-xl font-black text-sol">
              ?
            </span>
          )}
          <span className="h-16 w-1 bg-humo/60" />
        </div>

        {/* Las opciones */}
        <div className="mx-auto grid w-fit grid-cols-2 gap-2 sm:grid-cols-4">
          {(modo === "numero" ? rNumero.opciones : rCompletar.opciones).map(
            (o, i) => {
              const estado = resuelta
                ? esCorrecta(i)
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
                  className={`flex min-w-20 flex-col items-center justify-center gap-1 rounded-2xl px-4 py-3 transition ${
                    estado === "bien"
                      ? "bg-menta text-noche"
                      : estado === "mal"
                        ? "bg-brasa/25 text-brasa"
                        : estado === "apagada"
                          ? "bg-carta-2 opacity-40"
                          : "bg-carta-2 hover:bg-borde"
                  }`}
                >
                  {modo === "numero" ? (
                    <span className="font-display flex flex-col items-center text-xl leading-tight font-black">
                      <span>{(o as RondaNumero["opciones"][number]).numerador}</span>
                      <span>{(o as RondaNumero["opciones"][number]).denominador}</span>
                    </span>
                  ) : (
                    <>
                      <FiguraSVG
                        figura={(o as FiguraPuesta).figura}
                        conPuntillo={(o as FiguraPuesta).puntillo}
                        alto={40}
                      />
                      <span className={`text-[11px] ${estado === "viva" ? "text-humo" : ""}`}>
                        {(o as FiguraPuesta).figura.nombre}
                        {(o as FiguraPuesta).puntillo ? " ·" : ""}
                      </span>
                    </>
                  )}
                </button>
              );
            },
          )}
        </div>

        {/* La resolución, contada con el presupuesto */}
        {resuelta && (
          <div className="mt-5 text-center">
            <p className="text-sm text-humo">
              {modo === "numero" ? (
                <>
                  {enPalabras(rNumero.figuras)} suman{" "}
                  <strong className="text-tiza">
                    {presupuesto} {presupuesto === 1 ? delDenominador.nombre : delDenominador.plural}
                  </strong>{" "}
                  de presupuesto: {nombreDeOpcion(rNumero.compas)}.
                </>
              ) : (
                <>
                  Faltaba{" "}
                  <strong className="text-tiza">
                    {rCompletar.falta.figura.nombre}
                    {rCompletar.falta.puntillo ? " con puntillo" : ""}
                  </strong>
                  : {enPalabras(rCompletar.figuras)} no llegan a llenar el
                  presupuesto de {presupuesto} {delDenominador.plural} que pide{" "}
                  {nombreDeOpcion(rCompletar.compas)}.
                </>
              )}
            </p>
            <button
              onClick={otra}
              className="mt-3 rounded-full bg-menta px-5 py-2 text-sm font-bold text-noche transition hover:brightness-110"
            >
              Otro compás →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

