/**
 * Resuelve los imports `@/...` del proyecto para correr módulos de `content/`
 * desde node, sin Next. Los de `lib/` importan con extensión y no lo
 * necesitan; los de `content/` importan como en la app (`@/content/types`,
 * sin extensión), así que el test de la sala pasa por acá.
 */
import { register } from "node:module";

register("./alias-hooks.mjs", import.meta.url);
