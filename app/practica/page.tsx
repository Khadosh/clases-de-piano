import Link from "next/link";
import type { Metadata } from "next";
import { LESSONS, slugOf } from "@/content";
import {
  AREAS,
  acordesAprendidos,
  catalogo,
  type Area,
  type Entrada,
} from "@/content/practica";
import { rich } from "@/components/Blocks";
import ExerciseRunner from "@/components/ExerciseRunner";
import HandsSwap from "@/components/HandsSwap";
import NomenclatureQuiz from "@/components/NomenclatureQuiz";
import ChordLab from "@/components/ChordLab";
import TecladoLibre from "@/components/TecladoLibre";
import Figuras from "@/components/Figuras";
import Compases from "@/components/Compases";
import Semitonos from "@/components/Semitonos";
import Enlace from "@/components/Enlace";

export const metadata: Metadata = {
  title: "Práctica",
  description:
    "Todos los ejercicios de todas las clases, agrupados por tipo, para machacarlos entre miércoles y miércoles.",
};

/** El título y la bajada de cada ejercicio, según qué es. */
function ficha(e: Entrada): { titulo: string; bajada?: string } {
  switch (e.tipo) {
    case "exercise":
      return { titulo: e.block.title, bajada: e.block.intro };
    case "hands":
      return { titulo: e.block.title, bajada: e.block.intro };
    case "secuencia":
      return {
        titulo: "Enlazar una progresión",
        bajada:
          "Los acordes vienen en estado fundamental y hay que girarlos para moverse lo menos posible. No hay una única respuesta: el objetivo es bajar el número.",
      };
    case "nomenclature":
      return {
        titulo: "Cifrado inglés a toda velocidad",
        bajada: "Del símbolo a las notas y de las notas al símbolo, contra el reloj de tu propia paciencia.",
      };
    case "suelta":
      return FICHAS[e.id];
  }
}

const FICHAS = {
  laboratorio: {
    titulo: "El laboratorio",
    bajada:
      "Fundamental, receta e inversión en el mismo teclado. Con el dictado prendido sale un cifrado y lo armás apretando teclas: te dice si está bien, y si le erraste sólo al bajo también.",
  },
  identificador: {
    titulo: "¿Qué acorde armé?",
    bajada:
      "El revés del dictado: tocás teclas y te dice cómo se llama eso. Sirve para encontrar inversiones sin buscarlas.",
  },
  figuras: {
    titulo: "El árbol de las figuras",
    bajada:
      "Tocá una fila y después la de abajo: las cuatro duran lo mismo, sólo se parte más fino.",
  },
  compases: {
    titulo: "Compases simples y compuestos",
    bajada:
      "Elegí un compás y escuchá dónde caen los golpes. El botón de la constante pasa de simple a compuesto sin cambiar las notas.",
  },
  semitonos: {
    titulo: "Los semitonos de la octava",
    bajada: "Dónde no hay tecla negra en el medio, que es de donde sale todo lo demás.",
  },
} as const;

function Ejercicio({ e }: { e: Entrada }) {
  const { titulo, bajada } = ficha(e);
  const acordes = acordesAprendidos();

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="font-display text-2xl font-bold">{titulo}</h3>
        <Link
          href={`/clases/${slugOf(e.lesson)}`}
          className="rounded-full bg-carta-2 px-2.5 py-0.5 text-xs text-humo transition hover:text-sol"
        >
          clase {e.lesson.n} →
        </Link>
      </div>
      {/* Las bajadas que vienen de una clase traen *asteriscos*, igual que allá. */}
      {bajada && <p className="mb-4 max-w-3xl text-humo">{rich(bajada)}</p>}
      {e.tipo === "exercise" && <ExerciseRunner variants={e.block.variants} />}
      {e.tipo === "hands" && <HandsSwap positions={e.block.positions} />}
      {e.tipo === "secuencia" && <Enlace acordes={e.block.acordes} />}
      {e.tipo === "nomenclature" && <NomenclatureQuiz qualityIds={acordes} />}
      {e.tipo === "suelta" && e.id === "laboratorio" && (
        <ChordLab qualityIds={acordes} dictation inversiones />
      )}
      {e.tipo === "suelta" && e.id === "identificador" && <TecladoLibre />}
      {e.tipo === "suelta" && e.id === "figuras" && <Figuras />}
      {e.tipo === "suelta" && e.id === "compases" && <Compases />}
      {e.tipo === "suelta" && e.id === "semitonos" && <Semitonos />}
    </div>
  );
}

export default function PracticaPage() {
  const todo = catalogo();
  const porArea = (a: Area) => todo.filter((e) => e.area === a.id);
  const areasConAlgo = AREAS.filter((a) => porArea(a).length > 0);
  const acordes = acordesAprendidos();

  return (
    <div className="pt-10">
      {/* Portada */}
      <header className="mb-10">
        <p className="text-xs tracking-[0.25em] text-humo uppercase">
          {todo.length} ejercicios · {LESSONS.length}{" "}
          {LESSONS.length === 1 ? "clase" : "clases"} · {acordes.length} acordes
        </p>
        <h1 className="font-display mt-2 text-5xl font-black tracking-tight sm:text-6xl">
          Sala de práctica
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-humo">
          Todo lo que hay para machacar entre un miércoles y el otro, junto y{" "}
          <strong className="text-tiza">agrupado por tipo</strong> — no por
          clase. Para practicar acordes querés todos los acordes de una, no la
          mitad acá y la mitad allá.
        </p>
      </header>

      {/* El índice, que además dice qué hay en cada parte */}
      <nav className="mb-16 grid gap-3 sm:grid-cols-2">
        {areasConAlgo.map((a) => (
          <a
            key={a.id}
            href={`#${a.id}`}
            className="card group flex items-start gap-4 p-5 transition hover:border-sol/40"
          >
            <span className="text-3xl">{a.emoji}</span>
            <span className="min-w-0">
              <span className="font-display flex items-baseline gap-2 text-xl font-bold">
                {a.titulo}
                <span className="font-mono text-xs font-normal text-humo">
                  {porArea(a).length}
                </span>
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-humo">
                {a.bajada}
              </span>
            </span>
            <span className="ml-auto self-center text-humo transition group-hover:text-sol">
              →
            </span>
          </a>
        ))}
      </nav>

      {areasConAlgo.map((a) => (
        <section key={a.id} id={a.id} className="mb-20 scroll-mt-20">
          <div className="mb-2 flex items-center gap-3 border-b-2 border-borde pb-3">
            <span className="text-3xl">{a.emoji}</span>
            <h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl">
              {a.titulo}
            </h2>
            <span className="ml-auto font-mono text-sm text-humo">
              {porArea(a).length}
            </span>
          </div>
          <p className="mb-8 max-w-2xl text-humo">{a.bajada}</p>
          <div className="space-y-14">
            {porArea(a).map((e, i) => (
              <Ejercicio key={`${a.id}-${i}`} e={e} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
