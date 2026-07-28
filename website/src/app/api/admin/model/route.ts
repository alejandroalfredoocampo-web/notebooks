import { NextResponse } from "next/server";
import { createModel, getAdminModels, slugify } from "@/lib/adminData";

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
      ram_type: String(b.ramType ?? "DDR4"),
      storage_gb: Math.round(storageGb),
      storage_type: String(b.storageType ?? "SSD"),
      screen_size_in: Number(b.screenSizeIn) || 15.6,
      screen_resolution: String(b.screenResolution ?? "1920x1080 (FHD)"),
      screen_panel: String(b.screenPanel ?? "IPS"),
      screen_refresh_hz: Number(b.screenRefreshHz) || 60,
      gpu: String(b.gpu ?? (gpuType === "integrada" ? "Integrada" : "")).trim(),
      gpu_type: gpuType,
      os: String(b.os ?? "Windows 11 Home"),
      weight_kg: Number(b.weightKg) || 0,
      battery_wh: Math.round(Number(b.batteryWh) || 0),
      release_year: Number(b.releaseYear) || new Date().getFullYear(),
      use_cases: Array.isArray(b.useCases) ? b.useCases : [],
      image_url: String(b.imageUrl ?? "").trim() || null,
      source: "manual",
    };

    await createModel(row, b.fromListingId ? String(b.fromListingId) : undefined);
    return NextResponse.json({ ok: true, model: { id, brand, name } });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
