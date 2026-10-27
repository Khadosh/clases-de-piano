/**
 * El MCP del cuaderno: el motor de teoría musical de `lib/`, servido por
 * stdio para que un modelo pueda componer con las reglas de las clases.
 *
 * Acá sólo se declaran las herramientas y se traduce de JSON a las funciones
 * de `herramientas.ts`; nada musical pasa en este archivo. Se corre con
 * `npm run mcp` y se registra en `.mcp.json` para Claude Code.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  PedidoInvalido,
  acorde,
  analizar,
  componer,
  enlazar,
  progresion,
  progresionesConocidas,
  tonalidad,
  voicing,
} from "./herramientas.ts";
import { escribirMidi } from "./midi.ts";
import { escribirPieza } from "../scripts/escribir-pieza.mjs";

const servidor = new McpServer({ name: "cuaderno-de-piano", version: "1.0.0" });

const modo = z.enum(["mayor", "menor"]).default("mayor").describe("Modo de la tonalidad.");
const tonica = z.string().describe('Tónica: "C", "F#", "Bb", "Do", "Fa♯", "Si♭".');
const gradosRomanos = z
  .array(z.string())
  .min(1)
  .describe('Grados en romanos como en el papel: ["ii", "V7", "I"], ["I", "vi", "ii", "V"], ["i", "iv", "V7", "i"]. Préstamos con bemol o minúscula: "bVI", "iv". Séptima con 7: "V7", "ii7".');
const cifrados = z
  .array(z.string())
  .min(1)
  .describe('Acordes en cifrado inglés: ["Dm7", "G7", "C"]. Admite barra para inversión: "Em/B". Sufijos: m, 7, maj7, m7, dim, dim7, m7b5, aug, sus2, sus4, 7sus4, 7+5, m(maj7).');

/** Un resultado o un error de pedido, como el MCP los quiere. */
function responder(fn: () => unknown) {
  try {
    const resultado = fn();
    return { content: [{ type: "text" as const, text: JSON.stringify(resultado, null, 2) }] };
  } catch (e) {
    if (e instanceof PedidoInvalido) {
      return { isError: true, content: [{ type: "text" as const, text: e.message }] };
    }
    throw e;
  }
}

servidor.registerTool(
  "progresion",
  {
    title: "Progresión por grados",
    description:
      "Lleva una progresión escrita en grados (ii – V – I) a cifrados y teclas en una tonalidad, con la función armónica de cada acorde, la cadencia del final y los avisos del profe (la regla de oro: nunca cuatro funciones iguales seguidas).",
    inputSchema: { tonalidad: tonica, modo, grados: gradosRomanos },
  },
  (args) => responder(() => progresion(args)),
);

servidor.registerTool(
  "progresiones_conocidas",
  {
    title: "Catálogo",
    description:
      "Las progresiones y cadencias con nombre que se practican en el cuaderno, las tres funciones armónicas, las texturas del piano y las disposiciones de voicing. Para saber qué pedir.",
    inputSchema: {},
  },
  () => responder(() => progresionesConocidas()),
);

servidor.registerTool(
  "acorde",
  {
    title: "Un acorde",
    description:
      "Un acorde por su cifrado o por las teclas MIDI que suenan: notas bien deletreadas, receta en semitonos, por qué suena como suena, en qué clase apareció, y todas sus inversiones con el cifrado con barra.",
    inputSchema: {
      cifrado: z.string().optional().describe('Cifrado inglés: "F#m7b5".'),
      teclas: z.array(z.number().int().min(21).max(108)).optional().describe("Teclas MIDI que suenan (Do central = 60), si no hay cifrado."),
    },
  },
  (args) => responder(() => acorde(args)),
);

servidor.registerTool(
  "enlazar",
  {
    title: "Enlazar acordes",
    description:
      "El recorrido óptimo por inversiones de una progresión para que la mano se mueva lo menos posible. Criterio 'bajo' (el del profe: la nota de abajo viaja poco, para una mano sola) o 'mano' (el de manual: retener notas comunes, para cuando otro hace el bajo). Es programación dinámica sobre todas las inversiones, no greedy.",
    inputSchema: {
      acordes: cifrados,
      criterio: z.enum(["bajo", "mano"]).default("bajo"),
      base: z.number().int().min(36).max(72).default(48).describe("Desde qué Do arranca el primer acorde, en MIDI. 48 es Do3."),
    },
  },
  (args) => responder(() => enlazar(args)),
);

servidor.registerTool(
  "voicing",
  {
    title: "Voicing",
    description:
      "Cómo repartir un acorde entre las manos: cerrado (todo apilado), abierto 1-5/3-7, abierto 1-7/3-5, o a una mano sin la fundamental. Devuelve qué tecla va en cada mano y los intervalos entre vecinas.",
    inputSchema: {
      cifrado: z.string().describe('Cifrado inglés: "Dm7".'),
      disposicion: z.enum(["cerrada", "15-37", "17-35", "una-mano"]).default("15-37"),
    },
  },
  (args) => responder(() => voicing(args)),
);

servidor.registerTool(
  "analizar",
  {
    title: "Analizar una progresión",
    description:
      "De cifrados a lo que diría el profe: la tonalidad (adivinada si no se pasa), el grado y la función de cada acorde, cuáles son dominantes secundarios, sustitutos tritonales o préstamos de la menor, y qué cadencia hay al final.",
    inputSchema: {
      acordes: cifrados,
      tonalidad: tonica.optional().describe("Si se sabe. Si no, se adivina por el campo armónico."),
    },
  },
  (args) => responder(() => analizar(args)),
);

servidor.registerTool(
  "tonalidad",
  {
    title: "Ficha de una tonalidad",
    description:
      "La escala con su receta, la armadura, la relativa, el campo armónico (tríadas y cuatriadas de cada grado con su función) y, en mayor, la tabla de dominantes secundarios con sus sustitutos tritonales.",
    inputSchema: { tonalidad: tonica, modo },
  },
  (args) => responder(() => tonalidad(args)),
);

servidor.registerTool(
  "componer",
  {
    title: "Componer una vuelta",
    description:
      "Compone una vuelta: la progresión en la tonalidad, vestida con una textura del piano (plaqué, pum-chá, arpegio, arpegio intercalado), un compás por acorde más un compás de cierre, y si se pide una melodía arriba con las reglas de las clases 3 y 4 (nota del acorde en pulso fuerte, notas de paso por grado conjunto, respiraciones, final largo). Devuelve la pieza en el formato del cuaderno, el código listo para pegar en content/partituras.ts, y si se pasa una ruta escribe un .mid para escucharla.",
    inputSchema: {
      tonalidad: tonica,
      modo,
      grados: gradosRomanos,
      textura: z.enum(["plaque", "pum-cha", "arpegio", "arpegio-intercalado"]).default("pum-cha"),
      melodia: z.boolean().default(false).describe("Si va una melodía en la derecha. El acompañamiento pasa entero a la izquierda."),
      semilla: z.number().int().default(1).describe("Otra semilla, otra melodía. La misma semilla da siempre la misma."),
      bpm: z.number().int().min(30).max(240).default(80),
      titulo: z.string().optional(),
      archivoMidi: z.string().optional().describe("Ruta absoluta donde escribir el .mid, si se quiere escuchar afuera."),
    },
  },
  ({ archivoMidi, ...pedido }) =>
    responder(() => {
      const resultado = componer(pedido);
      const { pieza } = resultado;
      const codigo = escribirPieza({
        slug: pieza.slug,
        titulo: pieza.titulo,
        compositor: "Compuesto con el MCP del cuaderno",
        compas: pieza.compas,
        tonalidad: pieza.tonalidad,
        bpm: pieza.bpm,
        dificultad: 2,
        propia: true,
        derecha: [pieza.derecha],
        izquierda: [pieza.izquierda],
      });
      let midi: string | undefined;
      if (archivoMidi) {
        const ruta = resolve(archivoMidi);
        writeFileSync(ruta, escribirMidi(pieza));
        midi = ruta;
      }
      return { ...resultado, ...(midi ? { archivoMidi: midi } : {}), codigoParaPartituras: codigo };
    }),
);

await servidor.connect(new StdioServerTransport());
