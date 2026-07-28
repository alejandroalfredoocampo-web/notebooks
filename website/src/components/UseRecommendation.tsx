import type { NotebookModel } from "@/lib/types";
import { recommendUse } from "@/lib/useRecommendation";

export default function UseRecommendation({ model }: { model: NotebookModel }) {
  const rec = recommendUse(model);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl">
          {rec.icon}
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-brand-blue">
            ¿Para qué te sirve esta notebook?
          </div>
          <h2 className="mt-0.5 text-lg font-extrabold tracking-tight md:text-xl">
            {rec.headline}
          </h2>
        </div>
      </div>

      {/* Chips de nivel de cada componente */}
      <div className="mt-4 flex flex-wrap gap-2">
        {rec.tiers.map((t) => (
          <span
            key={t.label}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600"
          >
            {t.label}: <b className="text-slate-800">{t.value}</b>
          </span>
        ))}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-600">{rec.summary}</p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-[13px] font-bold text-slate-800">
            Rinde bien para
          </h3>
          <ul className="flex flex-col gap-1.5">
            {rec.goodFor.map((g) => (
              <li key={g} className="flex items-start gap-2 text-[13px] text-slate-600">
                <span className="mt-0.5 font-bold text-brand-green">✓</span>
                {g}
              </li>
            ))}
          </ul>
        </div>
        {rec.notIdeal.length > 0 && (
          <div>
            <h3 className="mb-2 text-[13px] font-bold text-slate-800">
              No es la más indicada para
            </h3>
            <ul className="flex flex-col gap-1.5">
              {rec.notIdeal.map((n) => (
                <li key={n} className="flex items-start gap-2 text-[13px] text-slate-500">
                  <span className="mt-0.5 font-bold text-slate-400">–</span>
                  {n}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className="mt-5 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
        Recomendación automática según las specs del equipo (procesador, placa
        de video y memoria). Es orientativa.
      </p>
    </section>
  );
}
