import Link from "next/link";
import type { NotebookModel } from "@/lib/types";
import { chipHref, type ChipAxis } from "@/lib/specFilters";

/**
 * Chips de specs, formato adoptado de Córdoba Notebooks:
 * procesador / RAM / SSD / pantalla / GPU / OS
 *
 * Con `linkify`, cada chip que mapea a un eje de filtro se vuelve un link a
 * `/notebooks?<eje>=<token>` (ver `specFilters.ts`). En las cards NO se linkifica
 * (la card entera ya es un <Link> y anidar links es inválido); sí en la ficha.
 */
type Chip = { label: string; axis: ChipAxis | null };

export default function SpecChips({
  model,
  compact = false,
  linkify = false,
}: {
  model: NotebookModel;
  compact?: boolean;
  linkify?: boolean;
}) {
  const chips: Chip[] = compact
    ? [
        { label: model.cpu.replace("Intel Core ", "").replace("AMD ", ""), axis: "cpu" },
        { label: `${model.ramGb} GB`, axis: "ram" },
        { label: `${model.storageGb >= 1000 ? "1 TB" : model.storageGb + " GB"} SSD`, axis: "storage" },
        { label: `${model.screenSizeIn}"`, axis: "screen" },
      ]
    : [
        { label: model.cpu, axis: "cpu" },
        { label: `${model.ramGb} GB ${model.ramType}`, axis: "ram" },
        {
          label: `${model.storageGb >= 1000 ? "1 TB" : model.storageGb + " GB"} ${model.storageType}`,
          axis: "storage",
        },
        { label: `${model.screenSizeIn}" ${model.screenPanel}`, axis: "screen" },
        { label: model.gpu, axis: "gpu" },
        { label: model.os, axis: null },
      ];

  const sizing = compact ? "px-1.5 py-0 text-[10px]" : "px-2.5 py-0.5 text-xs";
  const base = `rounded-full border border-brand-sky bg-blue-50 font-medium text-brand-deep ${sizing}`;

  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((c) => {
        const href = linkify && c.axis ? chipHref(model, c.axis) : null;
        if (href) {
          return (
            <Link
              key={c.label}
              href={href}
              scroll={false}
              className={`${base} transition hover:border-brand-blue hover:bg-blue-100`}
              title={`Ver todas con ${c.label}`}
            >
              {c.label}
            </Link>
          );
        }
        return (
          <span key={c.label} className={base}>
            {c.label}
          </span>
        );
      })}
    </div>
  );
}
