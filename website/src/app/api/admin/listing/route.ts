import { NextResponse } from "next/server";
import { addManualListing, adminStores, adminModels } from "@/lib/adminData";

/**
 * Alta de una publicación propia (cargada a mano por el operador).
 * body: { storeId, modelId?, titleRaw, url, priceCash, priceList?, inStock?, image? }
 */
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const errors: string[] = [];
  if (!b.storeId || !adminStores.some((s) => s.id === b.storeId))
    errors.push("Elegí una tienda válida.");
  if (!b.titleRaw?.trim()) errors.push("El título es obligatorio.");
  const priceCash = Number(b.priceCash);
  if (!Number.isFinite(priceCash) || priceCash <= 0)
    errors.push("El precio de contado debe ser un número mayor a 0.");
  if (b.modelId && !adminModels.some((m) => m.id === b.modelId))
    errors.push("El modelo elegido no existe.");
  if (b.url && !/^https?:\/\//i.test(b.url)) errors.push("La URL debe empezar con http(s)://");
  if (errors.length) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const priceList = Number(b.priceList);
  const listing = {
    id: `manual-${Date.now()}`,
    storeId: b.storeId,
    modelId: b.modelId || null,
    url: b.url || "",
    titleRaw: b.titleRaw.trim(),
    priceList: Number.isFinite(priceList) && priceList > 0 ? Math.round(priceList) : Math.round(priceCash),
    priceCash: Math.round(priceCash),
    installments: null,
    inStock: b.inStock !== false,
    condition: "new" as const,
    image: b.image?.trim() || null,
    source: "manual",
    lastSeenAt: new Date().toISOString(),
  };
  await addManualListing(listing);
  return NextResponse.json({ ok: true, listing });
}
