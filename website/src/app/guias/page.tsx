import type { Metadata } from "next";
import Link from "next/link";
import { GUIAS } from "@/content/guias";
import { getModels } from "@/lib/data";
import { fmtARS } from "@/lib/format";
import JsonLd from "@/components/JsonLd";
import Breadcrumbs, { type Miga } from "@/components/Breadcrumbs";
import { metaRuta } from "@/lib/seo";
import { breadcrumbLd, grafo, ID_SITIO } from "@/lib/schema";
import { urlAbsoluta } from "@/lib/site";

export const metadata: Metadata = metaRuta("/guias", {
  title: "Guías para elegir notebook según para qué la vas a usar",
  description:
    "Qué specs importan de verdad para estudiar, jugar, diseñar, programar o trabajar. El criterio en números, los errores caros, y los modelos que hoy lo cumplen con su precio comparado.",
});

export const dynamic = "force-dynamic";

export default async function GuiasPage() {
  const models = await getModels();
  const conOferta = models.filter((m) => m.listings.length > 0);

  const migas: Miga[] = [
    { nombre: "Inicio", path: "/" },
    { nombre: "Guías", path: "/guias" },
  ];

  const conteos = GUIAS.map((g) => {
    const cumplen = conOferta.filter(g.filtro);
    return {
      guia: g,
      cantidad: cumplen.length,
      desde: cumplen.length ? Math.min(...cumplen.map((m) => m.bestPrice)) : 0,
    };
  });

  return (
    <>
      <JsonLd
        data={grafo(
          {
            "@type": "CollectionPage",
            "@id": `${urlAbsoluta("/guias")}#coleccion`,
            url: urlAbsoluta("/guias"),
            name: "Guías para elegir notebook",
            inLanguage: "es-AR",
            isPartOf: { "@id": ID_SITIO },
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: GUIAS.length,
              itemListElement: GUIAS.map((g, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: g.titulo,
                url: urlAbsoluta(`/guias/${g.slug}`),
              })),
            },
          },
          breadcrumbLd(migas),
        )}
      />

      <div className="mx-auto max-w-5xl px-4">
        <Breadcrumbs items={migas} />
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-12 pt-4">
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
          ¿Para qué la vas a usar?
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-600">
          La pregunta &ldquo;cuál es la mejor notebook&rdquo; no tiene respuesta; &ldquo;cuál me sirve
          para esto&rdquo; sí. Cada guía dice qué specs importan para ese uso, con el número y el
          motivo, y después lista los modelos que hoy lo cumplen con su mejor precio entre todas las
          tiendas.
        </p>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          {conteos.map(({ guia, cantidad, desde }) => (
            <Link
              key={guia.slug}
              href={`/guias/${guia.slug}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-blue hover:shadow-md"
            >
              <div className="text-2xl">{guia.icono}</div>
              <h2 className="mt-2 font-extrabold leading-snug group-hover:text-brand-blue">
                {guia.titulo}
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{guia.resumen}</p>
              {cantidad > 0 && (
                <p className="mt-3 text-[13px] font-semibold text-slate-700">
                  {cantidad} {cantidad === 1 ? "modelo cumple" : "modelos cumplen"} el criterio ·
                  desde <span className="text-brand-blue">{fmtARS(desde)}</span>
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
