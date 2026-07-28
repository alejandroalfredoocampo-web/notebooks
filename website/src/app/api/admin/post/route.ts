import { NextResponse } from "next/server";
import { upsertPost, setPostStatus, deletePost, type PostKind, type PostStatus } from "@/lib/blog";

/** CMS del blog. Protegido por el middleware (cookie admin). */

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const title = String(b.title ?? "").trim();
  const bodyMd = String(b.bodyMd ?? "").trim();
  if (!title) return NextResponse.json({ error: "El título es obligatorio." }, { status: 400 });
  if (!bodyMd) return NextResponse.json({ error: "El cuerpo es obligatorio." }, { status: 400 });

  const kind: PostKind = ["opinion", "review", "guia"].includes(b.kind) ? b.kind : "opinion";
  const status: PostStatus = b.status === "published" ? "published" : "draft";

  try {
    const id = await upsertPost({
      id: b.id ? String(b.id) : undefined,
      slug: b.slug ? String(b.slug) : undefined,
      title,
      excerpt: String(b.excerpt ?? "").trim(),
      coverImage: String(b.coverImage ?? "").trim(),
      bodyMd,
      kind,
      author: String(b.author ?? "").trim() || undefined,
      status,
      modelIds: Array.isArray(b.modelIds) ? b.modelIds.map(String) : [],
    });
    return NextResponse.json({ ok: true, id });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b?.id || !["draft", "published"].includes(b.status)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  try {
    await setPostStatus(String(b.id), b.status);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b?.id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
  try {
    await deletePost(String(b.id));
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
