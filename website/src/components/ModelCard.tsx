import Link from "next/link";
import type { ModelWithOffers } from "@/lib/types";
import { fmtARS } from "@/lib/format";
import SpecChips from "./SpecChips";
import ModelImage from "./ModelImage";
import UsdHint from "./UsdHint";

export default function ModelCard({ model }: { model: ModelWithOffers }) {
  const href = `/notebooks/${model.brandSlug}/${model.slug}`;
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative mb-3 flex h-28 items-center justify-center overflow-hidden rounded-lg bg-white text-5xl">
        <ModelImage
          src={model.imageUrl}
          alt={`${model.brand} ${model.name}`}
          emoji={model.gpuType === "dedicada" ? "🎮" : model.os === "macOS" ? "🍎" : "💻"}
          className="h-full w-full p-2"
          sizes="(max-width: 1024px) 50vw, 300px"
        />
        {model.isRealDeal && (
          <>
            <span className="absolute left-2 top-2 rounded-full bg-brand-green px-2 py-0.5 text-[11px] font-bold text-white">
              -{model.dropPct}%
            </span>
            <span className="absolute right-2 top-2 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              ✓ oferta real
            </span>
          </>
        )}
      </div>
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {model.brand}
      </div>
      <div className="mb-1 min-h-[2.4rem] text-sm font-bold leading-snug group-hover:text-brand-blue">
        {model.name}
      </div>
      <SpecChips model={model} compact />
      <div className="mt-auto pt-3">
        <div className="text-[11px] text-slate-400">
          Mejor precio en {model.listings.length}{" "}
          {model.listings.length === 1 ? "tienda" : "tiendas"}
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span
            className={`text-lg font-extrabold tracking-tight ${
              model.isRealDeal ? "text-brand-green" : "text-slate-900"
            }`}
          >
            {fmtARS(model.bestPrice)}
          </span>
          {model.isRealDeal && model.avg90 && (
            <span className="text-xs text-slate-400 line-through">
              {fmtARS(model.avg90)}
            </span>
          )}
        </div>
        {model.bestPrice > 0 && <UsdHint ars={model.bestPrice} className="text-[11px] text-slate-400" />}
        {model.bestInstallment && (
          <div className="mt-0.5 text-[11px]">
            {model.bestInstallment.interestFree ? (
              <span className="font-semibold text-brand-green">
                {model.bestInstallment.count}x sin interés
              </span>
            ) : (
              <span className="text-slate-400">
                hasta {model.maxInstallments} cuotas
              </span>
            )}
          </div>
        )}
        <div className="mt-1 text-xs font-semibold text-brand-blue">
          Comparar {model.listings.length}{" "}
          {model.listings.length === 1 ? "oferta" : "ofertas"} →
        </div>
      </div>
    </Link>
  );
}
