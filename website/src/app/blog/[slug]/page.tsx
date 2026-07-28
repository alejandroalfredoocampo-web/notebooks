import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug, KIND_LABEL } from "@/lib/blog";
import { getModels } from "@/lib/data";
import { fmtDateLong, fmtARS } from "@/lib/format";
import Markdown from "@/components/Markdown";
import ShareButton from "@/components/ShareButton";
import ModelImage from "@/components/ModelImage";

export const dynamic = "force-dynamic";

interface Params {
  slug: string;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishedAt ?? undefined,
      images: post.coverImage ? [{ url: post.coverImage }] : undefined,
    },
    twitter: {
      card: post.coverImage ? "summary_large_image" : "summary",
      title: post.title,
      description: post.excerpt,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const post = await getPostBySlug(params.slug);
  if (!post) notFound();

  const mentioned = post.modelIds.length
    ? (await getModels()).filter((m) => post.modelIds.includes(m.id))
    : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    author: { "@type": "Organization", name: post.author },
    datePublished: post.publishedAt ?? undefined,
    dateModified: post.updatedAt || undefined,
    image: post.coverImage ? [post.coverImage] : undefined,
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-[13px] text-slate-400">
        <Link href="/" className="hover:text-brand-blue">Inicio</Link>
        {" / "}
        <Link href="/blog" className="hover:text-brand-blue">Blog</Link>
      </nav>

      <div className="mt-3 flex items-center gap-2 text-[12px]">
        <span className="rounded-full bg-blue-50 px-2 py-0.5 font-bold text-brand-blue">
          {KIND_LABEL[post.kind]}
        </span>
        {post.publishedAt && <span className="text-slate-400">{fmtDateLong(post.publishedAt)}</span>}
        <span className="text-slate-400">· por {post.author}</span>
      </div>

      <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight">{post.title}</h1>
      {post.excerpt && <p className="mt-2 text-lg text-slate-600">{post.excerpt}</p>}

      <div className="mt-3">
        <ShareButton title={post.title} text={post.title} />
      </div>

      {post.coverImage && (
        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.coverImage} alt={post.title} className="w-full object-cover" />
        </div>
      )}

      <div className="mt-6">
        <Markdown>{post.bodyMd}</Markdown>
      </div>

      {mentioned.length > 0 && (
        <div className="mt-10 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-extrabold">Modelos mencionados</h2>
          <div className="flex flex-col gap-2.5">
            {mentioned.map((m) => (
              <Link
                key={m.id}
                href={`/notebooks/${m.brandSlug}/${m.slug}`}
                className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition hover:border-brand-blue"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                  <ModelImage
                    src={m.imageUrl}
                    alt={`${m.brand} ${m.name}`}
                    emoji={m.gpuType === "dedicada" ? "🎮" : m.os === "macOS" ? "🍎" : "💻"}
                    className="h-full w-full p-1"
                    sizes="48px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold">{m.brand} {m.name}</div>
                  <div className="text-[11px] text-slate-500">{m.cpu} · {m.ramGb} GB</div>
                </div>
                {m.bestPrice > 0 && (
                  <div className="text-sm font-extrabold">{fmtARS(m.bestPrice)}</div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
