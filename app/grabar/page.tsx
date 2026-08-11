import type { Metadata } from "next";
import Grabador from "@/components/Grabador";

export const metadata: Metadata = {
  title: "Grabar para calibrar",
};

/**
 * Una herramienta, no una clase. Por eso no está en la navegación de arriba:
 * se entra a mano por /grabar cuando hay que sacar material para calibrar el
 * micrófono.
 */
export default function GrabarPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <header>
        <p className="text-xs tracking-[0.25em] text-humo uppercase">
          Herramienta
        </p>
        <h1 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
          Grabar para calibrar
        </h1>
        <p className="mt-3 leading-relaxed text-humo">
          Graba el micrófono y, si hay un teclado MIDI conectado,{" "}
          <strong className="text-tiza">
            lo que tocaste de verdad, con el mismo reloj
          </strong>
          . Con eso{" "}
          <code className="rounded bg-carta-2 px-1.5 py-0.5 font-mono text-sm">
            npm run calibrar
          </code>{" "}
          deja de tener que suponer que la interpretación fue perfecta, y se
          puede separar lo que erró el detector de lo que erraron los dedos.
        </p>
      </header>

      <Grabador />

      <section className="card space-y-3 p-5 text-sm text-humo">
        <h2 className="font-display text-lg font-bold text-tiza">
          Cómo grabar para que sirva
        </h2>
        <ul className="ml-4 list-disc space-y-2">
          <li>
            <strong className="text-tiza">Con el micrófono en la sala</strong>, no
            por la salida de audio del teclado. Los errores que queremos medir
            vienen del micrófono, la sala y el control de ganancia; con audio
            limpio medimos un problema que no tenemos.
          </li>
          <li>
            <strong className="text-tiza">El ejercicio que el script conoce</strong>
            : mano izquierda, hueco abajo, desde Do, la octava entera.
          </li>
          <li>
            Mejor <strong className="text-tiza">varias tomas cortas</strong> que
            una larga: una normal, una rápida, una con pedal, y{" "}
            <strong className="text-tiza">una tocando mal a propósito</strong>.
            Esa última es la que más falta: hasta ahora sólo medimos que no
            marque errores falsos, y con ese criterio “no marcar nunca nada”
            daría perfecto.
          </li>
        </ul>
      </section>
    </div>
  );
}
