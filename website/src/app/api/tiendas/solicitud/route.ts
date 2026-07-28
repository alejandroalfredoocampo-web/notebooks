import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";

/**
 * Recibe una solicitud de una tienda que quiere sumarse (formulario público).
 * Inserta en store_applications (RLS permite insert público, no lectura).
 */
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const commercialName = String(b.commercialName ?? "").trim();
  const contactEmail = String(b.contactEmail ?? "").trim();
  const website = String(b.website ?? "").trim();

  const errors: string[] = [];
  if (!commercialName) errors.push("El nombre comercial es obligatorio.");
  if (!contactEmail.includes("@")) errors.push("El email de contacto es inválido.");
  if (!/^https?:\/\//i.test(website)) errors.push("El sitio web debe empezar con http(s)://");
  if (errors.length) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const row = {
    commercial_name: commercialName,
    legal_name: String(b.legalName ?? "").trim() || null,
    cuit: String(b.cuit ?? "").trim() || null,
    website,
    contact_name: String(b.contactName ?? "").trim() || null,
    contact_email: contactEmail,
    contact_phone: String(b.contactPhone ?? "").trim() || null,
    province: String(b.province ?? "").trim() || null,
    city: String(b.city ?? "").trim() || null,
    has_physical_store: b.hasPhysicalStore === true,
    physical_address: String(b.physicalAddress ?? "").trim() || null,
    ships_nationwide: b.shipsNationwide === true,
    payment_methods: String(b.paymentMethods ?? "").trim() || null,
    interest_free_installments: b.interestFreeInstallments === true,
    instagram: String(b.instagram ?? "").trim() || null,
    facebook: String(b.facebook ?? "").trim() || null,
    tiktok: String(b.tiktok ?? "").trim() || null,
    youtube: String(b.youtube ?? "").trim() || null,
    linkedin: String(b.linkedin ?? "").trim() || null,
    mercadolibre: String(b.mercadolibre ?? "").trim() || null,
    google_rating: num(b.googleRating),
    google_reviews_count: num(b.googleReviewsCount),
    google_maps_url: String(b.googleMapsUrl ?? "").trim() || null,
    catalog_url: String(b.catalogUrl ?? "").trim() || null,
    platform: String(b.platform ?? "").trim() || null,
    message: String(b.message ?? "").trim() || null,
  };

  const { error } = await supabase.from("store_applications").insert(row);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
