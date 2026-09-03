import type { JSX } from "react";

/**
 * Los íconos del sitio, dibujados a mano como el teclado.
 *
 * Los emojis de teclado (🎹 🧪 🎲) dependen de la fuente del sistema: en cada
 * aparato se ven distintos, no toman el color del texto y desentonan con un
 * sitio donde todo lo demás es SVG propio. Éstos van en `currentColor` y miden
 * `1em`, así que heredan color y tamaño de donde estén — al lado de un título
 * grande salen grandes, adentro de un botón salen de botón.
 *
 * El mapa `DE_EMOJI` existe para no reescribir los datos: las clases y las
 * fichas siguen declarando `emoji: "🥁"`, y el render lo convierte acá. Un
 * emoji que no está en el mapa se muestra tal cual — mejor un emoji que un
 * hueco — y es la señal de que hay que dibujar uno nuevo.
 */

const S = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const CUERPOS: Record<string, JSX.Element> = {
  piano: (
    <g {...S}>
      <rect x={3} y={5} width={18} height={14} rx={2} />
      <path d="M8 5v14M13 5v14M18 5v14" strokeWidth={1.4} />
      <path d="M6.5 5v8M11.5 5v8M16.5 5v8" strokeWidth={2.6} />
    </g>
  ),
  matraz: (
    <g {...S}>
      <path d="M10 3h4M11 3v6l-5.2 8.6A2 2 0 0 0 7.5 21h9a2 2 0 0 0 1.7-3.4L13 9V3" />
      <path d="M8.2 15.5h7.6" strokeWidth={1.4} />
    </g>
  ),
  lupa: (
    <g {...S}>
      <circle cx={10.5} cy={10.5} r={6.5} />
      <path d="M15.5 15.5 21 21" />
    </g>
  ),
  oreja: (
    <g {...S}>
      <path d="M6.5 8.5a5.5 5.5 0 0 1 11 0c0 3-2.2 4-3.2 6-.7 1.4-.8 3.5-2.8 4.5s-4-.2-4.3-2" />
      <path d="M10 8.7a2.8 2.8 0 0 1 5.3 1c-.1 1.5-1.3 2.2-2 3.3" strokeWidth={1.4} />
    </g>
  ),
  rayo: (
    <g {...S}>
      <path d="M13 2 5 13.5h5L10.5 22l8-11.5h-5L13 2z" />
    </g>
  ),
  grados: (
    <text
      x={12}
      y={17}
      textAnchor="middle"
      fontSize={14}
      fontWeight={800}
      fill="currentColor"
    >
      I·V
    </text>
  ),
  letras: (
    <g>
      <text x={9} y={16} textAnchor="middle" fontSize={14} fontWeight={800} fill="currentColor">
        A
      </text>
      <text x={17.5} y={12} textAnchor="middle" fontSize={10} fontWeight={800} fill="currentColor">
        ♭
      </text>
    </g>
  ),
  escalera: (
    <g {...S}>
      <path d="M8 2v20M16 2v20M8 6.5h8M8 12h8M8 17.5h8" />
    </g>
  ),
  arbol: (
    <g {...S}>
      <circle cx={12} cy={9} r={6} />
      <path d="M12 15v7M9 22h6" />
    </g>
  ),
  tambor: (
    <g {...S}>
      <ellipse cx={12} cy={7.5} rx={8} ry={3.2} />
      <path d="M4 7.5v8c0 1.8 3.6 3.2 8 3.2s8-1.4 8-3.2v-8" />
      <path d="M6 3.5l6 6.5M18 3.5l-6 6.5" strokeWidth={1.4} />
    </g>
  ),
  regla: (
    <g {...S}>
      <rect x={2.5} y={9} width={19} height={6} rx={1} />
      <path d="M7 9v3M11 9v2.2M15 9v3M19 9v2.2" strokeWidth={1.4} />
    </g>
  ),
  casa: (
    <g {...S}>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v10h12V10" />
      <path d="M10 20v-6h4v6" strokeWidth={1.4} />
    </g>
  ),
  pluma: (
    <g {...S}>
      <path d="M4 20c1-6 5-12 13-16l3 3C16 11 10 15 4 20z" />
      <path d="M4 20c3-3 6-5 9-7" strokeWidth={1.4} />
    </g>
  ),
  pieza: (
    <g {...S}>
      <path d="M9 4h6v3.2a2.3 2.3 0 1 1 0 4.3V15h-3.2a2.3 2.3 0 1 0-4.3 0H4V4h5z" transform="translate(2 2.5)" />
    </g>
  ),
  reloj: (
    <g {...S}>
      <circle cx={12} cy={13} r={8} />
      <path d="M12 13V8.5M12 13l3.5 2M10 2h4" />
    </g>
  ),
  abaco: (
    <g {...S}>
      <path d="M4 3v18M20 3v18M4 7h16M4 12.5h16M4 18h16" strokeWidth={1.4} />
      <circle cx={9} cy={7} r={1.8} fill="currentColor" stroke="none" />
      <circle cx={14} cy={12.5} r={1.8} fill="currentColor" stroke="none" />
      <circle cx={11} cy={18} r={1.8} fill="currentColor" stroke="none" />
    </g>
  ),
  cuatriada: (
    <g {...S}>
      <circle cx={8.5} cy={8.5} r={4} />
      <circle cx={15.5} cy={8.5} r={4} />
      <circle cx={8.5} cy={15.5} r={4} />
      <circle cx={15.5} cy={15.5} r={4} />
    </g>
  ),
  eslabones: (
    <g {...S}>
      <path d="M10.5 13.5 13.5 10.5" />
      <path d="M8.5 15.5 6 18a3.5 3.5 0 0 0 5 5l2.5-2.5" transform="translate(0 -4)" />
      <path d="M15.5 8.5 18 6a3.5 3.5 0 0 0-5-5l-2.5 2.5" transform="translate(0 4)" />
    </g>
  ),
  espiga: (
    <g {...S}>
      <path d="M12 22V6" />
      <path d="M12 8c-3 0-4.5-1.5-4.5-4 3 0 4.5 1.5 4.5 4zM12 8c3 0 4.5-1.5 4.5-4-3 0-4.5 1.5-4.5 4zM12 13c-3 0-4.5-1.5-4.5-4 3 0 4.5 1.5 4.5 4zM12 13c3 0 4.5-1.5 4.5-4-3 0-4.5 1.5-4.5 4zM12 18c-3 0-4.5-1.5-4.5-4 3 0 4.5 1.5 4.5 4zM12 18c3 0 4.5-1.5 4.5-4-3 0-4.5 1.5-4.5 4z" strokeWidth={1.3} />
    </g>
  ),
  notas: (
    <g {...S}>
      <path d="M9 17.5V5.5l10-2v12" />
      <circle cx={6.5} cy={17.5} r={2.5} />
      <circle cx={16.5} cy={15.5} r={2.5} />
      <path d="M9 9l10-2" strokeWidth={1.4} />
    </g>
  ),
  corredor: (
    <g {...S}>
      <path d="M4 6l6 6-6 6" />
      <path d="M12 6l6 6-6 6" />
    </g>
  ),
  manos: (
    <g {...S}>
      <path d="M10 12H3.5M6 8.5 3.5 12 6 15.5" />
      <path d="M14 12h6.5M18 8.5l2.5 3.5L18 15.5" />
    </g>
  ),
  dado: (
    <g {...S}>
      <rect x={4} y={4} width={16} height={16} rx={3} />
      <circle cx={9} cy={9} r={1.4} fill="currentColor" stroke="none" />
      <circle cx={15} cy={15} r={1.4} fill="currentColor" stroke="none" />
      <circle cx={15} cy={9} r={1.4} fill="currentColor" stroke="none" />
      <circle cx={9} cy={15} r={1.4} fill="currentColor" stroke="none" />
    </g>
  ),
  parlante: (
    <g {...S}>
      <path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4z" />
      <path d="M16 9a4.2 4.2 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" strokeWidth={1.4} />
    </g>
  ),
  festejo: (
    <g {...S}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" strokeWidth={1.5} />
    </g>
  ),
  metronomo: (
    <g {...S}>
      <path d="M9.5 3h5L18 21H6L9.5 3z" />
      <path d="M12 16.5 16.5 7" />
      <circle cx={16.5} cy={7} r={1.3} fill="currentColor" stroke="none" />
      <path d="M7 16.5h10" strokeWidth={1.4} />
    </g>
  ),
  dedo: (
    <g {...S}>
      <path d="M12 21V7M12 7l-5 5M12 7l5 5" />
    </g>
  ),
  foco: (
    <g {...S}>
      <path d="M12 3a6 6 0 0 1 3.5 10.9c-.9.7-1.5 1.4-1.5 2.6h-4c0-1.2-.6-1.9-1.5-2.6A6 6 0 0 1 12 3z" />
      <path d="M10 19.5h4M10.8 22h2.4" strokeWidth={1.4} />
    </g>
  ),
  llama: (
    <g {...S}>
      <path d="M12 2.5c1 3-4.5 5.5-4.5 11a4.5 4.5 0 0 0 9 .3c0-2.3-1.3-3.6-1.3-3.6S17 12.5 12 2.5z" transform="translate(0 1.5)" />
      <path d="M12 21a2.8 2.8 0 0 1-1.5-5c.3 1.2 1.5 1.5 1.5 1.5s2 1 0 3.5z" strokeWidth={1.3} />
    </g>
  ),
  youtube: (
    <g {...S}>
      <rect x={2.5} y={6} width={19} height={13} rx={4} />
      <path d="M10.5 9.5v6l5-3-5-3z" fill="currentColor" stroke="none" />
    </g>
  ),
  instagram: (
    <g {...S}>
      <rect x={3.5} y={3.5} width={17} height={17} rx={5} />
      <circle cx={12} cy={12} r={4} />
      <circle cx={17} cy={7} r={1.2} fill="currentColor" stroke="none" />
    </g>
  ),
  spotify: (
    <g {...S}>
      <circle cx={12} cy={12} r={9} />
      <path d="M8 9.8c3.2-.9 6-.6 8.3.8M8.3 12.7c2.6-.7 4.8-.4 6.7.7M8.6 15.4c2-.5 3.7-.3 5.2.5" strokeWidth={1.5} />
    </g>
  ),
  microfono: (
    <g {...S}>
      <rect x={9} y={3} width={6} height={11} rx={3} />
      <path d="M6 11.5a6 6 0 0 0 12 0M12 17.5V21M9 21h6" />
    </g>
  ),
  pentagrama: (
    <g {...S}>
      <path d="M3 5.5h18M3 9h18M3 12.5h18M3 16h18M3 19.5h18" strokeWidth={1.1} />
      <circle cx={13.6} cy={16} r={2.1} fill="currentColor" stroke="none" />
      <path d="M15.7 16V5.5" strokeWidth={1.4} />
    </g>
  ),
  loop: (
    <g {...S}>
      <path d="M4.5 12a7.5 7.5 0 0 1 13-5.1L20 9.5M19.5 12a7.5 7.5 0 0 1-13 5.1L4 14.5" />
      <path d="M20 5v4.5h-4.5M4 19v-4.5h4.5" />
    </g>
  ),
  imprimir: (
    <g {...S}>
      <path d="M7 8V3h10v5" />
      <rect x={4} y={8} width={16} height={8} rx={2} />
      <path d="M7 14h10v7H7z" strokeLinejoin="round" />
    </g>
  ),
  iman: (
    <g {...S}>
      <path d="M6 3v9a6 6 0 0 0 12 0V3" />
      <path d="M10 3v9a2 2 0 0 0 4 0V3" />
      <path d="M6 7.5h4M14 7.5h4" strokeWidth={1.4} />
    </g>
  ),
};

/** De los emojis que quedaron en los datos, al ícono que los reemplaza. */
const DE_EMOJI: Record<string, string> = {
  "🎹": "piano",
  "🧪": "matraz",
  "🔎": "lupa",
  "👂": "oreja",
  "⚡": "rayo",
  "🔢": "grados",
  "🔤": "letras",
  "🪜": "escalera",
  "🌳": "arbol",
  "🥁": "tambor",
  "📏": "regla",
  "🏠": "casa",
  "✍️": "pluma",
  "🧩": "pieza",
  "⏱️": "reloj",
  "🧮": "abaco",
  "🍀": "cuatriada",
  "🔗": "eslabones",
  "🌾": "espiga",
  "🎶": "notas",
  "🏃": "corredor",
  "🤲": "manos",
  "🎲": "dado",
  "🔊": "parlante",
  "🎉": "festejo",
  "🕰": "metronomo",
  "👆": "dedo",
  "💡": "foco",
  "🔥": "llama",
  "🔁": "loop",
  "🎼": "pentagrama",
  "🧲": "iman",
};

export default function Icono({
  de,
  className = "",
}: {
  /** Un nombre de ícono, o el emoji que venía en los datos. */
  de: string;
  className?: string;
}) {
  const cuerpo = CUERPOS[de] ?? CUERPOS[DE_EMOJI[de]];
  if (!cuerpo) return <span className={className}>{de}</span>;
  return (
    <svg
      viewBox="0 0 24 24"
      className={`inline-block h-[1em] w-[1em] align-[-0.125em] ${className}`}
      aria-hidden
    >
      {cuerpo}
    </svg>
  );
}
