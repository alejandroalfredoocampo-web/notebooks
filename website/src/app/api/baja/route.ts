import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { unsubToken } from "@/lib/unsubToken";

/** Da de baja una alerta de precio (active=false). Verifica el token HMAC. */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const id = String(form?.get("id") ?? "");
  const t = String(form?.get("t") ?? "");
  if (!id || t !== unsubToken(id)) {
    return NextResponse.redirect(new URL("/baja?err=1", req.url));
  }
  try {
    await supabaseAdmin().from("price_alerts").update({ active: false }).eq("id", Number(id));
    return NextResponse.redirect(new URL("/baja?ok=1", req.url));
  } catch {
    return NextResponse.redirect(new URL("/baja?err=1", req.url));
  }
}
