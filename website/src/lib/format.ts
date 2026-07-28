export function fmtARS(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-AR");
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
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
