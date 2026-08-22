import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 bg-brand-navy text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 text-sm md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="text-lg font-extrabold text-white">
            notebooks<span className="text-brand-cyan">.com.ar</span>
          </div>
          <p className="mt-2 max-w-md text-slate-400">
            El comparador de precios de notebooks de Argentina. Indexamos las
            publicaciones de tiendas de terceros; no vendemos ni intermediamos
            pagos.
          </p>
          <div className="mt-4 rounded-lg bg-white/5 p-4 text-xs leading-relaxed text-slate-400">
            <b className="text-white">Cómo ganamos dinero:</b> algunas tiendas
            nos pagan una comisión si comprás a través de nuestros links. Esto
            nunca afecta el orden de los resultados, que es siempre por precio.
            Los espacios patrocinados se señalan como{" "}
            <span className="rounded bg-amber-100/10 px-1.5 py-0.5 font-bold uppercase tracking-wide text-amber-300">
              Patrocinado
            </span>
          </div>
        </div>
        <div>
          <h4 className="mb-3 font-bold text-white">Explorar</h4>
          <ul className="space-y-1.5">
            <li><Link className="hover:text-white" href="/notebooks">Todas las notebooks</Link></li>
            <li><Link className="hover:text-white" href="/ofertas">Ofertas verificadas</Link></li>
            <li><Link className="hover:text-white" href="/guias">Guías para elegir</Link></li>
            <li><Link className="hover:text-white" href="/tiendas">Tiendas indexadas</Link></li>
            <li><Link className="hover:text-white" href="/marcas">Marcas</Link></li>
            <li><Link className="hover:text-white" href="/blog">Blog</Link></li>
            <li><Link className="hover:text-white" href="/corporativo">Venta corporativa</Link></li>
            <li><Link className="hover:text-white" href="/privacidad">Política de privacidad</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-bold text-white">Tiendas</h4>
          <ul className="space-y-1.5">
            <li><Link className="hover:text-white" href="/tiendas">Sumá tu tienda (gratis)</Link></li>
            <li><Link className="hover:text-white" href="/portal">Portal para tiendas</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-5 text-xs text-slate-500">
          Los precios se actualizan varias veces al día y pueden variar en la
          tienda. © 2026 Notebooks.com.ar
        </div>
      </div>
    </footer>
  );
}
