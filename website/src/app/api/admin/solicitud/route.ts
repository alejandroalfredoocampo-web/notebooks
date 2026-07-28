import { NextResponse } from "next/server";
import { reviewApplication } from "@/lib/adminData";

/** Aprueba o rechaza una solicitud de tienda. body: { id, action } */
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b?.id || !["approved", "rejected"].includes(b.action)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  try {
    await reviewApplication(Number(b.id), b.action);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
