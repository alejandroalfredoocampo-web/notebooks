import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { filterModels, getBrands, getBrandInfo } from "@/lib/data";
import { fmtARS } from "@/lib/format";
import ModelCard from "@/components/ModelCard";
import EntityHero from "@/components/EntityHero";
import Markdown from "@/components/Markdown";
import JsonLd from "@/components/JsonLd";
import Breadcrumbs, { type Miga } from "@/components/Breadcrumbs";
import { metaRuta, recortar } from "@/lib/seo";
import { breadcrumbLd, coleccionLd, grafo } from "@/lib/schema";

export const dynamic = "force-dynamic";

interface Params {
  brand: string;
}

async function resolveBrand(slug: string) {
  const brands = await getBrands();
  return brands.find((b) => b.slug === slug) ?? null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const brand = await resolveBrand(params.brand);
  if (!brand) return {};
  const info = await getBrandInfo(params.brand);
  const title = info?.seoTitle || `Notebooks ${brand.name} en Argentina`;
  const description =
    info?.seoDesc ||
    `Todas las notebooks ${brand.name} con el mejor precio de cada tienda de Argentina. ${brand.count} modelos comparados con historial de precios.`;
  return metaRuta(`/marcas/${brand.slug}`, { title, description: recortar(description, 300) });
}

export default async function BrandLandingPage({ params }: { params: Params }) {
  const brand = await resolveBrand(params.brand);
  if (!brand) notFound();

  const [info, models] = await Promise.all([
    getBrandInfo(params.brand),
    filterModels({ brands: [params.brand] }),
  ]);
  if (!models.length) notFound();

  const minPrice = Math.min(...models.map((m) => m.bestPrice).filter((p) => p > 0));
  const dedicated = models.filter((m) => m.gpuType === "dedicada").length;

  const migas: Miga[] = [
    { nombre: "Inicio", path: "/" },
    { nombre: "Marcas", path: "/marcas" },
    { nombre: brand.name, path: `/marcas/${brand.slug}` },
  ];

  return (
    <>
      {/**
       * Las páginas de marca eran las únicas del sitio sin ningún dato estructurado: un
       * `<h1>`, una grilla y un párrafo. Para un buscador eso es una página de la que hay
       * que adivinar qué es. `CollectionPage` + `ItemList` la declara como lista, con su
       * orden y sus items — que es lo que permite que un modelo conteste "qué notebooks
       * Lenovo hay" enumerando en vez de resumiendo.
       */}
      <JsonLd
        data={grafo(
          coleccionLd({
            path: `/marcas/${brand.slug}`,
            nombre: `Notebooks ${brand.name}`,
            descripcion: info?.seoDesc || undefined,
            items: models.slice(0, 100).map((m) => ({
              nombre: `${m.brand} ${m.name}`,
              path: `/notebooks/${m.brandSlug}/${m.slug}`,
            })),
          }),
          breadcrumbLd(migas),
        )}
      />
      <div className="mx-auto max-w-6xl px-4">
        <Breadcrumbs items={migas} />
      </div>

      <EntityHero
        eyebrow="Marca"
        title={info?.name || brand.name}
        logoUrl={info?.logoUrl}
        emoji="💻"
        description={
          info?.introMd ? (
            <Markdown>{info.introMd}</Markdown>
          ) : (
            <>
              Compará todas las notebooks {brand.name} a la venta en Argentina. Te mostramos el mejor
              precio de cada modelo entre todas las tiendas, con historial para saber si la oferta es
              real.
            </>
          )
        }
        stats={[
          { label: brand.count === 1 ? "modelo" : "modelos", value: String(brand.count) },
          ...(Number.isFinite(minPrice) ? [{ label: "desde", value: fmtARS(minPrice) }] : []),
          ...(dedicated ? [{ label: "con GPU dedicada", value: String(dedicated) }] : []),
        ]}
      >
        <Link
          href={`/notebooks?brand=${brand.slug}`}
          className="text-[13px] font-semibold text-brand-blue hover:underline"
        >
          Ver con todos los filtros →
        </Link>
      </EntityHero>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <nav className="mb-4 text-[13px] text-slate-400">
          <Link href="/" className="hover:text-brand-blue">Inicio</Link>
          {" / "}
          <Link href="/marcas" className="hover:text-brand-blue">Marcas</Link>
          {" / "}
          <b className="text-slate-600">{brand.name}</b>
        </nav>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {models.map((m) => (
            <ModelCard key={m.id} model={m} />
          ))}
        </div>
      </div>
    </>
  );
}
