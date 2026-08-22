import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIAS, guiaPorSlug } from "@/content/guias";
import { getModels } from "@/lib/data";
import { fmtARS } from "@/lib/format";
import ModelCard from "@/components/ModelCard";
import JsonLd from "@/components/JsonLd";
import Breadcrumbs, { type Miga } from "@/components/Breadcrumbs";
import { metaRuta, recortar } from "@/lib/seo";
import { breadcrumbLd, coleccionLd, faqLd, grafo } from "@/lib/schema";

export const dynamic = "force-dynamic";

interface Params {
  slug: string;
}

/**
 * **No hay `generateStaticParams` a propósito.**
 *
 * Se probó y el build las prerenderizó: la página salió `●` en vez de `ƒ`, o sea con los
 * precios del momento del build horneados adentro. En un comparador eso es el peor error
 * posible — la página que dice "desde $X, actualizado a diario" mostrando el precio de
 * hace una semana. El resto del sitio es `force-dynamic` por la misma razón, y estas
 * páginas listan catálogo en vivo, así que van igual.
 *
 * Que las rutas existan no hace falta declararlo: el sitemap las deriva de `GUIAS`, que es
 * la misma fuente que usa esta página.
 */

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const guia = guiaPorSlug(params.slug);
  if (!guia) return {};
  return metaRuta(`/guias/${guia.slug}`, {
    title: guia.titulo,
    // La primera oración de la respuesta, no un resumen aparte: si el snippet de Google
    // dice una cosa y la página abre con otra, el que llega siente que se equivocó de link.
    description: recortar(guia.respuesta, 300),
    openGraph: { title: guia.titulo, description: recortar(guia.respuesta, 200) },
  });
}

export default async function GuiaPage({ params }: { params: Params }) {
  const guia = guiaPorSlug(params.slug);
  if (!guia) notFound();

  const todos = await getModels();
  const cumplen = todos
    .filter((m) => m.listings.length > 0)
    .filter(guia.filtro)
    .sort((a, b) => a.bestPrice - b.bestPrice);

  const destacados = cumplen.slice(0, 8);
  const desde = cumplen.length ? cumplen[0].bestPrice : 0;

  const migas: Miga[] = [
    { nombre: "Inicio", path: "/" },
    { nombre: "Guías", path: "/guias" },
    { nombre: guia.titulo, path: `/guias/${guia.slug}` },
  ];

  return (
    <>
      {/**
       * Tres nodos: la lista de modelos que cumplen (`CollectionPage` + `ItemList`), las
       * preguntas (`FAQPage`) y la miga.
       *
       * El `FAQPage` es el que más rinde acá: es el formato que un asistente cita casi
       * textual, porque ya viene con la pregunta y la respuesta separadas y no tiene que
       * inferir cuál es cuál.
       */}
      <JsonLd
        data={grafo(
          coleccionLd({
            path: `/guias/${guia.slug}`,
            nombre: guia.titulo,
            descripcion: guia.respuesta,
            items: destacados.map((m) => ({
              nombre: `${m.brand} ${m.name}`,
              path: `/notebooks/${m.brandSlug}/${m.slug}`,
            })),
          }),
          faqLd(guia.faq),
          breadcrumbLd(migas),
        )}
      />

      <div className="mx-auto max-w-4xl px-4">
        <Breadcrumbs items={migas} />
      </div>

      <article className="mx-auto max-w-4xl px-4 pb-14 pt-4">
        <div className="text-3xl">{guia.icono}</div>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight md:text-[32px] md:leading-tight">
          {guia.titulo}
        </h1>

        {/**
         * La respuesta va arriba de todo y en un solo bloque de prosa. Es deliberado: es lo
         * que se cita, y lo que se cita tiene que entenderse sin el resto de la página.
         */}
        <p className="mt-4 text-[17px] leading-relaxed text-slate-700">{guia.respuesta}</p>

        {cumplen.length > 0 && (
          <p className="mt-4 rounded-xl border border-brand-sky bg-blue-50 px-4 py-3 text-[15px] text-brand-darker">
            Hoy hay <b>{cumplen.length}</b> {cumplen.length === 1 ? "modelo" : "modelos"} en el
            comparador que cumplen este criterio, desde <b>{fmtARS(desde)}</b>. Precios de{" "}
            {new Set(cumplen.flatMap((m) => m.listings.map((l) => l.store.name))).size} tiendas,
            actualizados a diario.
          </p>
        )}

        {/* --- El criterio, en números --- */}
        <h2 className="mt-10 text-xl font-extrabold tracking-tight">Qué mirar, y por qué</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-slate-200 text-[12px] uppercase tracking-wider text-slate-400">
                <th className="py-2 pr-4 font-bold">Spec</th>
                <th className="py-2 pr-4 font-bold">Pedile</th>
                <th className="py-2 font-bold">Por qué</th>
              </tr>
            </thead>
            <tbody>
              {guia.criterio.map((c) => (
                <tr key={c.spec} className="border-b border-slate-100 align-top last:border-0">
                  <td className="py-3 pr-4 font-semibold text-slate-700">{c.spec}</td>
                  <td className="py-3 pr-4 font-bold text-brand-blue">{c.pide}</td>
                  <td className="py-3 leading-relaxed text-slate-600">{c.porque}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* --- Errores caros --- */}
        <h2 className="mt-10 text-xl font-extrabold tracking-tight">Errores que salen caros</h2>
        <ul className="mt-3 space-y-2.5">
          {guia.evitar.map((e) => (
            <li key={e} className="flex gap-2.5 text-[15px] leading-relaxed text-slate-700">
              <span aria-hidden="true" className="mt-0.5 shrink-0 text-red-500">
                ✕
              </span>
              <span>{e}</span>
            </li>
          ))}
        </ul>

        {/* --- Los modelos que cumplen, en vivo --- */}
        <h2 className="mt-11 text-xl font-extrabold tracking-tight">
          Modelos que cumplen el criterio hoy
        </h2>
        <p className="mt-1 text-[13px] text-slate-500">
          Ordenados por el precio más bajo entre todas las tiendas indexadas. Cada ficha tiene el
          historial de 90 días para saber si el precio de hoy es bueno.
        </p>
        {destacados.length ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              {destacados.map((m) => (
                <ModelCard key={m.id} model={m} />
              ))}
            </div>
            {cumplen.length > destacados.length && (
              <Link
                href={guia.filtroUrl}
                className="mt-4 inline-block text-sm font-semibold text-brand-blue hover:underline"
              >
                Ver los {cumplen.length} modelos con estos filtros →
              </Link>
            )}
          </>
        ) : (
          <p className="mt-4 rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
            Ahora mismo no hay modelos indexados que cumplan todo el criterio. Podés{" "}
            <Link href="/notebooks" className="font-semibold text-brand-blue hover:underline">
              ver el catálogo completo
            </Link>{" "}
            y aflojar alguno de los requisitos.
          </p>
        )}

        {/* --- Preguntas --- */}
        <h2 className="mt-11 text-xl font-extrabold tracking-tight">Preguntas frecuentes</h2>
        <div className="mt-4 space-y-4">
          {guia.faq.map((f) => (
            <div key={f.q} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              {/**
               * Las respuestas se renderizan siempre, no dentro de un acordeón cerrado.
               *
               * Es la lección más cara de la auditoría del otro proyecto: las pestañas de la
               * ficha se montaban con `tab === "x" &&`, así que el HTML del servidor no traía
               * la descripción aprobada. Googlebot ejecuta JavaScript **pero no hace click en
               * pestañas**, así que ese texto no llegaba a ningún buscador por ningún camino.
               * Si alguna vez esto se pliega, tiene que ser con `hidden` o con
               * `<details>` — que sí se indexan — y nunca desmontando el nodo.
               */}
              <h3 className="font-bold text-slate-800">{f.q}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{f.a}</p>
            </div>
          ))}
        </div>

        {/* --- Las otras guías --- */}
        <h2 className="mt-11 text-xl font-extrabold tracking-tight">Otras guías</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {GUIAS.filter((g) => g.slug !== guia.slug).map((g) => (
            <Link
              key={g.slug}
              href={`/guias/${g.slug}`}
              className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-700 transition hover:border-brand-blue hover:text-brand-blue"
            >
              {g.icono} {g.titulo}
            </Link>
          ))}
        </div>
      </article>
    </>
  );
}
