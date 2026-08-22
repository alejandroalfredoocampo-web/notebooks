import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { TAG_CATALOGO } from "@/lib/data";
import { igualEnTiempoConstante } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

/**
 * Invalidación del caché del catálogo.
 *
 * Es la contraparte de `TAG_CATALOGO` en `lib/data.ts`: el sitio sirve el catálogo desde
 * caché hasta que alguien avisa que cambió, y el que avisa es el scraper cuando termina de
 * escribir. Sin esto, el caché sería sólo un TTL y habría que elegir entre precios viejos y
 * consultar la base en cada visita.
 *
 *     curl -X POST https://www.notebooks.com.ar/api/revalidar \
 *          -H "x-revalidar-token: $REVALIDATE_SECRET"
 *
 * ## Por qué necesita un secreto
 *
 * Sin él, cualquiera vacía el caché en un bucle y cada request vuelve a la base: es un DoS
 * barato contra el plan de Supabase, y no se ve como un ataque en ningún log.
 *
 * ## Modo de falla: cerrado
 *
 * Sin `REVALIDATE_SECRET` configurado, el endpoint contesta 503 y **no invalida**. Es la
 * misma postura que el admin: si falta la variable, no funciona nada en vez de funcionar
 * para cualquiera. El costo de equivocarse hacia el otro lado es un endpoint público que
 * borra el caché del sitio entero.
 */
export async function POST(req: Request) {
  const secreto = process.env.REVALIDATE_SECRET ?? "";
  if (!secreto) {
    console.error("[revalidar] falta REVALIDATE_SECRET: el endpoint queda cerrado");
    return NextResponse.json({ error: "No configurado" }, { status: 503 });
  }

  const token = req.headers.get("x-revalidar-token") ?? "";
  if (!(await igualEnTiempoConstante(token, secreto))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  revalidateTag(TAG_CATALOGO);
  return NextResponse.json(
    { ok: true, invalidado: TAG_CATALOGO },
    { headers: { "cache-control": "no-store" } },
  );
}
