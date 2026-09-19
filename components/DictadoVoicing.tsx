"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Icono from "./Icono";
import { type Mark } from "./Keyboard";
import Piano from "./Piano";
import Pistas, { type Pista } from "./Pistas";
import {
  CHORD_QUALITIES,
  chordSymbol,
  deletrearAcorde,
  escribirNota,
  intervalsOf,
  octaveOf,
  qualityById,
  type ChordQuality,
  type Pitch,
} from "@/lib/music";
import {
  DISPOSICIONES,
  GRADOS_DE_ACORDE,
  corregirVoicing,
  gradoDeTecla,
  teclasDe,
  teclasQuePide,
  voicingModelo,
  type Disposicion,
  type PedidoDeVoicing,
} from "@/lib/voicing";
import { playChord, wakeAudio } from "@/lib/audio";
import { useArmado } from "@/lib/useArmado";
import { anotar, elegirConMemoria } from "@/lib/memoria";

/**
 * El dictado de voicing: sale un acorde y una disposición —"Fmaj7 abierto,
 * 1 y 5 en la izquierda, 3 y 7 en la derecha"— y hay que tocarlo así.
 *
 * Es el dictado de acordes con un criterio más. Ahí alcanza con las notas y
 * el bajo; acá además importa *dónde* cae cada grado, que es de lo que trata
 * la clase 7: la tercera no va abajo. Con el MIDI no se sabe qué mano apretó
 * qué, así que las manos se deducen del registro (`corregirVoicing`): en el
 * voicing abierto la izquierda son las dos teclas más graves.
 *
 * **Lo que se olvida es el reparto, no el acorde**, así que la memoria cuenta
 * por disposición (`voicing:15-37`) y no por calidad.
 */

const BASE_DE_MEMORIA = "voicing:";
const POR_DEFECTO: Disposicion[] = ["15-37", "17-35", "una-mano"];

type Ronda = PedidoDeVoicing;

export default function DictadoVoicing({ qualityIds }: { qualityIds?: string[] }) {
  const qualities = useMemo(() => {
    const ids = qualityIds?.length ? qualityIds : ["maj", "min", "maj7", "dom7", "min7"];
    // Los sus no tienen tercera: no hay qué repartir.
    const qs = ids
      .map((id) => qualityById(id))
      .filter((q): q is ChordQuality => Boolean(q) && !q!.grados);
    return qs.length ? qs : CHORD_QUALITIES.filter((q) => !q.grados);
  }, [qualityIds]);

  const [activas, setActivas] = useState<Disposicion[]>(POR_DEFECTO);
  const [ronda, setRonda] = useState<Ronda | null>(null);
  const [n, setN] = useState(0);
  const [pistas, setPistas] = useState(0);
  const [resuelta, setResuelta] = useState<"acerto" | "mostrado" | null>(null);
  const [racha, setRacha] = useState(0);
  const [puntaje, setPuntaje] = useState({ limpias: 0, rondas: 0 });

  const armado = useArmado({ activo: Boolean(ronda) && !resuelta });
  const puestas = armado.notas;

  const correccion = ronda ? corregirVoicing(puestas, ronda) : null;
  const modelo = ronda ? voicingModelo(ronda) : null;

  const nueva = useCallback(() => {
    wakeAudio();
    const q = qualities[Math.floor(Math.random() * qualities.length)];
    const cuatriada = intervalsOf(q).length >= 4;
    const posibles = DISPOSICIONES.filter(
      (d) => activas.includes(d.id) && (cuatriada || !d.soloCuatriadas),
    );
    // Una tríada con sólo "1-7 / 3-5" y "a una mano" elegidas no tiene
    // disposición posible: ahí va la abierta de siempre.
    const lista = posibles.length ? posibles : DISPOSICIONES.filter((d) => d.id === "15-37");
    const disposicion = elegirConMemoria(lista, (d) => BASE_DE_MEMORIA + d.id).id;
    setRonda({ root: Math.floor(Math.random() * 12), q, disposicion });
    setPistas(0);
    setResuelta(null);
    armado.borrar();
    setN((x) => x + 1);
    setPuntaje((p) => ({ ...p, rondas: p.rondas + 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qualities, activas]);

  const cerrar = useCallback(
    (como: "acerto" | "mostrado", limpio: boolean) => {
      if (!ronda) return;
      setResuelta(como);
      const bien = como === "acerto" && limpio;
      anotar(BASE_DE_MEMORIA + ronda.disposicion, bien);
      if (bien) {
        setPuntaje((p) => ({ ...p, limpias: p.limpias + 1 }));
        setRacha((r) => r + 1);
      } else {
        setRacha(0);
      }
    },
    [ronda],
  );

  // Se corrige recién con las teclas que pide, y se cierra sola al acertar.
  useEffect(() => {
    if (!ronda || resuelta || correccion?.veredicto !== "bien") return;
    wakeAudio();
    playChord(puestas, 1.4);
    cerrar("acerto", pistas === 0);
  }, [correccion?.veredicto, ronda, resuelta, pistas, cerrar, puestas]);

  const mostrar = () => {
    if (!modelo) return;
    wakeAudio();
    playChord(teclasDe(modelo), 1.4);
    cerrar("mostrado", false);
  };

  const alternarDisposicion = (id: Disposicion) =>
    setActivas((prev) => {
      if (prev.includes(id)) return prev.length > 1 ? prev.filter((x) => x !== id) : prev;
      return [...prev, id];
    });

  // ---- Lo que se ve ----------------------------------------------------------

  const grado = (p: Pitch) => (ronda ? gradoDeTecla(p, ronda.root, ronda.q) : null);
  const etiqueta = (p: Pitch) => {
    const g = grado(p);
    return g === null ? undefined : String(g);
  };

  /** Una mano pintada: la izquierda en menta, la derecha en rosa, la tercera con aro. */
  const pintar = (izquierda: Pitch[], derecha: Pitch[], conTilde = false): Mark[] => [
    ...izquierda.map((p) => ({ pitch: p, tone: "izq" as const, label: conTilde ? "✓" : etiqueta(p), active: grado(p) === 3 })),
    ...derecha.map((p) => ({ pitch: p, tone: "der" as const, label: conTilde ? "✓" : etiqueta(p), active: grado(p) === 3 })),
  ];

  let marks: Mark[] = [];
  if (ronda && resuelta === "mostrado" && modelo) {
    marks = pintar(modelo.izquierda, modelo.derecha);
  } else if (ronda && correccion) {
    const { veredicto, izquierda, derecha, pegadas } = correccion;
    const base = pintar(izquierda, derecha, resuelta === "acerto");
    const marcar = (cual: (p: Pitch) => boolean, tone: Mark["tone"], label?: string): Mark[] =>
      base.map((m) => (cual(m.pitch) ? { ...m, tone, label: label ?? m.label, active: false } : m));
    switch (veredicto) {
      case "bien":
        marks = base;
        break;
      case "notas":
        marks = marcar((p) => grado(p) === null, "brasa", "✗");
        break;
      case "bajo":
        marks = marcar((p) => p === Math.min(...puestas), "brasa", "↓");
        break;
      case "tercera-abajo":
        marks = marcar((p) => grado(p) === 3 && izquierda.includes(p), "brasa");
        break;
      case "reparto":
        marks = marcar((p) => izquierda.includes(p), "brasa");
        break;
      case "pegado":
        marks = marcar((p) => pegadas!.includes(p), "sol");
        break;
      case "no-cerrada":
        marks = base.map((m) => ({ ...m, tone: "luna" as const }));
        break;
      case "con-fundamental":
        marks = marcar((p) => grado(p) === 1, "brasa");
        break;
    }
  } else {
    marks = puestas.map((p) => ({ pitch: p, tone: "luna" as const, label: etiqueta(p) }));
  }

  const explicacion = (): string | null => {
    if (!correccion || resuelta) return null;
    switch (correccion.veredicto) {
      case "bien":
        return null;
      case "notas":
        return "Las teclas con ✗ no son del acorde. Contá la receta desde la fundamental.";
      case "bajo":
        return "Las notas están, pero abajo de todo va la fundamental: es la que sostiene el voicing.";
      case "tercera-abajo":
        return "Ahí está el error de la clase: la tercera quedó en la izquierda. Subila a la derecha, la izquierda pone sólo la base.";
      case "reparto":
        return "La izquierda tiene otro par. Fijate qué dos grados pide abajo.";
      case "pegado":
        return "El reparto está, pero la derecha arranca pegada a la izquierda: subí la derecha hasta que quede por lo menos una cuarta de aire.";
      case "no-cerrada":
        return "Cerrada es apilada de a terceras desde la fundamental, todo junto, sin aire.";
      case "con-fundamental":
        return "A una mano la fundamental se esquiva: la pone el bajo. Sacala y quedate con 3, 5 y 7.";
    }
  };

  const nombreConOctava = (p: Pitch): string => {
    if (!ronda) return "";
    const g = grado(p);
    const escritas = deletrearAcorde(ronda.root, ronda.q);
    const i = g === null ? -1 : GRADOS_DE_ACORDE.indexOf(g);
    return `${i >= 0 && escritas[i] ? escribirNota(escritas[i]) : "?"}${octaveOf(p)}`;
  };

  const listaDePistas: Pista[] = !ronda || !modelo
    ? []
    : [
        {
          que: "las notas",
          contenido: (
            <strong className="font-mono">
              {deletrearAcorde(ronda.root, ronda.q).map((x) => escribirNota(x)).join(" · ")}
            </strong>
          ),
        },
        ronda.disposicion === "una-mano"
          ? {
              que: "sin",
              contenido: (
                <>
                  la fundamental, <strong>{escribirNota(deletrearAcorde(ronda.root, ronda.q)[0])}</strong>. Lo que queda, en cualquier giro.
                </>
              ),
            }
          : ronda.disposicion === "cerrada"
            ? {
                que: "abajo",
                contenido: (
                  <>
                    la fundamental, y las demás pegadas arriba de a terceras.
                  </>
                ),
              }
            : {
                que: "la izquierda",
                contenido: (
                  <>
                    <strong className="font-mono">{modelo.izquierda.map(nombreConOctava).join(" · ")}</strong>, la fundamental abajo de todo.
                  </>
                ),
              },
        {
          que: "la disposición",
          contenido: (
            <strong className="font-mono">{teclasDe(modelo).map(nombreConOctava).join(" · ")}</strong>
          ),
        },
      ];

  const enunciado = (): string => {
    if (!ronda) return "";
    const d = DISPOSICIONES.find((x) => x.id === ronda.disposicion)!;
    const triada = intervalsOf(ronda.q).length < 4;
    if (d.id === "15-37" && triada) return "abierto: 1 y 5 en la izquierda, la 3 en la derecha";
    if (d.id === "una-mano" && triada) return "a una mano, girado como caiga cómodo";
    return `${d.id === "cerrada" ? "cerrado" : d.id === "una-mano" ? "a una mano" : "abierto"}: ${d.enunciado}`;
  };

  if (!ronda) {
    return (
      <div className="card p-6">
        <p className="text-humo">
          Sale un acorde con su disposición —cerrado, abierto con un reparto, o a una mano sin la
          fundamental— y hay que tocarlo así. Corrige las notas, el bajo, y sobre todo <em>dónde</em>{" "}
          quedó cada grado: la tercera abajo es el error que la clase 7 vino a sacar.
        </p>
        <p className="mt-3 text-sm text-humo">
          Con el teclado MIDI no se sabe qué mano apretó qué, así que la izquierda son las dos teclas
          más graves. La octava da igual, y duplicar la fundamental o la quinta arriba no molesta.
        </p>
        <p className="mt-5 text-xs tracking-[0.2em] text-humo uppercase">Qué pedir</p>
        <Disposiciones activas={activas} onAlternar={alternarDisposicion} />
        <p className="mt-4 text-xs tracking-[0.2em] text-humo uppercase">Sobre estos {qualities.length}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {qualities.map((q) => (
            <span key={q.id} className="rounded-lg bg-carta-2 px-2.5 py-1 font-mono text-sm">
              {q.suffix || "mayor"}
            </span>
          ))}
        </div>
        <button
          onClick={nueva}
          className="mt-6 rounded-full bg-sol px-6 py-3 font-bold text-noche transition hover:brightness-110"
        >
          <Icono de="dado" /> Arrancar
        </button>
      </div>
    );
  }

  const texto = explicacion();

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-borde/60 px-5 py-3 text-sm">
        <span className="text-xs tracking-[0.2em] text-humo uppercase">Ronda {n}</span>
        <span className="font-mono">
          <span className="text-menta">{puntaje.limpias}</span>
          <span className="text-humo">/{puntaje.rondas}</span>
          <span className="ml-1 text-xs text-humo">sin pistas</span>
        </span>
        <span className="font-mono">
          <span className={racha >= 3 ? "text-sol" : "text-humo"}>
            {Array.from({ length: Math.min(racha, 5) }, (_, i) => (
              <Icono key={i} de="llama" />
            ))}
            {racha === 0 ? "—" : ` ${racha}`}
          </span>
        </span>
      </div>

      <div className="p-5">
        <div className="mb-4 text-center">
          <p className="font-display my-2 text-6xl font-black text-sol">{chordSymbol(ronda.root, ronda.q)}</p>
          <p className="text-lg font-semibold text-tiza">{enunciado()}</p>
          <p className="mt-1 text-sm text-humo">
            {resuelta === "acerto"
              ? pistas === 0
                ? "Sin pistas y sin errores."
                : `Con ${pistas === 1 ? "una pista" : `${pistas} pistas`}.`
              : resuelta === "mostrado"
                ? "Así va. Verde la izquierda, rosa la derecha, con aro la tercera."
                : "Tocalo en el piano de verdad si lo tenés al lado, o en el teclado de acá."}
          </p>
        </div>

        <Piano
          from={45}
          to={81}
          marks={marks}
          armado={armado}
          respondiendo={!resuelta}
          faltan={Math.max(0, teclasQuePide(ronda) - puestas.length)}
          paraTocar
        >
          {texto && (
            <p className={`mt-3 text-center text-sm ${correccion?.veredicto === "pegado" ? "text-sol" : "text-brasa"}`}>
              {texto}
            </p>
          )}
          <Pistas lista={listaDePistas} dadas={pistas} onPedir={() => setPistas((x) => x + 1)} />
        </Piano>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            onClick={nueva}
            className="rounded-full bg-sol px-5 py-2.5 font-bold text-noche transition hover:brightness-110"
          >
            {resuelta ? (
              "Siguiente →"
            ) : (
              <>
                <Icono de="dado" /> Otro
              </>
            )}
          </button>
          {!resuelta && (
            <button
              onClick={mostrar}
              className="rounded-full bg-carta-2 px-4 py-2 text-sm font-bold transition hover:bg-borde"
            >
              👀 Ver resuelto
            </button>
          )}
        </div>

        <div className="mt-4 border-t border-borde/60 pt-4">
          <p className="text-xs tracking-[0.2em] text-humo uppercase">Qué pedir</p>
          <Disposiciones activas={activas} onAlternar={alternarDisposicion} />
        </div>
      </div>
    </div>
  );
}

function Disposiciones({
  activas,
  onAlternar,
}: {
  activas: Disposicion[];
  onAlternar: (id: Disposicion) => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {DISPOSICIONES.map((d) => {
        const puesta = activas.includes(d.id);
        return (
          <button
            key={d.id}
            onClick={() => onAlternar(d.id)}
            title={d.soloCuatriadas ? "Sólo sale con acordes con séptima" : undefined}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
              puesta ? "bg-sol text-noche" : "bg-carta-2 text-humo hover:text-tiza"
            }`}
          >
            {d.nombre}
          </button>
        );
      })}
    </div>
  );
}
