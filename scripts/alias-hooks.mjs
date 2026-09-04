import { existsSync, statSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve as resolverRuta } from "node:path";

const raiz = resolverRuta(import.meta.dirname, "..");

/** `@/content/types` → `<raiz>/content/types.ts`, probando extensiones e index. */
function archivoDe(ruta) {
  const base = resolverRuta(raiz, ruta);
  const candidatos = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`];
  for (const c of candidatos) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const archivo = archivoDe(specifier.slice(2));
    if (archivo) return { url: pathToFileURL(archivo).href, shortCircuit: true };
  }
  // Los relativos sin extensión de content/ (por si aparece alguno).
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL) {
    try {
      return await next(specifier, context);
    } catch (e) {
      const desde = new URL(specifier, context.parentURL);
      const archivo = archivoDe(desde.pathname.slice(raiz.length + 1));
      if (archivo) return { url: pathToFileURL(archivo).href, shortCircuit: true };
      throw e;
    }
  }
  return next(specifier, context);
}
