import { NextResponse } from "next/server";
import { getStoreInsights } from "@/lib/data";
import { autorizarTienda } from "@/lib/sesionTienda";
import { texto } from "@/lib/entrada";

export const dynamic = "force-dynamic";

/**
 * Inteligencia de precios de una tienda (spec 11, Parte A).
 *
 * Estaba abierto. Ver el docblock de `lib/sesionTienda.ts` para por qué eso era un problema
 * y no un MVP: el dato de origen es público, el análisis no, y encima es el producto que
 * esa misma spec pensaba cobrar.
 */
export async function GET(req: Request) {
  const storeId = texto(new URL(req.url).searchParams.get("storeId"), 100);
  if (!storeId) return NextResponse.json({ error: "Falta storeId" }, { status: 400 });

  const rechazo = await autorizarTienda(req, storeId);
  if (rechazo) return rechazo;

  try {
    const insights = await getStoreInsights(storeId);
    return NextResponse.json(insights, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    // El detalle al log; al cliente, nada del esquema.
    console.error("[portal/insights] falló", e);
    return NextResponse.json({ error: "No se pudo generar el informe." }, { status: 500 });
  }
}
