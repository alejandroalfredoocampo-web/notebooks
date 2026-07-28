import { NextRequest, NextResponse } from "next/server";
import { getListing, getStore } from "@/lib/data";

export const dynamic = "force-dynamic";
// Redirect saliente en runtime edge (Cloudflare Pages). El filesystem es de
// sólo lectura en producción, así que el clic se emite por consola (visible en
// los logs del proyecto); el paso a base de datos (tabla ClickOut) está en el roadmap.
export const runtime = "edge";

/**
 * Redirect saliente con tracking de clic (ClickOut).
 * - Registra el clic en var/clicks.jsonl (en producción: tabla ClickOut).
 * - Agrega parámetros de afiliado/UTM si la tienda los soporta.
 * - Devuelve 302 hacia la publicación de la tienda.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { listingId: string } }
) {
  const listing = getListing(params.listingId);
  if (!listing) {
    return NextResponse.redirect(new URL("/notebooks", req.url), 302);
  }

  const store = getStore(listing.storeId);

  // 1. Registrar el clic (inventario a monetizar: CPA hoy, CPC mañana).
  //    En edge no hay filesystem: se emite por consola (Cloudflare → logs).
  const click = {
    listingId: listing.id,
    storeId: listing.storeId,
    modelId: listing.modelId,
    priceAtClick: listing.priceCash,
    referrer: req.headers.get("referer") ?? null,
    userAgent: req.headers.get("user-agent") ?? null,
    ts: new Date().toISOString(),
  };
  console.log("clickout " + JSON.stringify(click));

  // 2. Construir URL destino con tag de afiliado si existe
  const target = new URL(listing.url);
  if (store?.affiliate?.kind === "utm") {
    for (const [k, v] of Object.entries(store.affiliate.params)) {
      target.searchParams.set(k, v);
    }
  }

  return NextResponse.redirect(target.toString(), 302);
}
