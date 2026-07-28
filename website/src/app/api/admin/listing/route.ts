import { NextResponse } from "next/server";
import { addManualListing, getAdminStores, getAdminModels } from "@/lib/adminData";

/**
 * Alta de una publicación propia (cargada a mano por el operador).
 * body: { storeId, modelId?, titleRaw, url, priceCash, priceList?, inStock?, image? }
 */
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const [stores, models] = await Promise.all([getAdminStores(), getAdminModels()]);
  const errors: string[] = [];
  if (!b.storeId || !stores.some((s) => s.id === b.storeId)) errors.push("Elegí una tienda válida.");
  if (!b.titleRaw?.trim()) errors.push("El título es obligatorio.");
  const priceCash = Number(b.priceCash);
  if (!Number.isFinite(priceCash) || priceCash <= 0)
    errors.push("El precio de contado debe ser un número mayor a 0.");
  if (b.modelId && !models.some((m) => m.id === b.modelId)) errors.push("El modelo elegido no existe.");
  if (b.url && !/^https?:\/\//i.test(b.url)) errors.push("La URL debe empezar con http(s)://");
  if (errors.length) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const priceList = Number(b.priceList);
  try {
    await addManualListing({
      id: `manual-${Date.now()}`,
      storeId: b.storeId,
      modelId: b.modelId || null,
      url: b.url || "",
      titleRaw: b.titleRaw.trim(),
      priceList: Number.isFinite(priceList) && priceList > 0 ? Math.round(priceList) : Math.round(priceCash),
      priceCash: Math.round(priceCash),
      inStock: b.inStock !== false,
      image: b.image?.trim() || null,
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
