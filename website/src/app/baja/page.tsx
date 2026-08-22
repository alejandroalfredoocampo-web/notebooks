import type { Metadata } from "next";
import Link from "next/link";
import { unsubToken } from "@/lib/unsubToken";
import { metaPrivada } from "@/lib/seo";

// `follow: true` a propósito: la página no se indexa pero sus links al catálogo sí se
// siguen. Es la diferencia entre "no muestres esto" y "hacé de cuenta que no existe".
export const metadata: Metadata = metaPrivada("Baja de alerta");
export const dynamic = "force-dynamic";

export default function BajaPage({
  searchParams,
}: {
  searchParams: { id?: string; t?: string; ok?: string; err?: string };
}) {
  const { id, t, ok, err } = searchParams;
  const valid = id && t && t === unsubToken(id);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      {ok ? (
        <>
          <h1 className="text-2xl font-extrabold">Listo ✓</h1>
          <p className="mt-2 text-slate-600">Te diste de baja de esa alerta. No vas a recibir más avisos de ese modelo.</p>
        </>
      ) : err || !valid ? (
        <>
          <h1 className="text-2xl font-extrabold">Link inválido</h1>
          <p className="mt-2 text-slate-600">No pudimos procesar la baja. El link puede estar vencido o ser incorrecto.</p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-extrabold">¿Dar de baja esta alerta?</h1>
          <p className="mt-2 text-slate-600">Dejarás de recibir avisos de precio de este modelo.</p>
          <form action="/api/baja" method="post" className="mt-5">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="t" value={t} />
            <button
              type="submit"
              className="rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-darker"
            >
              Confirmar baja
            </button>
          </form>
        </>
      )}
      <div className="mt-6">
        <Link href="/" className="text-sm font-semibold text-brand-blue hover:underline">
          ← Volver al inicio
        </Link>
      </div>
    </div>
  );
}
