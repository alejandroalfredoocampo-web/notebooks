import { NextResponse } from "next/server";
import { setStoreMonetization } from "@/lib/adminData";
import { invalidarCatalogo } from "@/lib/revalidar";

/** Edita tier/destacado/CPC de una tienda (spec 10). Protegido por el middleware admin. */
export async function PATCH(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b?.id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
  if (b.tier && !["free", "verified", "featured"].includes(b.tier)) {
    return NextResponse.json({ error: "tier inválido" }, { status: 400 });
  }
  try {
    await setStoreMonetization(String(b.id), {
      tier: b.tier,
      featured: typeof b.featured === "boolean" ? b.featured : undefined,
      featuredUntil: b.featuredUntil === undefined ? undefined : (b.featuredUntil || null),
      cpcArs: b.cpcArs === undefined ? undefined : (b.cpcArs === null || b.cpcArs === "" ? null : Math.round(Number(b.cpcArs))),
    });
    invalidarCatalogo("admin/store");
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
