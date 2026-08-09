import Link from "next/link";
import { LESSONS, computeStats, formatDate, slugOf } from "@/content";
import { CHORD_QUALITIES } from "@/lib/music";
import ProximoMiercoles from "@/components/ProximoMiercoles";

export default function Home() {
  const stats = computeStats(LESSONS, CHORD_QUALITIES.length);
  const clases = [...LESSONS].reverse();

  return (
    <div className="pt-10">
      {/* Portada */}
      <section className="relative mb-12">
        <p className="mb-3 text-sm tracking-[0.3em] text-menta uppercase">
          miércoles con Quique Yance
        </p>
        <h1 className="font-display text-5xl leading-[0.95] font-black tracking-tight sm:text-7xl">
          Un cuaderno
          <br />
          que <span className="marcador">se toca</span>.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-humo">
          Todo lo que pasa en clase queda acá, pero no como apuntes muertos:
          los acordes suenan, los ejercicios se mueven solos y el cifrado se
          practica hasta que entra.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href={`/clases/${slugOf(LESSONS[LESSONS.length - 1])}`}
            className="rounded-full bg-sol px-5 py-2.5 font-bold text-noche transition hover:brightness-110"
          >
            Ir a la última clase →
          </Link>
          <Link
            href="/practica"
            className="rounded-full border border-borde bg-carta px-5 py-2.5 font-bold transition hover:bg-carta-2"
          >
            Practicar ahora
          </Link>
        </div>
      </section>

      {/* Contadores */}
      <section className="mb-14 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Contador valor={stats.clases} etiqueta="clases" color="text-sol" />
        <Contador
          valor={stats.racha}
          etiqueta={`miércoles seguidos`}
          color="text-brasa"
          sufijo="🔥"
        />
        <Contador
          valor={stats.acordes}
          etiqueta="recetas de acorde"
          color="text-menta"
        />
        <Contador
          valor={stats.ejercicios}
          etiqueta="ejercicios vivos"
          color="text-uva"
        />
      </section>

      {/* Próxima clase */}
      <section className="card mb-10 flex flex-wrap items-center gap-4 px-6 py-5">
        <span
          className="flota text-3xl"
          style={{ ["--tilt" as string]: "8deg" }}
        >
          🗓️
        </span>
        <div>
          <p className="text-xs tracking-[0.2em] text-humo uppercase">
            Próxima clase
          </p>
          <p className="font-display text-xl font-bold">
            <ProximoMiercoles />
          </p>
        </div>
        <p className="ml-auto max-w-xs text-sm text-humo">
          Cuando termine, contame qué vieron y lo agrego como clase{" "}
          {LESSONS.length + 1}.
        </p>
      </section>

      {/* Línea de tiempo */}
      <section>
        <h2 className="font-display mb-5 text-3xl font-bold tracking-tight">
          Las clases
        </h2>
        <ol className="relative space-y-4 border-l-2 border-dashed border-borde pl-6">
          {clases.map((l) => (
            <li key={l.n} className="relative">
              <span className="absolute top-6 -left-[31px] flex h-4 w-4 items-center justify-center rounded-full border-2 border-noche bg-sol" />
              <Link
                href={`/clases/${slugOf(l)}`}
                className="card group block px-6 py-5 transition hover:border-sol/50"
              >
                <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
                  <span className="font-mono text-sm text-sol">
                    Clase {String(l.n).padStart(2, "0")}
                  </span>
                  <span className="text-sm text-humo">
                    {formatDate(l.date, { weekday: true })}
                  </span>
                </div>
                <h3 className="font-display text-2xl font-bold transition group-hover:text-sol">
                  {l.title}
                </h3>
                <p className="mt-1.5 leading-relaxed text-humo">{l.summary}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {l.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-carta-2 px-2.5 py-1 text-xs text-humo"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </Link>
            </li>
          ))}

          <li className="relative">
            <span className="absolute top-6 -left-[31px] flex h-4 w-4 items-center justify-center rounded-full border-2 border-dashed border-humo bg-noche" />
            <div className="rounded-blob border border-dashed border-borde px-6 py-5 text-humo">
              <p className="font-display text-xl">Clase {LESSONS.length + 1}</p>
              <p className="mt-1 text-sm">
                Todavía no pasó. El miércoles se llena sola.
              </p>
            </div>
          </li>
        </ol>
      </section>
    </div>
  );
}

function Contador({
  valor,
  etiqueta,
  color,
  sufijo,
}: {
  valor: number;
  etiqueta: string;
  color: string;
  sufijo?: string;
}) {
  return (
    <div className="card px-4 py-4">
      <p className={`font-display text-4xl font-black ${color}`}>
        {valor}
        {sufijo && <span className="ml-1 text-2xl">{sufijo}</span>}
      </p>
      <p className="mt-0.5 text-xs tracking-wider text-humo uppercase">
        {etiqueta}
      </p>
    </div>
  );
}
