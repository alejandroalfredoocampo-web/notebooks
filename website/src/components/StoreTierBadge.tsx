import type { Store } from "@/lib/types";

/**
 * Insignia según el tier de la tienda (spec 10).
 * free → sin badge · verified → "✓ Verificada" · featured → "★ Verificada+".
 * El tier featured es comercial (destacado); no altera el orden por precio.
 */
export default function StoreTierBadge({ store, className = "" }: { store: Store; className?: string }) {
  // Robusto pre/post migración 0011: si tier todavía no existe (o quedó 'free' pero
  // la tienda ya era verified), caemos al flag verified.
  const tier =
    store.tier && store.tier !== "free" ? store.tier : store.verified ? "verified" : "free";
  if (tier === "featured") {
    return (
      <span className={`rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ${className}`}>
        ★ Verificada+
      </span>
    );
  }
  if (tier === "verified") {
    return (
      <span className={`rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ${className}`}>
        ✓ Verificada
      </span>
    );
  }
  return null;
}
