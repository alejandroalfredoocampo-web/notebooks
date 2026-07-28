import type { NotebookModel } from "@/lib/types";

/**
 * Chips de specs, formato adoptado de Córdoba Notebooks:
 * procesador / RAM / SSD / pantalla / GPU / OS
 */
export default function SpecChips({
  model,
  compact = false,
}: {
  model: NotebookModel;
  compact?: boolean;
}) {
  const chips = compact
    ? [
        model.cpu.replace("Intel Core ", "").replace("AMD ", ""),
        `${model.ramGb} GB`,
        `${model.storageGb >= 1000 ? "1 TB" : model.storageGb + " GB"} SSD`,
        `${model.screenSizeIn}"`,
      ]
    : [
        model.cpu,
        `${model.ramGb} GB ${model.ramType}`,
        `${model.storageGb >= 1000 ? "1 TB" : model.storageGb + " GB"} ${model.storageType}`,
        `${model.screenSizeIn}" ${model.screenPanel}`,
        model.gpu,
        model.os,
      ];

  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((c) => (
        <span
          key={c}
          className={`rounded-full border border-brand-sky bg-blue-50 font-medium text-brand-deep ${
            compact ? "px-1.5 py-0 text-[10px]" : "px-2.5 py-0.5 text-xs"
          }`}
        >
          {c}
        </span>
      ))}
    </div>
  );
}
