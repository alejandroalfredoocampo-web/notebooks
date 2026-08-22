import type { Metadata } from "next";
import { metaPrivada } from "@/lib/seo";

/**
 * Existe sólo para declarar el `noindex`.
 *
 * La página es un componente de cliente (`"use client"`), y esos **no pueden exportar
 * `metadata`** — es una restricción del App Router, no una preferencia. Sin este layout, la
 * página heredaba el `index: true` del layout raíz y Google indexaba la pantalla de login
 * vacía: contenido sin valor, con el título del sitio, compitiendo con las páginas reales.
 */
export const metadata: Metadata = metaPrivada("Ingresar");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
