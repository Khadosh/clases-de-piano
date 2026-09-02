"use client";

import { useEffect, useRef, useState } from "react";
import SelectorDeAcordes, { cifraDe } from "./SelectorDeAcordes";
import {
  FUNCIONES,
  FUNCION_DE_GRADO,
  PROGRESIONES,
  cifradoDelAcorde,
  esPrestado,
  gradoDe,
  midisDelAcorde,
  raizDelAcorde,
  type AcordeDeLaSecuencia,
  type Funcion,
} from "@/lib/grados";
import {
  candidatosDelAcorde,
  esDelAcorde,
  midiDeNota,
  mismaNota,
  type NotaMelodia,
} from "@/lib/melodia";
import { LETRAS_ES } from "@/lib/music";
import { getAudioContext, playChord, playNote, wakeAudio } from "@/lib/audio";

/**
 * La grilla: la escala como columnas, los acordes de la vuelta como filas, y
 * un punto donde una nota **cae parada** en un acorde.
 *
 * Es la imagen del cuaderno de papel de un curso de armonía pop, y es lo
 * mismo que la sala ya hace de a un compás —las fichas verdes de "del
 * acorde" al escribir la melodía— pero visto todo junto. Así se ve de un
 * vistazo la nota que puede quedarse quieta mientras los acordes giran abajo
 * (el Do de La vuelta en Do, el Mi de Cuesta abajo) y la que va a tener que
 * moverse. Los nombres de las funciones son los de Quique; los apodos del
 * pop —la casa mayor, la casa menor, la tensión, el que eleva— van de alias
 * en los cuatro grados que el pop usa, que son los mismos con otro nombre.
 */

const APODO_POP: Partial<Record<number, string>> = {
  0: "la casa mayor",
  3: "el que eleva",
  4: "la tensión",
  5: "la casa menor",
};

const COLOR: Record<Funcion, { punto: string; suave: string }> = {
  reposo: { punto: "bg-menta", suave: "bg-menta/15 text-menta" },
  subdominante: { punto: "bg-sol", suave: "bg-sol/15 text-sol" },
  dominante: { punto: "bg-brasa", suave: "bg-brasa/15 text-brasa" },
};

/** El acompañamiento alrededor de Do3, como en la melodía. */
const BAJO = 48;
const midisDe = (a: AcordeDeLaSecuencia) => midisDelAcorde(a, BAJO + raizDelAcorde(a));

const nombreDe = (n: NotaMelodia) =>
  `${LETRAS_ES[((n.d % 7) + 7) % 7]}${n.b ? "♭" : ""}${n.d >= 7 ? "′" : ""}`;

/**
 * Las columnas: la escala de Do a Do′, más los bemoles que traiga algún
 * préstamo de la vuelta (el La♭ del Fm), en orden de altura.
 */
function columnasDe(acordes: AcordeDeLaSecuencia[]): NotaMelodia[] {
  const out: NotaMelodia[] = Array.from({ length: 8 }, (_, d) => ({ d }));
  for (const a of acordes) {
    for (const n of candidatosDelAcorde(a)) {
      if (n.b && n.d <= 7 && !out.some((o) => mismaNota(o, n))) out.push(n);
    }
  }
  return out.sort((x, y) => midiDeNota(x) - midiDeNota(y));
}

export default function Grilla() {
  // La de Frozen: la principal del pop.
  const [acordes, setAcordes] = useState<AcordeDeLaSecuencia[]>([...PROGRESIONES[4].grados]);
  const [columna, setColumna] = useState<NotaMelodia | null>(null);
  const [sonando, setSonando] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const parar = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setSonando(null);
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const columnas = columnasDe(acordes);
  /** En cuántos acordes de la vuelta cae parada cada columna. */
  const cuenta = (n: NotaMelodia) => acordes.filter((a) => esDelAcorde(n, a)).length;
  const mejor = columnas.reduce((m, n) => Math.max(m, cuenta(n)), 0);
  const quietas = columnas.filter((n) => n.d < 7 && cuenta(n) === mejor && mejor >= 2);

  const tocarAcorde = (a: AcordeDeLaSecuencia, nota?: NotaMelodia) => {
    parar();
    wakeAudio();
    playChord(midisDe(a), 1.4);
    if (nota) playNote(midiDeNota(nota), 1.4);
  };

  const elegirColumna = (n: NotaMelodia) => {
    parar();
    wakeAudio();
    playNote(midiDeNota(n), 1);
    setColumna(columna && mismaNota(columna, n) ? null : n);
  };

  /** La vuelta entera, un acorde atrás del otro, con la fila iluminada. */
  const tocarVuelta = async () => {
    parar();
    await wakeAudio();
    const ctx = getAudioContext();
    if (!ctx) return;
    const cada = 1.5;
    const t0 = ctx.currentTime + 0.1;
    acordes.forEach((a, i) => {
      playChord(midisDe(a), cada * 0.95, t0 + i * cada);
      timers.current.push(setTimeout(() => setSonando(i), (0.1 + i * cada) * 1000));
    });
    timers.current.push(setTimeout(() => setSonando(null), (0.1 + acordes.length * cada) * 1000));
  };

  const enCuales = columna ? acordes.filter((a) => esDelAcorde(columna, a)) : [];
  const fuera = columna ? acordes.filter((a) => !esDelAcorde(columna, a)) : [];
  const lista = (as: AcordeDeLaSecuencia[]) =>
    as.map(cifradoDelAcorde).join(as.length > 2 ? ", " : " y ").replace(/, ([^,]*)$/, " y $1");

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-borde/60 p-5">
        <p className="text-xs tracking-[0.2em] text-humo uppercase">La vuelta · en Do mayor</p>
        <div className="mt-3">
          <SelectorDeAcordes acordes={acordes} onCambiar={(n) => { parar(); setAcordes(n); }} />
        </div>
      </div>

      <div className="p-5">
        <p className="max-w-2xl text-sm leading-relaxed text-humo">
          La escala en columnas, los acordes de la vuelta en filas, y un punto
          donde la nota <strong className="text-tiza">cae parada</strong> en el
          acorde. Tocá un acorde para escucharlo, una nota para ver en cuáles
          cae parada, y una casilla para oír las dos cosas juntas — con punto
          o sin punto, que la diferencia se escucha.
        </p>

        {acordes.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="border-separate border-spacing-1">
              <thead>
                <tr>
                  <th />
                  {columnas.map((n) => {
                    const activa = columna && mismaNota(columna, n);
                    const c = cuenta(n);
                    return (
                      <th key={nombreDe(n)} className="p-0">
                        <button
                          onClick={() => elegirColumna(n)}
                          className={`w-11 rounded-lg py-1.5 text-center text-xs font-bold transition ${
                            activa
                              ? "bg-tiza text-noche"
                              : c === mejor && mejor >= 2
                                ? "bg-carta-2 text-tiza"
                                : "bg-carta-2 text-humo hover:text-tiza"
                          } ${n.b ? "text-uva" : ""}`}
                          title={`Cae parada en ${c} de ${acordes.length}`}
                        >
                          {nombreDe(n)}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {acordes.map((a, i) => {
                  const f = FUNCION_DE_GRADO[gradoDe(a)];
                  const apodo = esPrestado(a) ? undefined : APODO_POP[gradoDe(a)];
                  return (
                    <tr key={i}>
                      <th className="p-0 pr-2 text-left">
                        <button
                          onClick={() => tocarAcorde(a)}
                          className={`flex min-w-[112px] items-baseline gap-2 rounded-lg px-2.5 py-1.5 text-left transition hover:brightness-110 ${
                            COLOR[f].suave
                          } ${sonando === i ? "ring-2 ring-current" : ""}`}
                          title={`${FUNCIONES[f].nombre}${apodo ? ` — ${apodo}, en el pop` : ""}`}
                        >
                          <span className="font-mono text-sm font-bold">{cifradoDelAcorde(a)}</span>
                          <span className="font-mono text-[11px] opacity-75">{cifraDe(a)}</span>
                        </button>
                      </th>
                      {columnas.map((n) => {
                        const cae = esDelAcorde(n, a);
                        const enColumna = columna && mismaNota(columna, n);
                        return (
                          <td key={nombreDe(n)} className="p-0">
                            <button
                              onClick={() => tocarAcorde(a, n)}
                              className={`flex h-9 w-11 items-center justify-center rounded-lg transition ${
                                enColumna ? "bg-carta-2" : "bg-carta-2/40 hover:bg-carta-2"
                              }`}
                              aria-label={`${nombreDe(n)} sobre ${cifradoDelAcorde(a)}: ${cae ? "cae parada" : "no es del acorde"}`}
                            >
                              {cae && (
                                <span className={`h-3 w-3 rounded-full ${COLOR[f].punto}`} />
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {acordes.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={tocarVuelta}
              className="rounded-full bg-sol px-4 py-1.5 text-sm font-bold text-noche transition hover:brightness-110"
            >
              ▶ La vuelta entera
            </button>
            <span className="text-[11px] text-humo">
              <span className="text-menta">●</span> reposo ·{" "}
              <span className="text-sol">●</span> media tensión ·{" "}
              <span className="text-brasa">●</span> tensión — y en el pop, la
              casa mayor (I), la casa menor (VIm), el que eleva (IV) y la
              tensión (V): los mismos acordes con otro nombre.
            </span>
          </div>
        )}

        {/* Lo que la grilla enseña sola: la nota que puede quedarse quieta. */}
        {acordes.length > 1 && (
          <p className="mt-4 rounded-xl bg-noche px-4 py-3 text-sm leading-relaxed text-humo">
            {columna ? (
              <>
                El <strong className="text-tiza">{nombreDe(columna)}</strong>{" "}
                {enCuales.length === 0
                  ? "no cae parado en ningún acorde de esta vuelta: sólo puede pasar caminando."
                  : enCuales.length === acordes.length
                    ? "cae parado en todos los acordes de la vuelta: puede quedarse quieto de punta a punta."
                    : `cae parado en ${lista(enCuales)}; sobre ${lista(fuera)} tiene que moverse.`}
              </>
            ) : quietas.length > 0 ? (
              <>
                {quietas.length === 1 ? "La nota que puede quedarse quieta es el " : "Las notas que pueden quedarse quietas son "}
                <strong className="text-tiza">{quietas.map(nombreDe).join(" y ")}</strong>
                {mejor === acordes.length
                  ? ": cae parada en los cuatro."
                  : `: cae parada en ${mejor} de los ${acordes.length} acordes.`}{" "}
                Es la guía que se queda mientras la armonía gira abajo — el truco de La vuelta en Do.
              </>
            ) : (
              "Ninguna nota cae parada en dos acordes de esta vuelta: la melodía va a tener que moverse en cada compás."
            )}
          </p>
        )}
      </div>
    </div>
  );
}
