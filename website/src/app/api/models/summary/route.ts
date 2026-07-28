import { NextResponse } from "next/server";
import { getModels } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * Resumen público de modelos por id (spec 07). Lo usa la página de favoritos
 * (client-side) para renderizar las cards sin exponer toda la data.
 * GET /api/models/summary?ids=a,b,c
 */
export async function GET(req: Request) {
  const ids = new URL(req.url).searchParams.get("ids")?.split(",").filter(Boolean) ?? [];
  if (!ids.length) return NextResponse.json({ models: [] });

  const set = new Set(ids);
  const models = (await getModels())
    .filter((m) => set.has(m.id))
    .map((m) => ({
      id: m.id,
      brand: m.brand,
      brandSlug: m.brandSlug,
      name: m.name,
      slug: m.slug,
      cpu: m.cpu,
      ramGb: m.ramGb,
      gpuType: m.gpuType,
      os: m.os,
      imageUrl: m.imageUrl ?? null,
      bestPrice: m.bestPrice,
      listingsCount: m.listings.length,
    }));

  return NextResponse.json({ models });
}
