import Link from "next/link";
import Icono from "./Icono";
import { slugOf } from "@/content";
import {
  AREAS,
  rutaDe,
  vecinasDeTema,
  type Casa,
  type Entrada,
} from "@/content/practica";
import Visita from "./Visita";
import { rich } from "./Blocks";
import EjercicioDePractica from "./EjercicioDePractica";

/**
 * La página de una herramienta o de un ejercicio, que son la misma página.
 *
 * Vive acá y no duplicada en las dos rutas porque lo único que cambia entre el
 * taller y la sala es adónde vuelven las migas: el resto —el título, la
 * bajada, el ejercicio, los vecinos— es idéntico, y dos copias casi iguales es
 * exactamente lo que este proyecto viene sacando desde los cuatro pianos.
 *
 * Lo que sí es nuevo es **el puente**: abajo de todo, lo que hay del otro lado
 * sobre el mismo tema. Mirando el círculo de quintas se quiere el quiz de
 * armaduras, y practicando el quiz se quiere volver a mirar el círculo; sin
 * eso, separarlos sería un muro.
 */
export default function PaginaDeEjercicio({
  entrada,
  anterior,
  siguiente,
  renglon,
}: {
  entrada: Entrada;
  anterior: Entrada | null;
  siguiente: Entrada | null;
  renglon: number;
}) {
  const casa: Casa = entrada.casa;
  const area = AREAS.find((a) => a.id === entrada.area);
  const puente = vecinasDeTema(entrada);

  return (
    <div className="pt-10">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-humo">
        <Link
          href={casa === "taller" ? "/taller" : "/practica"}
          className="transition hover:text-sol"
        >
          ← {casa === "taller" ? "Taller" : "Práctica"}
        </Link>
        {area && (
          <>
            <span className="opacity-40">/</span>
            <Link
              href={casa === "taller" ? `/taller#${area.id}` : `/practica/paso/${area.id}`}
              className="transition hover:text-sol"
            >
              <Icono de={area.emoji} className="mr-1 text-sol" />
              {area.titulo}
            </Link>
          </>
        )}
        <Link
          href={`/clases/${slugOf(entrada.lesson)}`}
          className="ml-auto rounded-full bg-carta-2 px-3 py-1 text-xs transition hover:text-sol"
        >
          clase {entrada.lesson.n} →
        </Link>
      </nav>

      <header className="mb-7">
        <h1 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
          {entrada.titulo}
        </h1>
        {/* Las bajadas que vienen de una clase traen *asteriscos*, igual que allá. */}
        {entrada.bajada && (
          <p className="mt-3 max-w-3xl leading-relaxed text-humo">
            {rich(entrada.bajada)}
          </p>
        )}
      </header>

      {/* Lo último practicado se anota por el slug real, no por el alias. */}
      <Visita slug={entrada.slug} />
      <EjercicioDePractica e={entrada} renglon={renglon} />

      {/* El puente: lo del otro lado sobre el mismo tema. */}
      {puente.length > 0 && (
        <section className="mt-10 rounded-3xl border border-borde/60 bg-noche-2 p-5">
          <p className="mb-3 text-xs tracking-[0.2em] text-humo uppercase">
            {casa === "taller"
              ? "Para practicar esto"
              : `Las herramientas de ${area?.titulo.toLowerCase() ?? "este tema"}`}
          </p>
          <div className="flex flex-wrap gap-2">
            {puente.map((o) => (
              <Link
                key={o.slug}
                href={rutaDe(o)}
                className="flex items-center gap-2 rounded-full bg-carta-2 px-3.5 py-2 text-sm font-semibold transition hover:bg-borde hover:text-sol"
              >
                <Icono de={o.emoji} className="text-sol" />
                {o.titulo}
              </Link>
            ))}
          </div>
        </section>
      )}

      <nav className="mt-14 grid gap-3 border-t border-borde pt-6 sm:grid-cols-2">
        <Vecino e={anterior} lado="anterior" />
        <Vecino e={siguiente} lado="siguiente" />
      </nav>
    </div>
  );
}

/** El de al lado en la misma casa, que es el orden de una rutina. */
function Vecino({ e, lado }: { e: Entrada | null; lado: "anterior" | "siguiente" }) {
  if (!e) return <span />;
  return (
    <Link
      href={rutaDe(e)}
      className={`card p-4 transition hover:border-sol/40 ${
        lado === "siguiente" ? "text-right sm:col-start-2" : ""
      }`}
    >
      <span className="block text-xs tracking-[0.2em] text-humo uppercase">
        {lado === "anterior" ? "← Anterior" : "Siguiente →"}
      </span>
      <span className="font-display mt-1 block text-lg font-bold">
        <Icono de={e.emoji} className="mr-1.5 text-sol" />
        {e.titulo}
      </span>
    </Link>
  );
}
