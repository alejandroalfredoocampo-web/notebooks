import { NextResponse } from "next/server";
import { setBulkRequestStatus } from "@/lib/adminData";

/** Cambia el estado de una solicitud corporativa. Protegido por el middleware admin. */
export async function PATCH(req: Request) {
  const b = await req.json().catch(() => null);
  const valid = ["open", "quoting", "closed", "cancelled"];
  if (!b?.id || !valid.includes(b.status)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  try {
    await setBulkRequestStatus(String(b.id), b.status);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
