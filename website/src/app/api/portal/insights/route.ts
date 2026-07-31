import { NextResponse } from "next/server";
import { getStoreInsights } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * Inteligencia de precios de una tienda (spec 11, Parte A). Derivado de datos ya
 * públicos (precios del comparador), reordenados para la tienda. MVP: abierto sobre
 * data pública; refinamiento futuro: validar el token de Supabase del miembro.
 * GET /api/portal/insights?storeId=X
 */
export async function GET(req: Request) {
  const storeId = new URL(req.url).searchParams.get("storeId");
  if (!storeId) return NextResponse.json({ error: "Falta storeId" }, { status: 400 });
  try {
    const insights = await getStoreInsights(storeId);
    return NextResponse.json(insights);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
