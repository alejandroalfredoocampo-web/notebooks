import { NextResponse } from "next/server";
import { setSetting } from "@/lib/adminData";
import { invalidarCatalogo } from "@/lib/revalidar";

/** Edita una config global (ej. default_cpc_ars). Protegido por el middleware admin. */
export async function PATCH(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b?.key) return NextResponse.json({ error: "Falta key" }, { status: 400 });
  try {
    await setSetting(String(b.key), String(b.value ?? ""));
    invalidarCatalogo("admin/settings");
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
