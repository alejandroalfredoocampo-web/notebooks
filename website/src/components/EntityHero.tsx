import type { ReactNode } from "react";

/**
 * Hero editorial reutilizable para landings de entidad (marca / tienda).
 * Logo o emoji + eyebrow + título + badges + descripción + fila de stats + extras.
 */
export default function EntityHero({
  eyebrow,
  title,
  logoUrl,
  emoji = "🏷️",
  description,
  badges,
  stats,
  children,
}: {
  eyebrow?: string;
  title: string;
  logoUrl?: string;
  emoji?: string;
  description?: ReactNode;
  badges?: ReactNode;
  stats?: { label: string; value: string }[];
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white text-3xl shadow-sm">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={title} className="h-full w-full object-contain p-1.5" />
            ) : (
              <span aria-hidden>{emoji}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                {eyebrow}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>
              {badges}
            </div>
            {description && (
              <div className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-600">
                {description}
              </div>
            )}
            {children && <div className="mt-3">{children}</div>}
          </div>
        </div>

        {stats && stats.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            {stats.map((s) => (
              <div key={s.label}>
                <span className="font-extrabold text-slate-900">{s.value}</span>{" "}
                <span className="text-slate-500">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
