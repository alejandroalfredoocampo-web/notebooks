import type { MetadataRoute } from "next";
import { getModels, getStores, getBrands } from "@/lib/data";
import { getPublishedPosts } from "@/lib/blog";
import { urlAbsoluta } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * El sitemap.
 *
 * ## `lastModified` sólo donde hay una fecha honesta
 *
 * La tentación es poner `new Date()` en todo, y es contraproducente: un sitemap donde las
 * 3.000 URLs dicen "modificada hoy" en cada build le enseña a Google que la fecha de este
 * sitio no significa nada, y entonces la ignora **también** en las que sí cambiaron. Acá:
 *
 * - Una **ficha de modelo** usa el `lastSeenAt` más reciente de sus publicaciones. Es la
 *   fecha real en la que el scraper confirmó un precio, que es exactamente lo que cambia en
 *   esa página.
 * - Un **artículo** usa su `updatedAt`.
 * - Una **marca** usa la fecha más reciente de sus modelos.
 * - Las páginas estáticas y las de tienda **no llevan fecha**. No hay ninguna de la que se
 *   pueda afirmar cuándo cambió, y omitir el campo es una respuesta válida.
 *
 * ## Lo que no entra
 *
 * Nada que requiera sesión, ni el redirect saliente, ni las combinaciones de filtros. Ver
 * `robots.ts` para el razonamiento de las facetas.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [models, stores, brands, posts] = await Promise.all([
    getModels(),
    getStores(),
    getBrands(),
    getPublishedPosts(),
  ]);

  const estaticas: MetadataRoute.Sitemap = [
    { url: urlAbsoluta("/"), changeFrequency: "daily", priority: 1 },
    { url: urlAbsoluta("/notebooks"), changeFrequency: "hourly", priority: 0.9 },
    { url: urlAbsoluta("/ofertas"), changeFrequency: "hourly", priority: 0.9 },
    // Faltaba. Está enlazado desde el header de todas las páginas del sitio y no estaba en
    // el sitemap — el mismo hueco que se tapó tres veces en el otro proyecto, siempre con
    // páginas server-side enlazadas desde la navegación. Vale la pena decir por qué se
    // escapa: los chequeos de regresión recorren el sitemap, así que una página que no está
    // en el sitemap es invisible para el chequeo que debería detectar que falta.
    { url: urlAbsoluta("/comparar"), changeFrequency: "weekly", priority: 0.6 },
    { url: urlAbsoluta("/marcas"), changeFrequency: "weekly", priority: 0.6 },
    { url: urlAbsoluta("/tiendas"), changeFrequency: "weekly", priority: 0.5 },
    { url: urlAbsoluta("/blog"), changeFrequency: "daily", priority: 0.6 },
    { url: urlAbsoluta("/corporativo"), changeFrequency: "monthly", priority: 0.5 },
    { url: urlAbsoluta("/privacidad"), changeFrequency: "yearly", priority: 0.2 },
  ];

  /** La fecha más reciente en la que se confirmó un precio de este modelo. */
  const ultimoPrecio = (m: (typeof models)[number]): Date | undefined => {
    const fechas = m.listings
      .map((l) => Date.parse(l.lastSeenAt))
      .filter((t) => Number.isFinite(t));
    return fechas.length ? new Date(Math.max(...fechas)) : undefined;
  };

  const fichas: MetadataRoute.Sitemap = models.map((m) => ({
    url: urlAbsoluta(`/notebooks/${m.brandSlug}/${m.slug}`),
    lastModified: ultimoPrecio(m),
    changeFrequency: "daily",
    // Una ficha sin ofertas es una página en modo "próximamente": existe, se puede indexar,
    // pero no compite con una que tiene precios. Declararla con la misma prioridad que una
    // llena es pedirle a Google que gaste rastreo en la que no tiene nada.
    priority: m.listings.length > 0 ? 0.8 : 0.4,
  }));

  const marcas: MetadataRoute.Sitemap = brands.map((b) => {
    const suyos = models.filter((m) => m.brandSlug === b.slug);
    const fechas = suyos.map(ultimoPrecio).filter((d): d is Date => !!d);
    return {
      url: urlAbsoluta(`/marcas/${b.slug}`),
      lastModified: fechas.length
        ? new Date(Math.max(...fechas.map((d) => d.getTime())))
        : undefined,
      changeFrequency: "daily",
      priority: 0.7,
    };
  });

  const tiendas: MetadataRoute.Sitemap = stores.map((s) => ({
    url: urlAbsoluta(`/tiendas/${s.slug}`),
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  const articulos: MetadataRoute.Sitemap = posts.map((p) => ({
    url: urlAbsoluta(`/blog/${p.slug}`),
    lastModified: fecha(p.updatedAt) ?? fecha(p.publishedAt),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...estaticas, ...fichas, ...marcas, ...tiendas, ...articulos];
}

function fecha(iso: string | null | undefined): Date | undefined {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t) : undefined;
}
