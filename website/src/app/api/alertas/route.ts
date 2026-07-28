import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";

/**
 * Alta de una alerta de precio (loop de retención).
 * body: { email, modelId, targetPrice? }
 * Inserta en price_alerts (RLS permite insert público). El worker que compara
 * precios y manda el email queda para el cron (backlog).
 */
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const email = String(b?.email ?? "").trim();
  const modelId = String(b?.modelId ?? "").trim();
  if (!email.includes("@") || !modelId) {
    return NextResponse.json({ error: "Email o modelo inválido" }, { status: 400 });
  }
  const targetPrice =
    b?.targetPrice != null && Number.isFinite(Number(b.targetPrice))
      ? Math.round(Number(b.targetPrice))
      : null;

  const { error } = await supabase
    .from("price_alerts")
    .insert({ email, model_id: modelId, target_price: targetPrice });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
