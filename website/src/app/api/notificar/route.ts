import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";
import { LIMITES, chequearLimite, respuesta429 } from "@/lib/limites";
import { email, errorGuardando, esEmail, leerJson, texto } from "@/lib/entrada";

export const dynamic = "force-dynamic";

/**
 * Aviso de disponibilidad para un modelo que todavía no tiene ofertas.
 *
 * Idempotente por `unique(email, model_id)` — que recién funciona de verdad ahora que el
 * email se normaliza a minúsculas antes de guardarlo. Antes `Ana@x.com` y `ana@x.com` eran
 * dos filas, y la persona recibía el aviso dos veces.
 */
export async function POST(req: Request) {
  const limite = await chequearLimite("notificar", req, LIMITES.formulario);
  if (!limite.permitido) return respuesta429(limite.reintentarEn);

  const b = await leerJson(req);
  if (!b) return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  if (texto(b.company, 10)) return NextResponse.json({ ok: true }); // honeypot

  if (!esEmail(b.email)) {
    return NextResponse.json({ error: "El email no es válido." }, { status: 400 });
  }
  const modelId = texto(b.modelId, 100);
  if (!modelId) return NextResponse.json({ error: "Falta el modelo." }, { status: 400 });

  const { error } = await supabase
    .from("model_notify")
    .upsert({ email: email(b.email), model_id: modelId }, { onConflict: "email,model_id", ignoreDuplicates: true });
  if (error) return errorGuardando("notificar", error);
  return NextResponse.json({ ok: true });
}
