import { NextResponse } from "next/server";
import { confirmMatch, rejectMatch, getAdminModels } from "@/lib/adminData";
import { invalidarCatalogo } from "@/lib/revalidar";

/**
 * Decisión del operador sobre un matcheo pendiente.
 * body: { id, action: "confirmed"|"rejected", modelId? }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.id || !["confirmed", "rejected"].includes(body.action)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  try {
    if (body.action === "confirmed") {
      const modelId = body.modelId;
      if (!modelId) {
        return NextResponse.json({ error: "Elegí un modelo para confirmar" }, { status: 400 });
      }
      const models = await getAdminModels();
      if (!models.some((m) => m.id === modelId)) {
        return NextResponse.json({ error: "El modelo no existe" }, { status: 400 });
      }
      await confirmMatch(String(body.id), modelId);
    } else {
      await rejectMatch(String(body.id));
    }
    invalidarCatalogo("admin/match");
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
