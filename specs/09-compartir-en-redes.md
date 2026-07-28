# 09 — Compartir una publicación o equipo en redes sociales

## Objetivo
Permitir compartir fácilmente una ficha de modelo (y artículos del blog / landings) en redes sociales
y por mensajería, para que los usuarios inviten a otros y crezca el alcance orgánico. Incluye un botón
de compartir y **tarjetas Open Graph** bien armadas para que el link se vea atractivo al pegarlo.

## Alcance
- **MVP**: botón "Compartir" en la ficha (`.../[brand]/[slug]`) usando la **Web Share API** nativa en
  mobile, con fallback a links directos (WhatsApp, X/Twitter, Facebook, Telegram, copiar link) en
  desktop. Tags Open Graph / Twitter Card en ficha, blog (spec 01) y marcas (spec 02).
- **Fuera de MVP**: imágenes OG dinámicas por modelo (precio + specs renderizados), tracking avanzado
  de virality, incentivos por compartir.

## Componente `ShareButton` (client component)
- Props: `url` (absoluta), `title`, `text` (ej. "Mirá el precio del Lenovo LOQ: desde $X en N tiendas").
- Si `navigator.share` existe → botón único que abre la hoja de compartir nativa (`navigator.share({
  title, text, url })`). Ideal en mobile.
- Si no → menú con links directos:
  - WhatsApp: `https://wa.me/?text=<text+url encoded>`
  - Telegram: `https://t.me/share/url?url=<url>&text=<text>`
  - X/Twitter: `https://twitter.com/intent/tweet?text=<text>&url=<url>`
  - Facebook: `https://www.facebook.com/sharer/sharer.php?u=<url>`
  - **Copiar link**: `navigator.clipboard.writeText(url)` + confirmación "¡Copiado!".
- Todos los links externos con `target="_blank" rel="noopener"`. Encodear bien los parámetros.
- Ubicación en la ficha: junto al CTA "⚖️ Comparar con otras notebooks" (barra de acciones del modelo).

## Open Graph / Twitter Cards
- En `generateMetadata` de la ficha, agregar `openGraph` y `twitter`:
  - `og:title` = `{brand} {name} — desde {mejor precio}`
  - `og:description` = resumen (specs + N tiendas), reutilizando la description ya existente.
  - `og:image` = `model.imageUrl` (con fallback a un OG genérico del sitio en `/public`).
  - `og:url`, `og:type=product`, `twitter:card=summary_large_image`.
- Hacer lo propio en blog (spec 01) y marcas (spec 02). Requiere una **URL absoluta base**
  (`NEXT_PUBLIC_SITE_URL` o derivar de headers) para construir `og:url`/imágenes.

## Tracking (opcional) — migración `0010_shares.sql`
Para medir qué se comparte (útil para producto/afiliados). Reutiliza el patrón de `click_outs`:
```sql
create table if not exists shares (
  id         bigint generated always as identity primary key,
  entity     text not null,        -- 'model' | 'post' | 'brand'
  entity_id  text not null,
  channel    text,                 -- 'native' | 'whatsapp' | 'twitter' | 'copy' | ...
  referrer   text,
  created_at timestamptz default now()
);
alter table shares enable row level security;
create policy "public insert shares" on shares for insert with check (true);
```
`POST /api/share` (fire-and-forget, no bloquea el share). Es opcional: el compartir funciona sin esto.

## Criterios de aceptación
- [ ] En mobile con soporte, "Compartir" abre la hoja nativa con título, texto y URL correctos.
- [ ] En desktop, el menú ofrece WhatsApp/X/Facebook/Telegram/copiar y "copiar" confirma.
- [ ] Pegar la URL de una ficha en WhatsApp/redes muestra imagen, título con precio y descripción (OG).
- [ ] Los links externos usan `rel="noopener"` y parámetros correctamente encodeados.

## Notas
- Las OG cards son el 80% del valor: aunque el usuario solo copie el link, que se vea bien es lo que
  genera clicks. Priorizar los tags OG por encima del menú de canales.
- Imágenes OG dinámicas (Next.js `ImageResponse` / `opengraph-image.tsx` con precio y specs) son una
  mejora de alto impacto para una segunda iteración.
- No requiere spec 07 (login); es puramente aditivo y anónimo.
