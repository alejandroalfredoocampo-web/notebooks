import { NextResponse } from "next/server";
import { createModel, getAdminModels, slugify } from "@/lib/adminData";
import { invalidarCatalogo } from "@/lib/revalidar";

/** Texto recortado, o `null` si viene vacío. */
const opcional = (v: unknown): string | null => {
  const t = String(v ?? "").trim();
  return t || null;
};

/**
 * Crea un modelo canónico nuevo (típicamente desde una publicación scrapeada
 * que no matcheaba ninguno). Genera id/slug únicos, lo inserta en `models` y,
 * si viene `fromListingId`, confirma ese matcheo.
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
  if (!Number.isFinite(storageGb) || storageGb <= 0) errors.push("El almacenamiento debe ser un número.");
  const gpuType: "integrada" | "dedicada" = b.gpuType === "dedicada" ? "dedicada" : "integrada";
  if (errors.length) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  try {
    // id/slug únicos contra los modelos existentes
    const existing = await getAdminModels();
    const ids = new Set(existing.map((m) => m.id));
    const brandSlug = slugify(brand);
    const slug = slugify(name);
    let id = `${brandSlug}-${slug}`.slice(0, 80);
    let n = 2;
    while (ids.has(id)) id = `${brandSlug}-${slug}-${n++}`.slice(0, 90);

    // Fila snake_case para la tabla `models`
    const row = {
      id,
      brand,
      brand_slug: brandSlug,
      name,
      slug,
      part_number: String(b.partNumber ?? "").trim(),
      cpu,
      cpu_family: String(b.cpuFamily ?? "").trim(),
      ram_gb: Math.round(ramGb),
      // Lo que el formulario deja vacío se guarda vacío. Antes caía en DDR4 / SSD / 15,6" FHD
      // IPS 60 Hz / Windows 11 Home, y la ficha lo publicaba como dato (ver src/lib/specs.ts).
      ram_type: opcional(b.ramType),
      storage_gb: Math.round(storageGb),
      storage_type: opcional(b.storageType),
      screen_size_in: Number(b.screenSizeIn) || null,
      screen_resolution: opcional(b.screenResolution),
      screen_panel: opcional(b.screenPanel),
      screen_refresh_hz: Number(b.screenRefreshHz) || null,
      gpu: String(b.gpu ?? (gpuType === "integrada" ? "Integrada" : "")).trim(),
      gpu_type: gpuType,
      os: opcional(b.os),
      weight_kg: Number(b.weightKg) || null,
      battery_wh: Math.round(Number(b.batteryWh)) || null,
      release_year: Number(b.releaseYear) || null,
      use_cases: Array.isArray(b.useCases) ? b.useCases : [],
      image_url: String(b.imageUrl ?? "").trim() || null,
      source: "manual",
    };

    await createModel(row, b.fromListingId ? String(b.fromListingId) : undefined);
    invalidarCatalogo("admin/model");
    return NextResponse.json({ ok: true, model: { id, brand, name } });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
