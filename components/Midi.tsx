"use client";

import { useState } from "react";
import type { EstadoMidi } from "@/lib/useMidi";

/**
 * El estado del teclado MIDI, con las instrucciones para conectarlo.
 *
 * Conectado se encoge a una ficha chiquita: el que ya lo tiene andando no
 * necesita que se lo recuerden en cada ejercicio. Desconectado ofrece las
 * instrucciones, que son la mitad del trabajo — emparejar por Bluetooth no es
 * obvio en ningún sistema y es donde la gente abandona.
 */

/** Se adivina el sistema para mostrar primero el que corresponde, sin esconder el otro. */
function esMac() {
  if (typeof navigator === "undefined") return false;
  return /mac/i.test(navigator.userAgent);
}

export default function Midi({
  estado,
  dispositivos,
  pista = "— tocá el acorde en el piano",
  invitacion = "¿Tenés un teclado? Conectalo y tocá los acordes de verdad",
  cierre = "Cuando el teclado esté, tocás el acorde y la app lo corrige igual que si lo hubieras clickeado. Las teclas de la pantalla siguen andando: podés mezclar.",
}: {
  estado: EstadoMidi;
  dispositivos: string[];
  /** Qué hacer ahora que el teclado está. Cambia según el ejercicio. */
  pista?: string;
  /** Cómo se ofrece cuando no hay teclado. */
  invitacion?: string;
  /** Para qué va a servir, al pie de las instrucciones. */
  cierre?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const mac = esMac();

  if (estado === "conectado") {
    return (
      <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-menta">
        <span>🎹</span>
        <span className="font-mono">{dispositivos.join(" · ")}</span>
        <span className="text-humo">{pista}</span>
      </p>
    );
  }

  if (estado === "buscando") return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setAbierto((a) => !a)}
        className="flex items-center gap-2 text-sm text-humo transition hover:text-tiza"
      >
        <span>🎹</span>
        {estado === "sin-soporte"
          ? "Este navegador no lee teclados MIDI"
          : estado === "denegado"
            ? "No me diste permiso para el MIDI"
            : invitacion}
        <span className="text-xs">{abierto ? "▲" : "▼"}</span>
      </button>

      {abierto && (
        <div className="mt-2 space-y-3 rounded-2xl bg-noche-2 p-4 text-sm text-humo">
          {estado === "sin-soporte" ? (
            <p>
              Hace falta <strong className="text-tiza">Chrome o Edge</strong>.
              Safari no soporta MIDI y Firefox lo trae apagado. La página además
              tiene que estar en <code>https</code> o en <code>localhost</code>,
              que es cómo el navegador se asegura de que nadie te lea el teclado
              a escondidas.
            </p>
          ) : estado === "denegado" ? (
            <p>
              Recargá la página y aceptá el cartel del navegador. Si no aparece
              más, está en el candado de la barra de direcciones →{" "}
              <strong className="text-tiza">Dispositivos MIDI</strong>.
            </p>
          ) : (
            <>
              <Instruccion titulo="Por cable USB" abiertaPorDefecto>
                Enchufalo y listo, en los dos sistemas. No hace falta instalar
                nada: el teclado se anuncia solo y el navegador lo ve enseguida.
                Si tenés apuro o el Bluetooth se hace el difícil,{" "}
                <strong className="text-tiza">éste es el camino seguro</strong>.
              </Instruccion>

              <Instruccion titulo="Por Bluetooth en Mac" abiertaPorDefecto={mac}>
                No alcanza con emparejarlo desde Preferencias del Sistema — los
                teclados MIDI se conectan desde otro lado:
                <ol className="mt-2 ml-4 list-decimal space-y-1">
                  <li>
                    Abrí <strong className="text-tiza">Configuración de Audio MIDI</strong>{" "}
                    (está en Aplicaciones → Utilidades, o buscalo con Spotlight).
                  </li>
                  <li>
                    En el menú de arriba: <strong className="text-tiza">Ventana → Mostrar estudio MIDI</strong>.
                  </li>
                  <li>Apretá el ícono de Bluetooth, arriba a la derecha.</li>
                  <li>
                    Prendé el Bluetooth del teclado, esperá a que aparezca en la
                    lista y dale <strong className="text-tiza">Conectar</strong>.
                  </li>
                </ol>
                <p className="mt-2">
                  Volvé acá sin recargar: se engancha solo cuando aparece.
                </p>
              </Instruccion>

              <Instruccion titulo="Por Bluetooth en Windows" abiertaPorDefecto={!mac}>
                <ol className="ml-4 list-decimal space-y-1">
                  <li>Prendé el Bluetooth del teclado.</li>
                  <li>
                    <strong className="text-tiza">Configuración → Bluetooth y dispositivos → Agregar dispositivo → Bluetooth</strong>.
                  </li>
                  <li>Elegí el teclado de la lista y emparejalo.</li>
                </ol>
                <p className="mt-2">
                  Aviso: en Windows el MIDI por Bluetooth es caprichoso y muchos
                  programas de escritorio directamente no lo ven. Chrome sí, pero
                  si después de emparejarlo acá no aparece,{" "}
                  <strong className="text-tiza">no pelees: usá el cable USB</strong>.
                </p>
              </Instruccion>

              <p className="border-t border-borde/60 pt-3">{cierre}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Instruccion({
  titulo,
  abiertaPorDefecto = false,
  children,
}: {
  titulo: string;
  abiertaPorDefecto?: boolean;
  children: React.ReactNode;
}) {
  const [abierta, setAbierta] = useState(abiertaPorDefecto);
  return (
    <div>
      <button
        onClick={() => setAbierta((a) => !a)}
        className="flex w-full items-center gap-2 text-left font-semibold text-tiza"
      >
        <span className="text-xs text-humo">{abierta ? "▾" : "▸"}</span>
        {titulo}
      </button>
      {abierta && <div className="mt-1 ml-4">{children}</div>}
    </div>
  );
}
