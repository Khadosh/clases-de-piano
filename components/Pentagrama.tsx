"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  HOLGURA,
  vocesDe,
  type Voces,
  alturaEnPentagrama,
  armaduraDe,
  duracionDeCompas,
  duracionDeEvento,
  escribirEnPapel,
  figuraDeEvento,
  ubicar,
  type Clave,
  type Evento,
  type NotaUbicada,
  type Signo,
  type Tonalidad,
  ORDEN_BEMOLES,
  ORDEN_SOSTENIDOS,
  signosDe,
  PASO_LINEA_INFERIOR,
} from "@/lib/pentagrama";
import { banderasDe, cabezaLlena, tienePlica, type Compas } from "@/lib/ritmo";
import { GLIFOS, semiAncho } from "@/lib/glifos";

/** La bandera que corresponde a esa cantidad de ganchos y ese lado de plica. */
const glifoBandera = (ganchos: number, arriba: boolean) => {
  if (ganchos >= 3) return arriba ? GLIFOS.bandera3Arriba : GLIFOS.bandera3Abajo;
  if (ganchos === 2) return arriba ? GLIFOS.bandera2Arriba : GLIFOS.bandera2Abajo;
  return arriba ? GLIFOS.bandera1Arriba : GLIFOS.bandera1Abajo;
};

const GLIFOS_SIGNO = {
  "♯": GLIFOS.sostenido,
  "♭": GLIFOS.bemol,
  "♮": GLIFOS.becuadro,
} as const;

/**
 * El pentagrama, dibujado a mano como el teclado.
 *
 * Sale todo de una sola idea, la misma que ordena los acordes: **la altura en
 * el papel es diatónica**. El renglón lo decide la letra con la que se escribe
 * la nota, no la tecla — por eso Fa♯ y Sol♭ son la misma tecla en renglones
 * distintos, y por eso lo primero que hace esto es escribir cada nota en la
 * tonalidad y recién después dibujarla. La cuenta vive en `lib/pentagrama.ts` y
 * se prueba aparte; acá sólo hay geometría.
 *
 * Las cabezas, las plicas y las banderas salen del mismo número que ya usa
 * `FiguraSVG`: en cuántas partes divide la figura a la redonda. Así que si
 * aparece una figura nueva se dibuja sola.
 */

// Medidas en unidades del dibujo. Un espacio del pentagrama es la unidad de
// todo lo demás, como en el papel.
const ESPACIO = 8;
const ALTO_PENTAGRAMA = ESPACIO * 4;
const ENTRE_PENTAGRAMAS = 46;
const MARGEN_ARRIBA = 30;
const MARGEN_ABAJO = 34;
const X_CLAVE = 12;
const X_ARMADURA = 38;
const ANCHO_ALTERACION = 9;
/** Clave + armadura + compás. Depende de cuántas alteraciones haya que dibujar. */
const anchoEncabezado = (armadura: number) =>
  X_ARMADURA + Math.abs(armadura) * ANCHO_ALTERACION + 22;
const ALTO_SISTEMA =
  MARGEN_ARRIBA + ALTO_PENTAGRAMA + ENTRE_PENTAGRAMAS + ALTO_PENTAGRAMA + MARGEN_ABAJO;

const Y_BASE: Record<Clave, number> = {
  sol: MARGEN_ARRIBA + ALTO_PENTAGRAMA,
  fa: MARGEN_ARRIBA + ALTO_PENTAGRAMA + ENTRE_PENTAGRAMAS + ALTO_PENTAGRAMA,
};

const yDeAltura = (altura: number, clave: Clave) =>
  Y_BASE[clave] - altura * (ESPACIO / 2);

interface NotaDibujable extends NotaUbicada {
  clave: Clave;
  /** Cuál de las voces de ese pentagrama. 0 es la de arriba. */
  voz: number;
  x: number;
  /** Una por cada tecla del acorde, ya escrita y ubicada. */
  cabezas: { y: number; altura: number; signo: Signo }[];
  /** Hacia arriba si la nota está en la mitad de abajo del pentagrama. */
  arriba: boolean;
  indice: number;
  /** Entró en un barrado: no lleva bandera y la plica llega hasta la barra. */
  barrada?: boolean;
  yBarra?: number;
  /** El compás tiene dos voces sonando: los silencios se corren para su voz. */
  aDosVoces?: boolean;
}

export default function Pentagrama({
  derecha,
  izquierda,
  compas,
  tonalidad,
  sonando,
  onCompas,
  apagada,
  rango,
}: {
  derecha: Voces;
  izquierda: Voces;
  compas: Compas;
  tonalidad: Tonalidad;
  /** El instante que está sonando, en redondas desde el arranque. */
  sonando?: number | null;
  /** Se llama al tocar un compás, para poder empezar desde ahí. */
  onCompas?: (compas: number) => void;
  /** La mano que no se está tocando ahora: se dibuja al fondo, sin borrarse. */
  apagada?: "derecha" | "izquierda";
  /** Sólo estos compases (ambos inclusive), para practicar un pedazo. */
  rango?: { desde: number; hasta: number };
}) {
  const caja = useRef<HTMLDivElement>(null);
  // Arranca sin medir a propósito. Cuántos compases entran por renglón depende
  // del ancho, y el servidor no lo sabe: si se dibujara con un ancho supuesto,
  // el cliente armaría otros renglones y React se quejaría de que el HTML no
  // coincide. Así que primero se mide y después se dibuja.
  const [ancho, setAncho] = useState<number | null>(null);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setAncho(e.contentRect.width));
    ro.observe(el);
    setAncho(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const armadura = armaduraDe(tonalidad);

  const { sistemas, totalCompases } = useMemo(
    () =>
      disponer({ derecha, izquierda, compas, armadura, ancho: ancho ?? 760, rango }),
    [derecha, izquierda, compas, armadura, ancho, rango],
  );

  // **El renglón que suena se trae solo a la vista.** En una pieza larga, a los
  // pocos compases la música se va de la pantalla y había que perseguirla con
  // la mano. Se desplaza sólo cuando cambia el renglón, así el scroll del que
  // está mirando otra cosa no pelea con el nuestro a cada frame.
  const svgs = useRef<(SVGSVGElement | null)[]>([]);
  const ultimoSistema = useRef<number | null>(null);
  const compasActual =
    sonando == null
      ? null
      : Math.floor(sonando / duracionDeCompas(compas) + HOLGURA);
  const sistemaActual =
    compasActual == null
      ? null
      : sistemas.findIndex((s) => s.desde <= compasActual && compasActual <= s.hasta);
  useEffect(() => {
    if (sistemaActual == null || sistemaActual < 0) {
      ultimoSistema.current = null;
      return;
    }
    if (sistemaActual === ultimoSistema.current) return;
    ultimoSistema.current = sistemaActual;
    svgs.current[sistemaActual]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }, [sistemaActual]);

  return (
    <div ref={caja} className="w-full">
      {/* Mientras no se midió, un hueco del alto que va a ocupar: así no salta
          la página cuando aparece. */}
      {ancho === null && <div style={{ height: ALTO_SISTEMA }} />}
      {ancho !== null &&
        sistemas.map((s, i) => (
        <svg
          key={i}
          ref={(el) => {
            svgs.current[i] = el;
          }}
          viewBox={`0 ${s.arribaDeTodo} ${s.ancho} ${s.abajoDeTodo - s.arribaDeTodo}`}
          // **Todos los renglones a la misma escala.** Con width al 100% cada
          // svg se estiraba por su cuenta, y el último renglón —que suele tener
          // menos compases— salía con las notas un 50% más grandes que el
          // resto, como una lupa. El ancho ya está calculado para el ancho
          // medido del contenedor, así que acá se dibuja tal cual, en píxeles.
          width={s.ancho}
          height={s.abajoDeTodo - s.arribaDeTodo}
          className="block max-w-full select-none"
          role="img"
          aria-label={`Compases ${s.desde + 1} a ${s.hasta + 1} de ${totalCompases}`}
        >
          <Sistema
            s={s}
            armadura={armadura}
            compas={compas}
            sonando={sonando}
            onCompas={onCompas}
            apagada={apagada}
          />
        </svg>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// El dibujo
// ---------------------------------------------------------------------------

function Sistema({
  s,
  armadura,
  compas,
  sonando,
  onCompas,
  apagada,
}: {
  s: SistemaDispuesto;
  armadura: number;
  compas: Compas;
  sonando?: number | null;
  onCompas?: (compas: number) => void;
  apagada?: "derecha" | "izquierda";
}) {
  /** La mano apagada no se saca: se atenúa. Sigue estando para leerla. */
  const claveApagada: Clave | null =
    apagada === "derecha" ? "sol" : apagada === "izquierda" ? "fa" : null;
  const trazo = "#cfd6e6";
  return (
    <g>
      {/* Las cinco líneas de cada pentagrama */}
      {(["sol", "fa"] as Clave[]).map((clave) =>
        [0, 2, 4, 6, 8].map((altura) => (
          <line
            key={`${clave}${altura}`}
            x1={0}
            x2={s.ancho}
            y1={yDeAltura(altura, clave)}
            y2={yDeAltura(altura, clave)}
            stroke={trazo}
            strokeWidth={1}
            opacity={0.55}
          />
        )),
      )}

      {/* La llave que une los dos pentagramas: es lo que dice "esto es un piano" */}
      <path
        d={`M 3 ${yDeAltura(8, "sol")} L 3 ${yDeAltura(0, "fa")}`}
        stroke={trazo}
        strokeWidth={3}
        opacity={0.8}
      />

      <ClaveSol x={X_CLAVE} />
      <ClaveFa x={X_CLAVE} />
      <Armadura x={X_ARMADURA} armadura={armadura} />
      {s.primero && (
        <Compasillo x={anchoEncabezado(armadura) - 11} compas={compas} />
      )}

      {/* Barras de compás */}
      {s.barras.map((x, i) => (
        <line
          key={i}
          x1={x}
          x2={x}
          y1={yDeAltura(8, "sol")}
          y2={yDeAltura(0, "fa")}
          stroke={trazo}
          strokeWidth={i === s.barras.length - 1 && s.ultimo ? 3 : 1}
          opacity={0.75}
        />
      ))}

      {/* Zonas clickeables por compás, para arrancar desde ahí */}
      {onCompas &&
        s.zonas.map((z) => (
          <rect
            key={z.compas}
            x={z.x}
            y={MARGEN_ARRIBA - 12}
            width={z.ancho}
            height={ALTO_SISTEMA - MARGEN_ARRIBA - MARGEN_ABAJO + 24}
            fill="transparent"
            className="cursor-pointer"
            onClick={() => onCompas(z.compas)}
          >
            <title>Compás {z.compas + 1}</title>
          </rect>
        ))}

      {s.notas.map((nota) => (
        <Nota
          key={`${nota.clave}-${nota.voz}-${nota.indice}`}
          nota={nota}
          apagada={nota.clave === claveApagada}
          activa={
            sonando != null &&
            sonando >= nota.t - 1e-6 &&
            sonando < nota.t + duracionDeEvento(nota) - 1e-6
          }
        />
      ))}

      {s.barrados.map((b, i) => (
        <g key={i} opacity={b.clave === claveApagada ? 0.25 : 1}>
          {Array.from({ length: b.lineas }, (_, k) => (
            <line
              key={k}
              x1={b.x1}
              x2={b.x2}
              y1={b.y1 + (b.arriba ? k * 5 : -k * 5)}
              y2={b.y2 + (b.arriba ? k * 5 : -k * 5)}
              stroke="#f2efe6"
              strokeWidth={3}
              strokeLinecap="butt"
            />
          ))}
          {b.numero && (
            <text
              x={(b.x1 + b.x2) / 2}
              y={b.arriba ? b.y1 - 5 : b.y1 + (b.lineas - 1) * 5 + 11}
              textAnchor="middle"
              fontSize={10}
              fontStyle="italic"
              fontWeight={700}
              fill="#9aa6bf"
            >
              {b.numero}
            </text>
          )}
        </g>
      ))}
    </g>
  );
}

function Nota({
  nota,
  activa,
  apagada,
}: {
  nota: NotaDibujable;
  activa: boolean;
  apagada?: boolean;
}) {
  const color = activa ? "#ffcb3d" : "#f2efe6";
  const figura = figuraDeEvento(nota);
  const llena = cabezaLlena(figura);
  const plica = tienePlica(figura);
  const banderas = banderasDe(figura);
  const cabeza = llena
    ? GLIFOS.cabezaNegra
    : figura.divide === 2
      ? GLIFOS.cabezaBlanca
      : GLIFOS.cabezaRedonda;
  /** El borde de la cabeza, donde se apoya la plica. */
  const RX = semiAncho(cabeza) * ESPACIO;

  if (nota.midis.length === 0) {
    // Del mismo color que las notas: un silencio es música, no un hueco. En un
    // compás a dos voces se corre un espacio para el lado de su voz, que es lo
    // que hace cualquier edición para que no se pisen los de las dos.
    const dy = nota.aDosVoces ? (nota.arriba ? -ESPACIO : ESPACIO) : 0;
    return (
      <g opacity={apagada ? 0.25 : 1} transform={dy ? `translate(0 ${dy})` : undefined}>
        <Silencio nota={nota} color={color} />
      </g>
    );
  }

  const ys = nota.cabezas.map((c) => c.y);
  const yTope = Math.min(...ys);
  const yPiso = Math.max(...ys);
  const xPlica = nota.arriba ? nota.x + RX - 0.5 : nota.x - RX + 0.5;
  // Con dos o más ganchos la plica se alarga un poco, como en las ediciones:
  // el glifo de la bandera doble mide más que la plica de siempre.
  const largoPlica = 26 + (banderas >= 2 ? (banderas - 1) * 5 : 0);
  const yPlicaFin = nota.arriba ? yTope - largoPlica : yPiso + largoPlica;

  return (
    <g opacity={apagada ? 0.25 : 1}>
      {/* Líneas adicionales, arriba y abajo, para las que se van del pentagrama */}
      {nota.cabezas.flatMap((c) => lineasAdicionales(c.altura)).map((altura, i) => (
        <line
          key={i}
          x1={nota.x - 9}
          x2={nota.x + 9}
          y1={yDeAltura(altura, nota.clave)}
          y2={yDeAltura(altura, nota.clave)}
          stroke="#cfd6e6"
          strokeWidth={1}
          opacity={0.7}
        />
      ))}

      {plica && !nota.barrada && (
        <line
          x1={xPlica}
          x2={xPlica}
          y1={nota.arriba ? yPiso : yTope}
          y2={yPlicaFin}
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      )}
      {plica && nota.barrada && (
        <line
          x1={xPlica}
          x2={xPlica}
          y1={nota.arriba ? yPiso : yTope}
          y2={nota.yBarra ?? yPlicaFin}
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      )}

      {/* La bandera, sólo si la nota no entró en un barrado. Es un glifo por
          cantidad de ganchos —no ganchos apilados— con el origen en la punta
          de la plica, que es la convención con la que vienen dibujadas. */}
      {!nota.barrada && banderas > 0 && (
        <path
          d={glifoBandera(banderas, nota.arriba).d}
          fill={color}
          fillRule="evenodd"
          transform={`translate(${xPlica} ${yPlicaFin}) scale(${ESPACIO})`}
        />
      )}

      {nota.cabezas.map((c, i) => (
        <g key={i}>
          {c.signo && (
            <path
              d={GLIFOS_SIGNO[c.signo].d}
              fill={color}
              fillRule="evenodd"
              transform={`translate(${
                nota.x - RX - 3 - (GLIFOS_SIGNO[c.signo].xMax - GLIFOS_SIGNO[c.signo].xMin) * ESPACIO
              } ${c.y}) scale(${ESPACIO})`}
            />
          )}
          <path
            d={cabeza.d}
            fill={color}
            fillRule="evenodd"
            transform={`translate(${nota.x - RX} ${c.y}) scale(${ESPACIO})`}
          />
        </g>
      ))}

      {nota.puntillo && (
        <circle cx={nota.x + 9} cy={ys[0] - 2} r={1.6} fill={color} />
      )}
    </g>
  );
}

/**
 * Los silencios, que también salen del mismo número.
 *
 * La redonda cuelga de la cuarta línea y la blanca se apoya en la tercera —
 * ésa es la única diferencia entre las dos y es la que siempre se confunde. De
 * la negra para abajo es el trazo en zigzag, y cada división de más agrega un
 * ganchito, igual que las banderas de las notas.
 */
function Silencio({ nota, color }: { nota: NotaDibujable; color: string }) {
  const figura = figuraDeEvento(nota);
  const { x, clave } = nota;
  const yLinea = (altura: number) => yDeAltura(altura, clave);

  if (figura.divide === 1 || figura.divide === 2) {
    // Colgada de la cuarta (redonda) o apoyada en la tercera (blanca).
    const y = figura.divide === 1 ? yLinea(6) : yLinea(4);
    return (
      <rect
        x={x - 5}
        y={figura.divide === 1 ? y : y - 3.2}
        width={10}
        height={3.2}
        fill={color}
      />
    );
  }

  // De la negra para abajo son glifos, centrados en la tercera línea como los
  // trae la fuente. El de la semicorchea ya viene con sus dos ganchos: no se
  // apilan dos de corchea.
  const ganchos = banderasDe(figura);
  const glifo =
    figura.divide === 4
      ? GLIFOS.silencioNegra
      : ganchos === 1
        ? GLIFOS.silencioCorchea
        : ganchos === 2
          ? GLIFOS.silencioSemicorchea
          : GLIFOS.silencioFusa;
  return (
    <path
      d={glifo.d}
      fill={color}
      fillRule="evenodd"
      transform={`translate(${x - semiAncho(glifo) * ESPACIO} ${yLinea(4)}) scale(${ESPACIO})`}
    />
  );
}

/** Los renglones extra que hay que dibujar para una nota fuera del pentagrama. */
function lineasAdicionales(altura: number): number[] {
  const out: number[] = [];
  for (let a = 10; a <= altura; a += 2) out.push(a);
  for (let a = -2; a >= altura; a -= 2) out.push(a);
  return out;
}

// ---------------------------------------------------------------------------
// Claves, armadura y compás
// ---------------------------------------------------------------------------

/**
 * Las dos claves, con los contornos de `lib/glifos.ts` (Gonville, vía
 * VexFlow). El origen de cada glifo ya está sobre la línea que la clave
 * nombra, la misma convención de `yDeAltura`, así que se traslada a esa línea,
 * se escala a espacios y cae sola.
 */
const TINTA = "#e8e3d6";

function ClaveSol({ x }: { x: number }) {
  const yG = yDeAltura(2, "sol"); // la segunda línea, la que la clave abraza
  return (
    <g transform={`translate(${x} ${yG}) scale(${ESPACIO})`}>
      <path d={GLIFOS.claveSol.d} fill={TINTA} fillRule="evenodd" />
    </g>
  );
}

function ClaveFa({ x }: { x: number }) {
  const yF = yDeAltura(6, "fa"); // la cuarta línea
  return (
    <g transform={`translate(${x} ${yF}) scale(${ESPACIO})`}>
      <path d={GLIFOS.claveFa.d} fill={TINTA} fillRule="evenodd" />
    </g>
  );
}

/**
 * La armadura: los sostenidos o bemoles, en su orden y en su altura.
 *
 * El orden no es decorativo — fa do sol re la mi si — y la altura de cada uno
 * tampoco: van en renglones fijos, los mismos en toda partitura. Se dibuja en
 * las dos claves, corridos siete pasos porque la clave de fa está una séptima
 * más abajo.
 */
function Armadura({ x, armadura }: { x: number; armadura: number }) {
  if (armadura === 0) return null;
  const sostenidos = armadura > 0;
  const orden = sostenidos ? ORDEN_SOSTENIDOS : ORDEN_BEMOLES;
  // Las alturas canónicas en clave de sol, contadas desde la línea de abajo.
  const ALTURA_SOL: Record<number, number> = sostenidos
    ? { 3: 8, 0: 5, 4: 9, 1: 6, 5: 3, 2: 7, 6: 4 }
    : { 6: 4, 2: 7, 5: 3, 1: 6, 4: 2, 0: 5, 3: 1 };
  return (
    <g>
      {(["sol", "fa"] as Clave[]).map((clave) =>
        Array.from({ length: Math.abs(armadura) }, (_, i) => {
          const letra = orden[i];
          const altura = ALTURA_SOL[letra] - (clave === "fa" ? 2 : 0);
          const glifo = sostenidos ? GLIFOS.sostenido : GLIFOS.bemol;
          return (
            <path
              key={`${clave}${i}`}
              d={glifo.d}
              fill="#e8e3d6"
              fillRule="evenodd"
              transform={`translate(${x + i * ANCHO_ALTERACION} ${yDeAltura(altura, clave)}) scale(${ESPACIO})`}
            />
          );
        }),
      )}
    </g>
  );
}

/** Los dos números del compás, uno arriba del otro y sin la rayita del medio. */
function Compasillo({ x, compas }: { x: number; compas: Compas }) {
  return (
    <g>
      {(["sol", "fa"] as Clave[]).map((clave) => (
        <g key={clave}>
          <text
            x={x}
            y={yDeAltura(6, clave) + 4}
            textAnchor="middle"
            fontSize={13}
            fontWeight={800}
            fill="#e8e3d6"
          >
            {compas.numerador}
          </text>
          <text
            x={x}
            y={yDeAltura(2, clave) + 4}
            textAnchor="middle"
            fontSize={13}
            fontWeight={800}
            fill="#e8e3d6"
          >
            {compas.denominador}
          </text>
        </g>
      ))}
    </g>
  );
}

// ---------------------------------------------------------------------------
// La disposición: de la música a las coordenadas
// ---------------------------------------------------------------------------

interface Barrado {
  clave: Clave;
  /** El número del grupo irregular: 3 en un tresillo. */
  numero: number | null;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  lineas: number;
  arriba: boolean;
}

interface SistemaDispuesto {
  ancho: number;
  /** Hasta dónde llega el dibujo para arriba y para abajo, con líneas adicionales. */
  arribaDeTodo: number;
  abajoDeTodo: number;
  desde: number;
  hasta: number;
  primero: boolean;
  ultimo: boolean;
  notas: NotaDibujable[];
  barras: number[];
  barrados: Barrado[];
  zonas: { compas: number; x: number; ancho: number }[];
}

function disponer({
  derecha,
  izquierda,
  compas,
  armadura,
  ancho,
  rango,
}: {
  derecha: Voces;
  izquierda: Voces;
  compas: Compas;
  armadura: number;
  ancho: number;
  rango?: { desde: number; hasta: number };
}) {
  // Cada pentagrama con sus voces ya ubicadas en el tiempo. Con un rango, las
  // voces se recortan a esos compases **sin renumerar**: el compás 5 sigue
  // siendo el 5 — es la dirección con la que se salta ahí y la que se muestra.
  const dentroDelRango = (n: NotaUbicada) =>
    !rango || (n.compas >= rango.desde && n.compas <= rango.hasta);
  const pentagramas: { clave: Clave; voces: NotaUbicada[][] }[] = [
    {
      clave: "sol",
      voces: vocesDe(derecha).map((v) => ubicar(v, compas).filter(dentroDelRango)),
    },
    {
      clave: "fa",
      voces: vocesDe(izquierda).map((v) => ubicar(v, compas).filter(dentroDelRango)),
    },
  ];
  const todas = pentagramas.flatMap((p) => p.voces.flat());

  const totalCompases = Math.max(...todas.map((n) => n.compas), 0) + 1;
  const primerCompas = rango?.desde ?? 0;

  // **Todos los compases miden lo mismo.** El ancho lo pide el más denso —con
  // la raíz de sus instantes, que lineal un compás de doce tresillos aplastaba
  // al del acorde tenido— y ese ancho vale para todos. Una edición impresa le
  // da a cada compás lo justo para ahorrar papel; acá no hay papel, y con el
  // ancho parejo los compases quedan alineados en columnas entre renglón y
  // renglón, que para leer y practicar sirve mucho más.
  const anchoNecesario = (c: number) => {
    const cuantas = new Set(
      todas.filter((n) => n.compas === c).map((n) => n.dentro),
    ).size;
    return Math.max(120, 46 + Math.sqrt(cuantas) * 46);
  };
  let anchoCompas = 120;
  for (let c = primerCompas; c < totalCompases; c++) {
    anchoCompas = Math.max(anchoCompas, anchoNecesario(c));
  }

  // Cuántos entran por renglón, y el sobrante se reparte parejo: cada renglón
  // lleva la misma cantidad al mismo ancho, así que las barras caen todas en
  // la misma vertical (el último puede llevar menos, pero del mismo ancho).
  const encabezado = anchoEncabezado(armadura);
  const disponible = Math.max(240, Math.min(ancho, 900)) - encabezado - 8;
  const porRenglon = Math.max(1, Math.floor(disponible / anchoCompas));
  const anchoFinal = Math.max(disponible / porRenglon, 100);
  const grupos: number[][] = [];
  for (let c = primerCompas; c < totalCompases; c++) {
    if (!grupos.length || grupos[grupos.length - 1].length === porRenglon) {
      grupos.push([]);
    }
    grupos[grupos.length - 1].push(c);
  }

  const largoCompas = duracionDeCompas(compas);

  const sistemas: SistemaDispuesto[] = grupos.map((compasesDelSistema, gi) => {
    const anchos = compasesDelSistema.map(() => anchoFinal);

    let x = encabezado;
    const inicio = new Map<number, { x: number; ancho: number }>();
    const barras: number[] = [];
    const zonas: { compas: number; x: number; ancho: number }[] = [];
    compasesDelSistema.forEach((c, i) => {
      inicio.set(c, { x, ancho: anchos[i] });
      zonas.push({ compas: c, x, ancho: anchos[i] });
      x += anchos[i];
      barras.push(x);
    });

    const notas: NotaDibujable[] = [];
    const poner = (
      fila: NotaUbicada[],
      clave: Clave,
      voz: number,
    ) => {
      fila.forEach((nota, indice) => {
        const caja = inicio.get(nota.compas);
        if (!caja) return;
        const xNota =
          caja.x + 16 + (nota.dentro / largoCompas) * (caja.ancho - 26);
        const escritas = nota.midis.map((m) => escribirEnPapel(m, armadura));
        const signos = signosDe(
          escritas.map((e) => ({ nota: e, compas: nota.compas })),
          armadura,
        );
        const cabezas = escritas.map((e, i) => {
          const altura = alturaEnPentagrama(e, clave);
          return { altura, y: yDeAltura(altura, clave), signo: signos[i] };
        });
        const media = cabezas.reduce((s, c) => s + c.altura, 0) / (cabezas.length || 1);
        notas.push({
          ...nota,
          clave,
          voz,
          x: xNota,
          cabezas,
          // Provisorio: por la altura, que es la regla de una voz sola. Con dos
          // voces sonando manda la voz, y eso lo decide `acomodarPlicas` recién
          // cuando sabe qué compases tienen de verdad dos voces.
          arriba: media < 4,
          indice,
        });
      });
    };
    for (const { clave, voces } of pentagramas) {
      voces.forEach((fila, voz) => poner(fila, clave, voz));
    }
    const conVoz = callarVocesVacias(notas);
    acomodarPlicas(conVoz);
    unificarBarrados(conVoz, compas);

    // **El alto se mide, no se supone.** Las octavas graves del Claro de luna
    // caen cuatro líneas adicionales abajo del pentagrama, y con un alto fijo
    // quedaban cortadas por la mitad. La clave de sol entra en la cuenta porque
    // el rulo de arriba se va del margen y también se cortaba.
    const ys = conVoz.flatMap((n) => n.cabezas.map((c) => c.y));
    const arribaDeTodo = Math.min(
      MARGEN_ARRIBA,
      yDeAltura(2, "sol") + GLIFOS.claveSol.yMin * ESPACIO - 3,
      ...ys.map((y) => y - 34),
    );
    const abajoDeTodo = Math.max(
      Y_BASE.fa + MARGEN_ABAJO,
      yDeAltura(6, "fa") + GLIFOS.claveFa.yMax * ESPACIO + 3,
      ...ys.map((y) => y + 34),
    );

    return {
      ancho: x + 8,
      arribaDeTodo,
      abajoDeTodo,
      desde: compasesDelSistema[0],
      hasta: compasesDelSistema[compasesDelSistema.length - 1],
      primero: gi === 0,
      ultimo: gi === grupos.length - 1,
      notas: barrar(conVoz, compas),
      barras,
      barrados: barrados(conVoz, compas),
      zonas,
    };
  });

  return { sistemas, totalCompases };
}

/** Las notas de un pentagrama, agrupadas por compás. */
function porCompas(notas: NotaDibujable[]) {
  const mapa = new Map<string, NotaDibujable[]>();
  for (const n of notas) {
    const llave = `${n.clave}:${n.compas}`;
    if (!mapa.has(llave)) mapa.set(llave, []);
    mapa.get(llave)!.push(n);
  }
  return mapa;
}

/** Qué voces suenan de verdad en ese compás: las que tienen alguna nota. */
const vocesQueSuenan = (delCompas: NotaDibujable[]) => [
  ...new Set(delCompas.filter((n) => n.midis.length > 0).map((n) => n.voz)),
];

/**
 * Una voz que calla un compás entero no se dibuja, si la otra sí toca.
 *
 * Es lo que hace cualquier edición impresa: si de las dos voces del pentagrama
 * una no está, ya se ve que no está, y una redonda de silencio arriba del
 * acorde no agrega nada. Acá pesa más que en el papel porque el importador
 * rellena con silencios todo lo que una voz no toca — sin esto, los primeros
 * compases del Claro de luna salían con un silencio de más en cada mano y con
 * la mano izquierda contando dos voces donde hay una sola.
 *
 * Un compás en el que **ninguna** voz toca conserva sus silencios: ahí el
 * silencio es la música.
 */
function callarVocesVacias(notas: NotaDibujable[]) {
  const callados = new Set<NotaDibujable>();
  for (const delCompas of porCompas(notas).values()) {
    const suenan = vocesQueSuenan(delCompas);
    if (suenan.length === 0) continue;
    for (const n of delCompas) {
      if (!suenan.includes(n.voz)) callados.add(n);
    }
  }
  return notas.filter((n) => !callados.has(n));
}

/**
 * Hacia dónde va la plica, decidido **compás por compás**.
 *
 * Con dos voces sonando en un pentagrama vale la regla de siempre: la de arriba
 * lleva las plicas para arriba y la de abajo para abajo, que es lo que permite
 * leerlas separadas cuando se cruzan. Lo que no funciona es decidir cuál es
 * cuál mirando el promedio de la pieza entera — en el Claro de luna la melodía
 * tiene pasajes graves y el arpegio termina promediando más alto, así que
 * quedaban al revés. En un compás no hay ambigüedad.
 *
 * Y **un compás donde sólo suena una voz no es un compás a dos voces**, aunque
 * la pieza tenga dos: ahí manda la altura, como en cualquier pentagrama normal.
 * Sin esta parte, las octavas graves de la izquierda del Claro de luna salían
 * con la plica para abajo por ser "la voz de abajo" y se iban media página.
 */
function acomodarPlicas(notas: NotaDibujable[]) {
  for (const delCompas of porCompas(notas).values()) {
    const suenan = vocesQueSuenan(delCompas);
    if (suenan.length < 2) continue;
    const alturaDe = (voz: number) => {
      const suyas = delCompas.filter((n) => n.voz === voz && n.midis.length > 0);
      if (!suyas.length) return -Infinity;
      return (
        suyas.reduce((s, n) => s + Math.max(...n.cabezas.map((c) => c.altura)), 0) /
        suyas.length
      );
    };
    const masAguda = suenan.reduce((a, b) => (alturaDe(b) > alturaDe(a) ? b : a));
    for (const n of delCompas) {
      n.arriba = n.voz === masAguda;
      // Los silencios de un compás a dos voces se corren para el lado de su
      // voz — arriba los de la de arriba, abajo los de la otra. Sin esto, el
      // silencio de corchea de una voz y el de semicorchea de la otra caían
      // en el mismo instante uno arriba del otro, en el mismo renglón.
      n.aDosVoces = true;
    }
  }
}

/**
 * Los grupos que van con barra en vez de banderas.
 *
 * Se barran las notas de bandera seguidas que caen dentro del mismo tiempo, que
 * es la regla de siempre: el barrado existe para que se vea de un golpe dónde
 * cae cada pulso. Sin esto, doce corcheas seguidas son doce banderitas y no se
 * entiende nada.
 */
function grupos(notas: NotaDibujable[], compas: Compas) {
  const porTiempo = new Map<string, NotaDibujable[]>();
  const duracionTiempo = 1 / compas.denominador * (compas.numerador >= 6 && compas.numerador % 3 === 0 ? 3 : 1);
  for (const n of notas) {
    if (n.midis.length === 0) continue;
    if (figuraDeEvento(n).divide < 8) continue;
    // Con la misma holgura que todo el resto. Con 1e-9 el cuarto tresillo se
    // colaba en el primer tiempo —tres tercios dan 0,2499999…— y los grupos
    // salían de cuatro y de dos en vez de tres y tres.
    const tiempo = Math.floor(n.dentro / duracionTiempo + HOLGURA);
    // La voz entra en la clave: dos voces del mismo pentagrama no se barran
    // juntas aunque caigan en el mismo tiempo.
    const clave = `${n.clave}:${n.voz}:${n.compas}:${tiempo}`;
    if (!porTiempo.has(clave)) porTiempo.set(clave, []);
    porTiempo.get(clave)!.push(n);
  }
  return [...porTiempo.values()].filter((g) => g.length > 1);
}

/**
 * Un grupo barrado comparte **una sola** dirección de plica.
 *
 * Cada nota suelta elige la plica por su altura, y dentro de un grupo que
 * cruza el medio del pentagrama eso dejaba la mitad para arriba y la mitad
 * para abajo — la barra quedaba enganchada de los dos lados, con las plicas
 * saliendo del lado equivocado de la cabeza. La regla del papel es que el
 * grupo vota: manda el promedio de sus alturas. En un compás a dos voces no
 * hay nada que votar, ahí la dirección la puso la voz y ya vienen todas
 * iguales.
 */
function unificarBarrados(notas: NotaDibujable[], compas: Compas) {
  for (const g of grupos(notas, compas)) {
    if (g[0].aDosVoces) continue;
    const alturas = g.flatMap((n) => n.cabezas.map((c) => c.altura));
    const media = alturas.reduce((a, b) => a + b, 0) / alturas.length;
    const arriba = media < 4;
    for (const n of g) n.arriba = arriba;
  }
}

function barrar(notas: NotaDibujable[], compas: Compas) {
  const enGrupo = new Set(grupos(notas, compas).flat());
  const alturas = new Map<NotaDibujable, number>();
  for (const g of grupos(notas, compas)) {
    const arriba = g[0].arriba;
    const ys = g.flatMap((n) => n.cabezas.map((c) => c.y));
    const y = arriba ? Math.min(...ys) - 26 : Math.max(...ys) + 26;
    for (const n of g) alturas.set(n, y);
  }
  return notas.map((n) =>
    enGrupo.has(n) ? { ...n, barrada: true, yBarra: alturas.get(n) } : n,
  );
}

function barrados(notas: NotaDibujable[], compas: Compas): Barrado[] {
  return grupos(notas, compas).map((g) => {
    const arriba = g[0].arriba;
    const ys = g.flatMap((n) => n.cabezas.map((c) => c.y));
    const y = arriba ? Math.min(...ys) - 26 : Math.max(...ys) + 26;
    const RX = 5.2;
    const x1 = arriba ? g[0].x + RX - 0.5 : g[0].x - RX + 0.5;
    const x2 = arriba
      ? g[g.length - 1].x + RX - 0.5
      : g[g.length - 1].x - RX + 0.5;
    // Tantas líneas como banderas tendría la figura más corta del grupo.
    const lineas = Math.max(...g.map((n) => banderasDe(figuraDeEvento(n))));
    // El número del grupo irregular va una sola vez, sobre la barra. Se pone
    // sólo si todo el grupo es del mismo tresillo: medio grupo con tresillo es
    // un grupo mal armado y es mejor no dibujar nada que dibujar algo falso.
    const en = g[0].irregular?.en ?? null;
    const todoIgual = g.every((n) => (n.irregular?.en ?? null) === en);
    return {
      clave: g[0].clave,
      numero: todoIgual ? en : null,
      x1, x2, y1: y, y2: y, lineas, arriba,
    };
  });
}

// Se exporta para que la página pueda decir cuántos compases hay sin recalcular.
export { PASO_LINEA_INFERIOR };
