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

function Retrato({ iniciales }: { iniciales: string }) {
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
          <Retrato iniciales="QY" />
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
            Los miércoles deja los arreglos para orquesta y se pone a enseñar a
            gente de todos los niveles, improvisando acordes y melodías sobre la
            marcha. De él son la regla de oro, el compás como presupuesto, el
            triangulito del maj7 y todo lo que este cuaderno afirma.
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
          <Retrato iniciales="J" />
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
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-borde bg-carta-2 text-3xl text-sol">
            <Icono de="piano" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-3xl font-black">El cuaderno</h2>
            <p className="font-mono text-xs tracking-wider text-sol uppercase">
              el que se acuerda de todo · escrito a cuatro manos con Claude
            </p>
          </div>
        </div>
        <div className="mt-5 space-y-4 leading-relaxed text-humo">
          <p>
            El tercer personaje es esta página. Después de cada clase, Joaquín
            cuenta qué pasó — con las fotos del cuaderno de papel, los ejercicios
            y las dudas — y Claude lo convierte en esto: los teclados que suenan,
            los dictados que corrigen, el pentagrama dibujado desde cero, los
            ejercicios que saben qué te sale mal y te lo vuelven a preguntar.
          </p>
          <p>
            Tiene una sola regla de honestidad, heredada del papel: cuando algo
            no se entendió del todo, no se inventa — se hace la mejor
            interpretación posible y la duda queda anotada para preguntarle a
            Quique el miércoles siguiente. Por eso casi todas las clases
            terminan con una lista de preguntas abiertas. Es un cuaderno: está
            para equivocarse y corregirse.
          </p>
        </div>
      </section>
    </article>
  );
}
