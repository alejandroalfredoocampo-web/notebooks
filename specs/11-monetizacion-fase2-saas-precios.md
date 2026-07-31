# 11 — Monetización Fase 2: SaaS de inteligencia de precios + leads RFQ

Aterriza la **Fase 2** de [05-monetizacion-dos-puntas.md](../05-monetizacion-dos-puntas.md): el producto
**defendible** (moat), porque usa nuestro **dato propio** (historial de precios + listados de todas las
tiendas) para darle a cada tienda algo que no puede conseguir sola: **dónde está cara o barata vs. el
mercado**. Se suma la monetización de **leads corporativos** (RFQ) del portal (spec 08 Fase B).

## Objetivo
- **Inteligencia de precios por tienda** (dentro del `/portal`): para cada modelo que la tienda vende,
  su precio vs. el mejor precio del mercado y el promedio; en cuántos es la más barata ("wins"); y las
  **oportunidades** (modelos donde está más cara que la competencia).
- **Leads RFQ como producto pago**: monetizar el acceso a cotizar solicitudes corporativas.

## Regla de oro (se mantiene)
El sitio público sigue ordenando **por precio**. Esto es una herramienta B2B **dentro del portal
logueado**; no cambia nada de la experiencia del comprador ni el ranking.

## Estado actual (reutilizar)
- **Portal de tiendas** (`/portal`, spec 08 Fase B) con auth por `store_members` (Supabase Auth).
- **Datos**: `getModels()` ya trae cada modelo con sus `listings` (precio por tienda) + `avg90`/
  `minHistoric`/historial. Todo esto es **derivado de datos ya públicos** en el comparador.
- **Tiers de tienda** (spec 10): `tier` (free/verified/featured) → posible palanca de gating.

## Parte A — Dashboard de inteligencia de precios (buildable ya)

### Cálculo (todo derivado de datos públicos)
Para la tienda `S`, sobre cada modelo `M` que `S` vende (tiene listing confirmado):
- `storePrice` = precio de `S` en `M`.
- `bestPrice` = menor precio de mercado en `M`; `marketAvg` = promedio de precios de `M`.
- `rank` = posición de `S` entre las tiendas de `M` (1 = más barata); `totalStores`.
- `gapToBestPct` = cuánto está `S` por encima del más barato (0 si es la más barata).
- `isCheapest` = `rank === 1`.
- KPIs agregados: `modelsSold`, `wins` (cuántos es la más barata), `avgGapPct`, y **top oportunidades**
  (modelos con mayor `gapToBestPct` → dónde bajar para ganar la posición).

### API
`GET /api/portal/insights?storeId=X` → computa el reporte con `getModels()` (server, anon) y devuelve
`{ kpis, rows }`. Es data derivada de lo ya público, por eso no requiere RLS especial (ver "Seguridad").

### UI (en `/portal`, sección nueva)
- Fila de **KPIs**: modelos que vende, en cuántos es la más barata (wins), gap promedio.
- **Tabla de oportunidades** (orden por `gapToBestPct` desc): modelo · tu precio · mejor precio ·
  promedio · tu puesto (rank/total) · gap %. Resalta dónde está más lejos del mejor (para actuar).
- Reusar el look de las cards/tablas existentes; enlazar cada modelo a su ficha.

## Parte B — Leads RFQ como producto pago (gating + medición)

- Hoy (Fase B) cualquier tienda vinculada ve las RFQ abiertas y cotiza libre.
- **Monetización**: cobrar por el **acceso a cotizar** (lead). Dos modelos posibles **[DECISIÓN de negocio]**:
  1. **Gating por tier**: solo tiendas `verified`/`featured` (que pagan) pueden cotizar; `free` ve la RFQ
     ofuscada con CTA "mejorá tu plan para cotizar".
  2. **Pay-per-lead**: cada cotización enviada es un lead facturable; se cuenta y se factura offline
     (igual que el CPC de Fase 1).
- **MVP sugerido**: implementar **medición** (contar cotizaciones/leads por tienda) + un **gate por tier
  configurable** (flag), y dejar el precio del lead como dato que carga el operador. Reporte de leads
  por tienda en `/admin/monetizacion` (junto al CPC).

## Seguridad / privacidad
- El dashboard usa **datos ya públicos** (precios visibles en el comparador), sólo reordenados para la
  tienda → no hay filtración de datos nuevos. Aun así, idealmente el endpoint debería validar que quien
  pide el reporte de `storeId=X` sea miembro de esa tienda. Con el auth **client-side** actual eso no se
  puede verificar server-side sin sumar verificación de JWT. **MVP**: endpoint abierto sobre data pública
  (documentado); **refinamiento**: verificar el token de Supabase en el route handler.
- Los leads corporativos sí tienen datos de contacto → su gating/medición respeta lo de spec 08.

## Métricas de éxito
- Tiendas que entran al dashboard (uso), retención semanal.
- Correlación uso del dashboard ↔ mejoras de posición (¿bajan precios donde ven gap?).
- Leads: cotizaciones por tienda, conversión de RFQ a cotización, ingreso por lead.

## Criterios de aceptación
- [ ] En `/portal`, una tienda logueada ve sus KPIs y la tabla de oportunidades con números correctos
      (su precio vs. mejor/promedio, rank, gap) para los modelos que vende.
- [ ] El cálculo usa datos en vivo (mismos precios que el sitio público).
- [ ] Nada de esto cambia el orden por precio del sitio público.
- [ ] (Parte B) Se cuentan las cotizaciones por tienda para facturación; el gate por tier se puede
      activar/desactivar sin romper el portal.

## Fuera de alcance (siguiente)
- Alertas de precio de la competencia por email a la tienda (depende del worker de emails).
- Histórico de posición competitiva en el tiempo (hoy es foto actual; el historial existe pero graficar
  la evolución de "share of best price" es una iteración).
- Checkout/cobro automático de la suscripción (facturación offline por ahora).

## Notas
- **Empezar por la Parte A** (dashboard): es puro cálculo sobre datos que ya tenemos, alto valor
  percibido y bajo riesgo. La Parte B (gating/medición de leads) es más decisión de negocio.
- Es la palanca con mayor defensibilidad: cuanto más historial acumulamos, más valioso el dashboard.
