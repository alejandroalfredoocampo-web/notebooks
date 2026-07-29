import type { MetadataRoute } from "next";
import { getModels, getStores, getBrands } from "@/lib/data";
import { getPublishedPosts } from "@/lib/blog";

const BASE = "https://www.notebooks.com.ar";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/notebooks`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE}/ofertas`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE}/tiendas`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE}/blog`, changeFrequency: "daily", priority: 0.6 },
    { url: `${BASE}/corporativo`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/privacidad`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const [models, stores, brands, posts] = await Promise.all([
    getModels(),
    getStores(),
    getBrands(),
    getPublishedPosts(),
  ]);

  const postPages: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const modelPages: MetadataRoute.Sitemap = models.map((m) => ({
    url: `${BASE}/notebooks/${m.brandSlug}/${m.slug}`,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const storePages: MetadataRoute.Sitemap = stores.map((s) => ({
    url: `${BASE}/tiendas/${s.slug}`,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  const brandPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/marcas`, changeFrequency: "weekly", priority: 0.6 },
    ...brands.map((b) => ({
      url: `${BASE}/marcas/${b.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];

  return [...staticPages, ...modelPages, ...storePages, ...brandPages, ...postPages];
}
