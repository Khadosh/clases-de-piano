"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
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
  x: number;
  /** Una por cada tecla del acorde, ya escrita y ubicada. */
  cabezas: { y: number; altura: number; signo: Signo }[];
  /** Hacia arriba si la nota está en la mitad de abajo del pentagrama. */
  arriba: boolean;
  indice: number;
  /** Entró en un barrado: no lleva bandera y la plica llega hasta la barra. */
  barrada?: boolean;
  yBarra?: number;
}

export default function Pentagrama({
  derecha,
  izquierda,
  compas,
  tonalidad,
  sonando,
  onCompas,
}: {
  derecha: Evento[];
  izquierda: Evento[];
  compas: Compas;
  tonalidad: Tonalidad;
  /** El instante que está sonando, en redondas desde el arranque. */
  sonando?: number | null;
  /** Se llama al tocar un compás, para poder empezar desde ahí. */
  onCompas?: (compas: number) => void;
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
    () => disponer({ derecha, izquierda, compas, armadura, ancho: ancho ?? 760 }),
    [derecha, izquierda, compas, armadura, ancho],
  );

  return (
    <div ref={caja} className="w-full">
      {/* Mientras no se midió, un hueco del alto que va a ocupar: así no salta
          la página cuando aparece. */}
      {ancho === null && <div style={{ height: ALTO_SISTEMA }} />}
      {ancho !== null &&
        sistemas.map((s, i) => (
        <svg
          key={i}
          viewBox={`0 0 ${s.ancho} ${ALTO_SISTEMA}`}
          width="100%"
          className="block select-none"
          style={{ maxWidth: s.ancho * 1.6 }}
          role="img"
          aria-label={`Compases ${s.desde + 1} a ${s.hasta + 1} de ${totalCompases}`}
        >
          <Sistema s={s} armadura={armadura} compas={compas} sonando={sonando} onCompas={onCompas} />
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
}: {
  s: SistemaDispuesto;
  armadura: number;
  compas: Compas;
  sonando?: number | null;
  onCompas?: (compas: number) => void;
}) {
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
          key={`${nota.clave}-${nota.indice}`}
          nota={nota}
          activa={
            sonando != null &&
            sonando >= nota.t - 1e-6 &&
            sonando < nota.t + duracionDeEvento(nota) - 1e-6
          }
        />
      ))}

      {s.barrados.map((b, i) => (
        <g key={i}>
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
        </g>
      ))}
    </g>
  );
}

function Nota({ nota, activa }: { nota: NotaDibujable; activa: boolean }) {
  const color = activa ? "#ffcb3d" : "#f2efe6";
  const figura = figuraDeEvento(nota);
  const llena = cabezaLlena(figura);
  const plica = tienePlica(figura);
  const banderas = banderasDe(figura);
  const RX = 5.2;
  const RY = 3.9;

  if (nota.midis.length === 0) {
    // Del mismo color que las notas: un silencio es música, no un hueco.
    return <Silencio nota={nota} color={color} />;
  }

  const ys = nota.cabezas.map((c) => c.y);
  const yTope = Math.min(...ys);
  const yPiso = Math.max(...ys);
  const xPlica = nota.arriba ? nota.x + RX - 0.5 : nota.x - RX + 0.5;
  const yPlicaFin = nota.arriba ? yTope - 26 : yPiso + 26;

  return (
    <g>
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

      {/* Banderas sólo si la nota no entró en un barrado */}
      {!nota.barrada &&
        Array.from({ length: banderas }, (_, i) => (
          <path
            key={i}
            d={
              nota.arriba
                ? `M ${xPlica} ${yPlicaFin + i * 5} q 6 2 5.6 7.4 q -1.4 -3.4 -5.6 -4.5`
                : `M ${xPlica} ${yPlicaFin - i * 5} q 6 -2 5.6 -7.4 q -1.4 3.4 -5.6 4.5`
            }
            fill={color}
          />
        ))}

      {nota.cabezas.map((c, i) => (
        <g key={i}>
          {c.signo && (
            <text
              x={nota.x - 11}
              y={c.y + 3.4}
              textAnchor="end"
              fontSize={11}
              fill={color}
              fontWeight={700}
            >
              {c.signo}
            </text>
          )}
          <ellipse
            cx={nota.x}
            cy={c.y}
            rx={RX}
            ry={RY}
            transform={`rotate(-20 ${nota.x} ${c.y})`}
            fill={llena ? color : "none"}
            stroke={color}
            strokeWidth={llena ? 0 : 1.6}
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

  if (figura.divide === 4) {
    // El zigzag de la negra, centrado en el medio del pentagrama.
    const y = yLinea(4);
    return (
      <path
        d={`M ${x - 2.5} ${y - 9} l 4.5 5 l -4.5 5 l 5 5.5 q -4 -1.5 -5.5 1.5 q -0.6 -4 2.5 -6.5 l -4.5 -5 l 4 -5.5 z`}
        fill={color}
      />
    );
  }

  // Corchea para abajo: el trazo diagonal con un ganchito por cada división.
  const ganchos = banderasDe(figura);
  const y = yLinea(5);
  return (
    <g>
      <line
        x1={x + 2.6}
        y1={y - 5 - (ganchos - 1) * 4}
        x2={x - 2.2}
        y2={y + 5}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      {Array.from({ length: ganchos }, (_, i) => {
        const yg = y - 4 - (ganchos - 1 - i) * 4;
        return (
          <g key={i}>
            <circle cx={x + 1.4} cy={yg} r={1.5} fill={color} />
            <path
              d={`M ${x + 1.4} ${yg} q 2.6 0.6 3.4 -2.4`}
              fill="none"
              stroke={color}
              strokeWidth={1.3}
            />
          </g>
        );
      })}
    </g>
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
 * La clave de sol, dibujada alrededor de la línea del Sol.
 *
 * No es la del grabador de una edición linda: es una espiral aproximada, y es a
 * propósito. Lo que tiene que hacer es leerse como una clave de sol a tamaño de
 * celular, y para eso alcanza. Los símbolos de Unicode (𝄞) tienen el mismo
 * problema que los de las figuras: casi ninguna fuente los trae.
 */
function ClaveSol({ x }: { x: number }) {
  const yG = yDeAltura(2, "sol"); // la segunda línea, la que la clave abraza
  return (
    <g transform={`translate(${x} ${yG})`}>
      {/* La espiral que rodea la línea del Sol, la caña que sube y el rulo que
          baja. Es una aproximación: tiene que leerse como clave de sol a tamaño
          de celular, no ser la de una edición grabada. */}
      <path
        d="M 0 0
           c -4.6 0 -6.6 -3.6 -6.6 -6.4
           c 0 -3.4 2.6 -6.2 6.2 -9.4
           c 3.4 -3 5.2 -5.6 5.2 -8.6
           c 0 -2.6 -1.4 -4.4 -3.2 -4.4
           c -2.2 0 -3.6 2.2 -3.6 5.6
           c 0 3.2 1 6.6 2.2 10.4
           c 1.6 5 3.4 10.6 3.4 15.4
           c 0 5.4 -3 8.8 -7 8.8
           c -3.4 0 -5.8 -2.4 -5.8 -5.4
           c 0 -2.4 1.6 -4 3.6 -4
           c 1.9 0 3.2 1.4 3.2 3.2
           c 0 1.7 -1.1 2.9 -2.6 3"
        fill="none"
        stroke="#e8e3d6"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={-0.2} cy={0.2} r={1.9} fill="none" stroke="#e8e3d6" strokeWidth={1.6} />
    </g>
  );
}

/** La clave de fa: la cabeza va sobre la línea del Fa y los dos puntos la rodean. */
function ClaveFa({ x }: { x: number }) {
  const yF = yDeAltura(6, "fa"); // la cuarta línea
  return (
    <g transform={`translate(${x} ${yF})`}>
      <path
        d="M -1 5 c 6 -1 9 -5 9 -10 c 0 -4 -3 -6.5 -6 -5.6 c -2.2 0.7 -2.6 3.6 -0.8 4.6"
        fill="none"
        stroke="#e8e3d6"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <circle cx={-3.4} cy={-8.6} r={2.6} fill="#e8e3d6" />
      <circle cx={11} cy={-2} r={1.5} fill="#e8e3d6" />
      <circle cx={11} cy={2} r={1.5} fill="#e8e3d6" />
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
          return (
            <text
              key={`${clave}${i}`}
              x={x + i * ANCHO_ALTERACION}
              y={yDeAltura(altura, clave) + 3.6}
              fontSize={13}
              fill="#e8e3d6"
              fontWeight={700}
            >
              {sostenidos ? "♯" : "♭"}
            </text>
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
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  lineas: number;
  arriba: boolean;
}

interface SistemaDispuesto {
  ancho: number;
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
}: {
  derecha: Evento[];
  izquierda: Evento[];
  compas: Compas;
  armadura: number;
  ancho: number;
}) {
  const arriba = ubicar(derecha, compas);
  const abajo = ubicar(izquierda, compas);
  const totalCompases =
    Math.max(
      ...arriba.map((n) => n.compas),
      ...abajo.map((n) => n.compas),
      0,
    ) + 1;

  // Cada compás pide el ancho que necesita: uno con doce corcheas no puede
  // ocupar lo mismo que uno con cuatro negras.
  const anchoDe = (c: number) => {
    const cuantas = new Set([
      ...arriba.filter((n) => n.compas === c).map((n) => n.dentro),
      ...abajo.filter((n) => n.compas === c).map((n) => n.dentro),
    ]).size;
    return Math.max(96, 30 + cuantas * 17);
  };

  // Cuántos compases entran por renglón. El encabezado se paga una vez.
  const encabezado = anchoEncabezado(armadura);
  const disponible = Math.max(240, Math.min(ancho, 900)) - encabezado - 8;
  const grupos: number[][] = [];
  let actual: number[] = [];
  let usado = 0;
  for (let c = 0; c < totalCompases; c++) {
    const w = anchoDe(c);
    if (actual.length && usado + w > disponible) {
      grupos.push(actual);
      actual = [];
      usado = 0;
    }
    actual.push(c);
    usado += w;
  }
  if (actual.length) grupos.push(actual);

  const largoCompas = duracionDeCompas(compas);

  const sistemas: SistemaDispuesto[] = grupos.map((compasesDelSistema, gi) => {
    // El sobrante se reparte entre los compases del renglón, así que todos los
    // renglones terminan a la misma altura y la página se ve pareja.
    const crudo = compasesDelSistema.map(anchoDe);
    const suma = crudo.reduce((a, b) => a + b, 0);
    const escala = suma > 0 ? disponible / suma : 1;
    const anchos = crudo.map((w) => w * escala);

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
    const poner = (fila: NotaUbicada[], clave: Clave) => {
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
          x: xNota,
          cabezas,
          arriba: media < 4,
          indice,
        });
      });
    };
    poner(arriba, "sol");
    poner(abajo, "fa");

    return {
      ancho: x + 8,
      desde: compasesDelSistema[0],
      hasta: compasesDelSistema[compasesDelSistema.length - 1],
      primero: gi === 0,
      ultimo: gi === grupos.length - 1,
      notas: barrar(notas, compas),
      barras,
      barrados: barrados(notas, compas),
      zonas,
    };
  });

  return { sistemas, totalCompases };
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
    const tiempo = Math.floor(n.dentro / duracionTiempo + 1e-9);
    const clave = `${n.clave}:${n.compas}:${tiempo}`;
    if (!porTiempo.has(clave)) porTiempo.set(clave, []);
    porTiempo.get(clave)!.push(n);
  }
  return [...porTiempo.values()].filter((g) => g.length > 1);
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
    return { x1, x2, y1: y, y2: y, lineas, arriba };
  });
}

// Se exporta para que la página pueda decir cuántos compases hay sin recalcular.
export { PASO_LINEA_INFERIOR };
