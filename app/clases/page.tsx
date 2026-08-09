import Link from "next/link";
import type { Metadata } from "next";
import { LESSONS, formatDate, slugOf } from "@/content";

export const metadata: Metadata = { title: "Clases" };

export default function ClasesPage() {
  return (
    <div className="pt-10">
      <h1 className="font-display mb-2 text-5xl font-black tracking-tight">
        Clases
      </h1>
      <p className="mb-8 text-humo">
        Una por miércoles. De la más nueva a la más vieja.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {[...LESSONS].reverse().map((l) => (
          <Link
            key={l.n}
            href={`/clases/${slugOf(l)}`}
            className="card group flex flex-col px-6 py-5 transition hover:border-sol/50"
          >
            <span className="font-display text-6xl leading-none font-black text-carta-2 transition group-hover:text-sol/30">
              {String(l.n).padStart(2, "0")}
            </span>
            <h2 className="font-display mt-2 text-2xl font-bold transition group-hover:text-sol">
              {l.title}
            </h2>
            <p className="mt-1 text-sm text-humo">{formatDate(l.date)}</p>
            <p className="mt-3 flex-1 leading-relaxed text-humo">{l.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
