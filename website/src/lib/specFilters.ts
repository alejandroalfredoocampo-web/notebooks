/**
 * Fuente única de verdad para el mapeo spec → token de filtro.
 * Lo usan `filterModels` (data.ts), la barra `Filters.tsx` y los chips (`SpecChips.tsx`),
 * para que un chip que linkea a `/notebooks?ram=16` quede consistente con el checkbox del sidebar.
 */
import type { NotebookModel } from "./types";

// RAM: 8 (8–12) · 16 (16–28) · 32 (32+)
export function ramBucket(ramGb: number): "8" | "16" | "32" {
  if (ramGb < 16) return "8";
  if (ramGb < 32) return "16";
  return "32";
}

// Almacenamiento: 256 (≤256) · 512 (257–512) · 1000 (≥1 TB)
export function storageBucket(storageGb: number): "256" | "512" | "1000" {
  if (storageGb <= 256) return "256";
  if (storageGb <= 512) return "512";
  return "1000";
}

// Pantalla: 13 (≤13.9") · 14 (14–14.9") · 15 (15–15.9") · 16 (≥16")
export function screenBucket(screenSizeIn: number): "13" | "14" | "15" | "16" {
  if (screenSizeIn < 14) return "13";
  if (screenSizeIn < 15) return "14";
  if (screenSizeIn < 16) return "15";
  return "16";
}

/**
 * Dado un modelo y un eje, devuelve el href al listado filtrado por esa característica,
 * o null si el eje no aplica (dato faltante) → el chip queda como texto.
 */
export type ChipAxis = "cpu" | "ram" | "storage" | "screen" | "gpu";

export function chipHref(model: NotebookModel, axis: ChipAxis): string | null {
  let token: string | null = null;
  switch (axis) {
    case "cpu":
      token = model.cpuFamily || null;
      break;
    case "ram":
      token = model.ramGb ? ramBucket(model.ramGb) : null;
      break;
    case "storage":
      token = model.storageGb ? storageBucket(model.storageGb) : null;
      break;
    case "screen":
      token = model.screenSizeIn ? screenBucket(model.screenSizeIn) : null;
      break;
    case "gpu":
      token = model.gpuType || null;
      break;
  }
  return token ? `/notebooks?${axis}=${encodeURIComponent(token)}` : null;
}
