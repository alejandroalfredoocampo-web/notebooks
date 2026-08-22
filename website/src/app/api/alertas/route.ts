import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";
import { LIMITES, chequearLimite, respuesta429 } from "@/lib/limites";
import { email, entero, errorGuardando, esEmail, leerJson, texto } from "@/lib/entrada";

export const dynamic = "force-dynamic";

/**
 * Alta de una alerta de precio.
 *
 * Es el endpoint más sensible del sitio y no lo parece: guarda una dirección de correo que
 * después **recibe mail nuestro**. Sin techo, es un remitente de spam gratis apuntando a
 * direcciones ajenas, y lo que se quema es la reputación del dominio — o sea, la entrega de
 * los mails que sí importan.
 *
 * Por eso ahora tiene las cuatro cosas que le faltaban: rate limit por IP, validación de
 * email de verdad (antes alcanzaba con `includes("@")`, así que `"@"` pasaba), honeypot, y
 * un mensaje de error que no le cuenta el esquema al que manda basura a propósito.
 */
export async function POST(req: Request) {
  const limite = await chequearLimite("alerta", req, LIMITES.formulario);
  if (!limite.permitido) return respuesta429(limite.reintentarEn);

  const b = await leerJson(req);
  if (!b) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  // Honeypot: un campo que un humano no ve y un bot completa. Se contesta ok para que el
  // bot no aprenda que lo detectamos, y no se guarda nada.
  if (texto(b.website, 10)) return NextResponse.json({ ok: true });

  if (!esEmail(b.email)) {
    return NextResponse.json({ error: "El email no es válido." }, { status: 400 });
  }
  const modelId = texto(b.modelId, 100);
  if (!modelId) {
    return NextResponse.json({ error: "Falta el modelo." }, { status: 400 });
  }

  // El techo de 100 millones no es arbitrario: por encima de eso no es una notebook, es un
  // número que alguien tipeó apoyado en el teclado. Guardarlo hace que la alerta nunca
  // dispare y que la persona crea que la creó.
  const targetPrice = b.targetPrice == null ? null : entero(b.targetPrice, 1, 100_000_000);
  if (b.targetPrice != null && targetPrice === null) {
    return NextResponse.json({ error: "El precio objetivo no es válido." }, { status: 400 });
  }

  const { error } = await supabase
    .from("price_alerts")
    .insert({ email: email(b.email), model_id: modelId, target_price: targetPrice });
  if (error) return errorGuardando("alertas", error);
  return NextResponse.json({ ok: true });
}
