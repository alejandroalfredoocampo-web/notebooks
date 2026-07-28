import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getModelBySlug, getModels, getHistory } from "@/lib/data";
import { fmtARS, fmtDateTime } from "@/lib/format";
import SpecChips from "@/components/SpecChips";
import PriceChart from "@/components/PriceChart";
import PriceAlertForm from "@/components/PriceAlertForm";
import UseRecommendation from "@/components/UseRecommendation";
import ModelImage from "@/components/ModelImage";

interface Params {
  brand: string;
  slug: string;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const model = await getModelBySlug(params.brand, params.slug);
  if (!model) return {};
  return {
    title: `${model.brand} ${model.name} — precio en ${model.listings.length} tiendas`,
    description: `Mejor precio del ${model.brand} ${model.name} (${model.cpu}, ${model.ramGb} GB RAM, ${model.storageGb} GB SSD): ${fmtARS(model.bestPrice)}. Compará ${model.listings.length} ofertas con historial de precios.`,
  };
}

export default async function ModelPage({ params }: { params: Params }) {
  const model = await getModelBySlug(params.brand, params.slug);
  if (!model) notFound();

  const [history, allModels] = await Promise.all([getHistory(model.id), getModels()]);
  const similar = allModels
    .filter((m) => m.id !== model.id && m.gpuType === model.gpuType)
    .slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${model.brand} ${model.name}`,
    brand: { "@type": "Brand", name: model.brand },
    sku: model.partNumber,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "ARS",
      lowPrice: model.bestPrice,
      highPrice: Math.max(...model.listings.map((l) => l.priceCash)),
      offerCount: model.listings.length,
    },
  };

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="pt-5 text-[13px] text-slate-400">
        <Link href="/" className="hover:text-brand-blue">Inicio</Link>
        {" / "}
        <Link href="/notebooks" className="hover:text-brand-blue">Notebooks</Link>
        {" / "}
        <Link href={`/notebooks?brand=${model.brandSlug}`} className="hover:text-brand-blue">
          {model.brand}
        </Link>
        {" / "}
        <b className="text-slate-600">{model.name}</b>
      </nav>

      <div className="grid gap-8 py-5 md:grid-cols-[1fr_1.4fr]">
        {/* Columna izquierda: imagen + specs */}
        <div>
          <div className="flex h-72 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white text-8xl shadow-sm">
            <ModelImage
              src={model.imageUrl}
              alt={`${model.brand} ${model.name}`}
              emoji={model.gpuType === "dedicada" ? "🎮" : model.os === "macOS" ? "🍎" : "💻"}
              className="h-full w-full p-4"
              sizes="400px"
            />
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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
        </div>

        {/* Columna derecha: precios */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            {model.brand}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-[27px]">
            {model.name}
          </h1>
          <div className="mb-3 mt-1.5">
            <SpecChips model={model} />
          </div>

          <div className="mb-3.5 rounded-xl border-2 border-brand-green bg-white p-4 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-widest text-brand-green">
              Mejor precio hoy
            </div>
            <div className="text-3xl font-extrabold tracking-tight">
              {fmtARS(model.bestPrice)}
            </div>
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
                Mínimo histórico: {fmtARS(model.minHistoric)}
              </span>
            )}
          </div>

          {/* Mobile: cards apiladas (el CTA "Ir a la tienda" queda siempre visible) */}
          <div className="flex flex-col gap-3 md:hidden">
            {model.listings.map((l) => {
              const isBest = l.id === model.bestListing?.id;
              const free =
                l.installments &&
                l.installments.count * l.installments.amount <= l.priceCash * 1.02;
              return (
                <div
                  key={l.id}
                  className={`rounded-xl border p-4 shadow-sm ${
                    isBest ? "border-brand-green bg-emerald-50/50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold">{l.store.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {l.store.type}
                        {l.store.physicalStore ? " · local físico" : ""}
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
                    {l.installments && (
                      <span className="text-xs text-slate-500">
                        {l.installments.count}x {fmtARS(l.installments.amount)}
                        {free ? <b className="text-brand-green"> sin interés</b> : null}
                      </span>
                    )}
                  </div>
                  <a
                    href={`/salir/${l.id}`}
                    rel="nofollow sponsored"
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
                        {l.store.name}
                        <span className="block text-[11px] font-normal text-slate-400">
                          {l.store.type}
                          {l.store.physicalStore ? " · local físico" : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-base font-extrabold tracking-tight">
                        {fmtARS(l.priceCash)}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {l.installments ? (
                          <>
                            {l.installments.count}x {fmtARS(l.installments.amount)}
                            {l.installments.count * l.installments.amount <=
                            l.priceCash * 1.02 ? (
                              <span className="mt-0.5 block font-semibold text-brand-green">
                                sin interés
                              </span>
                            ) : null}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-semibold ${l.inStock ? "text-brand-green" : "text-red-600"}`}>
                          {l.inStock ? "● En stock" : "○ Sin stock"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <a
                          href={`/salir/${l.id}`}
                          rel="nofollow sponsored"
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
        </div>
      </div>

      <div className="pb-6">
        <UseRecommendation model={model} />
      </div>

      <div className="grid gap-6 pb-6 md:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-extrabold">Historial de precios (90 días)</h2>
          <PriceChart points={history} avg90={model.avg90} />
        </div>
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
