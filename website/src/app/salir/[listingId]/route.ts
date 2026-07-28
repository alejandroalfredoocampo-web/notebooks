import { NextRequest, NextResponse } from "next/server";
import { getListing, getStore } from "@/lib/data";
import { supabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

/**
 * Redirect saliente con tracking de clic (ClickOut).
 * - Registra el clic en la tabla `click_outs` de Supabase (inventario a monetizar).
 * - Agrega parámetros de afiliado/UTM si la tienda los soporta.
 * - Devuelve 302 hacia la publicación de la tienda.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { listingId: string } }
) {
  const listing = await getListing(params.listingId);
  if (!listing) {
    return NextResponse.redirect(new URL("/notebooks", req.url), 302);
  }

  const store = await getStore(listing.storeId);

  // 1. Registrar el clic (nunca debe romper el redirect)
  try {
    await supabase.from("click_outs").insert({
      listing_id: listing.id,
      store_id: listing.storeId,
      model_id: listing.modelId,
      price_at_click: listing.priceCash,
      referrer: req.headers.get("referer") ?? null,
      user_agent: req.headers.get("user-agent") ?? null,
    });
  } catch (e) {
    console.error("clickout: no se pudo registrar", e);
  }

  // 2. Construir URL destino con tag de afiliado si existe
  const target = new URL(listing.url);
  if (store?.affiliate?.kind === "utm") {
    for (const [k, v] of Object.entries(store.affiliate.params)) {
      target.searchParams.set(k, v);
    }
  }

  return NextResponse.redirect(target.toString(), 302);
}
