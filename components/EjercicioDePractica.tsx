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
      // En la sala el enlace trae el dado: la progresión de la clase primero,
      // y cualquier otra sorteada para practicar distinto cada vez.
      return <EnlaceSorteo acordesDeLaClase={e.block.acordes} />;
    case "nomenclature":
      return <NomenclatureQuiz qualityIds={acordes} />;
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
      }
  }
}
