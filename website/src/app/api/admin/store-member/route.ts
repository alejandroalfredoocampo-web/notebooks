import { NextResponse } from "next/server";
import { addStoreMember, removeStoreMember } from "@/lib/adminData";

/** Vincula/desvincula un usuario a una tienda (portal, Fase B). Protegido por el middleware admin. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const email = String(b?.email ?? "").trim();
  const storeId = String(b?.storeId ?? "").trim();
  if (!email.includes("@") || !storeId) {
    return NextResponse.json({ error: "Email o tienda inválidos" }, { status: 400 });
  }
  try {
    await addStoreMember(email, storeId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b?.userId || !b?.storeId) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  try {
    await removeStoreMember(String(b.userId), String(b.storeId));
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
