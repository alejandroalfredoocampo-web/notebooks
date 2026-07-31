"use client";

import { useEffect, useState } from "react";

/**
 * Muestra el equivalente aproximado en USD (dólar blue) de un precio en ARS.
 * Comparte una sola llamada a /api/usd entre todas las instancias. Si no hay
 * cotización, no renderiza nada (degrada con gracia).
 */
let ratePromise: Promise<number | null> | null = null;
function getRate(): Promise<number | null> {
  if (!ratePromise) {
    ratePromise = fetch("/api/usd")
      .then((r) => r.json())
      .then((d) => (d?.rate as number) ?? null)
      .catch(() => null);
  }
  return ratePromise;
}

export default function UsdHint({ ars, className = "" }: { ars: number; className?: string }) {
  const [rate, setRate] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    getRate().then((r) => alive && setRate(r));
    return () => {
      alive = false;
    };
  }, []);
  if (!rate || !ars) return null;
  const usd = Math.round(ars / rate);
  return <span className={className}>≈ US$&nbsp;{usd.toLocaleString("es-AR")}</span>;
}
