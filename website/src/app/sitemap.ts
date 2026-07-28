import type { MetadataRoute } from "next";
import { getModels } from "@/lib/data";

const BASE = "https://www.notebooks.com.ar";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/notebooks`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE}/ofertas`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE}/tiendas`, changeFrequency: "weekly", priority: 0.5 },
  ];

  const models = await getModels();
  const modelPages: MetadataRoute.Sitemap = models.map((m) => ({
    url: `${BASE}/notebooks/${m.brandSlug}/${m.slug}`,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticPages, ...modelPages];
}
