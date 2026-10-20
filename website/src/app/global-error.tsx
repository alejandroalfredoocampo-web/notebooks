"use client";

import { useEffect } from "react";
import { recargarPagina, recargarSiEsDeDeploy } from "@/lib/recarga-por-deploy";

/**
 * La red de más abajo: se dibuja cuando lo que se rompe es el **layout raíz**.
 *
 * `error.tsx` cubre los errores de una ruta, pero vive *adentro* del layout: si falla el layout
 * mismo, no hay dónde dibujarlo. Este archivo reemplaza el documento entero, y por eso trae sus
 * propios `<html>` y `<body>` — es el único del proyecto además de `layout.tsx` que los lleva.
 *
 * Es también el caso más grave: un layout roto es el sitio entero caído, no una página. Acá el
 * layout hace consultas en vivo (el Header lee de Supabase con `dynamic = "force-dynamic"`), así
 * que la base caída es un camino real hasta esta pantalla, no una hipótesis.
 *
 * **Va sin Tailwind a propósito.** Si el layout raíz falló, puede haber fallado justamente al
 * cargar los estilos; una pantalla de error que depende de la hoja que quizá no cargó es una
 * pantalla en blanco. Los estilos van embebidos con `style`, que React aplica sobre la propiedad
 * `style` del nodo y por lo tanto no lo toca la CSP.
 *
 * Los links son `<a>` y no `<Link>`: si el árbol de React de la aplicación es lo que se rompió,
 * una navegación de cliente puede volver a romperse en el mismo lugar. Una recarga entera no.
 *
 * Sobre el log, vale lo mismo que en `error.tsx`: consola y nunca la URL, porque el link de baja
 * de alertas lleva un HMAC en la query.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (recargarSiEsDeDeploy(error)) return;
    console.error("[error-global]", error?.digest ?? "(sin digest)", error?.message);
  }, [error]);

  const boton: React.CSSProperties = {
    display: "inline-block",
    borderRadius: 8,
    padding: "12px 20px",
    fontSize: 14,
    fontWeight: 700,
    textDecoration: "none",
    cursor: "pointer",
  };

  return (
    <html lang="es-AR">
      <body
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff",
          color: "#131525",
        }}
      >
        <main style={{ maxWidth: 560, padding: "48px 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            El sitio no está respondiendo
          </h1>
          <p style={{ marginTop: 12, fontSize: 15, lineHeight: 1.6, color: "#475569" }}>
            Es un problema nuestro, no tuyo. Probá recargar en un momento.
          </p>

          <div
            style={{
              marginTop: 28,
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              justifyContent: "center",
            }}
          >
            {/* No `reset()`: acá lo roto es el layout raíz, y `reset()` lo vuelve a dibujar igual
                de roto — el botón parecía no hacer nada. Córdoba Notebooks lo encontró así
                (4be1489c). Recargar el documento sí sale. */}
            <button
              onClick={recargarPagina}
              style={{ ...boton, background: "#336EFA", color: "#fff", border: "none" }}
            >
              Recargar
            </button>
            <a
              href="/notebooks"
              style={{ ...boton, border: "1px solid #cbd5e1", color: "#131525" }}
            >
              Ver las notebooks
            </a>
          </div>

          {error?.digest && (
            <p style={{ marginTop: 40, fontSize: 12, color: "#94a3b8" }}>
              Código del error:{" "}
              <code style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                {error.digest}
              </code>
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
