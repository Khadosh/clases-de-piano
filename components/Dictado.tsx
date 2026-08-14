"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Mark } from "./Keyboard";
import Piano from "./Piano";
import Pistas, { type Pista } from "./Pistas";
import {
  CHORD_QUALITIES,
  NOMBRES_INVERSION,
  cantidadDeInversiones,
  chordPitches,
  corregirAcorde,
  escribirNota,
  invertir,
  mod12,
  notasDeInversion,
  qualityById,
  raizEscrita,
  simboloConBajo,
  stackLabel,
  type ChordQuality,
} from "@/lib/music";
import { playArpeggio, playChord, wakeAudio } from "@/lib/audio";
import { useArmado } from "@/lib/useArmado";
import { anotar, elegirConMemoria, leerMemoria, olvidar, peso } from "@/lib/memoria";

/**
 * El dictado como ejercicio, en sus dos formas.
 *
 * `cifrado` es el juego del profe: sale un símbolo y ponés las manos. `oido` es
 * el que no se puede hacer sin instrumento —suena el acorde y no se muestra
 * nada— y es el único de todos que entrena el oído en vez de la memoria de la
 * receta. Son el mismo motor porque son la misma ronda: se propone algo, lo
 * armás, se corrige; lo único que cambia es cómo se enuncia.
 *
 * **Los que te salen mal vuelven más seguido** (`lib/memoria.ts`), y la cuenta
 * es por calidad de acorde y no por acorde entero: lo que se olvida es la
 * receta del m7♭5, no que era sobre Fa♯.
 */

const BASE = 48; // Do3, así entra cualquier inversión sin irse del teclado
const SEGUNDOS = 25;

interface Ronda {
  root: number;
  quality: ChordQuality;
  inv: number;
}

export default function Dictado({
  qualityIds,
  modo,
  reloj: relojInicial = false,
}: {
  qualityIds: string[];
  modo: "cifrado" | "oido";
  /** Arranca con el contrarreloj prendido. Se puede apagar igual. */
  reloj?: boolean;
}) {
  const qualities = useMemo(() => {
    const qs = qualityIds
      .map((id) => qualityById(id))
      .filter((q): q is ChordQuality => Boolean(q));
    return qs.length ? qs : CHORD_QUALITIES;
  }, [qualityIds]);

  const [ronda, setRonda] = useState<Ronda | null>(null);
  const [n, setN] = useState(0);
  const [pistas, setPistas] = useState(0);
  const [resuelta, setResuelta] = useState(false);
  const [seTermino, setSeTermino] = useState(false);
  const [racha, setRacha] = useState(0);
  const [mejorRacha, setMejorRacha] = useState(0);
  const [puntaje, setPuntaje] = useState({ limpias: 0, rondas: 0 });
  const [conInversiones, setConInversiones] = useState(false);
  const [conReloj, setConReloj] = useState(relojInicial);
  const [restante, setRestante] = useState(SEGUNDOS);
  /** En el modo oído, si se muestra la fundamental. Sin ella es bastante más duro. */
  const [regalarRaiz, setRegalarRaiz] = useState(true);

  const armado = useArmado({ activo: Boolean(ronda) && !resuelta });
  const puestas = armado.notas;

  const pitches = ronda
    ? invertir(chordPitches(BASE + ronda.root, ronda.quality), ronda.inv)
    : [];
  const veredicto = ronda ? corregirAcorde(puestas, pitches) : null;

  const sonar = useCallback(
    (arpegio = false) => {
      if (!ronda) return;
      wakeAudio();
      const ps = invertir(chordPitches(BASE + ronda.root, ronda.quality), ronda.inv);
      if (arpegio) playArpeggio(ps);
      else playChord(ps);
    },
    [ronda],
  );

  const nueva = useCallback(() => {
    wakeAudio();
    // La calidad sale del bombo cargado; la fundamental, al azar y punto.
    const quality = elegirConMemoria(qualities, (q) => q.id);
    const siguiente: Ronda = {
      root: Math.floor(Math.random() * 12),
      quality,
      inv: conInversiones
        ? Math.floor(Math.random() * (cantidadDeInversiones(quality) + 1))
        : 0,
    };
    setRonda(siguiente);
    setPistas(0);
    setResuelta(false);
    setSeTermino(false);
    armado.borrar();
    setRestante(SEGUNDOS);
    setN((x) => x + 1);
    setPuntaje((p) => ({ ...p, rondas: p.rondas + 1 }));
    if (modo === "oido") {
      const ps = invertir(
        chordPitches(BASE + siguiente.root, siguiente.quality),
        siguiente.inv,
      );
      // Un toque después: si suena en el mismo instante que el click del botón
      // se pisan y se escucha peor.
      setTimeout(() => playChord(ps), 180);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qualities, conInversiones, modo]);

  /** Se cierra la ronda: se anota, se marca la racha y se muestra la respuesta. */
  const cerrar = useCallback(
    (acerto: boolean, limpio: boolean) => {
      if (!ronda) return;
      setResuelta(true);
      anotar(ronda.quality.id, acerto && limpio);
      if (acerto && limpio) {
        setPuntaje((p) => ({ ...p, limpias: p.limpias + 1 }));
        setRacha((r) => {
          const siguiente = r + 1;
          setMejorRacha((m) => Math.max(m, siguiente));
          return siguiente;
        });
      } else {
        setRacha(0);
      }
    },
    [ronda],
  );

  // Se corrige recién con el acorde completo, igual que en el laboratorio.
  useEffect(() => {
    if (!ronda || resuelta || veredicto !== "bien") return;
    sonar();
    cerrar(true, pistas === 0);
  }, [veredicto, ronda, resuelta, pistas, cerrar, sonar]);

  // ---- El contrarreloj -----------------------------------------------------

  const cerrarRef = useRef(cerrar);
  cerrarRef.current = cerrar;

  useEffect(() => {
    if (!conReloj || !ronda || resuelta) return;
    if (restante <= 0) {
      setSeTermino(true);
      cerrarRef.current(false, false);
      return;
    }
    const t = setTimeout(() => setRestante((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [conReloj, ronda, resuelta, restante]);

  // ---- Lo que se ve --------------------------------------------------------

  const escritas = ronda
    ? notasDeInversion(ronda.root, ronda.quality, ronda.inv)
    : [];

  const marks: Mark[] = resuelta
    ? pitches.map((p) => ({ pitch: p, tone: "menta" as const, label: "✓" }))
    : puestas.map((p) => {
        const enElAcorde = pitches.some((o) => mod12(o) === mod12(p));
        if (!veredicto) return { pitch: p, tone: "luna" as const };
        if (!enElAcorde) return { pitch: p, tone: "brasa" as const, label: "✗" };
        if (veredicto === "bajo" && p === Math.min(...puestas))
          return { pitch: p, tone: "brasa" as const, label: "↓" };
        return { pitch: p, tone: "menta" as const };
      });

  const listaDePistas: Pista[] = !ronda
    ? []
    : modo === "oido"
      ? [
          {
            que: "nota por nota",
            contenido: (
              <button
                onClick={() => sonar(true)}
                className="underline decoration-dotted underline-offset-4 hover:text-sol"
              >
                escuchalo arpegiado ▸
              </button>
            ),
          },
          {
            que: regalarRaiz ? "la receta" : "la fundamental",
            contenido: regalarRaiz ? (
              <>
                desde la fundamental, <strong>{stackLabel(ronda.quality)}</strong>{" "}
                semitonos.
              </>
            ) : (
              <>
                es <strong>{escribirNota(raizEscrita(ronda.root))}</strong>.
              </>
            ),
          },
          {
            que: "el cifrado",
            contenido: (
              <strong className="font-mono">
                {simboloConBajo(ronda.root, ronda.quality, ronda.inv)}
              </strong>
            ),
          },
        ]
      : [
          {
            que: "la receta",
            contenido: (
              <>
                desde la fundamental, <strong>{stackLabel(ronda.quality)}</strong>{" "}
                semitonos. {ronda.quality.vibe}
              </>
            ),
          },
          ronda.inv > 0
            ? {
                que: "el bajo",
                contenido: (
                  <>
                    abajo de todo va <strong>{escritas[0]}</strong>. La
                    fundamental sigue estando, pero arriba.
                  </>
                ),
              }
            : {
                que: "la segunda nota",
                contenido: (
                  <>
                    contando {ronda.quality.stack[0]} semitonos desde{" "}
                    {escritas[0]} llegás a <strong>{escritas[1]}</strong>.
                  </>
                ),
              },
          {
            que: "las notas",
            contenido: (
              <strong className="font-mono">{escritas.join(" · ")}</strong>
            ),
          },
        ];

  if (!ronda) {
    return (
      <Portada
        modo={modo}
        qualities={qualities}
        onArrancar={nueva}
        onOlvidar={() => {
          olvidar();
          setN((x) => x + 1);
        }}
        version={n}
      />
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Marcador */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-borde/60 px-5 py-3 text-sm">
        <span className="text-xs tracking-[0.2em] text-humo uppercase">
          Ronda {n}
        </span>
        <span className="font-mono">
          <span className="text-menta">{puntaje.limpias}</span>
          <span className="text-humo">/{puntaje.rondas}</span>
          <span className="ml-1 text-xs text-humo">sin pistas</span>
        </span>
        <span className="font-mono">
          <span className={racha >= 3 ? "text-sol" : "text-humo"}>
            {"🔥".repeat(Math.min(racha, 5))}
            {racha === 0 ? "—" : ` ${racha}`}
          </span>
          {mejorRacha > 1 && (
            <span className="ml-2 text-xs text-humo">mejor {mejorRacha}</span>
          )}
        </span>
        {conReloj && !resuelta && (
          <span
            className={`ml-auto font-mono text-lg font-bold ${
              restante <= 5 ? "text-brasa" : "text-tiza"
            }`}
          >
            {restante}s
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="mb-4 text-center">
          {modo === "cifrado" || resuelta ? (
            <p className="font-display my-2 text-6xl font-black text-sol">
              {simboloConBajo(ronda.root, ronda.quality, ronda.inv)}
            </p>
          ) : (
            <div className="my-2 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => sonar()}
                className="rounded-full bg-uva px-5 py-3 text-lg font-bold text-noche transition hover:brightness-110"
              >
                🔊 Escuchar otra vez
              </button>
              {regalarRaiz && (
                <span className="font-display text-4xl font-black text-sol">
                  {escribirNota(raizEscrita(ronda.root), "en")}
                  <span className="ml-1.5 text-base font-bold text-humo">
                    la fundamental
                  </span>
                </span>
              )}
            </div>
          )}
          <p className="text-sm text-humo">
            {resuelta
              ? veredicto === "bien"
                ? pistas === 0
                  ? "Sin pistas y sin errores."
                  : `Con ${pistas === 1 ? "una pista" : `${pistas} pistas`}.`
                : seTermino
                  ? "Se acabó el tiempo. Ahí está el acorde."
                  : "Ahí está el acorde."
              : modo === "oido"
                ? regalarRaiz
                  ? "Sacá de oído qué acorde es y armalo. La fundamental te la damos; lo que hay que escuchar es la calidad."
                  : "Sacá de oído qué acorde es y armalo, sin ninguna ayuda."
                : "Armalo en el teclado, o en el piano de verdad si lo tenés al lado."}
          </p>
        </div>

        <Piano
          from={45}
          to={81}
          marks={marks}
          armado={armado}
          respondiendo={!resuelta}
          faltan={pitches.length - puestas.length}
          paraTocar
        >
          {veredicto === "bajo" && (
            <p className="mt-3 text-center text-sm text-sol">
              Las notas son ésas, pero el bajo no: está invertido.
            </p>
          )}
          {veredicto === "mal" && (
            <p className="mt-3 text-center text-sm text-brasa">
              Las teclas con ✗ no van. Contá la receta desde la fundamental.
            </p>
          )}
          <Pistas
            lista={listaDePistas}
            dadas={pistas}
            onPedir={() => setPistas((x) => x + 1)}
          />
        </Piano>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            onClick={nueva}
            className="rounded-full bg-sol px-5 py-2.5 font-bold text-noche transition hover:brightness-110"
          >
            {resuelta ? "Siguiente →" : "🎲 Otro"}
          </button>
          {!resuelta && (
            <button
              onClick={() => {
                sonar();
                cerrar(false, false);
              }}
              className="rounded-full bg-carta-2 px-4 py-2 text-sm font-bold transition hover:bg-borde"
            >
              👀 Ver resuelto
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-borde/60 pt-4 text-sm text-humo">
          <Tilde
            puesto={conReloj}
            onCambiar={setConReloj}
            texto={`Contrarreloj (${SEGUNDOS}s por acorde)`}
          />
          <Tilde
            puesto={conInversiones}
            onCambiar={setConInversiones}
            texto="Pedir también inversiones"
          />
          {modo === "oido" && (
            <Tilde
              puesto={!regalarRaiz}
              onCambiar={(v) => setRegalarRaiz(!v)}
              texto="Sin darte la fundamental"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Tilde({
  puesto,
  onCambiar,
  texto,
}: {
  puesto: boolean;
  onCambiar: (v: boolean) => void;
  texto: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={puesto}
        onChange={(e) => onCambiar(e.target.checked)}
        className="accent-uva"
      />
      {texto}
    </label>
  );
}

/**
 * Antes de arrancar: qué acordes van a salir y cuáles te vienen costando.
 *
 * Lo de "cuáles te cuestan" es lo único que sobrevive entre sesiones, y está
 * acá y no en un puntaje a propósito: no es un boletín, es la razón por la que
 * esos van a aparecer más seguido. Y se puede borrar de un botón.
 */
function Portada({
  modo,
  qualities,
  onArrancar,
  onOlvidar,
  version,
}: {
  modo: "cifrado" | "oido";
  qualities: ChordQuality[];
  onArrancar: () => void;
  onOlvidar: () => void;
  version: number;
}) {
  const [memoria, setMemoria] = useState<ReturnType<typeof leerMemoria>>({});
  // En el servidor no hay localStorage, así que se lee después de montar.
  useEffect(() => setMemoria(leerMemoria()), [version]);

  const conCuenta = qualities
    .map((q) => ({ q, marca: memoria[q.id] }))
    .filter((x) => x.marca && x.marca.bien + x.marca.mal > 0)
    .sort((a, b) => peso(b.marca) - peso(a.marca));
  const cuestan = conCuenta.filter((x) => (x.marca?.mal ?? 0) > 0).slice(0, 4);

  return (
    <div className="card p-6">
      <p className="text-humo">
        {modo === "oido"
          ? "Suena un acorde y no se muestra nada: hay que sacarlo de oído y armarlo. Es el que más pide el piano al lado — con el teclado MIDI enchufado se contesta tocando."
          : "Sale un cifrado y lo armás, contra el reloj si querés. Los que te salen mal vuelven a aparecer más seguido."}
      </p>

      <p className="mt-4 text-xs tracking-[0.2em] text-humo uppercase">
        Van a salir estos {qualities.length}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {qualities.map((q) => (
          <span
            key={q.id}
            className="rounded-lg bg-carta-2 px-2.5 py-1 font-mono text-sm"
          >
            {q.suffix || "mayor"}
          </span>
        ))}
      </div>

      {cuestan.length > 0 && (
        <>
          <p className="mt-5 text-xs tracking-[0.2em] text-humo uppercase">
            Los que te vienen costando
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {cuestan.map(({ q, marca }) => (
              <span
                key={q.id}
                className="rounded-lg bg-brasa/15 px-2.5 py-1 font-mono text-sm text-brasa"
              >
                {q.suffix || "mayor"}
                <span className="ml-1.5 text-xs opacity-70">
                  {marca!.bien}/{marca!.bien + marca!.mal}
                </span>
              </span>
            ))}
            <button
              onClick={onOlvidar}
              className="ml-2 text-xs text-humo underline decoration-dotted underline-offset-4 transition hover:text-tiza"
            >
              olvidalo todo
            </button>
          </div>
        </>
      )}

      <button
        onClick={onArrancar}
        className="mt-6 rounded-full bg-sol px-6 py-3 font-bold text-noche transition hover:brightness-110"
      >
        {modo === "oido" ? "🔊 Arrancar" : "🎲 Arrancar"}
      </button>
    </div>
  );
}
