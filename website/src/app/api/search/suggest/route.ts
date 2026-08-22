import { NextResponse } from "next/server";
import { getModels, getBrands } from "@/lib/data";
import { LIMITES, chequearLimite, respuesta429 } from "@/lib/limites";
import { texto } from "@/lib/entrada";

export const dynamic = "force-dynamic";

/**
 * Autocomplete del buscador.
 *
 * Parece inofensivo y es el endpoint más caro del sitio por request: cada llamada trae
 * **el catálogo entero** (`getModels()` con sus publicaciones y tiendas) para filtrar en
 * memoria. Se dispara con cada tecla. Por eso lleva techo — 120 por minuto y por IP es
 * holgado para alguien tipeando y corta a un script — y por eso el término se acota a 60
 * caracteres: nadie busca una notebook con una consulta de 4 KB, pero el filtro la recorre
 * igual contra cada modelo.
 */
export async function GET(req: Request) {
  const limite = await chequearLimite("sugerencias", req, LIMITES.lectura);
  if (!limite.permitido) return respuesta429(limite.reintentarEn);

  const q = texto(new URL(req.url).searchParams.get("q"), 60).toLowerCase();
  if (q.length < 2) return NextResponse.json({ models: [], brands: [] });

  const [models, brands] = await Promise.all([getModels(), getBrands()]);

  const matched = models
    .filter((m) => m.listings.length > 0)
    .filter((m) => `${m.brand} ${m.name} ${m.cpu}`.toLowerCase().includes(q))
    .slice(0, 6)
    .map((m) => ({
      id: m.id,
      label: `${m.brand} ${m.name}`,
      brandSlug: m.brandSlug,
      slug: m.slug,
      price: m.bestPrice,
    }));

  const marcas = brands
    .filter((b) => b.name.toLowerCase().includes(q))
    .slice(0, 3)
    .map((b) => ({ name: b.name, slug: b.slug, count: b.count }));

  return NextResponse.json(
    { models: matched, brands: marcas },
    // Privado y corto: son sugerencias, no contenido. Diez segundos alcanzan para absorber
    // el rebote de una tecla y no alcanzan para servir un precio viejo.
    { headers: { "cache-control": "private, max-age=10" } },
  );
}
