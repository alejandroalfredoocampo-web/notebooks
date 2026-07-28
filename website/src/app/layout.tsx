import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.notebooks.com.ar"),
  title: {
    default: "Notebooks.com.ar — El comparador de notebooks de Argentina",
    template: "%s | Notebooks.com.ar",
  },
  description:
    "Compará el precio de cada notebook en todas las tiendas de Argentina. Historial de precios, ofertas verificadas y alertas. Gratis y sin registro.",
  openGraph: {
    siteName: "Notebooks.com.ar",
    locale: "es_AR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body>
        <Header />
        <main className="min-h-[60vh]">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
