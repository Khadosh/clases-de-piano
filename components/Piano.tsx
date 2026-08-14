"use client";

import type { ReactNode } from "react";
import Keyboard, { type Mark } from "./Keyboard";
import NotasPuestas from "./NotasPuestas";
import Midi from "./Midi";
import type { Armado } from "@/lib/useArmado";

/**
 * El piano de los ejercicios: el teclado, las fichas de lo que apretaste y el
 * teclado MIDI, en ese orden y siempre igual.
 *
 * Antes cada ejercicio armaba su propia versión de las mismas tres piezas y
 * eran cuatro pianos apenas distintos: uno ponía las fichas arriba del
 * veredicto y otro abajo, uno agrandaba las teclas y otro no. Nada de eso era
 * una decisión, era el orden en que se fueron escribiendo.
 *
 * `respondiendo` es la diferencia entre mostrar un acorde y pedirlo. Ojo que no
 * es lo mismo que no pasar `armado`: la caja tiene que seguir puesta igual, que
 * es con lo que el MIDI decide a qué ejercicio mandarle la nota.
 */
export default function Piano({
  from,
  to,
  marks,
  armado,
  respondiendo = true,
  faltan,
  paraTocar,
  pista,
  invitacion,
  cierre,
  children,
}: {
  from: number;
  to: number;
  marks: Mark[];
  /** Lo que devuelve `useArmado`. Si no viene, el teclado es de mirar. */
  armado?: Armado;
  /** Si el ejercicio está esperando una respuesta ahora mismo. */
  respondiendo?: boolean;
  /** Cuántas teclas faltan para completar. Negativo = te pasaste. */
  faltan?: number;
  /**
   * Fuerza el tamaño grande. Va cuando el teclado *va a* volverse interactivo
   * más tarde: si no, cambia de tamaño en el medio y salta toda la página.
   */
  paraTocar?: boolean;
  pista?: string;
  invitacion?: string;
  cierre?: string;
  /** El veredicto del ejercicio, entre las fichas y el MIDI. */
  children?: ReactNode;
}) {
  const pidiendo = Boolean(armado) && respondiendo;

  return (
    <div ref={armado?.caja}>
      <div className="rounded-2xl bg-noche-2 p-3">
        <Keyboard
          from={from}
          to={to}
          marks={marks}
          paraTocar={paraTocar ?? Boolean(armado)}
          onKeyPress={pidiendo ? armado!.alternar : undefined}
        />
      </div>

      {pidiendo && (
        <>
          <NotasPuestas
            notas={armado!.notas}
            faltan={faltan}
            onQuitar={armado!.quitar}
            onBorrar={armado!.borrar}
          />
          {children}
          <Midi
            estado={armado!.midi.estado}
            dispositivos={armado!.midi.dispositivos}
            pista={pista}
            invitacion={invitacion}
            cierre={cierre}
          />
        </>
      )}
    </div>
  );
}
