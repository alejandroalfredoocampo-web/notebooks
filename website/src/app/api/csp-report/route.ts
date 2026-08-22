import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Receptor de los informes de la CSP (`report-uri`).
 *
 * ## Para qué sirve mientras la política está en report-only
 *
 * Es el único lugar donde se ve qué origen real usa el sitio y la lista no cubre. Sin esto,
 * pasar la CSP a *enforce* es adivinar: se prende, algo deja de cargar y nadie se entera
 * hasta que un cliente avisa que "no se ven las fotos".
 *
 * ## Por qué descarta antes de parsear
 *
 * Es un endpoint público que acepta POST sin ninguna credencial, porque así lo define la
 * especificación: el que reporta es el navegador del visitante. O sea que **cualquiera
 * puede mandarle lo que quiera**. Un cuerpo de 10 MB parseado como JSON es memoria y CPU
 * regalada, y en un runtime serverless es factura. Por eso el orden es: mirar el
 * `content-length`, mirar el `content-type`, y recién ahí leer.
 *
 * Y siempre contesta **204 sin cuerpo**, incluso cuando descarta: un atacante que ve
 * distintas respuestas aprende dónde está el corte. Un navegador legítimo no mira la
 * respuesta de un informe de CSP.
 */

/** 64 KB. Un informe real son ~700 bytes; el margen es para los que traen `sample`. */
const MAX_BYTES = 64 * 1024;

const TIPOS = [
  "application/csp-report",
  "application/reports+json",
  "application/json",
];

/** Lo único que se loguea. El resto del informe es ruido y a veces trae URLs con tokens. */
type Informe = {
  "blocked-uri"?: string;
  "violated-directive"?: string;
  "effective-directive"?: string;
  "document-uri"?: string;
};

export async function POST(req: Request) {
  const vacio = new NextResponse(null, { status: 204 });

  const largo = Number(req.headers.get("content-length") ?? "0");
  if (largo > MAX_BYTES) return vacio;

  const tipo = (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!TIPOS.includes(tipo)) return vacio;

  let cuerpo: unknown;
  try {
    const texto = await req.text();
    // `content-length` puede faltar o mentir (transfer-encoding chunked): se vuelve a
    // medir sobre lo que realmente llegó.
    if (texto.length > MAX_BYTES) return vacio;
    cuerpo = JSON.parse(texto);
  } catch {
    return vacio;
  }

  // Dos formatos conviven: el viejo (`{"csp-report": {...}}`) y el nuevo Reporting API
  // (`[{ "type": "csp-violation", "body": {...} }]`). Se aceptan los dos.
  const informes: Informe[] = Array.isArray(cuerpo)
    ? (cuerpo as { body?: Informe }[]).map((r) => r?.body ?? {})
    : [((cuerpo as { "csp-report"?: Informe })?.["csp-report"] ?? {}) as Informe];

  for (const i of informes) {
    const directiva = i["effective-directive"] || i["violated-directive"];
    const bloqueado = i["blocked-uri"];
    if (!directiva && !bloqueado) continue;
    // Sólo la directiva, el origen bloqueado y la página. La URL completa del recurso
    // bloqueado no entra: en un informe de `form-action` puede traer parámetros.
    console.warn("[csp]", {
      directiva,
      bloqueado: origenDe(bloqueado),
      pagina: rutaDe(i["document-uri"]),
    });
  }

  return vacio;
}

function origenDe(uri?: string): string | undefined {
  if (!uri) return undefined;
  // Los valores especiales de la spec (`inline`, `eval`, `data`) no son URLs.
  if (!uri.includes("://")) return uri;
  try {
    return new URL(uri).origin;
  } catch {
    return "(url inválida)";
  }
}

function rutaDe(uri?: string): string | undefined {
  if (!uri) return undefined;
  try {
    return new URL(uri).pathname;
  } catch {
    return undefined;
  }
}
