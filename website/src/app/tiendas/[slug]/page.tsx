import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStoreBySlug, getStoreListings } from "@/lib/data";
import { fmtARS } from "@/lib/format";
import StoreRating from "@/components/StoreRating";
import StoreTierBadge from "@/components/StoreTierBadge";
import EntityHero from "@/components/EntityHero";
import ModelImage from "@/components/ModelImage";
import JsonLd from "@/components/JsonLd";
import Breadcrumbs, { type Miga } from "@/components/Breadcrumbs";
import { metaRuta, recortar } from "@/lib/seo";
import { breadcrumbLd, coleccionLd, grafo, tiendaLd } from "@/lib/schema";

export const dynamic = "force-dynamic";

interface Params {
  slug: string;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const store = await getStoreBySlug(params.slug);
  if (!store) return {};
  const title = `${store.name} — precios de notebooks`;
  const description =
    store.description ||
    `Notebooks a la venta en ${store.name}${store.city ? ` (${store.city})` : ""}. Compará sus precios con el resto de las tiendas de Argentina.`;
  return metaRuta(`/tiendas/${store.slug}`, { title, description: recortar(description, 300) });
}

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  mercadolibre: "MercadoLibre",
};

export default async function StoreProfilePage({ params }: { params: Params }) {
  const store = await getStoreBySlug(params.slug);
  if (!store) notFound();

  const offers = await getStoreListings(store.id);
  const inStock = offers.filter((o) => o.listing.inStock).length;
  const minPrice = offers.length ? Math.min(...offers.map((o) => o.listing.priceCash)) : 0;

  const migas: Miga[] = [
    { nombre: "Inicio", path: "/" },
    { nombre: "Tiendas", path: "/tiendas" },
    { nombre: store.name, path: `/tiendas/${store.slug}` },
  ];

  /**
   * El nodo de la tienda sale de `tiendaLd`, que es el **mismo** que emite cada ficha de
   * producto como `seller` de sus ofertas. Que compartan `@id` es lo que hace que para
   * Google sea una sola entidad: la tienda que vende en 40 fichas es la misma que tiene su
   * perfil acá, con su reputación y su dirección.
   *
   * Lo que había antes emitía `reviewCount: undefined` cuando la tienda no tenía la cantidad
   * de reseñas cargada. Un `aggregateRating` sin `reviewCount` es un error de validación:
   * Google descarta el bloque **entero**, así que también se perdía el resto. `tiendaLd`
   * omite el rating salvo que estén los dos datos.
   */
  const catalogo = coleccionLd({
    path: `/tiendas/${store.slug}`,
    nombre: `Notebooks en ${store.name}`,
    descripcion: store.description || undefined,
    items: offers.slice(0, 100).map((o) => ({
      nombre: `${o.model.brand} ${o.model.name}`,
      path: `/notebooks/${o.model.brandSlug}/${o.model.slug}`,
    })),
  });

  return (
    <>
      <JsonLd data={grafo(tiendaLd(store), catalogo, breadcrumbLd(migas))} />
      <div className="mx-auto max-w-6xl px-4">
        <Breadcrumbs items={migas} />
      </div>

      <EntityHero
        eyebrow="Tienda"
        title={store.name}
        logoUrl={store.logoUrl}
        emoji="🏬"
        description={
          store.description || (
            <>
              Estas son las notebooks que {store.name} tiene publicadas. Comparamos sus precios con el
              resto de las tiendas de Argentina; comprás directo en su sitio.
            </>
          )
        }
        badges={
          <>
            <StoreTierBadge store={store} />
            <StoreRating store={store} size="md" />
          </>
        }
        stats={[
          { label: "modelos publicados", value: String(offers.length) },
          { label: "con stock", value: String(inStock) },
          ...(minPrice ? [{ label: "desde", value: fmtARS(minPrice) }] : []),
        ]}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate-500">
          {store.city && <span>📍 {store.city}</span>}
          <span>{store.physicalStore ? "🏬 Local físico" : "🛒 Tienda online"}</span>
          {store.shipsNationwide && <span>🚚 Envíos a todo el país</span>}
          {store.paymentMethods && <span>💳 {store.paymentMethods}</span>}
          <a
            href={store.url}
            target="_blank"
            rel="noopener nofollow"
            className="font-semibold text-brand-blue hover:underline"
          >
            Ir al sitio oficial →
          </a>
          {store.socials &&
            Object.entries(store.socials)
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <a
                  key={k}
                  href={v}
                  target="_blank"
                  rel="noopener nofollow"
                  className="text-slate-500 hover:text-brand-blue hover:underline"
                >
                  {SOCIAL_LABELS[k] ?? k}
                </a>
              ))}
        </div>
      </EntityHero>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {store.affiliate && (
          <p className="mb-4 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
            Podemos recibir una comisión si comprás a través de nuestros links. Nunca afecta el orden,
            que siempre es por precio.
          </p>
        )}

        <h2 className="mb-4 text-lg font-extrabold tracking-tight">
          Notebooks en {store.name}{" "}
          <span className="text-sm font-normal text-slate-400">({offers.length})</span>
        </h2>

        {offers.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map(({ model, listing }) => (
              <div
                key={listing.id}
                className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                  <ModelImage
                    src={model.imageUrl}
                    alt={`${model.brand} ${model.name}`}
                    emoji={model.gpuType === "dedicada" ? "🎮" : model.os === "macOS" ? "🍎" : "💻"}
                    className="h-full w-full p-1"
                    sizes="64px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/notebooks/${model.brandSlug}/${model.slug}`}
                    className="block text-[13px] font-bold leading-snug hover:text-brand-blue"
                  >
                    {model.brand} {model.name}
                  </Link>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    {model.cpu} · {model.ramGb} GB
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-base font-extrabold tracking-tight">
                      {fmtARS(listing.priceCash)}
                    </span>
                    <a
                      href={`/salir/${listing.id}`}
                      rel="nofollow sponsored"
                      className="rounded-lg border-[1.5px] border-brand-blue px-2.5 py-1 text-[11px] font-bold text-brand-blue hover:bg-blue-50"
                    >
                      Ir a la tienda
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            Todavía no tenemos publicaciones activas de esta tienda.
          </p>
        )}

        <div className="mt-6">
          <Link href="/tiendas" className="text-sm font-semibold text-brand-blue hover:underline">
            ← Ver todas las tiendas
          </Link>
        </div>
      </div>
    </>
  );
}
