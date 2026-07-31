import { NextResponse } from "next/server";
import { getModels, getBrands } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Sugerencias para el autocomplete del buscador (feature de producto). */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2) return NextResponse.json({ models: [], brands: [] });

  const models = (await getModels()).filter((m) => m.listings.length > 0);
  const matched = models
    .filter((m) => `${m.brand} ${m.name} ${m.cpu}`.toLowerCase().includes(q))
    .slice(0, 6)
    .map((m) => ({
      id: m.id,
      label: `${m.brand} ${m.name}`,
      brandSlug: m.brandSlug,
      slug: m.slug,
      price: m.bestPrice,
    }));
  const brands = (await getBrands())
    .filter((b) => b.name.toLowerCase().includes(q))
    .slice(0, 3)
    .map((b) => ({ name: b.name, slug: b.slug, count: b.count }));

  return NextResponse.json({ models: matched, brands });
}
