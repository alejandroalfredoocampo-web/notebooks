export function fmtARS(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-AR");
}

/**
 * Saca la marca repetida al principio del nombre del modelo (varios modelos
 * scrapeados quedaron con el nombre incluyendo la marca → "Acer Acer Al15…").
 * Display-only: no toca la DB. Si el nombre no empieza con la marca, lo deja igual.
 */
export function cleanModelName(brand: string, name: string): string {
  const b = (brand ?? "").trim();
  const n = (name ?? "").trim();
  if (!b || !n) return n;
  if (n.toLowerCase().startsWith(b.toLowerCase() + " ")) {
    return n.slice(b.length).trim();
  }
  return n;
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

export function fmtDateLong(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-AR", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
