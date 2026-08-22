import type { Metadata } from "next";
import { metaRuta } from "@/lib/seo";
import { getModels } from "@/lib/data";
import CorporateForm from "@/components/CorporateForm";

export const metadata: Metadata = metaRuta("/corporativo", {
  title: "Venta corporativa y mayorista de notebooks",
  description:
    "¿Comprás notebooks al por mayor? Pedí presupuesto y dejá que las tiendas compitan por tu compra. Comparativa de precios por volumen para empresas, escuelas y revendedores.",
});

export const dynamic = "force-dynamic";

const CASES = [
  { icon: "🏢", title: "Empresas", desc: "Equipá a tu equipo con el mejor precio por volumen." },
  { icon: "🎓", title: "Escuelas e institutos", desc: "Compras grandes para aulas y laboratorios." },
  { icon: "🛒", title: "Revendedores", desc: "Stock a precio diferencial para tu negocio." },
];

export default async function CorporativoPage() {
  const models = (await getModels())
    .filter((m) => m.listings.length > 0)
    .map((m) => ({ id: m.id, label: `${m.brand} ${m.name}`, bestPrice: m.bestPrice }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <>
      <section className="bg-brand-navy text-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="text-[11px] font-bold uppercase tracking-widest text-brand-cyan">
            Venta corporativa
          </div>
          <h1 className="mt-2 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight md:text-[40px]">
            Comprás notebooks al por mayor? Que las tiendas compitan por tu compra.
          </h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            Dejanos tu solicitud con el modelo y la cantidad. La compartimos con las tiendas que
            comparamos y te acercamos propuestas con precio diferencial por volumen. Gratis y sin
            compromiso.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {CASES.map((c) => (
              <div key={c.title} className="rounded-xl bg-white/5 p-5">
                <div className="text-2xl">{c.icon}</div>
                <div className="mt-1.5 font-bold">{c.title}</div>
                <div className="text-[13px] text-slate-300">{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <CorporateForm models={models} />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { n: "1", t: "Contanos qué necesitás", d: "Modelo (o specs) y cantidad de equipos." },
            { n: "2", t: "Las tiendas cotizan", d: "Recopilamos propuestas con precio por volumen." },
            { n: "3", t: "Elegís y comprás directo", d: "Te conectamos con la tienda; el pago es con ella." },
          ].map((s) => (
            <div key={s.n} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 font-extrabold text-brand-blue">
                {s.n}
              </div>
              <h3 className="text-[15px] font-bold">{s.t}</h3>
              <p className="mt-1 text-[13px] text-slate-500">{s.d}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
