import { NextResponse } from "next/server";
import {
  addManualModel,
  allModels,
  saveMatchDecision,
  slugify,
} from "@/lib/adminData";

/**
 * Crea un modelo canónico nuevo (típicamente a partir de una publicación
 * scrapeada que no matcheaba ninguno). Genera id/slug únicos, lo guarda en
 * manual-models.json y, si viene `fromListingId`, confirma ese matcheo.
 */
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const errors: string[] = [];
  const brand = String(b.brand ?? "").trim();
  const name = String(b.name ?? "").trim();
  const cpu = String(b.cpu ?? "").trim();
  const ramGb = Number(b.ramGb);
  const storageGb = Number(b.storageGb);
  if (!brand) errors.push("La marca es obligatoria.");
  if (!name) errors.push("El nombre es obligatorio.");
  if (!cpu) errors.push("El procesador es obligatorio.");
  if (!Number.isFinite(ramGb) || ramGb <= 0) errors.push("La RAM debe ser un número.");
  if (!Number.isFinite(storageGb) || storageGb <= 0)
    errors.push("El almacenamiento debe ser un número.");
  const gpuType: "integrada" | "dedicada" = b.gpuType === "dedicada" ? "dedicada" : "integrada";
  if (errors.length) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  // id/slug únicos
  const existing = await allModels();
  const ids = new Set(existing.map((m) => m.id));
  const brandSlug = slugify(brand);
  const slug = slugify(name);
  let id = `${brandSlug}-${slug}`.slice(0, 80);
  let n = 2;
  while (ids.has(id)) id = `${brandSlug}-${slug}-${n++}`.slice(0, 90);

  const model = {
    id,
    brand,
    brandSlug,
    name,
    slug,
    partNumber: String(b.partNumber ?? "").trim(),
    cpu,
    cpuFamily: String(b.cpuFamily ?? "").trim(),
    ramGb: Math.round(ramGb),
    ramType: String(b.ramType ?? "DDR4"),
    storageGb: Math.round(storageGb),
    storageType: String(b.storageType ?? "SSD"),
    screenSizeIn: Number(b.screenSizeIn) || 15.6,
    screenResolution: String(b.screenResolution ?? "1920x1080 (FHD)"),
    screenPanel: String(b.screenPanel ?? "IPS"),
    screenRefreshHz: Number(b.screenRefreshHz) || 60,
    gpu: String(b.gpu ?? (gpuType === "integrada" ? "Integrada" : "")).trim(),
    gpuType,
    os: String(b.os ?? "Windows 11 Home"),
    weightKg: Number(b.weightKg) || 0,
    batteryWh: Number(b.batteryWh) || 0,
    releaseYear: Number(b.releaseYear) || new Date().getFullYear(),
    useCases: Array.isArray(b.useCases) ? b.useCases : [],
    imageUrl: String(b.imageUrl ?? "").trim() || undefined,
    source: "manual",
  };

  await addManualModel(model);

  // Si vino de una publicación, confirmar ese matcheo automáticamente
  if (b.fromListingId) {
    await saveMatchDecision(String(b.fromListingId), {
      action: "confirmed",
      modelId: id,
      decidedAt: new Date().toISOString(),
      title: String(b.fromTitle ?? name),
    });
  }

  return NextResponse.json({ ok: true, model });
}
