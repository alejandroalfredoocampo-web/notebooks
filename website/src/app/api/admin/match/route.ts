import { NextResponse } from "next/server";
import { saveMatchDecision, adminModels } from "@/lib/adminData";

/**
 * Registra la decisión del operador sobre un matcheo pendiente.
 * body: { id, action: "confirmed"|"rejected", modelId?, title? }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.id || !["confirmed", "rejected"].includes(body.action)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  let modelId: string | null = null;
  if (body.action === "confirmed") {
    modelId = body.modelId ?? null;
    if (!modelId) {
      return NextResponse.json(
        { error: "Elegí un modelo para confirmar el matcheo" },
        { status: 400 }
      );
    }
    if (!adminModels.some((m) => m.id === modelId)) {
      return NextResponse.json({ error: "El modelo no existe" }, { status: 400 });
    }
  }

  const decision = {
    action: body.action as "confirmed" | "rejected",
    modelId,
    decidedAt: new Date().toISOString(),
    title: String(body.title ?? ""),
  };
  await saveMatchDecision(String(body.id), decision);
  return NextResponse.json({ ok: true, decision });
}
