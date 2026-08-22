import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { grafo, organizacionLd, sitioLd } from "@/lib/schema";
import { DESCRIPCION_SITIO, NOMBRE_SITIO, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  /**
   * `metadataBase` es lo que convierte los canonical relativos de cada página en absolutos.
   * Sale de `lib/site.ts` para que staging se declare a sí mismo y no a producción: el
   * mismo build sirve en los dos lados y la diferencia es una variable de entorno.
   */
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${NOMBRE_SITIO} — El comparador de notebooks de Argentina`,
    template: `%s | ${NOMBRE_SITIO}`,
  },
  description: DESCRIPCION_SITIO,
  applicationName: NOMBRE_SITIO,
  /**
   * `alternates.canonical` **no** va acá.
   *
   * En el App Router la metadata se hereda, así que un canonical en el layout hace que cada
   * página del sitio se declare como copia de la home. El canonical vive por ruta, con
   * `metaRuta()` de `lib/seo.ts`.
   */
  openGraph: {
    siteName: NOMBRE_SITIO,
    locale: "es_AR",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
    // `max-image-preview:large` es lo que permite que Google muestre la foto del equipo en
    // el resultado. En un comparador la imagen es la mitad del click.
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  formatDetection: { telephone: false },
};

// El Header lee de Supabase (sin cache) → todo el árbol se renderiza en vivo.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body>
        {/**
         * El grafo del sitio, una sola vez y en el layout.
         *
         * `Organization` y `WebSite` son los dos nodos a los que apuntan por `@id` todos los
         * demás (cada oferta declara su `seller`, cada artículo su `publisher`). Si vivieran
         * en cada página serían N entidades distintas con el mismo nombre; acá son una.
         */}
        <JsonLd data={grafo(organizacionLd(), sitioLd())} />
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-navy focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Saltar al contenido
        </a>
        <Header />
        <main id="contenido" className="min-h-[60vh]">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
