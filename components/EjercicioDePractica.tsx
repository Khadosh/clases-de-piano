import type { Entrada } from "@/content/practica";
import { acordesAprendidos } from "@/content/practica";
import ChordLab from "./ChordLab";
import Dictado from "./Dictado";
import Escalas from "./Escalas";
import Grados from "./Grados";
import Compases from "./Compases";
import Enlace from "./Enlace";
import EnlaceSorteo from "./EnlaceSorteo";
import CompasQuiz from "./CompasQuiz";
import Funciones from "./Funciones";
import InventorDeSecuencias from "./InventorDeSecuencias";
import Melodia from "./Melodia";
import Encima from "./Encima";
import Grilla from "./Grilla";
import NotasGuia from "./NotasGuia";
import Cadencias from "./Cadencias";
import Paralelas from "./Paralelas";
import Dominantes from "./Dominantes";
import ExerciseRunner from "./ExerciseRunner";
import Figuras from "./Figuras";
import HandsSwap from "./HandsSwap";
import NomenclatureQuiz from "./NomenclatureQuiz";
import Semitonos from "./Semitonos";
import TecladoLibre from "./TecladoLibre";

/**
 * De una entrada del catálogo al ejercicio que le corresponde.
 *
 * Vive acá y no en la página para que el índice y la página de cada ejercicio
 * no puedan discrepar sobre qué es cada cosa.
 */
export default function EjercicioDePractica({
  e,
  renglon = 0,
}: {
  e: Entrada;
  /** Para las notas guía: qué renglón abre elegido (lo dice la URL alias). */
  renglon?: number;
}) {
  const acordes = acordesAprendidos();
  switch (e.tipo) {
    case "exercise":
      return <ExerciseRunner variants={e.block.variants} />;
    case "hands":
      return <HandsSwap positions={e.block.positions} />;
    case "secuencia":
      // En la sala el enlace trae el dado: la progresión de la clase primero,
      // y cualquier otra sorteada para practicar distinto cada vez.
      return <EnlaceSorteo acordesDeLaClase={e.block.acordes} />;
    case "nomenclature":
      return <NomenclatureQuiz qualityIds={acordes} />;
    case "notas-guia":
      return (
        <NotasGuia
          inicial={renglon}
          renglones={e.renglones.map((r) => ({
            titulo: r.block.title,
            intro: r.block.intro,
            clase: r.lesson.n,
            columnas: r.block.columnas,
          }))}
        />
      );
    case "suelta":
      switch (e.id) {
        case "laboratorio":
          return <ChordLab qualityIds={acordes} dictation inversiones />;
        case "identificador":
          return <TecladoLibre />;
        case "oido":
          return <Dictado qualityIds={acordes} modo="oido" />;
        case "contrarreloj":
          return <Dictado qualityIds={acordes} modo="cifrado" reloj />;
        case "grados":
          return <Grados />;
        case "funciones":
          return <Funciones />;
        case "inventor":
          return <InventorDeSecuencias />;
        case "melodia":
          return <Melodia />;
        case "encima":
          return <Encima />;
        case "grilla":
          return <Grilla />;
        case "cadencias":
          return <Cadencias />;
        case "paralelas":
          return <Paralelas />;
        case "dominantes":
          return <Dominantes />;
        case "que-compas":
          return <CompasQuiz modo="numero" />;
        case "completar-compas":
          return <CompasQuiz modo="completar" />;
        case "escalas":
          return <Escalas />;
        case "figuras":
          return <Figuras />;
        case "compases":
          return <Compases />;
        case "semitonos":
          return <Semitonos />;
        default: {
          const _agotado: never = e.id;
          return _agotado;
        }
      }
    default: {
      const _agotado: never = e;
      return _agotado;
    }
  }
}
