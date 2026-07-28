import type { PricePoint } from "@/lib/types";
import { fmtARS } from "@/lib/format";

/**
 * Gráfico de historial de precios renderizado server-side como SVG.
 * Sin dependencias de cliente.
 */
export default function PriceChart({
  points,
  avg90,
}: {
  points: PricePoint[];
  avg90: number | null;
}) {
  if (points.length < 2) {
    return (
      <p className="text-sm text-slate-500">
        Todavía no hay suficiente historial para este modelo.
      </p>
    );
  }

  const W = 560;
  const H = 200;
  const P = 40;
  const prices = points.map((p) => p.bestPrice);
  const min = Math.min(...prices) * 0.99;
  const max = Math.max(...prices) * 1.01;
  const x = (i: number) => P + ((W - 2 * P) * i) / (points.length - 1);
  const y = (v: number) => H - P - ((H - 2 * P) * (v - min)) / (max - min);

  const line = points
    .map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.bestPrice).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H - P} L${x(0).toFixed(1)},${H - P} Z`;
  const last = points[points.length - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Historial de precios">
        {avg90 && (
          <>
            <line
              x1={P} y1={y(avg90)} x2={W - P} y2={y(avg90)}
              stroke="#cbd5e1" strokeDasharray="5 4" strokeWidth="1.5"
            />
            <text x={P} y={y(avg90) - 7} fontSize="10" fill="#94a3b8">
              promedio 90 días
            </text>
          </>
        )}
        <path d={area} fill="#336EFA" opacity="0.08" />
        <path d={line} fill="none" stroke="#336EFA" strokeWidth="2.5" strokeLinecap="round" />
        <circle
          cx={x(points.length - 1)} cy={y(last.bestPrice)} r="5"
          fill="#336EFA" stroke="#fff" strokeWidth="2"
        />
        <text
          x={W - P} y={y(last.bestPrice) - 12} textAnchor="end"
          fontSize="12" fontWeight="700" fill="#046BD2"
        >
          {fmtARS(last.bestPrice)}
        </text>
        <text x={P} y={H - 12} fontSize="10" fill="#94a3b8">
          {new Date(points[0].date).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
        </text>
        <text x={W - P} y={H - 12} textAnchor="end" fontSize="10" fill="#94a3b8">
          hoy
        </text>
      </svg>
      <div className="mt-2 flex gap-5 text-xs text-slate-500">
        <span>
          <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-brand-blue align-[-1px]" />
          Mejor precio del mercado
        </span>
        <span>
          <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-slate-300 align-[-1px]" />
          Promedio 90 días
        </span>
      </div>
    </div>
  );
}
