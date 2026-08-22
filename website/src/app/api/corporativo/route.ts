import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";
import { LIMITES, chequearLimite, respuesta429 } from "@/lib/limites";
import {
  email,
  entero,
  errorGuardando,
  esEmail,
  leerJson,
  texto,
  textoOpcional,
} from "@/lib/entrada";

export const dynamic = "force-dynamic";

/**
 * Solicitud de presupuesto corporativo / mayorista.
 *
 * Es el formulario con más campos libres del sitio, así que es el que más ganaba con topes
 * de largo: sin ellos, `message` y `specsNote` entran a la base con el tamaño que el
 * cliente quiera.
 */

/**
 * ID de la solicitud.
 *
 * Antes salía de `Math.random()`, que **no es un generador criptográfico**: en V8 es
 * xorshift128+ y su estado se puede reconstruir observando unas pocas salidas. Acá eso
 * importa porque el id es lo que identifica una solicitud comercial con datos de la empresa
 * adentro. `crypto.randomUUID()` está en el runtime desde Node 19 y no cuesta nada.
 */
function genId(): string {
  return "rfq_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

export async function POST(req: Request) {
  const limite = await chequearLimite("corporativo", req, LIMITES.formulario);
  if (!limite.permitido) return respuesta429(limite.reintentarEn);

  const b = await leerJson(req);
  if (!b) return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  if (texto(b.website, 10)) return NextResponse.json({ ok: true }); // honeypot

  const companyName = texto(b.companyName, 160);
  const quantity = entero(b.quantity, 1, 100_000);
  const modelId = textoOpcional(b.modelId, 100);
  const specsNote = texto(b.specsNote, 2000);

  const errores: string[] = [];
  if (!companyName) errores.push("La empresa es obligatoria.");
  if (!esEmail(b.contactEmail)) errores.push("El email de contacto es inválido.");
  if (quantity === null) errores.push("La cantidad debe ser un número entre 1 y 100.000.");
  if (!modelId && !specsNote) errores.push("Elegí un modelo o describí lo que buscás.");
  if (errores.length) return NextResponse.json({ error: errores.join(" ") }, { status: 400 });

  const row = {
    id: genId(),
    status: "open",
    model_id: modelId,
    specs_note: specsNote || null,
    quantity,
    // Se valida el formato: una fecha que no parsea entra a la columna y explota como 500
    // sin que nadie sepa por qué.
    needed_by: fechaOpcional(b.neededBy),
    company_name: companyName,
    cuit: textoOpcional(b.cuit, 20),
    contact_name: textoOpcional(b.contactName, 120),
    contact_email: email(b.contactEmail),
    contact_phone: textoOpcional(b.contactPhone, 40),
    province: textoOpcional(b.province, 80),
    message: textoOpcional(b.message, 4000),
  };

  const { error } = await supabase.from("bulk_requests").insert(row);
  if (error) return errorGuardando("corporativo", error);
  return NextResponse.json({ ok: true });
}

/** `YYYY-MM-DD` o nada. El `<input type="date">` manda ese formato; el resto es ruido. */
function fechaOpcional(v: unknown): string | null {
  const t = texto(v, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  return Number.isFinite(Date.parse(t)) ? t : null;
}
