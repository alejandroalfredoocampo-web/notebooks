import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedPosts, KIND_LABEL } from "@/lib/blog";
import { fmtDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Blog — opiniones y reseñas de notebooks",
  description:
    "Opiniones, reseñas y guías sobre las notebooks que se venden en Argentina. Analizamos modelos, relación precio/rendimiento y cuándo conviene comprar.",
};

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const posts = await getPublishedPosts();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Blog</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Opiniones, reseñas y guías sobre las notebooks que comparamos.
          </p>
        </div>
        <a href="/blog/rss.xml" className="text-[13px] font-semibold text-brand-blue hover:underline">
          RSS
        </a>
      </div>

      {posts.length ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/blog/${p.slug}`}
              className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex h-40 items-center justify-center overflow-hidden bg-slate-100 text-4xl">
                {p.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.coverImage} alt={p.title} className="h-full w-full object-cover" />
                ) : (
                  <span aria-hidden>📝</span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="mb-1 flex items-center gap-2 text-[11px]">
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 font-bold text-brand-blue">
                    {KIND_LABEL[p.kind]}
                  </span>
                  {p.publishedAt && (
                    <span className="text-slate-400">{fmtDate(p.publishedAt)}</span>
                  )}
                </div>
                <h2 className="text-[15px] font-bold leading-snug group-hover:text-brand-blue">
                  {p.title}
                </h2>
                {p.excerpt && (
                  <p className="mt-1 line-clamp-3 text-[13px] text-slate-500">{p.excerpt}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Todavía no publicamos artículos. Volvé pronto.
        </p>
      )}
    </div>
  );
}
