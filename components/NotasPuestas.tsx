"use client";

import { noteNameWithOctave, type Pitch } from "@/lib/music";

/**
 * Las notas que fuiste apretando, como fichas grandes.
 *
 * Existe por el peor momento de armar un acorde en el teléfono: apretaste una
 * tecla que no era y para sacarla tenés que volver a apuntarle a la misma tecla
 * de trece píxeles. Acá se saca de un toque, en un botón del tamaño de un dedo.
 *
 * Y de paso se lee lo que armaste sin tener que descifrar el teclado, que es lo
 * que uno quiere mirar mientras piensa si está bien.
 */
export default function NotasPuestas({
  notas,
  onQuitar,
  onBorrar,
  faltan,
}: {
  notas: Pitch[];
  onQuitar: (p: Pitch) => void;
  onBorrar?: () => void;
  /** Cuántas faltan para completar el acorde, si se sabe. */
  faltan?: number;
}) {
  if (notas.length === 0) {
    return (
      <p className="mt-3 min-h-[2.5rem] text-center text-sm text-humo">
        {faltan !== undefined && faltan > 0
          ? `Apretá ${faltan} ${faltan === 1 ? "tecla" : "teclas"}.`
          : "Apretá las teclas del acorde."}
      </p>
    );
  }

  return (
    <div className="mt-3 flex min-h-[2.5rem] flex-wrap items-center gap-2">
      {[...notas]
        .sort((a, b) => a - b)
        .map((p) => (
          <button
            key={p}
            onClick={() => onQuitar(p)}
            className="group flex items-center gap-1.5 rounded-full bg-carta-2 py-2 pr-2.5 pl-3.5 font-mono text-sm font-bold transition hover:bg-brasa hover:text-noche"
            aria-label={`Sacar ${noteNameWithOctave(p)}`}
          >
            {noteNameWithOctave(p)}
            <span className="text-humo transition group-hover:text-noche">
              ✕
            </span>
          </button>
        ))}
      {faltan !== undefined && faltan > 0 && (
        <span className="text-sm text-humo">
          faltan {faltan}
        </span>
      )}
      {faltan !== undefined && faltan < 0 && (
        <span className="text-sm text-brasa">te pasaste por {-faltan}</span>
      )}
      {onBorrar && notas.length > 1 && (
        <button
          onClick={onBorrar}
          className="ml-auto rounded-full px-3 py-2 text-sm text-humo transition hover:text-tiza"
        >
          borrar todo
        </button>
      )}
    </div>
  );
}
