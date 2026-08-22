import type { Metadata } from "next";
import { metaRuta } from "@/lib/seo";
import { getModels } from "@/lib/data";
import { recommendUse } from "@/lib/useRecommendation";
import CompareTool from "@/components/CompareTool";

export const dynamic = "force-dynamic";

export const metadata: Metadata = metaRuta("/comparar", {
  title: "Comparar notebooks lado a lado",
  description: "Elegí hasta 3 notebooks y compará specs, precio, cuotas y para qué sirve cada una.",
});

export default async function CompararPage({
  searchParams,
}: {
  searchParams: { ids?: string };
}) {
  const models = await getModels();
  const compact = models.map((m) => ({
    id: m.id,
    brand: m.brand,
    name: m.name,
    brandSlug: m.brandSlug,
    slug: m.slug,
    imageUrl: m.imageUrl ?? null,
    cpu: m.cpu,
    ramGb: m.ramGb,
    storageGb: m.storageGb,
    storageType: m.storageType,
    gpu: m.gpu,
    gpuType: m.gpuType,
    screenSizeIn: m.screenSizeIn,
    screenResolution: m.screenResolution,
    os: m.os,
    bestPrice: m.bestPrice,
    storeCount: m.listings.length,
    bestInstallment: m.bestInstallment,
    maxInstallments: m.maxInstallments,
    useLabel: recommendUse(m).headline,
  }));

  const initialIds = (typeof searchParams.ids === "string" ? searchParams.ids.split(",") : [])
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight">Comparar notebooks</h1>
      <p className="mb-5 text-sm text-slate-500">
        Elegí hasta 3 modelos y velos enfrentados: precio, cuotas, specs y para qué sirve cada uno.
      </p>
      <CompareTool models={compact} initialIds={initialIds} />
    </div>
  );
}
