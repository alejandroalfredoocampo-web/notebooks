# 10 — Monetización Fase 1: destacados pagos + tier de tienda

Aterriza la **Fase 1** de [05-monetizacion-dos-puntas.md](../05-monetizacion-dos-puntas.md): cobrarle a
la tienda por **visibilidad** (slot patrocinado) y por **tráfico** (CPC sobre los click-outs que ya
medimos), sin tocar el ranking por precio. Es el primer ingreso escalable de bajo riesgo.

## Objetivo
- Vender a las tiendas un lugar **destacado y rotulado "Patrocinado"** (separado de la lista ordenada
  por precio) + un perfil enriquecido ("Verificada+").
- Empezar a **cobrar el CPC** de los click-outs que ya persistimos (`click_outs`), con un reporte de
  facturación en el admin (la facturación en sí es offline por ahora).

## Regla de oro (innegociable)
El listado y la tabla de ofertas se ordenan **siempre por precio**. Lo pago vive en **slots aparte,
visualmente distintos y con la etiqueta "Patrocinado"**. Nunca se compra una mejor posición dentro del
orden por precio. (Modelo Trivago/MELI; es nuestro diferencial de confianza.)

## Decisiones de negocio (las define el usuario — [DECISIÓN])
- **[DECISIÓN] Precio del CPC** por click-out (¿fijo p/todas, por tienda, por categoría?). El código
  guarda un `cpc_ars` por tienda; el valor lo carga el operador.
- **[DECISIÓN] Precio del destacado**: ¿tarifa mensual fija por estar "Destacada", CPC más alto, o
  ambos? MVP asume **flag manual** que el operador activa tras acordar comercialmente (fee offline).
- **[DECISIÓN]** ¿El slot patrocinado se cobra por CPC, por impresión (CPM) o por período fijo? MVP:
  período fijo (flag `featured` + `featured_until`), y el CPC corre por separado sobre los click-outs.

## Estado actual (reutilizar)
- `stores` ya tiene `verified` (insignia editorial) + perfil (logo, descripción, redes) de spec 04.
- `click_outs` ya persiste cada salida a tienda (listing/store/model/precio/fecha) → base del CPC.
- `StoreRating`, perfil `/tiendas/[slug]`, listado `/tiendas` y la ficha ya existen.
- El footer ya declara "cómo ganamos dinero" y define el rótulo **Patrocinado**.

## Modelo de datos — migración `0011_store_tiers.sql`
```sql
alter table stores add column if not exists tier          text default 'free'
  check (tier in ('free','verified','featured'));   -- free | Verificada | Verificada+/Destacada
alter table stores add column if not exists featured      boolean default false; -- slot patrocinado activo
alter table stores add column if not exists featured_until date;                 -- vigencia del destacado
alter table stores add column if not exists cpc_ars       int;                   -- tarifa CPC acordada (ARS), null = no monetizado
```
- `verified` (bool, spec 04) se mantiene por compatibilidad; `tier` lo subsume (`verified`/`featured`).
  Derivar el badge de `tier` y dejar `verified` como espejo de `tier != 'free'`.
- Extender `Store` en `types.ts` + `mapStore` en `data.ts`/`adminData.ts`.
- Un destacado está **activo** si `featured = true AND (featured_until is null OR featured_until >= today)`.

## UI pública (respetando la regla de oro)
1. **Badge de tier**: "✓ Verificada" (tier=verified) y "★ Verificada+" o "Destacada" (tier=featured) en
   la ficha, `/tiendas` y el perfil. Componente `StoreTierBadge` (reemplaza el badge inline actual).
2. **Módulo "Tiendas destacadas · Patrocinado"**: en `/tiendas` (arriba) y opcionalmente en la home,
   una fila de tiendas con `featured` activo, **rotulada "Patrocinado"**. Orden entre ellas: aleatorio
   o por `featured_until`/prioridad, NO por precio (no es la lista de precios).
3. **Slot patrocinado en `/notebooks`**: una card/fila **separada y rotulada "Patrocinado"** (p. ej. una
   tienda destacada o una promo), visualmente distinta de la grilla ordenada por precio. La grilla de
   modelos **no cambia de orden**. Opcional en MVP (se puede lanzar solo con 1 y 2).
4. **Perfil "Verificada+" enriquecido**: en `/tiendas/[slug]`, las featured muestran más (banner,
   descripción destacada, redes, CTA). Reusa los campos de perfil de spec 04.
5. La ficha de producto: **la tabla de ofertas NO se toca** (sigue por precio). A lo sumo, el badge de
   tier de cada tienda (ya está el de verified).

## Admin
- **Editar tier/destacado de una tienda**: en el perfil de tienda del admin (o `/admin/solicitudes` al
  aprobar), setear `tier`, `featured`, `featured_until`, `cpc_ars`. API `/api/admin/store` (PATCH).
- **Reporte de facturación CPC** (`/admin/facturacion` o dentro de `/admin`): por tienda y rango de
  fechas, contar `click_outs` y multiplicar por `cpc_ars` → monto a facturar. Solo lectura/exportable
  (CSV). La facturación real es offline. Reutiliza `click_outs` (ya tiene `store_id`, `created_at`).

## Transparencia / confianza
- Todo slot pago rotulado **"Patrocinado"** (ya definido en el footer).
- Mantener la nota de afiliación en la ficha/perfil cuando corresponda.
- El texto de "cómo ganamos dinero" del footer debería mencionar los destacados además de la afiliación.

## Métricas de éxito
- Tiendas con `tier != 'free'` activas y **ingreso por tienda**.
- CTR del módulo/slot patrocinado vs. click-outs orgánicos.
- % de click-outs monetizados (con `cpc_ars` cargado) e **ingreso por click-out**.
- Que la neutralidad no se resienta: CTR global del listado y bounce no deben caer al introducir el slot.

## Criterios de aceptación
- [ ] El listado `/notebooks` y la tabla de la ficha **siguen ordenados por precio**; ningún flag de
      tier/featured altera ese orden.
- [ ] Una tienda `featured` activa aparece en el módulo "Patrocinado" de `/tiendas`, rotulado como tal.
- [ ] El badge refleja el `tier` (free sin badge, verified "✓ Verificada", featured "★ Verificada+").
- [ ] `featured_until` en el pasado ⇒ la tienda deja de aparecer como destacada (sin redeploy).
- [ ] El reporte de admin cuenta click-outs por tienda en un rango y calcula `clicks × cpc_ars`.
- [ ] Nada de esto se rompe si `tier`/`cpc_ars` están vacíos (default `free`, sin badge, sin cobro).

## Fuera de alcance (fases siguientes)
- Cobro/checkout automático (hoy la facturación es offline).
- Sponsoreo a nivel modelo/keyword y subasta CPC en tiempo real.
- SaaS de inteligencia de precios y leads RFQ pagos (Fase 2 del doc de monetización).
- Retail media / ads de marcas (Fase 4).

## Notas
- Empezar por lo más barato y de menor riesgo: **badge de tier + módulo "Destacadas (Patrocinado)" en
  `/tiendas` + reporte CPC**. El slot en `/notebooks` puede ir en una segunda iteración.
- Al vender por resultado (CPC) en vez de fee fijo, la propuesta a la tienda argentina es más fácil
  ("pagás por el tráfico que te mandamos"); el reporte de admin es la prueba de valor.
