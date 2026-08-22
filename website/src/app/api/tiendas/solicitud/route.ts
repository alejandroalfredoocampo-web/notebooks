import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";
import { LIMITES, chequearLimite, respuesta429 } from "@/lib/limites";
import {
  email,
  errorGuardando,
  esEmail,
  leerJson,
  texto,
  textoOpcional,
  urlHttp,
} from "@/lib/entrada";

export const dynamic = "force-dynamic";

/**
 * Alta pública de una tienda que quiere sumarse al comparador.
 *
 * ## El agujero que se tapa acá
 *
 * Este formulario guarda **siete URLs** (sitio, catálogo, mapa y cinco redes) que el admin
 * después renderiza como links en la bandeja de aprobación, y varias terminan visibles en
 * la ficha pública de la tienda. Antes ninguna se validaba: sólo el `website` pasaba por un
 * `/^https?:\/\//`, y las otras seis entraban tal cual. Un `javascript:...` en `instagram`
 * es XSS almacenado que se dispara en el navegador de quien aprueba la solicitud — o sea,
 * en una sesión con permisos sobre el catálogo entero.
 *
 * Ahora las siete pasan por `urlHttp`, que parsea y exige `http`/`https`.
 */
export async function POST(req: Request) {
  const limite = await chequearLimite("alta-tienda", req, LIMITES.formulario);
  if (!limite.permitido) return respuesta429(limite.reintentarEn);

  const b = await leerJson(req);
  if (!b) return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  if (texto(b.honeypot, 10)) return NextResponse.json({ ok: true });

  const commercialName = texto(b.commercialName, 160);
  const website = urlHttp(b.website);

  const errores: string[] = [];
  if (!commercialName) errores.push("El nombre comercial es obligatorio.");
  if (!esEmail(b.contactEmail)) errores.push("El email de contacto es inválido.");
  if (!website) errores.push("El sitio web tiene que ser una URL http(s) válida.");
  if (errores.length) return NextResponse.json({ error: errores.join(" ") }, { status: 400 });

  const row = {
    commercial_name: commercialName,
    legal_name: textoOpcional(b.legalName, 200),
    cuit: textoOpcional(b.cuit, 20),
    website,
    contact_name: textoOpcional(b.contactName, 120),
    contact_email: email(b.contactEmail),
    contact_phone: textoOpcional(b.contactPhone, 40),
    province: textoOpcional(b.province, 80),
    city: textoOpcional(b.city, 80),
    has_physical_store: b.hasPhysicalStore === true,
    physical_address: textoOpcional(b.physicalAddress, 300),
    ships_nationwide: b.shipsNationwide === true,
    payment_methods: textoOpcional(b.paymentMethods, 500),
    interest_free_installments: b.interestFreeInstallments === true,
    instagram: urlHttp(b.instagram),
    facebook: urlHttp(b.facebook),
    tiktok: urlHttp(b.tiktok),
    youtube: urlHttp(b.youtube),
    linkedin: urlHttp(b.linkedin),
    mercadolibre: urlHttp(b.mercadolibre),
    // La reputación que declara la tienda entra acotada al rango que existe. Un 4,9 sobre 5
    // es un dato; un 47 es una tienda probando qué pasa, y termina en la ficha pública.
    google_rating: rango(b.googleRating, 0, 5),
    google_reviews_count: rango(b.googleReviewsCount, 0, 1_000_000),
    google_maps_url: urlHttp(b.googleMapsUrl),
    catalog_url: urlHttp(b.catalogUrl),
    platform: textoOpcional(b.platform, 80),
    message: textoOpcional(b.message, 4000),
  };

  const { error } = await supabase.from("store_applications").insert(row);
  if (error) return errorGuardando("alta-tienda", error);
  return NextResponse.json({ ok: true });
}

function rango(v: unknown, min: number, max: number): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}
