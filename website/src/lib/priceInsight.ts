import type { PricePoint } from "./types";

export interface PriceInsight {
  level: "min" | "good" | "normal" | "high";
  headline: string;
  detail: string;
  vsAvgPct: number; // signo: negativo = por debajo del promedio (mejor)
  min: number;
  avg: number;
  max: number;
  drops: number;
  position: number; // 0..1 dónde cae el precio actual entre mín y máx
}

/**
 * "Termómetro de precio": convierte el historial en un veredicto accionable
 * (¿es buen momento para comprar?). Devuelve null si no hay historial suficiente.
 */
export function priceInsight(bestPrice: number, history: PricePoint[]): PriceInsight | null {
  if (!bestPrice || history.length < 2) return null;

  const prices = history.map((p) => p.bestPrice);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
  const vsAvgPct = Math.round(((bestPrice - avg) / avg) * 100);

  let drops = 0;
  for (let i = 1; i < prices.length; i++) if (prices[i] < prices[i - 1]) drops++;

  const isAtMin = bestPrice <= min * 1.005;
  const level: PriceInsight["level"] =
    isAtMin ? "min" : vsAvgPct <= -5 ? "good" : vsAvgPct < 5 ? "normal" : "high";

  const headline =
    level === "min" ? "Mínimo histórico" :
    level === "good" ? "Buen momento para comprar" :
    level === "normal" ? "Precio en su valor habitual" :
    "Está caro";

  const detailBase =
    level === "min" ? "Es el precio más bajo que registramos." :
    level === "good" ? `Está ${Math.abs(vsAvgPct)}% por debajo del promedio de los últimos 90 días.` :
    level === "normal" ? "En línea con el promedio de los últimos 90 días." :
    `Está ${vsAvgPct}% por encima del promedio; suele conseguirse más barato.`;

  const detail = drops > 0
    ? `${detailBase} Bajó ${drops} ${drops === 1 ? "vez" : "veces"} en el período.`
    : detailBase;

  const position = max > min ? Math.min(1, Math.max(0, (bestPrice - min) / (max - min))) : 0;

  return { level, headline, detail, vsAvgPct, min, avg, max, drops, position };
}
