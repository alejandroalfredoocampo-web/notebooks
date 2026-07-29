import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";

/**
 * Solicitud de presupuesto corporativo / mayorista (spec 08, Fase A).
 * El público inserta en bulk_requests (RLS permite insert). El admin la lee y
 * recopila cotizaciones. Honeypot antispam en el campo "website".
 */
function genId(): string {
  return "rfq_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  if (b.website) return NextResponse.json({ ok: true }); // honeypot

  const companyName = String(b.companyName ?? "").trim();
  const contactEmail = String(b.contactEmail ?? "").trim();
  const quantity = Number(b.quantity);
  const modelId = b.modelId ? String(b.modelId) : null;
  const specsNote = String(b.specsNote ?? "").trim();

  const errors: string[] = [];
  if (!companyName) errors.push("La empresa es obligatoria.");
  if (!contactEmail.includes("@")) errors.push("El email de contacto es inválido.");
  if (!Number.isFinite(quantity) || quantity < 1) errors.push("La cantidad debe ser al menos 1.");
  if (!modelId && !specsNote) errors.push("Elegí un modelo o describí lo que buscás.");
  if (errors.length) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const row = {
    id: genId(),
    status: "open",
    model_id: modelId,
    specs_note: specsNote || null,
    quantity: Math.round(quantity),
    needed_by: b.neededBy ? String(b.neededBy) : null,
    company_name: companyName,
    cuit: String(b.cuit ?? "").trim() || null,
    contact_name: String(b.contactName ?? "").trim() || null,
    contact_email: contactEmail,
    contact_phone: String(b.contactPhone ?? "").trim() || null,
    province: String(b.province ?? "").trim() || null,
    message: String(b.message ?? "").trim() || null,
  };

  const { error } = await supabase.from("bulk_requests").insert(row);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
