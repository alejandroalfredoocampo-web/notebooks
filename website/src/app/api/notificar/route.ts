import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";

/**
 * Aviso de disponibilidad para un modelo que todavía no tiene ofertas (spec 06).
 * body: { email, modelId }
 * Inserta en model_notify (RLS permite insert público). El worker de mails avisa
 * cuando se publique la primera oferta. Idempotente por unique(email, model_id).
 */
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const email = String(b?.email ?? "").trim();
  const modelId = String(b?.modelId ?? "").trim();
  // honeypot antispam: si viene relleno, hacemos como que ok pero no guardamos
  if (b?.company) return NextResponse.json({ ok: true });
  if (!email.includes("@") || !modelId) {
    return NextResponse.json({ error: "Email o modelo inválido" }, { status: 400 });
  }

  const { error } = await supabase
    .from("model_notify")
    .upsert({ email, model_id: modelId }, { onConflict: "email,model_id", ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
