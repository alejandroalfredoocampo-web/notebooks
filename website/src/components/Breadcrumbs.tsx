import Link from "next/link";

export type Miga = { nombre: string; path: string };

/**
 * Miga de pan visible.
 *
 * Va acompañada siempre del `breadcrumbLd` correspondiente: la versión visible es para la
 * persona y para el crawler que lee links, y el JSON-LD es lo que hace que Google muestre
 * la ruta en el resultado en vez de la URL cruda. Los dos salen de la misma lista, así que
 * no se pueden contradecir.
 *
 * El último item no es un link: es la página en la que ya estás, y linkear a sí misma es
 * ruido para un lector de pantalla.
 */
export default function Breadcrumbs({ items }: { items: Miga[] }) {
  return (
    <nav aria-label="Miga de pan" className="pt-5 text-[13px] text-slate-400">
      <ol className="flex flex-wrap items-center gap-x-1.5">
        {items.map((it, i) => {
          const ultimo = i === items.length - 1;
          return (
            <li key={it.path} className="flex items-center gap-x-1.5">
              {ultimo ? (
                <span aria-current="page" className="font-semibold text-slate-600">
                  {it.nombre}
                </span>
              ) : (
                <>
                  <Link href={it.path} className="hover:text-brand-blue">
                    {it.nombre}
                  </Link>
                  <span aria-hidden="true">/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
