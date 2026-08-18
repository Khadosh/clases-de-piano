/**
 * De un MusicXML a una pieza de `content/partituras.ts`.
 *
 * MusicXML es el formato en el que se entienden entre sí los programas de
 * partituras (MuseScore, Sibelius, Finale). Es lo único que se puede importar
 * de verdad: un PDF es una foto y sacarle las notas es otro problema entero.
 *
 *   node --experimental-strip-types scripts/importar-musicxml.mjs archivo.xml \
 *     --slug preludio-en-do --titulo "Preludio nº 1" --hasta 4
 *
 * Escupe el objeto listo para pegar y, sobre todo, **un informe de lo que no
 * pudo**. Eso es la mitad del trabajo: nuestro modelo es más pobre que
 * MusicXML —una sola voz por mano, sin ligaduras de prolongación— y es mejor
 * que diga qué se perdió a que lo tape en silencio.
 */

import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { figuraQueDivide } from "../lib/ritmo.ts";

// ---------------------------------------------------------------------------
// .mxl: el MusicXML comprimido
// ---------------------------------------------------------------------------

/**
 * Un `.mxl` es un ZIP con el XML adentro, y es lo que baja de todos lados.
 *
 * Leer un ZIP a mano es menos de lo que parece y evita una dependencia: cada
 * entrada arranca con una firma fija, y de ahí salen el nombre y los bytes.
 * Sólo se contempla lo que usan estos archivos — sin comprimir o con deflate.
 */
export function abrirMxl(buffer) {
  const entradas = [];
  for (let i = 0; i + 4 <= buffer.length; i++) {
    if (buffer.readUInt32LE(i) !== 0x04034b50) continue; // firma de entrada
    const metodo = buffer.readUInt16LE(i + 8);
    const comprimido = buffer.readUInt32LE(i + 18);
    const largoNombre = buffer.readUInt16LE(i + 26);
    const largoExtra = buffer.readUInt16LE(i + 28);
    const inicio = i + 30 + largoNombre + largoExtra;
    const nombre = buffer.subarray(i + 30, i + 30 + largoNombre).toString("utf8");
    if (!comprimido) continue; // tamaño en el descriptor de atrás: no lo usamos
    const datos = buffer.subarray(inicio, inicio + comprimido);
    try {
      entradas.push({
        nombre,
        contenido: metodo === 0 ? datos.toString("utf8") : inflateRawSync(datos).toString("utf8"),
      });
    } catch {
      // Una entrada que no se puede inflar no sirve; seguimos con las otras.
    }
  }
  // El de verdad es el único .xml que no está en META-INF.
  const xml = entradas.find(
    (e) => /\.(xml|musicxml)$/i.test(e.nombre) && !e.nombre.startsWith("META-INF"),
  );
  if (!xml) throw new Error("El .mxl no trae ningún MusicXML adentro.");
  return xml.contenido;
}

/** Lee un `.xml`, `.musicxml` o `.mxl` y devuelve siempre el XML de texto. */
export function leerPartitura(ruta) {
  const crudo = readFileSync(ruta);
  return /\.mxl$/i.test(ruta) ? abrirMxl(crudo) : crudo.toString("utf8");
}

// ---------------------------------------------------------------------------
// Un parser de XML del tamaño justo
// ---------------------------------------------------------------------------

/**
 * No hay parser de XML en Node y no vamos a bajar uno: MusicXML es XML simple
 * —sin namespaces raros ni CDATA— y con esto alcanza.
 */
function parsearXml(texto) {
  const limpio = texto
    .replace(/<\?xml[\s\S]*?\?>/g, "")
    .replace(/<!DOCTYPE[\s\S]*?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  const raiz = { nombre: "#raiz", attrs: {}, hijos: [], texto: "" };
  const pila = [raiz];
  const re = /<(\/?)([\w-]+)((?:\s+[\w:-]+\s*=\s*"[^"]*")*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(limpio)) !== null) {
    const [, cierra, nombre, attrsCrudos, vacio, texto] = m;
    if (texto !== undefined) {
      const t = texto.trim();
      if (t) pila[pila.length - 1].texto += t;
      continue;
    }
    if (cierra) {
      if (pila.length > 1) pila.pop();
      continue;
    }
    const attrs = {};
    for (const a of attrsCrudos.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) {
      attrs[a[1]] = a[2];
    }
    const nodo = { nombre, attrs, hijos: [], texto: "" };
    pila[pila.length - 1].hijos.push(nodo);
    if (!vacio) pila.push(nodo);
  }
  return raiz;
}

const hijo = (nodo, nombre) => nodo.hijos.find((h) => h.nombre === nombre);
const hijos = (nodo, nombre) => nodo.hijos.filter((h) => h.nombre === nombre);
const texto = (nodo, nombre) => hijo(nodo, nombre)?.texto ?? null;
const numero = (nodo, nombre) => {
  const t = texto(nodo, nombre);
  return t === null ? null : Number(t);
};
function buscar(nodo, nombre) {
  if (nodo.nombre === nombre) return nodo;
  for (const h of nodo.hijos) {
    const e = buscar(h, nombre);
    if (e) return e;
  }
  return null;
}

// ---------------------------------------------------------------------------
// De MusicXML a teclas
// ---------------------------------------------------------------------------

const LETRA_A_SEMITONO = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** MusicXML usa la notación científica: el Do central es C4 y suena 60. */
function aMidi(pitch) {
  const step = texto(pitch, "step");
  const octave = numero(pitch, "octave");
  const alter = numero(pitch, "alter") ?? 0;
  return (octave + 1) * 12 + LETRA_A_SEMITONO[step] + alter;
}

/** Cómo se llama cada figura en MusicXML y en cuántas partes divide la redonda. */
const TIPO_A_DIVIDE = {
  whole: 1, half: 2, quarter: 4, eighth: 8,
  "16th": 16, "32nd": 32, "64th": 64,
};

/**
 * La figura de una nota, leída como está escrita.
 *
 * Se lee del `<type>` y no de la duración, porque con tresillos la duración ya
 * viene multiplicada: una corchea de tresillo dura dos tercios de corchea, y de
 * ese número no se puede sacar ninguna figura. La figura es corchea igual — se
 * dibuja con su bandera— y lo que cambia es cuánto entra.
 */
function figuraDeNota(nodo, avisos, numeroMedida) {
  const tipo = texto(nodo, "type");
  const divide = TIPO_A_DIVIDE[tipo];
  if (!divide) return null;
  const puntos = hijos(nodo, "dot").length;
  if (puntos > 1) {
    avisos.push(`Compás ${numeroMedida}: una figura con doble puntillo, que no manejamos. Se tomó como si tuviera uno.`);
  }
  const tm = hijo(nodo, "time-modification");
  const en = tm ? numero(tm, "actual-notes") : null;
  const de = tm ? numero(tm, "normal-notes") : null;
  return {
    divide,
    puntillo: puntos > 0,
    irregular: en && de && en !== de ? { en, de } : undefined,
  };
}

/**
 * De una duración en "divisions" a nuestra figura. Es el camino de atrás: para
 * los silencios de relleno, que no salen de ninguna nota escrita.
 */
function aFigura(duracion, divisions) {
  const enRedondas = duracion / (divisions * 4);
  if (enRedondas <= 0) return null;
  for (const puntillo of [false, true]) {
    const base = puntillo ? enRedondas / 1.5 : enRedondas;
    const divide = 1 / base;
    const redondeado = Math.round(divide);
    if (Math.abs(divide - redondeado) < 1e-6 && figuraQueDivide(redondeado)) {
      return { divide: redondeado, puntillo };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// El recorrido
// ---------------------------------------------------------------------------

export function importar(xml, { hasta = Infinity } = {}) {
  const raiz = parsearXml(xml);
  const parte = buscar(raiz, "part");
  if (!parte) throw new Error("El archivo no tiene ninguna <part>: ¿es MusicXML?");

  const avisos = [];
  const titulo = texto(buscar(raiz, "work") ?? { hijos: [] }, "work-title");
  const compositor =
    hijos(buscar(raiz, "identification") ?? { hijos: [] }, "creator").find(
      (c) => c.attrs.type === "composer",
    )?.texto ?? null;

  let divisions = 1;
  let fifths = 0;
  let modo = "mayor";
  let compas = null;
  let bpm = null;
  const voces = new Set();

  /**
   * Las notas crudas por pentagrama y por voz, con su instante absoluto.
   *
   * La voz importa: cuando la mano derecha lleva la melodía y el acompañamiento
   * a la vez, cada una tiene su propio ritmo y no se pueden escribir como una
   * sola fila. MusicXML las numera y las escribe una después de la otra,
   * volviendo el reloj para atrás con `<backup>`.
   */
  const crudas = new Map();
  let inicioDelCompas = 0;
  let anacrusa = null;

  for (const medida of hijos(parte, "measure")) {
    const numeroMedida = Number(medida.attrs.number);
    if (numeroMedida > hasta) break;

    const attrs = hijo(medida, "attributes");
    if (attrs) {
      divisions = numero(attrs, "divisions") ?? divisions;
      const key = hijo(attrs, "key");
      if (key) {
        const nuevo = numero(key, "fifths") ?? 0;
        if (compas && nuevo !== fifths) {
          avisos.push(`El compás ${numeroMedida} cambia de armadura. Se quedó la primera.`);
        }
        fifths = nuevo;
        modo = texto(key, "mode") === "minor" ? "menor" : "mayor";
      }
      const time = hijo(attrs, "time");
      if (time) {
        const nuevo = {
          numerador: numero(time, "beats"),
          denominador: numero(time, "beat-type"),
        };
        if (compas && (nuevo.numerador !== compas.numerador || nuevo.denominador !== compas.denominador)) {
          avisos.push(`El compás ${numeroMedida} cambia de métrica. Se quedó la primera.`);
        }
        compas ??= nuevo;
      }
    }
    if (!bpm) {
      const metronomo = buscar(medida, "metronome");
      if (metronomo) bpm = numero(metronomo, "per-minute");
    }

    // El cursor es **absoluto**, no relativo al compás. Es el error que costó:
    // arrancando de cero en cada compás, del segundo en adelante todas las
    // notas parecían caer encima de las del primero y se descartaban.
    let cursor = inicioDelCompas;
    let maximo = inicioDelCompas;
    let ultima = null;
    for (const nodo of medida.hijos) {
      if (nodo.nombre === "backup") {
        cursor -= numero(nodo, "duration") ?? 0;
        ultima = null;
        continue;
      }
      if (nodo.nombre === "forward") {
        cursor += numero(nodo, "duration") ?? 0;
        ultima = null;
        continue;
      }
      if (nodo.nombre !== "note") continue;

      const duracion = numero(nodo, "duration") ?? 0;
      const staff = Number(texto(nodo, "staff") ?? "1");
      const voz = texto(nodo, "voice");
      if (voz) voces.add(`${staff}:${voz}`);
      const esAcorde = Boolean(hijo(nodo, "chord"));
      const esSilencio = Boolean(hijo(nodo, "rest"));
      const gracia = Boolean(hijo(nodo, "grace"));

      if (gracia) {
        avisos.push(`Hay notas de adorno (compás ${numeroMedida}) y se saltearon.`);
        continue;
      }

      if (esAcorde && ultima) {
        // Otra nota del mismo ataque: se suma al acorde y el cursor no se mueve.
        const p = hijo(nodo, "pitch");
        if (p) ultima.midis.push(aMidi(p));
        continue;
      }

      const escrita = figuraDeNota(nodo, avisos, numeroMedida);
      if (!escrita && !esSilencio) {
        avisos.push(`Compás ${numeroMedida}: una figura que no reconocemos (${texto(nodo, "type") ?? "sin tipo"}). Se salteó.`);
        cursor += duracion;
        continue;
      }

      const t = cursor;
      const nota = {
        t,
        duracion,
        escrita,
        midis: esSilencio ? [] : [aMidi(hijo(nodo, "pitch"))],
        ligadaAdelante: hijos(nodo, "tie").some((x) => x.attrs.type === "start"),
        ligadaAtras: hijos(nodo, "tie").some((x) => x.attrs.type === "stop"),
        compas: numeroMedida,
      };
      const llave = `${staff}:${voz ?? "1"}`;
      if (!crudas.has(llave)) crudas.set(llave, { staff, voz, notas: [] });
      crudas.get(llave).notas.push(nota);
      ultima = nota;
      cursor += duracion;
      maximo = Math.max(maximo, cursor);
    }

    // Cuánto avanzó el reloj. Normalmente es lo que dura el compás; si el
    // primero es más corto, es una anacrusa.
    const largo = divisions * 4 * ((compas?.numerador ?? 4) / (compas?.denominador ?? 4));
    const escrito = maximo - inicioDelCompas;
    if (anacrusa === null) {
      anacrusa = escrito > 0 && escrito < largo - 1e-9 ? largo - escrito : 0;
    } else if (escrito > 0 && Math.abs(escrito - largo) > 1e-9) {
      // El archivo mismo tiene un compás que no cierra. Pasa seguido en las
      // transcripciones subidas por gente, y desalinea todo lo que viene
      // después, así que conviene enterarse acá y no mirando el dibujo.
      avisos.push(
        `El compás ${numeroMedida} del archivo no cierra la cuenta (tiene ${escrito} de ${largo}). Todo lo que sigue queda corrido.`,
      );
    }
    inicioDelCompas += escrito > 0 && escrito < largo - 1e-9 ? escrito : largo;
  }

  /**
   * La anacrusa se rellena con silencios.
   *
   * Nuestro modelo no tiene compás incompleto: son notas seguidas y las barras
   * salen de contar. Si la pieza arranca con un pie —Para Elisa entra con dos
   * semicorcheas antes del primer compás— hay que correr todo hacia adelante,
   * o las barras caen en cualquier lado. El costo es que el compás 1 pasa a ser
   * el pie, así que los números quedan corridos uno respecto de la edición.
   */
  if (anacrusa) {
    for (const { notas } of crudas.values()) {
      for (const nota of notas) nota.t += anacrusa;
    }
    avisos.push(
      "La pieza arranca con anacrusa y se rellenó con silencios, así que la numeración de compases queda corrida uno respecto del original.",
    );
  }



  const largoCompas =
    divisions * 4 * ((compas?.numerador ?? 4) / (compas?.denominador ?? 4));

  /**
   * Las voces de un pentagrama: cuáles se quedan y en qué orden.
   *
   * Son dos decisiones distintas y las dos costaron.
   *
   * **Cuáles.** Las que más música tienen. La primera versión se quedaba con
   * las dos más agudas y en la mano izquierda eso tiraba el bajo: se quedaba
   * con voces de relleno de tres notas y el pentagrama de abajo aparecía casi
   * vacío.
   *
   * **En qué orden.** Por altura, la más aguda primero, porque el dibujo lo usa
   * para las plicas: la de arriba va con las plicas para arriba y la de abajo
   * para abajo, que es lo que permite leerlas separadas cuando se cruzan. Los
   * números de voz de MusicXML no sirven para esto (en el pentagrama de abajo
   * suelen ser la 5 y la 6).
   */
  const vocesDePentagrama = (staff, nombre) => {
    const suyas = [...crudas.values()].filter((v) => v.staff === staff && v.notas.length);
    if (!suyas.length) return [[]];
    const conNotas = (v) => v.notas.filter((n) => n.midis.length).length;
    const altura = (v) => {
      const conNota = v.notas.filter((n) => n.midis.length);
      if (!conNota.length) return -Infinity;
      return conNota.reduce((s, n) => s + Math.max(...n.midis), 0) / conNota.length;
    };
    const elegidas = [...suyas].sort((a, b) => conNotas(b) - conNotas(a)).slice(0, 2);
    if (suyas.length > 2) {
      const dejadas = suyas.filter((v) => !elegidas.includes(v));
      avisos.push(
        `La mano ${nombre} tiene ${suyas.length} voces y sólo entran dos. Se quedaron las que más notas tienen; se perdieron ${dejadas.reduce((s, v) => s + conNotas(v), 0)} notas.`,
      );
    }
    elegidas.sort((a, b) => altura(b) - altura(a));
    return elegidas.map((v, i) =>
      armarFila(v.notas, divisions, avisos, i ? `${nombre} (voz de abajo)` : nombre, largoCompas),
    );
  };

  const derecha = vocesDePentagrama(1, "derecha");
  const izquierda = vocesDePentagrama(2, "izquierda");
  // Todas las voces tienen que durar lo mismo: llenan los mismos compases. La
  // que termina antes se completa con silencios.
  emparejarTodas([...derecha, ...izquierda], divisions, largoCompas);

  return {
    titulo,
    compositor,
    compas: compas ?? { numerador: 4, denominador: 4 },
    tonalidad: { tonica: tonicaDeFifths(fifths, modo), modo },
    bpm: bpm ? Math.round(bpm) : 80,
    derecha,
    izquierda,
    avisos,
  };
}

/**
 * De notas sueltas con instante a la fila que espera la app.
 *
 * Dos cosas pasan acá. Las ligaduras de prolongación se juntan en una nota más
 * larga, porque nuestro modelo no las dibuja y volver a atacar la nota sonaría
 * distinto. Y los huecos se rellenan con silencios: si una mano no toca, eso
 * también se escribe.
 */
function armarFila(crudas, divisions, avisos, nombre, largoCompas) {
  const ordenadas = [...crudas].sort((a, b) => a.t - b.t);
  const fila = [];

  // Ligaduras: la que empieza se come a la que sigue con la misma tecla.
  const juntadas = [];
  for (const nota of ordenadas) {
    const previa = juntadas[juntadas.length - 1];
    // **No se juntan las que cruzan la barra de compás.** Una ligadura que pasa
    // de un compás al otro, unida en una sola nota, le suma duración a un compás
    // y se la saca al siguiente: los dos dejan de cerrar la cuenta. Se las deja
    // separadas y se vuelve a atacar la nota, que es una mentira chica y visible.
    const cruzaBarra =
      largoCompas > 0 &&
      Math.floor((previa?.t ?? 0) / largoCompas + 1e-9) !==
        Math.floor(((previa?.t ?? 0) + (previa?.duracion ?? 0) + nota.duracion - 1e-9) / largoCompas);
    if (
      nota.ligadaAtras &&
      previa?.ligadaAdelante &&
      !cruzaBarra &&
      previa.midis.length === nota.midis.length &&
      previa.midis.every((m, i) => m === nota.midis[i])
    ) {
      previa.duracion += nota.duracion;
      previa.ligadaAdelante = nota.ligadaAdelante;
      // La figura escrita ya no vale: la nota resultante es más larga, así que
      // se deduce de la duración sumada.
      previa.escrita = null;
      continue;
    }
    juntadas.push({ ...nota, midis: [...nota.midis] });
  }

  // **Arranca en cero, no en la primera nota.** Si una mano entra tarde —lo
  // normal: en Para Elisa la izquierda aparece recién en el segundo compás—
  // empezar en su primera nota le come el silencio de adelante y le corre toda
  // la música hacia atrás. El test de que las dos manos duran lo mismo agarró
  // exactamente eso.
  let cursor = 0;
  for (const nota of juntadas) {
    if (nota.t > cursor + 1e-9) {
      // Un hueco casi nunca es una figura sola: se llena con las que hagan
      // falta, de la más larga a la más corta, como se escribe un silencio.
      //
      // **Y se corta en cada barra de compás.** Sin eso, un hueco largo se
      // llenaba con una redonda de silencio arrancada a mitad de compás, que se
      // come la barra: el compás quedaba con una redonda de más y el siguiente
      // sin nada. Lo agarró el test de que cada compás cierre la cuenta.
      let sobra = 0;
      let desde = cursor;
      while (desde < nota.t - 1e-9) {
        const finDelCompas = largoCompas > 0
          ? (Math.floor(desde / largoCompas + 1e-6) + 1) * largoCompas
          : nota.t;
        const hasta = Math.min(nota.t, finDelCompas);
        sobra += rellenar(hasta - desde, divisions, fila);
        desde = hasta;
      }
      if (sobra > 1e-9) {
        avisos.push(
          `En la mano ${nombre}, compás ${nota.compas}: quedó un resto de ${sobra} divisiones que no entra en ninguna figura (¿un tresillo partido?).`,
        );
      }
      cursor = nota.t;
    }
    if (nota.t < cursor - 1e-9) {
      avisos.push(
        `En la mano ${nombre} hay dos notas encimadas en el compás ${nota.compas}. Nuestro modelo no tiene dos voces: se salteó una.`,
      );
      continue;
    }
    // Se prefiere la figura tal como está escrita; la deducida de la duración
    // es el plan B, para silencios de relleno y archivos sin <type>.
    const figura = nota.escrita ?? aFigura(nota.duracion, divisions);
    if (!figura) {
      avisos.push(
        `En la mano ${nombre}, compás ${nota.compas}: una duración de ${nota.duracion} divisiones no es ninguna figura. Se salteó.`,
      );
      continue;
    }
    const limpia = { midis: nota.midis, divide: figura.divide };
    if (figura.puntillo) limpia.puntillo = true;
    if (figura.irregular) limpia.irregular = figura.irregular;
    fila.push(limpia);
    cursor += nota.duracion;
  }
  return fila;
}

/**
 * Llena `cuanto` divisiones con silencios, de la figura más larga a la más
 * corta. Devuelve lo que no entró en ninguna.
 */
function rellenar(cuanto, divisions, fila) {
  let falta = cuanto;
  // De la más larga a la más corta, y con la versión de tresillo de cada una:
  // en una pieza con tresillos los huecos también caen en tercios, y sin esto
  // quedaba siempre un resto que no entraba en ninguna figura binaria.
  const opciones = [];
  for (const divide of [1, 2, 4, 8, 16, 32, 64]) {
    const entera = (divisions * 4) / divide;
    opciones.push({ divide, unidad: entera });
    opciones.push({ divide, unidad: (entera * 2) / 3, irregular: { en: 3, de: 2 } });
  }
  opciones.sort((a, b) => b.unidad - a.unidad);
  for (const o of opciones) {
    while (falta >= o.unidad - 1e-6) {
      const silencio = { midis: [], divide: o.divide };
      if (o.irregular) silencio.irregular = o.irregular;
      fila.push(silencio);
      falta -= o.unidad;
    }
  }
  return falta < 1e-6 ? 0 : falta;
}

/**
 * Le agrega silencios a las voces que quedaron cortas hasta que todas midan
 * igual, **cortando en cada barra de compás**.
 *
 * Lo de cortar es lo mismo que hay que hacer con los huecos del medio y por el
 * mismo motivo: una redonda de silencio que arranca a mitad de compás se come
 * la barra, y el compás queda con una redonda de más mientras el siguiente
 * queda vacío.
 */
function emparejarTodas(voces, divisions, largoCompas) {
  const largo = (fila) =>
    fila.reduce((s, e) => {
      const entera = (1 / e.divide) * (e.puntillo ? 1.5 : 1);
      return s + (e.irregular ? (entera * e.irregular.de) / e.irregular.en : entera);
    }, 0);
  const unidad = divisions * 4; // divisiones que entran en una redonda
  const compasEnRedondas = largoCompas > 0 ? largoCompas / unidad : 0;
  const largos = voces.map(largo);
  const mayor = Math.max(...largos, 0);
  voces.forEach((fila, i) => {
    let desde = largos[i];
    while (mayor - desde > 1e-6) {
      const finDelCompas = compasEnRedondas
        ? (Math.floor(desde / compasEnRedondas + 1e-6) + 1) * compasEnRedondas
        : mayor;
      const hasta = Math.min(mayor, finDelCompas);
      rellenar((hasta - desde) * unidad, divisions, fila);
      desde = hasta;
    }
  });
}

/** De la cantidad de alteraciones a la tónica, por el círculo de quintas. */
function tonicaDeFifths(fifths, modo) {
  const mayor = ((fifths * 7) % 12 + 12) % 12;
  return modo === "menor" ? (mayor + 9) % 12 : mayor;
}

// ---------------------------------------------------------------------------
// La línea de comandos
// ---------------------------------------------------------------------------

function principal() {
  const args = process.argv.slice(2);
  const archivo = args.find((a) => !a.startsWith("--"));
  if (!archivo) {
    console.error(
      "Uso: node --experimental-strip-types scripts/importar-musicxml.mjs archivo.xml [--hasta N] [--slug x] [--titulo x]",
    );
    process.exit(1);
  }
  const opcion = (nombre) => {
    const i = args.indexOf(`--${nombre}`);
    return i >= 0 ? args[i + 1] : null;
  };
  const hasta = opcion("hasta") ? Number(opcion("hasta")) : Infinity;

  const pieza = importar(leerPartitura(archivo), { hasta });
  const slug = opcion("slug") ?? "pieza";
  const titulo = opcion("titulo") ?? pieza.titulo ?? "Sin título";

  const evento = (e) => {
    const midis = e.midis.length === 0 ? "[]" : e.midis.length === 1 ? String(e.midis[0]) : `[${e.midis.join(", ")}]`;
    // Ojo con el puntillo de los silencios: perderlo acortaba la mano y las dos
    // dejaban de durar lo mismo. Lo agarró el test, no el ojo.
    const partes = [];
    if (e.puntillo) partes.push("puntillo: true");
    if (e.irregular) {
      partes.push(
        e.irregular.en === 3 && e.irregular.de === 2
          ? "irregular: TRESILLO"
          : `irregular: { en: ${e.irregular.en}, de: ${e.irregular.de} }`,
      );
    }
    const extra = partes.length ? `, { ${partes.join(", ")} }` : "";
    return e.midis.length === 0
      ? `silencio(${e.divide}${extra})`
      : `n(${midis}, ${e.divide}${extra})`;
  };
  const filaDe = (evs) =>
    evs.map(evento).reduce((lineas, txt) => {
      const ultima = lineas[lineas.length - 1];
      if (ultima && (ultima + ", " + txt).length < 76) lineas[lineas.length - 1] = ultima + ", " + txt;
      else lineas.push(txt);
      return lineas;
    }, []);

  /** Una sola voz se escribe como fila suelta; dos, como lista de filas. */
  const escribirVoces = (voces, sangria) => {
    if (voces.length === 1) {
      return filaDe(voces[0]).map((l) => `${sangria}${l},`).join("\n");
    }
    return voces
      .map((v) => `${sangria}[\n${filaDe(v).map((l) => `${sangria}  ${l},`).join("\n")}\n${sangria}],`)
      .join("\n");
  };

  console.log(`  {
    slug: ${JSON.stringify(slug)},
    titulo: ${JSON.stringify(titulo)},
    compositor: ${JSON.stringify(pieza.compositor ?? "")},
    anio: "",
    compas: { numerador: ${pieza.compas.numerador}, denominador: ${pieza.compas.denominador} },
    tonalidad: { tonica: ${pieza.tonalidad.tonica}, modo: ${JSON.stringify(pieza.tonalidad.modo)} },
    bpm: ${pieza.bpm},
    dificultad: 3,
    sobre: "",
    hasta: "",
    derecha: [
${escribirVoces(pieza.derecha, "      ")}
    ],
    izquierda: [
${escribirVoces(pieza.izquierda, "      ")}
    ],
  },`);

  const cuenta = (voces) =>
    voces.length === 1
      ? `${voces[0].length} eventos`
      : voces.map((v) => v.length).join(" + ") + " eventos en dos voces";
  console.error(`\n// ${cuenta(pieza.derecha)} en la derecha, ${cuenta(pieza.izquierda)} en la izquierda`);
  if (pieza.avisos.length) {
    console.error("// Lo que NO se pudo importar:");
    for (const a of [...new Set(pieza.avisos)]) console.error(`//   · ${a}`);
  } else {
    console.error("// Entró todo sin pérdidas.");
  }
}

if (process.argv[1]?.endsWith("importar-musicxml.mjs")) principal();
