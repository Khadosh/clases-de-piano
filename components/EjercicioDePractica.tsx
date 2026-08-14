import type { Entrada } from "@/content/practica";
import { acordesAprendidos } from "@/content/practica";
import ChordLab from "./ChordLab";
import Compases from "./Compases";
import Enlace from "./Enlace";
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
export default function EjercicioDePractica({ e }: { e: Entrada }) {
  const acordes = acordesAprendidos();
  switch (e.tipo) {
    case "exercise":
      return <ExerciseRunner variants={e.block.variants} />;
    case "hands":
      return <HandsSwap positions={e.block.positions} />;
    case "secuencia":
      return <Enlace acordes={e.block.acordes} />;
    case "nomenclature":
      return <NomenclatureQuiz qualityIds={acordes} />;
    case "suelta":
      switch (e.id) {
        case "laboratorio":
          return <ChordLab qualityIds={acordes} dictation inversiones />;
        case "identificador":
          return <TecladoLibre />;
        case "figuras":
          return <Figuras />;
        case "compases":
          return <Compases />;
        case "semitonos":
          return <Semitonos />;
      }
  }
}
