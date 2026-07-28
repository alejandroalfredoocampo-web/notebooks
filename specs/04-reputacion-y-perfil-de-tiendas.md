# 04 — Reputación y perfil de tiendas

## Objetivo
En la ficha de producto, junto a cada oferta, mostrar un **resumen de reputación** de la tienda
(rating de Google, estrellas, cantidad de reseñas) para que el usuario decida con más confianza. Y dar
a cada tienda una **landing de perfil** (`/tiendas/[slug]`) chica con sus datos básicos, reputación,
medios de pago/envío y su listado de ofertas.

## Estado actual (reutilizar)
- El formulario "sumá tu tienda" (`store_applications`, migración `0003`) **ya captura**
  `google_rating`, `google_reviews_count`, `google_maps_url`, redes sociales, medios de pago, envíos,
  local físico, etc. Esta feature **expone** esos datos: al aprobar una solicitud se copian a `stores`.
- `stores` hoy tiene: `id, name, slug, url, type, physical_store, city, affiliate, verified`. No tiene
  campos de reputación.
- La insignia "✓ Verificada" ya se muestra en la ficha (`verified`).
- `/tiendas` hoy es el formulario de alta + (según BACKLOG) listado de tiendas indexadas.

## Modelo de datos — migración `0006_store_profile.sql`
```sql
alter table stores add column if not exists logo_url             text;
alter table stores add column if not exists description          text;   -- 1–2 frases
alter table stores add column if not exists google_rating        numeric; -- 0..5
alter table stores add column if not exists google_reviews_count int;
alter table stores add column if not exists google_maps_url      text;
alter table stores add column if not exists rating_updated_at    timestamptz;
alter table stores add column if not exists socials              jsonb;   -- { instagram, facebook, ... }
alter table stores add column if not exists payment_methods      text;
alter table stores add column if not exists ships_nationwide     boolean;
alter table stores add column if not exists physical_address     text;
```
- Extender `mapStore` en `src/lib/data.ts` y la interfaz `Store` en `src/lib/types.ts`.
- Al **aprobar** una solicitud (`/api/admin/solicitud`), copiar los campos de reputación/redes de
  `store_applications` a la fila `stores` creada.
- **Frescura del rating**: el rating de Google es un dato manual/semi-manual. Guardar
  `rating_updated_at` y mostrar "actualizado el …". La actualización automática vía Google Places API
  queda fuera de MVP (requiere API key y costo); documentarla como futuro.

## UI — resumen en la ficha (junto a cada oferta)
En `.../[brand]/[slug]/page.tsx`, en cada fila/card de tienda, agregar un bloque compacto:
- `★ 4,6` (estrellas renderizadas) + `(1.234)` reseñas, linkeable a `google_maps_url` (nueva pestaña,
  `rel="noopener nofollow"`).
- Si la tienda no tiene rating cargado → no mostrar el bloque (no inventar).
- Convivir con las badges existentes ("✓ Verificada", "★ mejor en cuotas") sin saturar: en mobile,
  rating debajo del nombre; en desktop, en la celda "Tienda".
- Componente reutilizable `StoreRating` (estrellas + conteo), usado también en la landing.

## UI — perfil de tienda `/tiendas/[slug]`
- Ruta `src/app/tiendas/[slug]/page.tsx` (`force-dynamic`). `getStoreBySlug` ya existe.
- **Hero**: logo, nombre, badge Verificada, `StoreRating`, `description`, ciudad/provincia, tipo
  (online / local físico), envíos a todo el país, medios de pago, links a web oficial y redes.
- **Listado**: todas las ofertas confirmadas de esa tienda agrupadas por modelo → `ModelCard` o una
  tabla "modelo · precio en esta tienda". Derivar con `getModels()` filtrando `listings` por `storeId`
  (agregar helper `getModelsByStore(storeId)` en `data.ts`).
- Nota de transparencia si la tienda es afiliada (patrón del `Footer`).
- Linkear el nombre de la tienda (ficha, `/tiendas`) a su perfil.

## SEO
- `generateMetadata` por tienda. JSON-LD `@type: Store`/`LocalBusiness` con `aggregateRating`
  (rating + reviewCount) cuando haya datos. Sumar perfiles al `sitemap.ts`.
- **Cuidado**: solo declarar `aggregateRating` en JSON-LD si el dato es real y atribuido a Google
  (evitar penalización por reseñas propias inexistentes). Marcar la fuente ("Reseñas de Google").

## Criterios de aceptación
- [ ] Al aprobar una solicitud con rating de Google, el perfil y la ficha muestran las estrellas.
- [ ] Una tienda sin rating no muestra bloque de estrellas (ni JSON-LD de rating).
- [ ] `/tiendas/[slug]` lista las ofertas reales de esa tienda con precios en vivo.
- [ ] El rating linkea al Google Maps de la tienda y muestra "actualizado el …".

## Notas
- No calcular ni promediar reseñas propias: la señal es la reputación externa (Google), presentada
  como tal. Evita responsabilidad editorial sobre reviews.
- Reusar el `EntityHero` compartido con la landing de marca (spec 02).
