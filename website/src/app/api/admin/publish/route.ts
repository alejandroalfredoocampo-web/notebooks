import { NextResponse } from "next/server";
// @ts-ignore -- módulo JS del pipeline, sin tipos
import { publish } from "../../../../../scrapers/publish.mjs";

export async function POST() {
  try {
    const summary = await publish();
    return NextResponse.json({ ok: true, summary });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
