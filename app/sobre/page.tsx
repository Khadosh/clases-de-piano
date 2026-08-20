import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import Icono from "@/components/Icono";

export const metadata: Metadata = {
  title: "Quién es quién — Cuaderno de piano",
  description:
    "El profe, el alumno y el cuaderno: los tres que escriben este libro, un miércoles por vez.",
};

/**
 * La página de autores. Quique dijo que estamos escribiendo un libro, y los
 * libros tienen página de autores.
 *
 * Las semblanzas las escribió Joaquín (el humor es de él y se respeta); las
 * fotos llegan cuando lleguen — el círculo con las iniciales es el lugar
 * reservado. Los links de Quique son los suyos públicos de músico.
 */

const LINKS_QUIQUE = [
  { de: "youtube", label: "YouTube", href: "https://www.youtube.com/@detafiviejo" },
  {
    de: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com/quiqueyance.musico/",
  },
  {
    de: "spotify",
    label: "Spotify",
    href: "https://open.spotify.com/artist/6TjLq2TSUUrf8r4teLk1DB",
  },
];

/**
 * Si la foto está en `public/retratos/<quien>.jpg`, se usa; si no, las
 * iniciales. Se decide en el build: subir la foto al repo alcanza para que el
 * próximo deploy la levante, sin tocar código.
 */
function Retrato({ quien, iniciales }: { quien: string; iniciales: string }) {
  const foto = existsSync(join(process.cwd(), "public", "retratos", `${quien}.jpg`))
    ? `/retratos/${quien}.jpg`
    : null;
  if (foto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={foto}
        alt={`Retrato de ${quien}`}
        className="h-20 w-20 shrink-0 rounded-full border-2 border-borde object-cover"
      />
    );
  }
  return (
    <span className="font-display flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-borde bg-carta-2 text-2xl font-black text-sol">
      {iniciales}
    </span>
  );
}

export default function Sobre() {
  return (
    <article className="mx-auto max-w-3xl pt-10 pb-20">
      <header className="mb-10">
        <p className="font-mono text-sm text-sol">el libro que estamos escribiendo</p>
        <h1 className="font-display mt-2 text-5xl font-black tracking-tight">
          Quién es quién
        </h1>
        <p className="mt-4 leading-relaxed text-humo">
          Este cuaderno lo escriben tres: uno enseña, uno aprende y uno se
          acuerda de todo. Un miércoles por vez.
        </p>
      </header>

      <section className="card mb-6 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <Retrato quien="quique" iniciales="QY" />
          <div className="min-w-0">
            <h2 className="font-display text-3xl font-black">Quique Yance</h2>
            <p className="font-mono text-xs tracking-wider text-sol uppercase">
              el profe · los miércoles
            </p>
          </div>
        </div>
        <div className="mt-5 space-y-4 leading-relaxed text-humo">
          <p>
            Pianista, tecladista, compositor, arreglador, profesor — y{" "}
            <em className="text-tiza not-italic font-semibold">farmacéutico</em>,
            por si el folclore de fusión no le llenaba la agenda. Referente del
            folclore tucumano desde 1997 con Mariela Narchi, dos discos propios
            y giras que llegaron a Bolivia, Perú y Brasil. Le mete armonía de
            jazz a la chacarera como si fuera lo más natural del mundo.
          </p>
          <p>
            Su vocación docente deja los arreglos para orquesta y le hace lugar
            a alumnos de todos los niveles, improvisando acordes y melodías
            sobre la marcha. En este cuaderno le toca el miércoles. De él son
            la regla de oro, el compás como presupuesto, el triangulito del
            maj7 y todo lo que estas páginas afirman.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {LINKS_QUIQUE.map((l) => (
            <a
              key={l.de}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-carta-2 px-4 py-2 text-sm font-semibold text-humo transition hover:bg-borde hover:text-tiza"
            >
              <Icono de={l.de} className="text-sol" /> {l.label}
            </a>
          ))}
        </div>
      </section>

      <section className="card mb-6 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <Retrato quien="joaquin" iniciales="J" />
          <div className="min-w-0">
            <h2 className="font-display text-3xl font-black">Joaquín</h2>
            <p className="font-mono text-xs tracking-wider text-sol uppercase">
              el alumno · el resto de la semana
            </p>
          </div>
        </div>
        <div className="mt-5 space-y-4 leading-relaxed text-humo">
          <p>
            Frontend lead. Programa interfaces todo el día y a la noche vuelve a
            una donde el usuario es él y el bug también es él.
          </p>
          <p>
            Un día notó que siempre se olvidaba la misma digitación. La solución
            normal hubiera sido anotarla en un cuaderno — pero es programador,
            así que hizo lo que hace cualquier programador ante un problema
            humano:{" "}
            <em className="text-tiza not-italic font-semibold">
              lo convirtió en un problema de sistemas
            </em>
            .
          </p>
          <p>
            Tres semanas después, el cuaderno dibuja partituras desde cero con
            los contornos de una fuente de grabado, escucha el piano de verdad
            por el micrófono —calibrado a mano contra grabaciones reales—, te
            sigue las manos por MIDI y te espera cuando te trabás, toma examen
            de cada clase, y se acuerda de lo que te sale mal para
            preguntártelo más seguido. Todo por no anotar una digitación en un
            papel.
          </p>
          <p>
            Menos mal que es bueno programando, porque como pianista le falta
            mucho.
          </p>
        </div>
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap items-center gap-4">
          {existsSync(join(process.cwd(), "public", "retratos", "cuaderno.jpg")) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/retratos/cuaderno.jpg"
              alt="El tercer pianista"
              className="h-20 w-20 shrink-0 rounded-full border-2 border-borde object-cover"
            />
          ) : (
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-borde bg-carta-2 text-3xl text-sol">
              <Icono de="piano" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="font-display text-3xl font-black">El cuaderno</h2>
            <p className="font-mono text-xs tracking-wider text-sol uppercase">
              el que se acuerda de todo · escrito a cuatro manos con Claude
            </p>
          </div>
        </div>
        <div className="mt-5 space-y-4 leading-relaxed text-humo">
          <p>
            El tercer personaje es esta página, escrita{" "}
            <em className="text-tiza not-italic font-semibold">
              a cuatro manos de verdad
            </em>
            : Joaquín marca el rumbo — qué construir, cómo se tiene que ver, qué
            quedó raro y se rehace — y Claude escribe el código. Después de cada
            clase, el relato y las fotos del cuaderno de papel se convierten en
            contenido: los teclados que suenan, el pentagrama dibujado desde
            cero, los dictados que corrigen.
          </p>
          <p>
            Pero el corazón está en la <em className="text-tiza not-italic font-semibold">sala de práctica</em>, que es lo
            que se usa entre miércoles y miércoles: el laboratorio de acordes,
            los dictados de oído y contrarreloj, el enlace con su puntaje, las
            secuencias por funciones, los quiz de compases. Ejercicios que se
            generan distintos cada vez y se acuerdan de lo que te sale mal para
            preguntártelo más seguido — la diferencia entre un apunte que se
            lee y un cuaderno que te hace practicar.
          </p>
          <p>
            Y una regla heredada del papel: lo que no se entendió del todo no se
            inventa — queda anotado para preguntarle a Quique el miércoles
            siguiente.
          </p>
        </div>
      </section>
    </article>
  );
}
