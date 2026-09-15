import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { tokenDeBajaValido } from "@/lib/unsubToken";

/** Da de baja una alerta de precio (active=false). Verifica el token HMAC. */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const id = String(form?.get("id") ?? "");
  const t = String(form?.get("t") ?? "");
  if (!tokenDeBajaValido(id, t)) {
    return NextResponse.redirect(new URL("/baja?err=1", req.url));
  }
  try {
    // supabase-js no tira cuando la base rechaza: devuelve `{ error }`. Sin este chequeo la
    // persona veía "Listo ✓" y la alerta seguía activa — y el mail siguiente es spam.
    const { error } = await supabaseAdmin().from("price_alerts").update({ active: false }).eq("id", Number(id));
    if (error) throw error;
    return NextResponse.redirect(new URL("/baja?ok=1", req.url));
  } catch (e) {
    console.error("[baja] no se pudo dar de baja", e);
    return NextResponse.redirect(new URL("/baja?err=1", req.url));
  }
}
