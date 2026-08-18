import type { Metadata } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Cuaderno de piano",
    template: "%s · Cuaderno de piano",
  },
  description:
    "Un cuaderno de clases de piano que se puede tocar: acordes, ejercicios y cifrado, un miércoles por vez.",
};

const NAV = [
  { href: "/", label: "Inicio" },
  { href: "/clases", label: "Clases" },
  { href: "/acordes", label: "Acordes" },
  { href: "/partituras", label: "Partituras" },
  { href: "/practica", label: "Práctica" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR" className={`${fraunces.variable} ${grotesk.variable}`}>
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-50 border-b border-borde/70 bg-noche/80 backdrop-blur-md">
          {/* En el celular el menú no entra en una línea, así que se desliza.
              Se prefiere eso a esconder secciones atrás de un botón: son cinco
              y la de más a la derecha es la que más se usa. */}
          <nav className="mx-auto flex max-w-5xl items-center gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]{display:none}">
            <Link href="/" className="group mr-auto flex shrink-0 items-center gap-2.5">
              <span className="flex h-8 items-end gap-[2px] rounded-[5px] bg-tiza p-[3px] shadow-[0_2px_0_#8d8778]">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="h-full w-[5px] rounded-[1px] bg-noche transition-all duration-300 group-hover:h-1/2"
                    style={{ transitionDelay: `${i * 45}ms` }}
                  />
                ))}
              </span>
              <span className="font-display hidden text-lg leading-none font-bold tracking-tight sm:inline">
                Cuaderno de piano
              </span>
            </Link>
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-full px-2.5 py-1.5 text-sm text-humo transition hover:bg-carta hover:text-tiza sm:px-3"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="mx-auto max-w-5xl px-4 pb-24">{children}</main>

        <footer className="border-t border-borde/60 px-4 py-8 text-center text-xs leading-relaxed text-humo">
          <p>
            Clases con Quique Yance · miércoles · escrito a cuatro manos con
            Claude
          </p>
          <p className="mt-1.5 text-humo/70">
            El piano suena con el Salamander Grand Piano de Alexander Holm (
            <a
              href="https://creativecommons.org/licenses/by/3.0/"
              className="underline underline-offset-2 hover:text-tiza"
              target="_blank"
              rel="noreferrer"
            >
              CC-BY 3.0
            </a>
            )
          </p>
        </footer>
      </body>
    </html>
  );
}
