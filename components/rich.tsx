/** Convierte *esto* en negrita, sin traer un parser de markdown entero. */
export function rich(text: string) {
  return text.split(/(\*[^*]+\*)/g).map((chunk, i) =>
    chunk.startsWith("*") && chunk.endsWith("*") && chunk.length > 2 ? (
      <strong key={i} className="font-semibold text-sol">
        {chunk.slice(1, -1)}
      </strong>
    ) : (
      <span key={i}>{chunk}</span>
    ),
  );
}
