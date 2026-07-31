import { NextResponse } from "next/server";

/**
 * Cotización del dólar blue (venta) para mostrar precios de referencia en USD (feature de producto).
 * Cacheada 1h. Si falla, devuelve rate null → la UI simplemente no muestra el equivalente.
 */
export async function GET() {
  try {
    const r = await fetch("https://dolarapi.com/v1/dolares/blue", { next: { revalidate: 3600 } });
    if (!r.ok) throw new Error(String(r.status));
    const d = await r.json();
    const rate = Number(d?.venta) || null;
    return NextResponse.json({ rate });
  } catch {
    return NextResponse.json({ rate: null });
  }
}
