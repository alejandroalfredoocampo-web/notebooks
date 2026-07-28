import { cache } from "react";
import { supabase } from "./supabaseServer";
import { supabaseAdmin } from "./supabaseAdmin";
import { slugify } from "./adminData";

/**
 * Capa de datos del blog (spec 01).
 * - Lecturas públicas (anon key): solo artículos publicados. Resilientes: si la
 *   tabla `posts` no existe todavía (migración 0004 sin correr), devuelven vacío.
 * - Escrituras/lecturas de admin (service_role): ven borradores y publicados.
 */

export type PostKind = "opinion" | "review" | "guia";
export type PostStatus = "draft" | "published";

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage?: string;
  bodyMd: string;
  kind: PostKind;
  author: string;
  status: PostStatus;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
  modelIds: string[];
}

export const KIND_LABEL: Record<PostKind, string> = {
  opinion: "Opinión",
  review: "Reseña",
  guia: "Guía",
};

type Row = Record<string, unknown>;

function mapPost(r: Row, modelIds: string[] = []): Post {
  return {
    id: r.id as string,
    slug: r.slug as string,
    title: r.title as string,
    excerpt: (r.excerpt as string) ?? "",
    coverImage: (r.cover_image as string) ?? undefined,
    bodyMd: (r.body_md as string) ?? "",
    kind: (r.kind as PostKind) ?? "opinion",
    author: (r.author as string) ?? "Redacción",
    status: (r.status as PostStatus) ?? "draft",
    publishedAt: (r.published_at as string) ?? null,
    updatedAt: (r.updated_at as string) ?? "",
    createdAt: (r.created_at as string) ?? "",
    modelIds,
  };
}

async function modelIdsFor(postIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (!postIds.length) return map;
  const { data } = await supabase.from("post_models").select("post_id,model_id").in("post_id", postIds);
  for (const r of data ?? []) {
    const pid = r.post_id as string;
    (map.get(pid) ?? map.set(pid, []).get(pid)!).push(r.model_id as string);
  }
  return map;
}

// --- Público -----------------------------------------------------------------

export const getPublishedPosts = cache(async (): Promise<Post[]> => {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false });
    if (error || !data) return [];
    return data.map((r) => mapPost(r));
  } catch {
    return [];
  }
});

export async function getPostBySlug(slug: string): Promise<Post | null> {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error || !data) return null;
    const ids = (await modelIdsFor([data.id as string])).get(data.id as string) ?? [];
    return mapPost(data, ids);
  } catch {
    return null;
  }
}

// --- Admin (service_role) ----------------------------------------------------

export async function getAdminPosts(): Promise<Post[]> {
  const { data, error } = await supabaseAdmin()
    .from("posts")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`posts: ${error.message}`);
  return (data ?? []).map((r) => mapPost(r));
}

export async function getAdminPost(id: string): Promise<Post | null> {
  const db = supabaseAdmin();
  const { data, error } = await db.from("posts").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const { data: pm } = await db.from("post_models").select("model_id").eq("post_id", id);
  return mapPost(data, (pm ?? []).map((r) => r.model_id as string));
}

export interface PostInput {
  id?: string;
  slug?: string;
  title: string;
  excerpt?: string;
  coverImage?: string;
  bodyMd: string;
  kind: PostKind;
  author?: string;
  status: PostStatus;
  modelIds: string[];
}

/** Crea o actualiza un artículo + su relación con modelos. Devuelve el id. */
export async function upsertPost(input: PostInput): Promise<string> {
  const db = supabaseAdmin();
  const id = input.id || `${slugify(input.title).slice(0, 60)}-${Math.abs(hash(input.title + input.bodyMd)) % 100000}`;
  const slug = input.slug ? slugify(input.slug) : slugify(input.title);

  // published_at: se setea la primera vez que pasa a published
  let publishedAt: string | null = null;
  if (input.status === "published") {
    const { data: existing } = await db.from("posts").select("published_at").eq("id", id).maybeSingle();
    publishedAt = (existing?.published_at as string) ?? new Date().toISOString();
  }

  const row = {
    id,
    slug,
    title: input.title,
    excerpt: input.excerpt ?? "",
    cover_image: input.coverImage || null,
    body_md: input.bodyMd,
    kind: input.kind,
    author: input.author || "Redacción",
    status: input.status,
    published_at: publishedAt,
    updated_at: new Date().toISOString(),
  };
  const { error } = await db.from("posts").upsert(row, { onConflict: "id" });
  if (error) throw new Error(error.message);

  // Reemplazar relaciones con modelos
  await db.from("post_models").delete().eq("post_id", id);
  if (input.modelIds.length) {
    const { error: pmErr } = await db
      .from("post_models")
      .insert(input.modelIds.map((mid) => ({ post_id: id, model_id: mid })));
    if (pmErr) throw new Error(pmErr.message);
  }
  return id;
}

export async function setPostStatus(id: string, status: PostStatus): Promise<void> {
  const db = supabaseAdmin();
  const patch: Row = { status, updated_at: new Date().toISOString() };
  if (status === "published") {
    const { data } = await db.from("posts").select("published_at").eq("id", id).maybeSingle();
    if (!data?.published_at) patch.published_at = new Date().toISOString();
  }
  const { error } = await db.from("posts").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await supabaseAdmin().from("posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// Hash determinístico (para sufijo de id sin Math.random/Date.now dependientes)
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
