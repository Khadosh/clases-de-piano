"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { type Mark, type Tone } from "./Keyboard";
import Piano from "./Piano";
import Pistas, { type Pista } from "./Pistas";
import {
  CHORD_QUALITIES,
  GRADOS_ACORDE,
  NOMBRES_INVERSION,
  cantidadDeInversiones,
  chordNameEs,
  chordPitches,
  chordSymbol,
  corregirAcorde,
  escribirNota,
  invertir,
  mod12,
  notasDeInversion,
  pickRandom,
  raizEscrita,
  qualityById,
  simboloConBajo,
  stackLabel,
  type ChordQuality,
} from "@/lib/music";
import { playArpeggio, playChord, wakeAudio } from "@/lib/audio";
import { useArmado } from "@/lib/useArmado";

/**
 * El laboratorio de acordes.
 *
 * Armar un acorde y girarlo son la misma operación mirada desde dos lugares
 * —las mismas notas, la misma receta, sólo cambia cuál queda abajo— así que
 * son una sola herramienta con un eje más, y no dos. `inversiones` muestra ese
 * eje; sin él queda el laboratorio pelado, para cuando todavía no se vio.
 */
interface Props {
  qualityIds: string[];
  /** El juego del profe: sale un cifrado y ponés las manos. */
  dictation?: boolean;
  /** Muestra el selector de inversión y deja pedirlas en el dictado. */
  inversiones?: boolean;
}

const BASE = 48; // Do3, así entra cualquier inversión sin irse del teclado

export default function ChordLab({
  qualityIds,
  dictation = false,
  inversiones = false,
}: Props) {
  const qualities = useMemo(() => {
    const qs = qualityIds
      .map((id) => qualityById(id))
      .filter((q): q is ChordQuality => Boolean(q));
    return qs.length ? qs : CHORD_QUALITIES;
  }, [qualityIds]);

  const [root, setRoot] = useState(0);
  const [qid, setQid] = useState(qualities[0].id);
  const [inv, setInv] = useState(0);

  // Dictado: el profe canta un cifrado raro y vos ponés las manos.
  const [dictado, setDictado] = useState<{
    root: number;
    quality: ChordQuality;
    inv: number;
  } | null>(null);
  const [revelado, setRevelado] = useState(false);
  const [ronda, setRonda] = useState(0);
  const [dictarInversiones, setDictarInversiones] = useState(false);
  const [acertado, setAcertado] = useState(false);
  const [puntaje, setPuntaje] = useState({ bien: 0, rondas: 0 });
  /** Cuántas pistas pediste en esta ronda. Se cuentan: hay puntaje limpio. */
  const [pistas, setPistas] = useState(0);

  const elegido = qualityById(qid) ?? qualities[0];
  const mostrado = dictado ?? {
    root,
    quality: elegido,
    inv: Math.min(inv, cantidadDeInversiones(elegido)),
  };
  const maxInv = cantidadDeInversiones(mostrado.quality);
  const inversion = Math.min(mostrado.inv, maxInv);

  const fundamental = chordPitches(BASE + mostrado.root, mostrado.quality);
  const pitches = invertir(fundamental, inversion);

  // Los grados quedan rotados: en 1ª inversión el bajo es la tercera.
  const gradosBase = GRADOS_ACORDE.slice(0, mostrado.quality.stack.length + 1);
  const grados = [...gradosBase.slice(inversion), ...gradosBase.slice(0, inversion)];

  const oculto = Boolean(dictado) && !revelado;

  const armado = useArmado({ activo: oculto });
  const puestas = armado.notas;

  const veredicto = useMemo(
    () => (dictado ? corregirAcorde(puestas, pitches) : null),
    [dictado, puestas, pitches],
  );

  // Se anota el acierto una sola vez por ronda, la primera que sale bien.
  useEffect(() => {
    if (veredicto !== "bien" || acertado) return;
    setAcertado(true);
    setPuntaje((p) => ({ ...p, bien: p.bien + 1 }));
    wakeAudio();
    playChord(invertir(chordPitches(BASE + mostrado.root, mostrado.quality), inversion));
  }, [veredicto, acertado, mostrado.root, mostrado.quality, inversion]);

  /** Mientras armás en el teclado, cada tecla se pinta según cómo viene. */
  const marcasArmado: Mark[] = puestas.map((p) => {
    const enElAcorde = pitches.some((o) => mod12(o) === mod12(p));
    const esElBajo = p === Math.min(...puestas);
    // Recién cuando está completo se dice si estuvo bien: mientras tanto sólo
    // se muestran las teclas puestas, sin ir corrigiendo tecla por tecla.
    if (!veredicto) return { pitch: p, tone: "luna" as const };
    if (veredicto === "bien") return { pitch: p, tone: "menta" as const, label: "✓" };
    if (!enElAcorde) return { pitch: p, tone: "brasa" as const, label: "✗" };
    if (veredicto === "bajo" && esElBajo)
      return { pitch: p, tone: "brasa" as const, label: "↓" };
    return { pitch: p, tone: "menta" as const };
  });

  const marks: Mark[] = oculto
    ? marcasArmado
    : pitches.map((p, i) => {
        // Las que subieron una octava se pintan distinto: de eso se trata
        // invertir, y si no se ve cuáles se movieron no se entiende nada.
        const subio = inversion > 0 && i >= pitches.length - inversion;
        return {
          pitch: p,
          tone: (subio ? "sol" : mostrado.quality.tone) as Tone,
          label: grados[i],
          active: subio,
        };
      });

  const sonar = useCallback(
    (arpegio: boolean) => {
      wakeAudio();
      const ps = invertir(
        chordPitches(BASE + mostrado.root, mostrado.quality),
        inversion,
      );
      if (arpegio) playArpeggio(ps);
      else playChord(ps);
    },
    [mostrado.root, mostrado.quality, inversion],
  );

  /** Recorre las inversiones una tras otra, que es como se entiende de una. */
  const girar = useCallback(() => {
    wakeAudio();
    setDictado(null);
    const q = elegido;
    const ps = chordPitches(BASE + root, q);
    for (let n = 0; n <= cantidadDeInversiones(q); n++) {
      setTimeout(() => {
        setInv(n);
        playChord(invertir(ps, n), 0.9);
      }, n * 750);
    }
  }, [root, elegido]);

  const nuevoDictado = () => {
    wakeAudio();
    const q = pickRandom(qualities);
    setDictado({
      root: Math.floor(Math.random() * 12),
      quality: q,
      inv:
        dictarInversiones && inversiones
          ? Math.floor(Math.random() * (cantidadDeInversiones(q) + 1))
          : 0,
    });
    setRevelado(false);
    armado.borrar();
    setAcertado(false);
    setPistas(0);
    setPuntaje((p) => ({ ...p, rondas: p.rondas + 1 }));
    setRonda((n) => n + 1);
  };

  const salirDelDictado = () => {
    setDictado(null);
    armado.borrar();
    setAcertado(false);
    setPistas(0);
  };

  /**
   * Las pistas del dictado, de menos a más.
   *
   * La escalera importa: la receta sola alcanza casi siempre, porque lo que se
   * olvida es cuántos semitonos van, no cómo se cuenta. Recién si con eso no
   * sale se dice una nota, y las notas enteras van últimas — eso ya es la
   * respuesta escrita, sólo que sin verla en el teclado.
   */
  const escritas = notasDeInversion(mostrado.root, mostrado.quality, inversion);
  const listaDePistas: Pista[] = [
    {
      que: "la receta",
      contenido: (
        <>
          desde la fundamental, <strong>{stackLabel(mostrado.quality)}</strong>{" "}
          semitonos. {mostrado.quality.vibe}
        </>
      ),
    },
    inversion > 0
      ? {
          que: "el bajo",
          contenido: (
            <>
              abajo de todo va <strong>{escritas[0]}</strong>, la{" "}
              {grados[0] === "3"
                ? "tercera"
                : grados[0] === "5"
                  ? "quinta"
                  : "séptima"}
              . La fundamental sigue estando, pero arriba.
            </>
          ),
        }
      : {
          que: "la segunda nota",
          contenido: (
            <>
              contando {mostrado.quality.stack[0]} semitonos desde{" "}
              {escritas[0]} llegás a <strong>{escritas[1]}</strong>.
            </>
          ),
        },
    {
      que: "las notas",
      contenido: <strong className="font-mono">{escritas.join(" · ")}</strong>,
    },
  ];

  return (
    <div className="card overflow-hidden">
      {/* Fundamental: acomodada como un teclado, pero con botones de dedo.
          La forma importa —Do♯ va arriba y entre Do y Re, como en el piano— y
          el tamaño también: son para apretar, no para mirar. */}
      <div className="border-b border-borde/60 p-4">
        <p className="mb-2 text-xs tracking-[0.2em] text-humo uppercase">
          Fundamental
        </p>
        <div className="space-y-1.5">
          <div className="flex gap-1.5 pl-[9%]">
            {[1, 3, null, 6, 8, 10].map((pc, n) =>
              pc === null ? (
                <span key={`h${n}`} className="w-[9%] shrink-0" />
              ) : (
                <BotonRaiz
                  key={pc}
                  pc={pc}
                  activo={!dictado && root === pc}
                  negra
                  onClick={() => {
                    salirDelDictado();
                    setRoot(pc);
                  }}
                />
              ),
            )}
          </div>
          <div className="flex gap-1.5">
            {[0, 2, 4, 5, 7, 9, 11].map((pc) => (
              <BotonRaiz
                key={pc}
                pc={pc}
                activo={!dictado && root === pc}
                onClick={() => {
                  salirDelDictado();
                  setRoot(pc);
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Receta, agrupada por familia. Sueltas en una tira sola eran catorce
          fichas iguales y había que leerlas todas para encontrar una. */}
      <div className="space-y-3 border-b border-borde/60 p-4">
        {FAMILIAS.map(({ id, titulo }) => {
          const delGrupo = qualities.filter((q) => q.family === id);
          if (!delGrupo.length) return null;
          return (
            <div key={id}>
              <p className="mb-1.5 text-xs tracking-[0.2em] text-humo uppercase">
                {titulo}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {delGrupo.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => {
                      salirDelDictado();
                      setQid(q.id);
                      setInv((n) => Math.min(n, cantidadDeInversiones(q)));
                    }}
                    className={`rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                      !dictado && qid === q.id
                        ? "bg-tiza text-noche"
                        : "bg-carta-2 text-humo hover:text-tiza"
                    }`}
                  >
                    {chordSymbol(0, q).replace(/^C/, "") || "mayor"}
                    <span className="ml-1.5 font-mono text-[11px] opacity-70">
                      {stackLabel(q)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Inversión */}
      {inversiones && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-borde/60 p-4">
          {Array.from(
            { length: cantidadDeInversiones(elegido) + 1 },
            (_, n) => (
              <button
                key={n}
                onClick={() => {
                  salirDelDictado();
                  setInv(n);
                }}
                className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                  !dictado && inversion === n
                    ? "bg-uva text-noche"
                    : "bg-carta-2 text-humo hover:text-tiza"
                }`}
              >
                {NOMBRES_INVERSION[n]}
              </button>
            ),
          )}
          <button
            onClick={girar}
            className="ml-auto rounded-xl bg-carta-2 px-3 py-1.5 text-sm font-bold transition hover:bg-borde"
          >
            🔄 Girarlas todas
          </button>
        </div>
      )}

      <div className="p-5">
        {oculto ? (
          <div className="mb-4 text-center">
            <p className="text-xs tracking-[0.25em] text-humo uppercase">
              Dictado · ronda {ronda}
              {puntaje.rondas > 1 && (
                <span className="ml-2 font-mono text-menta normal-case">
                  {puntaje.bien}/{puntaje.rondas - (acertado ? 0 : 1)}
                </span>
              )}
            </p>
            <p className="font-display my-3 text-6xl font-black text-sol">
              {simboloConBajo(mostrado.root, mostrado.quality, inversion)}
            </p>
            <p className="text-sm text-humo">
              Armalo en el teclado de abajo, o en el piano de verdad si lo
              tenés al lado.
              {inversion > 0 &&
                " Ojo con el bajo: la letra de después de la barra va abajo de todo."}
            </p>
          </div>
        ) : (
          <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-display text-4xl font-black">
              {simboloConBajo(mostrado.root, mostrado.quality, inversion)}
            </span>
            <span className="text-humo">
              {chordNameEs(mostrado.root, mostrado.quality)}
              {inversion > 0 && `, ${NOMBRES_INVERSION[inversion]}`}
            </span>
            <span className="ml-auto rounded-full bg-carta-2 px-3 py-1 font-mono text-sm">
              {stackLabel(mostrado.quality)}
            </span>
          </div>
        )}

        <Piano
          from={45}
          to={81}
          marks={marks}
          armado={armado}
          respondiendo={oculto}
          faltan={pitches.length - puestas.length}
          paraTocar={dictation}
        >
          <Correccion
            veredicto={veredicto}
            pistas={pistas}
            onBorrar={armado.borrar}
          />
          {!acertado && (
            <Pistas
              lista={listaDePistas}
              dadas={pistas}
              onPedir={() => setPistas((n) => n + 1)}
            />
          )}
        </Piano>

        {!oculto && (
          <div className="mt-4 rounded-2xl bg-noche-2 px-4 py-3">
            <p className="font-mono text-lg">
              {notasDeInversion(
                mostrado.root,
                mostrado.quality,
                inversion,
              ).map((nombre, i) => (
                <span key={i}>
                  {i > 0 && <span className="text-humo"> · </span>}
                  <span
                    className={
                      inversion > 0 && i >= pitches.length - inversion
                        ? "text-sol"
                        : undefined
                    }
                  >
                    {nombre}
                  </span>
                </span>
              ))}
            </p>
            <p className="mt-1.5 text-sm text-humo">
              {inversion === 0 ? (
                <>
                  {mostrado.quality.vibe} Los números en las teclas son los
                  grados: 1 la fundamental, después 3, 5 y 7.
                </>
              ) : (
                <>
                  {inversion === 1
                    ? "La nota de abajo subió"
                    : `Las ${inversion} notas de abajo subieron`}{" "}
                  una octava (en amarillo). Son <em>las mismas notas</em> que{" "}
                  {chordSymbol(mostrado.root, mostrado.quality)}, pero ahora el
                  bajo es{" "}
                  <span className="font-semibold text-tiza">
                    {notasDeInversion(
                      mostrado.root,
                      mostrado.quality,
                      inversion,
                    )[0]}
                  </span>
                  , la{" "}
                  {grados[0] === "3"
                    ? "tercera"
                    : grados[0] === "5"
                      ? "quinta"
                      : "séptima"}
                  .
                </>
              )}
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            onClick={() => sonar(false)}
            className="rounded-full bg-menta px-4 py-2 text-sm font-bold text-noche transition hover:brightness-110"
          >
            ▶ Sonar junto
          </button>
          <button
            onClick={() => sonar(true)}
            className="rounded-full bg-carta-2 px-4 py-2 text-sm font-bold transition hover:bg-borde"
          >
            ♪ Nota por nota
          </button>

          {dictation && (
            <>
              <button
                onClick={nuevoDictado}
                className="ml-auto rounded-full bg-uva px-4 py-2 text-sm font-bold text-noche transition hover:brightness-110"
              >
                🎲 Dictado
              </button>
              {dictado && (
                <button
                  onClick={() => {
                    setRevelado(true);
                    sonar(false);
                  }}
                  disabled={revelado}
                  className="rounded-full bg-sol px-4 py-2 text-sm font-bold text-noche transition hover:brightness-110 disabled:opacity-40"
                >
                  👀 Ver respuesta
                </button>
              )}
            </>
          )}
        </div>

        {dictation && inversiones && (
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-humo">
            <input
              type="checkbox"
              checked={dictarInversiones}
              onChange={(e) => setDictarInversiones(e.target.checked)}
              className="accent-uva"
            />
            Que el dictado pida también inversiones (aparecen cifrados con
            barra, tipo <span className="font-mono text-tiza">Am/C</span>)
          </label>
        )}
      </div>
    </div>
  );
}

/**
 * Le dice al que practica cómo le fue. Sólo aparece en el dictado, y sólo
 * corrige cuando el acorde está completo: ir marcando tecla por tecla
 * convertiría el ejercicio en adivinar por descarte.
 */
function Correccion({
  veredicto,
  pistas,
  onBorrar,
}: {
  veredicto: "bien" | "mal" | "bajo" | null;
  pistas: number;
  onBorrar: () => void;
}) {
  if (veredicto === "bien") {
    return (
      <div className="mt-4 rounded-2xl border border-menta/40 bg-menta/10 px-4 py-3">
        <p className="font-display text-xl font-bold text-menta">
          {pistas === 0 ? "¡Ahí está! 🎉" : "Ahí está 👍"}
        </p>
        <p className="mt-0.5 text-sm text-humo">
          {pistas === 0
            ? "Sin pistas. Dale a Dictado para que te tire otro."
            : `Con ${pistas === 1 ? "una pista" : `${pistas} pistas`}. Anotalo: ése es el que hay que repetir.`}
        </p>
      </div>
    );
  }

  if (veredicto === "bajo") {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-sol/40 bg-sol/10 px-4 py-3">
        <p className="text-sm text-tiza/90">
          <span className="font-semibold text-sol">Casi.</span> Las notas son
          esas, pero abajo de todo tiene que quedar la que va después de la
          barra. Está invertido.
        </p>
        <button
          onClick={onBorrar}
          className="ml-auto rounded-full bg-carta-2 px-3 py-1.5 text-xs font-bold transition hover:bg-borde"
        >
          Borrar y probar de nuevo
        </button>
      </div>
    );
  }

  if (veredicto === "mal") {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-brasa/40 bg-brasa/10 px-4 py-3">
        <p className="text-sm text-tiza/90">
          Las teclas con <span className="font-bold text-brasa">✗</span> no van.
          Contá la receta de nuevo desde la fundamental.
        </p>
        <button
          onClick={onBorrar}
          className="ml-auto rounded-full bg-carta-2 px-3 py-1.5 text-xs font-bold transition hover:bg-borde"
        >
          Borrar y probar de nuevo
        </button>
      </div>
    );
  }

  // Sin veredicto no hay nada que decir: lo que falta ya lo dice NotasPuestas.
  return null;
}

/** El orden en que se leen: primero las de tres notas, después las de cuatro. */
const FAMILIAS = [
  { id: "triada", titulo: "Tríadas" },
  { id: "suspendido", titulo: "Suspendidos" },
  { id: "septima", titulo: "Cuatriadas" },
] as const;

/**
 * Una fundamental. Va con el cifrado grande y el nombre en castellano abajo:
 * el cifrado es lo que hay que aprender a leer, el castellano es la muleta.
 */
function BotonRaiz({
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
