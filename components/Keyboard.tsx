"use client";

import { useMemo } from "react";
import { isBlack, mod12, noteName, type Pitch } from "@/lib/music";

export type Tone =
  | "sol"
  | "luna"
  | "brasa"
  | "menta"
  | "uva"
  | "niebla"
  | "izq"
  | "der";

export const TONE_HEX: Record<Tone, string> = {
  sol: "#ffcb3d",
  luna: "#7aa2ff",
  brasa: "#ff6f4e",
  menta: "#4fd6a9",
  uva: "#c07dff",
  niebla: "#9aa6bf",
  izq: "#4fd6a9",
  der: "#ff8ec4",
};

export interface Mark {
  pitch: Pitch;
  tone?: Tone;
  /** Texto chico dentro de la tecla: número de dedo, grado, lo que sea. */
  label?: string;
  /** Se dibuja más apagada: sirve para "la posición" vs "la nota que suena". */
  ghost?: boolean;
  /** Aro alrededor: la nota activa en este instante. */
  active?: boolean;
}

interface Props {
  from?: Pitch;
  to?: Pitch;
  marks?: Mark[];
  onKeyPress?: (pitch: Pitch) => void;
  /** Escribe el nombre de la nota en todas las blancas. */
  showNoteNames?: boolean;
  className?: string;
}

const WHITE_W = 34;
const WHITE_H = 150;
const BLACK_W = 21;
const BLACK_H = 94;

export default function Keyboard({
  from = 48,
  to = 84,
  marks = [],
  onKeyPress,
  showNoteNames = false,
  className = "",
}: Props) {
  const { whites, blacks, width } = useMemo(() => {
    const whites: { pitch: Pitch; x: number }[] = [];
    const blacks: { pitch: Pitch; x: number }[] = [];
    let x = 0;
    for (let p = from; p <= to; p++) {
      if (!isBlack(p)) {
        whites.push({ pitch: p, x });
        x += WHITE_W;
      }
    }
    for (let p = from; p <= to; p++) {
      if (!isBlack(p)) continue;
      const below = whites.find((w) => w.pitch === p - 1);
      if (!below) continue;
      blacks.push({ pitch: p, x: below.x + WHITE_W - BLACK_W / 2 });
    }
    return { whites, blacks, width: x };
  }, [from, to]);

  const markFor = useMemo(() => {
    const m = new Map<Pitch, Mark>();
    for (const mark of marks) m.set(mark.pitch, mark);
    return m;
  }, [marks]);

  const interactive = Boolean(onKeyPress);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${WHITE_H + 6}`}
        // En pantallas chicas el teclado no se achica hasta ser ilegible:
        // se mantiene a un tamaño usable y el contenedor scrollea.
        style={{ minWidth: Math.min(whites.length * 26, 520) }}
        className={`w-full select-none ${className}`}
        role="img"
        aria-label="Teclado de piano"
      >
      {whites.map(({ pitch, x }) => {
        const mk = markFor.get(pitch);
        const hex = mk ? TONE_HEX[mk.tone ?? "sol"] : null;
        return (
          <g
            key={pitch}
            onClick={interactive ? () => onKeyPress?.(pitch) : undefined}
            className={interactive ? "cursor-pointer" : undefined}
          >
            <rect
              x={x + 1}
              y={0}
              width={WHITE_W - 2}
              height={WHITE_H}
              rx={5}
              fill={hex ?? "#f7f4ee"}
              opacity={mk?.ghost ? 0.38 : 1}
              stroke={mk?.active ? "#0b0a14" : "#cbc6ba"}
              strokeWidth={mk?.active ? 3 : 1}
            />
            {mk?.label && (
              <text
                x={x + WHITE_W / 2}
                y={WHITE_H - 16}
                textAnchor="middle"
                fontSize={15}
                fontWeight={800}
                fill="#161225"
              >
                {mk.label}
              </text>
            )}
            {showNoteNames && !mk?.label && (
              <text
                x={x + WHITE_W / 2}
                y={WHITE_H - 16}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                fill="#8d8778"
              >
                {noteName(pitch)}
              </text>
            )}
            {mod12(pitch) === 0 && !mk?.label && (
              <text
                x={x + WHITE_W / 2}
                y={WHITE_H - 3}
                textAnchor="middle"
                fontSize={8}
                fill="#b3ac9c"
              >
                {`Do${Math.floor(pitch / 12) - 1}`}
              </text>
            )}
          </g>
        );
      })}

      {blacks.map(({ pitch, x }) => {
        const mk = markFor.get(pitch);
        const hex = mk ? TONE_HEX[mk.tone ?? "sol"] : null;
        return (
          <g
            key={pitch}
            onClick={interactive ? () => onKeyPress?.(pitch) : undefined}
            className={interactive ? "cursor-pointer" : undefined}
          >
            <rect
              x={x}
              y={0}
              width={BLACK_W}
              height={BLACK_H}
              rx={4}
              fill={hex ?? "#1b1726"}
              opacity={mk?.ghost ? 0.5 : 1}
              stroke={mk?.active ? "#fff" : "#000"}
              strokeWidth={mk?.active ? 3 : 1}
            />
            {mk?.label && (
              <text
                x={x + BLACK_W / 2}
                y={BLACK_H - 12}
                textAnchor="middle"
                fontSize={13}
                fontWeight={800}
                fill={mk.ghost ? "#fff" : "#161225"}
              >
                {mk.label}
              </text>
            )}
          </g>
        );
      })}
      </svg>
    </div>
  );
}
