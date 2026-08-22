import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getModelBySlug, getModels, getHistory } from "@/lib/data";
import { fmtARS, fmtDateTime, daysAgo } from "@/lib/format";
import SpecChips from "@/components/SpecChips";
import PriceChart from "@/components/PriceChart";
import PriceAlertForm from "@/components/PriceAlertForm";
import NotifyAvailabilityForm from "@/components/NotifyAvailabilityForm";
import UseRecommendation from "@/components/UseRecommendation";
import ModelImage from "@/components/ModelImage";
import PriceThermometer from "@/components/PriceThermometer";
import ShareButton from "@/components/ShareButton";
import StoreRating from "@/components/StoreRating";
import StoreTierBadge from "@/components/StoreTierBadge";
import FavoriteButton from "@/components/FavoriteButton";
import UsdHint from "@/components/UsdHint";
import TrackView from "@/components/TrackView";
import { priceInsight } from "@/lib/priceInsight";
import JsonLd from "@/components/JsonLd";
import Breadcrumbs, { type Miga } from "@/components/Breadcrumbs";
import { metaRuta, recortar } from "@/lib/seo";
import { breadcrumbLd, grafo, productoLd, tiendaLd } from "@/lib/schema";
import BarraMejorPrecio from "@/components/BarraMejorPrecio";

interface Params {
  brand: string;
  slug: string;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const model = await getModelBySlug(params.brand, params.slug);
  if (!model) return {};
  const title = `${model.brand} ${model.name} — precio en ${model.listings.length} tiendas`;
  const description = `Mejor precio del ${model.brand} ${model.name} (${model.cpu}, ${model.ramGb} GB RAM, ${model.storageGb} GB SSD): ${fmtARS(model.bestPrice)}. Compará ${model.listings.length} ofertas con historial de precios.`;
  const canonical = `/notebooks/${model.brandSlug}/${model.slug}`;
  return metaRuta(canonical, {
    title,
    // `recortar` corta en el último espacio. Antes esta description podía salir partida a
    // mitad de palabra cuando el nombre del modelo era largo, y un snippet que termina en
    // "con placa de vid" no es un resumen, es un error visible en el resultado de Google.
    description: recortar(description, 300),
    openGraph: {
      title,
      description: recortar(description, 200),
      type: "website",
      // La foto del equipo cuando la hay; si no, la portada del sitio (la que arma
      // `metaRuta`), que es mejor que compartir un link sin imagen.
      ...(model.imageUrl ? { images: [{ url: model.imageUrl }] } : {}),
    },
    twitter: {
      card: model.imageUrl ? "summary_large_image" : "summary",
      title,
      description: recortar(description, 200),
      images: model.imageUrl ? [model.imageUrl] : undefined,
    },
  });
}

export default async function ModelPage({ params }: { params: Params }) {
  const model = await getModelBySlug(params.brand, params.slug);
  if (!model) notFound();

  const hasOffers = model.listings.length > 0; // modo "próximamente" si no hay ofertas (spec 06)
  const [history, allModels] = await Promise.all([getHistory(model.id), getModels()]);
  const insight = priceInsight(model.bestPrice, history);
  const similar = allModels
    .filter((m) => m.id !== model.id && m.gpuType === model.gpuType && m.listings.length > 0)
    .slice(0, 3);

  // Radar de financiación: costo real en cuotas por oferta + cuál conviene financiada
  const financing = (l: (typeof model.listings)[number]) => {
    if (!l.installments) return null;
    const total = l.installments.count * l.installments.amount;
    return {
      total,
      free: total <= l.priceCash * 1.02,
      surchargePct: Math.max(0, Math.round((total / l.priceCash - 1) * 100)),
    };
  };
  const bestFinancedId = (() => {
    const withInst = model.listings.filter((l) => l.installments);
    if (!withInst.length) return null;
    const scored = withInst.map((l) => {
      const f = financing(l)!;
      return { id: l.id, free: f.free, count: l.installments!.count, total: f.total };
    });
    scored.sort((a, b) => Number(b.free) - Number(a.free) || (a.free ? b.count - a.count : a.total - b.total));
    return scored[0].id;
  })();

  const migas: Miga[] = [
    { nombre: "Inicio", path: "/" },
    { nombre: "Notebooks", path: "/notebooks" },
    { nombre: model.brand, path: `/marcas/${model.brandSlug}` },
    { nombre: model.name, path: `/notebooks/${model.brandSlug}/${model.slug}` },
  ];

  /**
   * El grafo de la ficha.
   *
   * Lo que había era un `Product` con `AggregateOffer` y nada más: declaraba que existe un
   * rango de precios y **no quién vende a cada uno**. Para un buscador eso es una página
   * con muchos números; para un asistente al que le preguntan "¿dónde está más barata?", no
   * hay respuesta.
   *
   * Ahora van tres cosas atadas por `@id`:
   *
   *  - el `Product`, con una `Offer` por publicación y su `seller`;
   *  - un nodo por cada **tienda** que la vende, que es a lo que apunta ese `seller` (sin
   *    esto la referencia queda colgada y Google descarta el bloque);
   *  - la miga de pan, que es lo que hace que el resultado muestre la ruta en vez de la URL.
   *
   * Las tiendas se deduplican: dos publicaciones de la misma tienda comparten el nodo.
   */
  const tiendasUnicas = new Map(model.listings.map((l) => [l.store.slug, l.store]));

  const specs: [string, string][] = [
    ["Procesador", model.cpu],
    ["Memoria RAM", `${model.ramGb} GB ${model.ramType}`],
    ["Almacenamiento", `${model.storageGb >= 1000 ? "1 TB" : model.storageGb + " GB"} ${model.storageType}`],
    ["Pantalla", `${model.screenSizeIn}" ${model.screenResolution} ${model.screenPanel} ${model.screenRefreshHz} Hz`],
    ["Placa de video", model.gpu],
    ["Sistema operativo", model.os],
    ["Peso", `${model.weightKg} kg`],
    ["Batería", `${model.batteryWh} Wh`],
    ["Part number", model.partNumber],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4">
      <TrackView modelId={model.id} />
      {/**
       * La barra fija de mobile con el mejor precio y el link a la tienda.
       *
       * Medido: sin ella, el primer "Ir a la tienda" está a 1.584px — casi dos pantallas
       * abajo del pliegue en un iPhone. Ver el docblock del componente.
       */}
      {model.bestListing && (
        <BarraMejorPrecio
          precio={model.bestPrice}
          tienda={model.bestListing.store.name}
          listingId={model.bestListing.id}
          cantidadTiendas={model.listings.length}
          cuotas={model.bestInstallment}
        />
      )}

      <JsonLd
        data={grafo(
          productoLd(model),
          ...[...tiendasUnicas.values()].map(tiendaLd),
          breadcrumbLd(migas),
        )}
      />
      <Breadcrumbs items={migas} />

      {/**
       * ## El orden en mobile, que estaba al revés
       *
       * En escritorio son dos columnas: a la izquierda imagen y specs, a la derecha nombre y
       * precios. En mobile eso se apila en el orden del HTML, así que lo primero que veía
       * alguien con un teléfono era **una foto de 288px y la tabla de especificaciones
       * completa**; el nombre del equipo y el precio quedaban abajo del pliegue. Medido: el
       * `<h1>` no entraba en la primera pantalla.
       *
       * Ahora los tres bloques son hijos directos de la grilla y se ordenan por separado:
       * en mobile van foto → nombre y precios → specs, que es el orden en el que alguien
       * decide. En escritorio se los vuelve a poner en su celda con `col-start` / `row-start`,
       * así la disposición de dos columnas queda igual que antes.
       */}
      <div className="grid gap-x-8 gap-y-6 py-5 md:grid-cols-[1fr_1.4fr]">
        {/* Foto — primera en las dos disposiciones */}
        <div className="order-1 flex h-56 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white text-8xl shadow-sm sm:h-72 md:order-none md:col-start-1 md:row-start-1">
          <ModelImage
            src={model.imageUrl}
            alt={`${model.brand} ${model.name}`}
            emoji={model.gpuType === "dedicada" ? "🎮" : model.os === "macOS" ? "🍎" : "💻"}
            className="h-full w-full p-4"
            sizes="(max-width: 767px) 100vw, 400px"
            // La imagen que domina la primera pantalla de la ficha: es la que mide el LCP.
            prioridad
          />
        </div>

        {/* Specs — última en mobile, debajo de la foto en escritorio */}
        <div className="order-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:order-none md:col-start-1 md:row-start-2">
          <h2 className="mb-3 font-extrabold">Especificaciones</h2>
          <table className="w-full table-fixed text-[13px]">
            <tbody>
              {specs.map(([k, v]) => (
                <tr key={k} className="border-b border-slate-100 last:border-0">
                  <td className="w-[42%] py-2 pr-2 align-top text-slate-500">{k}</td>
                  <td className="py-2 font-semibold [overflow-wrap:anywhere]">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Nombre, precios y ofertas — segunda en mobile, columna derecha en escritorio */}
        <div className="order-2 md:order-none md:col-start-2 md:row-start-1 md:row-span-2">
          <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            {model.brand}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-[27px]">
            {model.name}
          </h1>
          <div className="mb-3 mt-1.5">
            <SpecChips model={model} linkify />
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link
              href={`/comparar?ids=${model.id}`}
              className="text-[13px] font-semibold text-brand-blue hover:underline"
            >
              ⚖️ Comparar con otras notebooks
            </Link>
            <ShareButton
              title={`${model.brand} ${model.name}`}
              text={`${model.brand} ${model.name} desde ${fmtARS(model.bestPrice)} — comparado en ${model.listings.length} tiendas`}
            />
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-500">
              <FavoriteButton modelId={model.id} size="sm" /> Guardar
            </span>
          </div>

          {hasOffers ? (
          <>
          <div className="mb-3.5 rounded-xl border-2 border-brand-green bg-white p-4 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-widest text-brand-green">
              Mejor precio hoy
            </div>
            <div className="text-3xl font-extrabold tracking-tight">
              {fmtARS(model.bestPrice)}
            </div>
            <UsdHint ars={model.bestPrice} className="text-[13px] text-slate-500" />
            {model.bestListing && (
              <div className="text-[13px] text-slate-500">
                en <b className="text-slate-800">{model.bestListing.store.name}</b> ·{" "}
                {model.listings.length} tiendas lo venden
              </div>
            )}
            {model.bestInstallment && (
              <div className="mt-1.5 text-[13px]">
                {model.bestInstallment.interestFree ? (
                  <span className="font-semibold text-brand-green">
                    o {model.bestInstallment.count} cuotas sin interés de{" "}
                    {fmtARS(model.bestInstallment.amount)}
                  </span>
                ) : (
                  <span className="text-slate-500">
                    hasta {model.maxInstallments} cuotas
                  </span>
                )}
              </div>
            )}
          </div>

          {insight ? (
            <div className="mb-4">
              <PriceThermometer insight={insight} />
            </div>
          ) : (
            <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold">
              {model.isRealDeal ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700">
                  ✓ {model.dropPct}% abajo del promedio de 90 días
                </span>
              ) : (
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-500">
                  Precio dentro del promedio de 90 días
                </span>
              )}
              {model.minHistoric && (
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-500">
                  Mínimo en 90 días: {fmtARS(model.minHistoric)}
                </span>
              )}
            </div>
          )}

          {/* Mobile: cards apiladas (el CTA "Ir a la tienda" queda siempre visible) */}
          <div className="flex flex-col gap-3 md:hidden">
            {model.listings.map((l) => {
              const isBest = l.id === model.bestListing?.id;
              const f = financing(l);
              return (
                <div
                  key={l.id}
                  className={`rounded-xl border p-4 shadow-sm ${
                    isBest ? "border-brand-green bg-emerald-50/50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold">
                        <Link href={`/tiendas/${l.store.slug}`} className="hover:text-brand-blue hover:underline">
                          {l.store.name}
                        </Link>
                        <StoreTierBadge store={l.store} className="ml-2 align-middle" />
                        {l.id === bestFinancedId && (
                          <span className="ml-2 align-middle rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-brand-blue">
                            ★ mejor en cuotas
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {l.store.type}
                        {l.store.physicalStore ? " · local físico" : ""}
                      </div>
                      <div className="mt-0.5">
                        <StoreRating store={l.store} />
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-semibold ${
                        l.inStock ? "text-brand-green" : "text-red-600"
                      }`}
                    >
                      {l.inStock ? "● En stock" : "○ Sin stock"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
                    <span className="text-xl font-extrabold tracking-tight">
                      {fmtARS(l.priceCash)}
                    </span>
                    {l.installments && f && (
                      <span className="text-xs text-slate-500">
                        {l.installments.count}x {fmtARS(l.installments.amount)}{" "}
                        {f.free ? (
                          <b className="text-brand-green">sin interés</b>
                        ) : (
                          <span className="text-slate-400">(total {fmtARS(f.total)} · +{f.surchargePct}%)</span>
                        )}
                      </span>
                    )}
                  </div>
                  {daysAgo(l.lastSeenAt) > 7 && (
                    <div className="mt-2 text-[11px] font-semibold text-amber-600">
                      ⚠ Precio desactualizado (hace {daysAgo(l.lastSeenAt)} días)
                    </div>
                  )}
                  <a
                    href={`/salir/${l.id}`}
                    rel="nofollow sponsored noopener noreferrer"
                    className={`mt-3 block rounded-lg px-4 py-2 text-center text-[13px] font-bold transition ${
                      isBest
                        ? "bg-brand-blue text-white hover:bg-brand-darker"
                        : "border-[1.5px] border-brand-blue text-brand-blue hover:bg-blue-50"
                    }`}
                  >
                    Ir a la tienda
                  </a>
                </div>
              );
            })}
          </div>

          {/* Desktop: tabla comparativa */}
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Tienda</th>
                  <th className="px-4 py-3">Contado</th>
                  <th className="px-4 py-3">Cuotas</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {model.listings.map((l) => {
                  const isBest = l.id === model.bestListing?.id;
                  return (
                    <tr
                      key={l.id}
                      className={`border-b border-slate-100 last:border-0 ${isBest ? "bg-emerald-50/60" : ""}`}
                    >
                      <td className="px-4 py-3.5 font-bold">
                        <Link href={`/tiendas/${l.store.slug}`} className="hover:text-brand-blue hover:underline">
                          {l.store.name}
                        </Link>
                        <StoreTierBadge store={l.store} className="ml-2 align-middle" />
                        {l.id === bestFinancedId && (
                          <span className="ml-2 align-middle rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-brand-blue">
                            ★ mejor en cuotas
                          </span>
                        )}
                        <span className="block text-[11px] font-normal text-slate-400">
                          {l.store.type}
                          {l.store.physicalStore ? " · local físico" : ""}
                        </span>
                        <span className="mt-0.5 block">
                          <StoreRating store={l.store} />
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-base font-extrabold tracking-tight">
                        {fmtARS(l.priceCash)}
                        {daysAgo(l.lastSeenAt) > 7 && (
                          <span
                            className="ml-1 align-middle text-[10px] font-semibold text-amber-600"
                            title={`Actualizado hace ${daysAgo(l.lastSeenAt)} días`}
                          >
                            ⚠
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {(() => {
                          const f = financing(l);
                          if (!l.installments || !f) return "—";
                          return (
                            <>
                              {l.installments.count}x {fmtARS(l.installments.amount)}
                              {f.free ? (
                                <span className="mt-0.5 block font-semibold text-brand-green">sin interés</span>
                              ) : (
                                <span className="mt-0.5 block text-slate-400">
                                  total {fmtARS(f.total)} · +{f.surchargePct}%
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-semibold ${l.inStock ? "text-brand-green" : "text-red-600"}`}>
                          {l.inStock ? "● En stock" : "○ Sin stock"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <a
                          href={`/salir/${l.id}`}
                          rel="nofollow sponsored noopener noreferrer"
                          className={`inline-block whitespace-nowrap rounded-lg px-4 py-2 text-[13px] font-bold transition ${
                            isBest
                              ? "bg-brand-blue text-white hover:bg-brand-darker"
                              : "border-[1.5px] border-brand-blue text-brand-blue hover:bg-blue-50"
                          }`}
                        >
                          Ir a la tienda
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mb-5 mt-2 text-xs text-slate-400">
            Precios actualizados{" "}
            {model.listings[0] ? fmtDateTime(model.listings[0].lastSeenAt) : "hoy"} ·
            Pueden variar en la tienda
          </p>

          <PriceAlertForm modelId={model.id} modelName={`${model.brand} ${model.name}`} />
          </>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-brand-sky bg-blue-50/50 p-6">
              <div className="text-lg font-extrabold">Todavía sin ofertas</div>
              <p className="mt-1 text-sm text-slate-600">
                Ninguna tienda publicó este modelo por ahora. Dejanos tu email y te avisamos
                apenas aparezca a la venta en alguna de las tiendas que comparamos.
              </p>
              <div className="mt-4">
                <NotifyAvailabilityForm
                  modelId={model.id}
                  modelName={`${model.brand} ${model.name}`}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="pb-6">
        <UseRecommendation model={model} />
      </div>

      <div className="grid gap-6 pb-6 md:grid-cols-[1.4fr_1fr]">
        {hasOffers && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-extrabold">Historial de precios (90 días)</h2>
            <PriceChart points={history} avg90={model.avg90} />
          </div>
        )}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-extrabold">Modelos similares</h2>
          <div className="flex flex-col gap-2.5">
            {similar.map((s) => (
              <Link
                key={s.id}
                href={`/notebooks/${s.brandSlug}/${s.slug}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-3 transition hover:border-brand-blue"
              >
                <div>
                  <div className="text-[13px] font-bold">
                    {s.brand} {s.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {s.cpu} · {s.ramGb} GB
                  </div>
                </div>
                <div className="text-sm font-extrabold">{fmtARS(s.bestPrice)}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
