import type { Metadata } from "next";
import Link from "next/link";
import { getDeals, getModels, getStores, countListings, getBrands } from "@/lib/data";
import ModelCard from "@/components/ModelCard";
import HeroSearch from "@/components/HeroSearch";
import RecentlyViewed from "@/components/RecentlyViewed";
import { GUIAS } from "@/content/guias";
import { metaRuta } from "@/lib/seo";
import { DESCRIPCION_SITIO } from "@/lib/site";

/**
 * Los cinco casos de uso ahora llevan a su **guía** y no a `/notebooks?use=…`.
 *
 * Dos razones. La de producto: el listado filtrado le devuelve una grilla a alguien que
 * todavía no sabe qué mirar, que es exactamente el que hizo click acá. La de SEO: el
 * listado filtrado es `noindex` (ver `notebooks/page.tsx`), así que estos cinco links —de
 * los más prominentes de la home— apuntaban a páginas que le pedimos a Google que ignore.
 *
 * Los slugs son los de `content/guias.ts`. La lista se deriva de ahí para que no puedan
 * quedar desincronizadas.
 */
const USE_CASES = GUIAS.map((g) => ({
  slug: g.slug,
  icon: g.icono,
  title: g.titulo.replace(/^Qué notebook conviene para /, "").replace(/^\w/, (c) => c.toUpperCase()),
  desc: g.resumen,
}));

/**
 * La home es la única página cuyo canonical es `/` y no la URL con la que se llegó. Sin
 * esto, `notebooks.com.ar/?utm_source=instagram` entraba al índice como una página propia
 * que compite con la home por su mismo contenido.
 */
export const metadata: Metadata = metaRuta("/", { description: DESCRIPCION_SITIO });

export const dynamic = "force-dynamic";

export default async function Home() {
  const [allDeals, allModels, stores, listingsCount, brands] = await Promise.all([
    getDeals(),
    getModels(),
    getStores(),
    countListings(),
    getBrands(),
  ]);
  const deals = allDeals.slice(0, 4);
  const popular = allModels.filter((m) => m.listings.length > 0).slice(0, 4);
  const stats = {
    models: allModels.length,
    stores: stores.length,
    listings: listingsCount,
  };

  return (
    <>
      {/* Hero sobre navy, estilo Córdoba Notebooks */}
      <section className="bg-brand-navy text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-[40px] md:leading-tight">
            El precio real de cada notebook,
            <br />
            en <em className="not-italic text-brand-cyan">todas</em> las tiendas de Argentina
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-300">
            Comparamos el mismo modelo en {stats.stores} tiendas y te mostramos
            si la oferta es real, con historial de precios.
          </p>
          <HeroSearch />
          <div className="mt-7 flex flex-wrap justify-center gap-x-7 gap-y-2 text-[13px] text-slate-300">
            <span><b className="text-white">{stats.models}</b> modelos indexados</span>
            <span><b className="text-white">{stats.stores}</b> tiendas monitoreadas</span>
            <span><b className="text-white">{stats.listings}</b> ofertas comparadas</span>
            <span className="text-brand-cyan font-semibold">100% gratis, sin registro</span>
          </div>
        </div>
      </section>

      {/* Ofertas del día */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="text-xl font-extrabold tracking-tight">🔥 Bajaron de precio</h2>
          <Link href="/ofertas" className="text-sm font-semibold text-brand-blue hover:underline">
            Ver todas las ofertas →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {deals.map((m) => (
            <ModelCard key={m.id} model={m} />
          ))}
        </div>
      </section>

      {/* Vistos recientemente (client, solo si hay historial) */}
      <RecentlyViewed />

      {/* Por tipo de uso */}
      <section className="mx-auto max-w-6xl px-4 py-6">
        <h2 className="mb-5 text-xl font-extrabold tracking-tight">
          ¿Para qué la vas a usar?
        </h2>
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-5">
          {USE_CASES.map((u) => (
            <Link
              key={u.slug}
              href={`/guias/${u.slug}`}
              className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:border-brand-blue hover:shadow-lg"
            >
              <div className="text-2xl">{u.icon}</div>
              <div className="mt-1.5 text-sm font-bold">{u.title}</div>
              <div className="mt-0.5 text-xs leading-snug text-slate-500">{u.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="mt-8 border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
          {[
            {
              n: "1",
              t: "Indexamos todas las tiendas",
              d: `Relevamos los catálogos de ${stores.length} tiendas argentinas varias veces por día y agrupamos las publicaciones del mismo modelo en una sola ficha.`,
            },
            {
              n: "2",
              t: "Verificamos cada oferta",
              d: "Guardamos el historial de precios de cada modelo. Si una “oferta” estuvo más barata hace un mes, te lo mostramos.",
            },
            {
              n: "3",
              t: "Comprás directo en la tienda",
              d: "No vendemos nada: te llevamos con un clic a la tienda con el mejor precio. Sin comisiones ocultas para vos.",
            },
          ].map((s) => (
            <div key={s.n}>
              <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 font-extrabold text-brand-blue">
                {s.n}
              </div>
              <h3 className="text-[15px] font-bold">{s.t}</h3>
              <p className="mt-1 text-[13px] text-slate-500">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Populares + marcas */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="text-xl font-extrabold tracking-tight">
            Los más comparados esta semana
          </h2>
          <Link href="/notebooks" className="text-sm font-semibold text-brand-blue hover:underline">
            Ver todos →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {popular.map((m) => (
            <ModelCard key={m.id} model={m} />
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          {brands.map((b) => (
            <Link
              key={b.slug}
              href={`/marcas/${b.slug}`}
              className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-600 transition hover:border-brand-blue hover:text-brand-blue"
            >
              {b.name}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
