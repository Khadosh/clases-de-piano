"use client";

import { useEffect, useRef, useState } from "react";
import {
  DISMINUIDOS,
  DOMINANTES,
  PROGRESIONES,
  TONALIDAD_MAYOR,
  destinoDadoVuelta,
  disminuidoDelGrado,
  dominanteDelGrado,
  raizDelGrado,
  type Disminuido,
  type Dominante,
} from "@/lib/grados";
import {
  chordPitches,
  chordSymbol,
  deletrearAcorde,
  escribirNota,
  mod12,
  qualityById,
} from "@/lib/music";
import { playChord, wakeAudio } from "@/lib/audio";
import Keyboard, { type Mark } from "./Keyboard";

/**
 * Los acordes de paso de la clase 5, en dos mitades.
 *
 * La tabla: sobre cada nota de Do mayor el X7 y adónde lleva, para escuchar
 * la llegada de a una — y con el mismo interruptor, la otra opción: el X°, el
 * disminuido que es el VII° de la llegada. El teclado de abajo muestra el
 * acorde que está sonando con la nota ajena a la escala pintada distinto — el
 * Fa♯ del D7, el Do♯ del A7 — porque esa nota es toda la gracia: es lo que
 * el acorde de paso trae de la tonalidad adonde apunta. Cada dominante tiene
 * además el destino dado vuelta (el D en vez del Dm), que es la manera de
 * oír cuándo se va del campo — lo que el profe llamó *efectivo*.
 *
 * La vuelta: una progresión, y entre acorde y acorde un botón que cicla
 * nada → el X7 → el X° del acorde que viene. Se escucha con y sin, que es la
 * única forma de entender para qué sirve un acorde de paso. El de paso ocupa
 * la segunda mitad del compás anterior —así está escrito en el cuaderno,
 * entre paréntesis adentro del compás de antes— y no agrega compases.
 */

const BASE = 48; // Do3
const DOM7 = qualityById("dom7")!;
const DIM = qualityById("dim")!;

const TIPO: Record<Dominante["tipo"], { nombre: string; chip: string; detalle: string }> = {
  principal: {
    nombre: "principal",
    chip: "bg-menta/20 text-menta",
    detalle: "El V7 de la tonalidad: el de siempre.",
  },
  secundario: {
    nombre: "secundario",
    chip: "bg-sol/20 text-sol",
    detalle: "Lleva a otro acorde del campo, como el G7 lleva a Do.",
  },
  efectivo: {
    nombre: "efectivo",
    chip: "bg-brasa/20 text-brasa",
    detalle: "Lleva a un acorde que Do mayor no tiene: se va a otro campo armónico.",
  },
};

export default function Dominantes() {
  const [modo, setModo] = useState<"tabla" | "vuelta">("tabla");

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-borde/60 p-4">
        {(["tabla", "vuelta"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setModo(m)}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
              modo === m ? "bg-tiza text-noche" : "bg-carta-2 text-humo hover:text-tiza"
            }`}
          >
            {m === "tabla" ? "la tabla" : "meterlos en la vuelta"}
          </button>
        ))}
        <span className="ml-auto hidden text-xs text-humo sm:block">
          {modo === "tabla"
            ? "cada acorde de paso de Do mayor y adónde lleva"
            : "una progresión, con y sin los de paso"}
        </span>
      </div>

      {modo === "tabla" ? <Tabla /> : <Vuelta />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// La tabla
// ---------------------------------------------------------------------------

type Paso = "dom" | "dim";

function Tabla() {
  const [paso, setPaso] = useState<Paso>("dom");
  const [marcas, setMarcas] = useState<Mark[]>([]);
  const [sonando, setSonando] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const limpiar = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  /** Suena el acorde de paso y, un segundo después, adonde lleva. */
  const tocar = (
    clave: string,
    pitches: number[],
    ajenas: number[],
    raizDestino: number,
    calidad: string,
  ) => {
    limpiar();
    wakeAudio();
    const llegada = chordPitches(BASE + raizDestino, qualityById(calidad)!);
    playChord(pitches, 1.2);
    setMarcas(
      pitches.map((p) => ({ pitch: p, tone: ajenas.includes(mod12(p)) ? "brasa" : "sol" })),
    );
    setSonando(clave);
    timers.current.push(
      setTimeout(() => {
        playChord(llegada, 1.6);
        setMarcas(llegada.map((p) => ({ pitch: p, tone: "menta" })));
      }, 1000),
    );
    timers.current.push(setTimeout(() => setSonando(null), 2400));
  };

  const tocarDominante = (d: Dominante, dadoVuelta = false) =>
    tocar(
      `${d.cifrado}${dadoVuelta ? "-vuelta" : ""}`,
      chordPitches(BASE + d.raiz, DOM7),
      d.ajenas,
      d.raizDestino,
      dadoVuelta ? destinoDadoVuelta(d).calidad : d.calidadDestino,
    );

  const tocarDisminuido = (x: Disminuido) =>
    tocar(x.cifrado, chordPitches(BASE + x.raiz, DIM), x.ajenas, x.raizDestino, x.calidadDestino);

  const Notas = ({
    notas,
    ajenas,
  }: {
    notas: ReturnType<typeof deletrearAcorde>;
    ajenas: number[];
  }) => (
    <span className="flex gap-1 sm:ml-auto">
      {notas.map((n, i) => {
        const ajena = ajenas.includes(n.pc);
        return (
          <span
            key={i}
            className={`rounded-md px-1.5 py-0.5 font-mono text-xs ${
              ajena ? "bg-brasa/20 font-bold text-brasa" : "bg-noche text-tiza"
            }`}
            title={ajena ? "No está en Do mayor: es la nota que el acorde de paso trae" : undefined}
          >
            {escribirNota(n)}
          </span>
        );
      })}
    </span>
  );

  return (
    <div>
      {/* Cuál de las dos opciones */}
      <div className="flex flex-wrap items-center gap-2 px-4 pt-4">
        <div className="flex overflow-hidden rounded-xl border border-borde/60 text-sm font-semibold">
          {(
            [
              ["dom", "X7 · dominantes"],
              ["dim", "X° · disminuidos"],
            ] as const
          ).map(([p, label]) => (
            <button
              key={p}
              onClick={() => setPaso(p)}
              className={`px-3 py-1.5 font-mono transition ${
                paso === p ? "bg-tiza text-noche" : "bg-carta-2 text-humo hover:text-tiza"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-humo">
          {paso === "dom"
            ? "mayor con séptima menor, cinco semitonos abajo de adonde llega"
            : "el VII° de adonde llega: un semitono abajo, y resuelve para arriba"}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 p-4">
        {paso === "dom"
          ? DOMINANTES.map((d) => {
              const tipo = TIPO[d.tipo];
              const vuelta = destinoDadoVuelta(d);
              const activo = sonando === d.cifrado;
              const activoVuelta = sonando === `${d.cifrado}-vuelta`;
              return (
                <div
                  key={d.cifrado}
                  className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl px-3 py-2 transition ${
                    activo || activoVuelta ? "bg-sol/10" : "bg-carta-2"
                  }`}
                >
                  <button
                    onClick={() => tocarDominante(d)}
                    className="flex items-baseline gap-2 rounded-lg px-1 text-left transition hover:brightness-125"
                    title={`Escuchar ${d.cifrado} → ${d.cifradoDestino}`}
                  >
                    <span className="font-mono text-xl font-black text-brasa">{d.cifrado}</span>
                    <span className="text-humo">→</span>
                    <span
                      className={`font-mono text-xl font-bold ${
                        d.tipo === "efectivo" ? "text-brasa/80" : "text-menta"
                      }`}
                    >
                      {d.cifradoDestino}
                    </span>
                  </button>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase ${tipo.chip}`}
                    title={tipo.detalle}
                  >
                    {tipo.nombre}
                  </span>
                  <Notas notas={deletrearAcorde(d.raiz, DOM7)} ajenas={d.ajenas} />
                  {d.tipo !== "efectivo" && (
                    <button
                      onClick={() => tocarDominante(d, true)}
                      className={`rounded-lg px-2 py-1 font-mono text-xs transition ${
                        activoVuelta
                          ? "bg-brasa/20 text-brasa"
                          : "bg-noche text-humo hover:text-tiza"
                      }`}
                      title={`El destino dado vuelta: ${vuelta.cifrado} no está en Do mayor, así que acá el ${d.cifrado} se vuelve efectivo`}
                    >
                      → {vuelta.cifrado}
                      <span className="ml-1 text-[10px] tracking-wider uppercase opacity-70">
                        efectivo
                      </span>
                    </button>
                  )}
                </div>
              );
            })
          : DISMINUIDOS.map((x) => {
              const activo = sonando === x.cifrado;
              const afuera = x.destino === null;
              return (
                <div
                  key={x.cifrado}
                  className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl px-3 py-2 transition ${
                    activo ? "bg-sol/10" : "bg-carta-2"
                  }`}
                >
                  <button
                    onClick={() => tocarDisminuido(x)}
                    className="flex items-baseline gap-2 rounded-lg px-1 text-left transition hover:brightness-125"
                    title={`Escuchar ${x.cifrado} → ${x.cifradoDestino}`}
                  >
                    <span className="font-mono text-xl font-black text-uva">{x.cifrado}</span>
                    <span className="text-humo">→</span>
                    <span
                      className={`font-mono text-xl font-bold ${afuera ? "text-brasa/80" : "text-menta"}`}
                    >
                      {x.cifradoDestino}
                    </span>
                  </button>
                  <span
                    className="rounded-full bg-uva/20 px-2 py-0.5 text-[10px] font-bold tracking-widest text-uva uppercase"
                    title={`El séptimo grado de la tonalidad de ${x.cifradoDestino}`}
                  >
                    VII° de {escribirNota(deletrearAcorde(x.raizDestino, qualityById(x.calidadDestino)!)[0])}
                  </span>
                  <Notas notas={deletrearAcorde(x.raiz, DIM, x.base)} ajenas={x.ajenas} />
                </div>
              );
            })}
      </div>

      <div className="border-t border-borde/60 px-4 pt-3 pb-4">
        <Keyboard from={BASE} to={BASE + 24} marks={marcas} />
        <p className="mt-2 text-center text-[11px] text-humo">
          <span className="text-sol">■ el acorde de paso</span> ·{" "}
          <span className="text-brasa">■ la nota que Do mayor no tiene</span> ·{" "}
          <span className="text-menta">■ adonde llega</span>
        </p>
        {paso === "dom" ? (
          <p className="mt-3 text-xs leading-relaxed text-humo">
            El F7 está en la tabla y no en la lista de la clase: la cuenta sobre Fa da un
            dominante igual que los demás, pero cae en Si♭, que Do mayor no tiene. Del
            Bdim no hay X7, porque el que le tocaría —Fa♯7— no se arma sobre ninguna
            nota de la escala.
          </p>
        ) : (
          <p className="mt-3 text-xs leading-relaxed text-humo">
            El Bdim es el de la escala, el que ya lleva a Do desde la clase 3: los otros
            seis son ese mismo movimiento mudado a cada llegada. Se escriben con la letra
            de abajo de adonde van —Re♯dim para Em, no Mi♭dim— porque son su séptimo
            grado.
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// La vuelta
// ---------------------------------------------------------------------------

const SLOT = 1000; // ms por acorde de la progresión

interface VueltaPreset {
  nombre: string;
  grados: number[];
  /** Antes de qué acordes (por índice) viene puesto un acorde de paso. */
  pasos: Record<number, Paso>;
  nota?: string;
}

/**
 * La primera es la del cuaderno, tal cual: los de paso entre paréntesis
 * adentro del compás anterior — C7 antes del F, Fa♯° antes del G, A7 antes
 * del Dm, B° antes del C. Las otras son las progresiones de siempre, vacías,
 * para meterles lo que uno quiera.
 */
const VUELTAS: VueltaPreset[] = [
  {
    nombre: "la de la clase",
    grados: [0, 2, 3, 1, 4, 5, 1, 4, 0],
    pasos: { 2: "dom", 4: "dim", 6: "dom", 8: "dim" },
    nota: "Tal como quedó en el cuaderno: dos dominantes y dos disminuidos, alternados.",
  },
  ...PROGRESIONES.map((p) => ({ nombre: p.nombre, grados: p.grados, pasos: {} })),
];

const SIGUIENTE: Record<Paso | "nada", Paso | "nada"> = { nada: "dom", dom: "dim", dim: "nada" };

function Vuelta() {
  const [vuelta, setVuelta] = useState(0);
  const [pasos, setPasos] = useState<Record<number, Paso>>(VUELTAS[0].pasos);
  const [sonando, setSonando] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const { grados, nota } = VUELTAS[vuelta];

  const acordeDe = (g: number) => {
    const quality = qualityById(TONALIDAD_MAYOR[g].triada)!;
    const raiz = raizDelGrado(0, g);
    return { pitches: chordPitches(BASE + raiz, quality), cifrado: chordSymbol(raiz, quality) };
  };

  /** El acorde de paso puesto antes del acorde i, si hay. */
  const pasoAntesDe = (i: number) => {
    const tipo = pasos[i];
    if (!tipo || i === 0) return null;
    if (tipo === "dom") {
      const d = dominanteDelGrado(grados[i]);
      return d ? { tipo, cifrado: d.cifrado, pitches: chordPitches(BASE + d.raiz, DOM7) } : null;
    }
    const x = disminuidoDelGrado(grados[i]);
    return x ? { tipo, cifrado: x.cifrado, pitches: chordPitches(BASE + x.raiz, DIM) } : null;
  };

  const limpiar = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setSonando(null);
  };

  const elegir = (i: number) => {
    limpiar();
    setVuelta(i);
    setPasos(VUELTAS[i].pasos);
  };

  /** Cicla: nada → el X7 → el X° → nada. Cada uno suena al ponerlo. */
  const ciclar = (i: number) => {
    limpiar();
    wakeAudio();
    const nuevo = SIGUIENTE[pasos[i] ?? "nada"];
    const n = { ...pasos };
    if (nuevo === "nada") delete n[i];
    else n[i] = nuevo;
    setPasos(n);
    if (nuevo !== "nada") {
      const p =
        nuevo === "dom"
          ? dominanteDelGrado(grados[i]) && chordPitches(BASE + dominanteDelGrado(grados[i])!.raiz, DOM7)
          : disminuidoDelGrado(grados[i]) && chordPitches(BASE + disminuidoDelGrado(grados[i])!.raiz, DIM);
      if (p) playChord(p, 0.9);
    }
  };

  const todos = (tipo: Paso | "nada") => {
    limpiar();
    if (tipo === "nada") return setPasos({});
    const n: Record<number, Paso> = {};
    grados.forEach((g, i) => {
      if (i > 0 && dominanteDelGrado(g)) n[i] = tipo;
    });
    setPasos(n);
  };

  const hayPasos = Object.keys(pasos).length > 0;

  /**
   * La progresión, con o sin los de paso. El de paso va en la segunda mitad
   * del compás anterior, así que el acorde de antes se acorta y el total no
   * cambia: la vuelta sigue midiendo lo mismo, sólo que más llena.
   */
  const escuchar = (conPaso: boolean) => {
    limpiar();
    wakeAudio();
    let t = 0;
    grados.forEach((g, i) => {
      const p = conPaso ? pasoAntesDe(i + 1) : null;
      const dur = p ? SLOT / 2 : SLOT;
      const { pitches } = acordeDe(g);
      const ti = t;
      timers.current.push(
        setTimeout(() => {
          playChord(pitches, (dur / 1000) * 1.05);
          setSonando(`${i}`);
        }, ti),
      );
      t += dur;
      if (p) {
        const td = t;
        timers.current.push(
          setTimeout(() => {
            playChord(p.pitches, (SLOT / 2 / 1000) * 1.05);
            setSonando(`p${i + 1}`);
          }, td),
        );
        t += SLOT / 2;
      }
    });
    timers.current.push(setTimeout(() => setSonando(null), t + 300));
  };

  const linea = grados.flatMap((g, i) => {
    const p = pasoAntesDe(i);
    return p ? [`(${p.cifrado})`, acordeDe(g).cifrado] : [acordeDe(g).cifrado];
  });

  return (
    <div className="p-4">
      {/* Qué progresión */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {VUELTAS.map((v, i) => (
          <button
            key={v.nombre}
            onClick={() => elegir(i)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              i === 0 ? "" : "font-mono"
            } ${vuelta === i ? "bg-tiza text-noche" : "bg-carta-2 text-humo hover:text-tiza"}`}
          >
            {v.nombre}
          </button>
        ))}
      </div>
      {nota && <p className="mb-3 text-center text-xs text-humo">{nota}</p>}

      {/* La vuelta, con el botón de paso entre acorde y acorde */}
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {grados.map((g, i) => {
          const { cifrado } = acordeDe(g);
          const d = i > 0 ? dominanteDelGrado(g) : null;
          const x = i > 0 ? disminuidoDelGrado(g) : null;
          const p = pasoAntesDe(i);
          return (
            <div key={i} className="flex items-center gap-1.5">
              {d && x && (
                <button
                  onClick={() => ciclar(i)}
                  className={`rounded-xl border px-2.5 py-1.5 font-mono text-sm font-bold transition ${
                    !p
                      ? "border-borde/60 border-dashed bg-transparent text-humo/50 hover:text-humo"
                      : sonando === `p${i}`
                        ? p.tipo === "dom"
                          ? "border-brasa bg-brasa text-noche"
                          : "border-uva bg-uva text-noche"
                        : p.tipo === "dom"
                          ? "border-brasa/60 border-dashed bg-brasa/15 text-brasa"
                          : "border-uva/60 border-dashed bg-uva/15 text-uva"
                  }`}
                  title={
                    !p
                      ? `Meter el ${d.cifrado} antes del ${cifrado} (otro toque: el ${x.cifrado}; otro más: sacarlo)`
                      : p.tipo === "dom"
                        ? `Cambiar por el ${x.cifrado}`
                        : `Sacar el ${x.cifrado}`
                  }
                >
                  {p ? p.cifrado : "+"}
                </button>
              )}
              <span
                className={`rounded-xl px-3 py-2 font-mono text-base font-bold transition ${
                  sonando === `${i}` ? "bg-sol text-noche" : "bg-carta-2 text-tiza"
                }`}
              >
                {cifrado}
                <span className="ml-1.5 text-[11px] font-normal opacity-70">
                  {TONALIDAD_MAYOR[g].cifra}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-center font-mono text-sm text-humo">{linea.join(" · ")}</p>
      <p className="mt-1 text-center text-[11px] text-humo/70">
        cada toque en el + cambia: <span className="text-brasa">X7</span> ·{" "}
        <span className="text-uva">X°</span> · nada
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => escuchar(false)}
          className="rounded-full bg-carta-2 px-4 py-2 text-sm font-semibold text-humo transition hover:text-tiza"
        >
          ▶ Sin los de paso
        </button>
        <button
          onClick={() => escuchar(true)}
          disabled={!hayPasos}
          className="rounded-full bg-sol px-5 py-2 text-sm font-bold text-noche transition hover:brightness-110 disabled:opacity-40"
        >
          ▶ Con los de paso
        </button>
        <button
          onClick={() => todos("dom")}
          className="rounded-xl bg-carta-2 px-3 py-1.5 font-mono text-xs font-semibold text-humo transition hover:text-tiza"
        >
          todos X7
        </button>
        <button
          onClick={() => todos("dim")}
          className="rounded-xl bg-carta-2 px-3 py-1.5 font-mono text-xs font-semibold text-humo transition hover:text-tiza"
        >
          todos X°
        </button>
        {hayPasos && (
          <button
            onClick={() => todos("nada")}
            className="rounded-xl bg-carta-2 px-3 py-1.5 text-xs font-semibold text-humo transition hover:text-tiza"
          >
            sacar todos
          </button>
        )}
      </div>
      <p className="mt-4 text-center text-xs leading-relaxed text-humo">
        El de paso ocupa la segunda mitad del compás anterior —en el cuaderno va entre
        paréntesis adentro de ese compás—: la vuelta dura lo mismo, pero cada llegada
        viene preparada. Con todos puestos se escucha por qué son de paso y no de
        quedarse.
      </p>
    </div>
  );
}
