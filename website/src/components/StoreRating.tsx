import type { Store } from "@/lib/types";

/**
 * Resumen de reputación de una tienda (rating de Google). Se renderiza solo si hay
 * dato real; nunca inventa. Fuente atribuida a Google (spec 04).
 */
export default function StoreRating({
  store,
  size = "sm",
}: {
  store: Store;
  size?: "sm" | "md";
}) {
  const rating = store.googleRating;
  if (rating == null || rating <= 0) return null;

  const full = Math.round(rating); // estrellas llenas (redondeo simple)
  const stars = "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full);
  const count = store.googleReviewsCount;
  const text = size === "md" ? "text-sm" : "text-[11px]";

  const inner = (
    <span className={`inline-flex items-center gap-1 ${text} text-slate-500`}>
      <span className="text-amber-500" aria-hidden>
        {stars}
      </span>
      <span className="font-semibold text-slate-700">{rating.toFixed(1).replace(".", ",")}</span>
      {count != null && count > 0 && <span className="text-slate-400">({count.toLocaleString("es-AR")})</span>}
    </span>
  );

  const label = `${rating.toFixed(1)} de 5 en Google${count ? `, ${count} reseñas` : ""}`;

  if (store.googleMapsUrl) {
    return (
      <a
        href={store.googleMapsUrl}
        target="_blank"
        rel="noopener nofollow"
        title="Ver reseñas en Google"
        aria-label={label}
        className="hover:underline"
      >
        {inner}
      </a>
    );
  }
  return (
    <span aria-label={label}>{inner}</span>
  );
}
