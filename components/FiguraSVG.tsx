import {
  banderasDe,
  cabezaLlena,
  tienePlica,
  type Figura,
} from "@/lib/ritmo";
import { GLIFOS, semiAncho } from "@/lib/glifos";

/**
 * Una figura dibujada a mano, como el teclado.
 *
 * No hay tabla de casos ni un dibujo por figura: la cabeza se llena de la negra
 * para abajo, la plica aparece de la blanca para abajo y las banderas son los
 * pasos que hay desde la negra. Todo sale del mismo número, así que si algún
 * día aparece una figura nueva se dibuja sola.
 *
 * Los símbolos musicales de Unicode existen (𝅘𝅥𝅮 y compañía) pero casi ninguna
 * fuente los trae, y en el celular se ven como cuadraditos.
 */
export default function FiguraSVG({
  figura,
  conPuntillo = false,
  color = "currentColor",
  alto = 44,
  className = "",
}: {
  figura: Figura;
  conPuntillo?: boolean;
  color?: string;
  alto?: number;
  className?: string;
}) {
  const banderas = banderasDe(figura);
  const llena = cabezaLlena(figura);
  const plica = tienePlica(figura);

  // Coordenadas en un lienzo fijo; el tamaño real lo pone `alto`.
  const CX = 11;
  const CY = 40;
  const RX = 8;
  const RY = 5.8;
  // Cada bandera de más estira la plica para arriba. Seis de separación es lo
  // mínimo para que en la semifusa se distingan cuatro y no un borrón: con
  // cuatro se pisaban tanto que fusa y semifusa se veían iguales.
  const SEPARACION = 6;
  const ARRIBA = banderas > 1 ? 2 - (banderas - 1) * SEPARACION : 2;
  const ancho = conPuntillo ? 30 : 24;

  return (
    <svg
      viewBox={`0 ${Math.min(ARRIBA - 2, 0)} ${ancho} ${50 - Math.min(ARRIBA - 2, 0)}`}
      height={alto}
      className={className}
      role="img"
      aria-label={`${figura.nombre}${conPuntillo ? " con puntillo" : ""}`}
    >
      {/* La cabeza va inclinada, como en el papel. */}
      <ellipse
        cx={CX}
        cy={CY}
        rx={RX}
        ry={RY}
        transform={`rotate(-20 ${CX} ${CY})`}
        fill={llena ? color : "none"}
        stroke={color}
        strokeWidth={llena ? 0 : 2.4}
      />
      {plica && (
        <line
          x1={CX + RX - 0.8}
          y1={CY - 2.6}
          x2={CX + RX - 0.8}
          y2={ARRIBA}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
      )}
      {Array.from({ length: banderas }, (_, i) => (
        <path
          key={i}
          d={`M ${CX + RX - 1.4} ${ARRIBA + i * SEPARACION} q 7.5 2.5 7 9 q -1.8 -4.2 -7 -5.6`}
          fill={color}
        />
      ))}
      {conPuntillo && (
        <circle cx={CX + RX + 7} cy={CY} r={2.1} fill={color} />
      )}
    </svg>
  );
}

/**
 * El silencio de una figura, para los botones de la paleta.
 *
 * Es el mismo dibujo del pentagrama —los glifos de Gonville de la negra para
 * abajo, los rectángulos de redonda y blanca— apoyado en un pedacito de
 * tercera línea, que es la que dice de qué lado cuelga cada rectángulo. Sale
 * del mismo número que todo lo demás: una figura nueva trae su silencio sola.
 */
export function SilencioSVG({
  figura,
  color = "currentColor",
  alto = 30,
  className = "",
}: {
  figura: Figura;
  color?: string;
  alto?: number;
  className?: string;
}) {
  // El lienzo en píxeles de pentagrama (ESPACIO = 8, como los glifos ya
  // escalados): la tercera línea va en y = 18, centrada en el lienzo.
  const LINEA = 18;
  const CX = 15;
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
    <svg
      viewBox="0 0 30 36"
      height={alto}
      className={className}
      role="img"
      aria-label={`silencio de ${figura.nombre}`}
    >
      <line x1={4} y1={LINEA} x2={26} y2={LINEA} stroke={color} strokeWidth={1} opacity={0.35} />
      {figura.divide <= 2 ? (
        // Colgada de la línea (redonda) o apoyada encima (blanca).
        <rect
          x={CX - 5}
          y={figura.divide === 1 ? LINEA : LINEA - 3.2}
          width={10}
          height={3.2}
          fill={color}
        />
      ) : (
        <path
          d={glifo.d}
          fill={color}
          fillRule="evenodd"
          transform={`translate(${CX - semiAncho(glifo) * 8} ${LINEA}) scale(8)`}
        />
      )}
    </svg>
  );
}
