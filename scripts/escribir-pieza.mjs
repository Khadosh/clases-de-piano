/**
 * De una pieza importada al código listo para pegar en `content/partituras.ts`.
 *
 * Lo comparten el importador de MusicXML y el de grabaciones: hay una sola
 * forma de escribir un evento —`n(60, 4, { puntillo: true })`— y si cambia,
 * cambia para los dos.
 */

export function evento(e) {
  const midis = e.midis.length === 0 ? "[]" : e.midis.length === 1 ? String(e.midis[0]) : `[${e.midis.join(", ")}]`;
  // Ojo con el puntillo de los silencios: perderlo acortaba la mano y las dos
  // dejaban de durar lo mismo. Lo agarró el test, no el ojo.
  const partes = [];
  if (e.puntillo) partes.push("puntillo: true");
  if (e.ligada) partes.push("ligada: true");
  if (e.irregular) {
    partes.push(
      e.irregular.en === 3 && e.irregular.de === 2
        ? "irregular: TRESILLO"
        : `irregular: { en: ${e.irregular.en}, de: ${e.irregular.de} }`,
    );
  }
  const extra = partes.length ? `, { ${partes.join(", ")} }` : "";
  return e.midis.length === 0 ? `silencio(${e.divide}${extra})` : `n(${midis}, ${e.divide}${extra})`;
}

export function filaDe(evs) {
  return evs.map(evento).reduce((lineas, txt) => {
    const ultima = lineas[lineas.length - 1];
    if (ultima && (ultima + ", " + txt).length < 76) lineas[lineas.length - 1] = ultima + ", " + txt;
    else lineas.push(txt);
    return lineas;
  }, []);
}

/** Una sola voz se escribe como fila suelta; dos, como lista de filas. */
export function escribirVoces(voces, sangria) {
  if (voces.length === 1) {
    return filaDe(voces[0]).map((l) => `${sangria}${l},`).join("\n");
  }
  return voces
    .map((v) => `${sangria}[\n${filaDe(v).map((l) => `${sangria}  ${l},`).join("\n")}\n${sangria}],`)
    .join("\n");
}

/** El objeto entero, con los campos a mano vacíos para que se note que faltan. */
export function escribirPieza({ slug, titulo, compositor, anio = "", compas, tonalidad, bpm, dificultad = 3, propia = false, derecha, izquierda, extra = "" }) {
  return `  {
    slug: ${JSON.stringify(slug)},
    titulo: ${JSON.stringify(titulo)},
    compositor: ${JSON.stringify(compositor ?? "")},
    anio: ${JSON.stringify(anio)},
    compas: { numerador: ${compas.numerador}, denominador: ${compas.denominador} },
    tonalidad: { tonica: ${tonalidad.tonica}, modo: ${JSON.stringify(tonalidad.modo)} },
    bpm: ${bpm},
    dificultad: ${dificultad},${propia ? "\n    propia: true," : ""}
    sobre: "",
    hasta: "",${extra}
    derecha: [
${escribirVoces(derecha, "      ")}
    ],
    izquierda: [
${escribirVoces(izquierda, "      ")}
    ],
  },`;
}
