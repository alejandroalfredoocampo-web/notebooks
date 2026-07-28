import type { PriceInsight } from "@/lib/priceInsight";
import { fmtARS } from "@/lib/format";

const STYLES: Record<PriceInsight["level"], { icon: string; ring: string; text: string; bg: string }> = {
  min: { icon: "🟢", ring: "border-emerald-300", text: "text-emerald-700", bg: "bg-emerald-50" },
  good: { icon: "🟢", ring: "border-emerald-200", text: "text-emerald-700", bg: "bg-emerald-50" },
  normal: { icon: "🟡", ring: "border-amber-200", text: "text-amber-700", bg: "bg-amber-50" },
  high: { icon: "🔴", ring: "border-red-200", text: "text-red-700", bg: "bg-red-50" },
};

export default function PriceThermometer({ insight }: { insight: PriceInsight }) {
  const s = STYLES[insight.level];
  const pct = Math.round(insight.position * 100);

  return (
    <div className={`rounded-xl border ${s.ring} ${s.bg} p-4`}>
      <div className="flex items-center gap-2">
        <span>{s.icon}</span>
        <span className={`text-sm font-extrabold ${s.text}`}>{insight.headline}</span>
      </div>
      <p className="mt-1 text-[13px] text-slate-600">{insight.detail}</p>

      {/* Barra mín → máx con el marcador del precio actual */}
      <div className="mt-3">
        <div className="relative h-2 rounded-full bg-gradient-to-r from-emerald-400 via-amber-300 to-red-400">
          <div
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-800 shadow"
            style={{ left: `${pct}%` }}
            aria-label="Precio actual"
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-slate-400">
          <span>Mín {fmtARS(insight.min)}</span>
          <span>Prom {fmtARS(insight.avg)}</span>
          <span>Máx {fmtARS(insight.max)}</span>
        </div>
      </div>
    </div>
  );
}
