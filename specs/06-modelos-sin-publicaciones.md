# 06 — Modelos sin publicaciones + aviso por email

## Objetivo
Poder cargar modelos canónicos que **todavía no tienen ninguna publicación** de tienda, y darles una
página que le explique al usuario que aún no hay vendedores ofreciendo ese equipo, ofreciéndole
**dejar su email para recibir un aviso** cuando el modelo se publique. Captura demanda temprana
(señal para priorizar scraping/negociación con tiendas) y no deja "agujeros" cuando alguien busca un
modelo conocido que aún no está indexado.

## Estado actual (reutilizar)
- `models` y `listings` ya están separados: un modelo puede existir sin listings (hoy `enrich` le
  pone `bestPrice: 0`, `listings: []`).
- Ya existe `price_alerts` (email + `model_id` + `target_price`) y la API `/api/alertas`. La captura
  de "avísame cuando se publique" es el **mismo patrón** con un flag distinto.
- El admin ya crea modelos ("+ Crear modelo" / `/admin/nuevo-modelo`).

## Comportamiento de un modelo sin ofertas
Hoy `filterModels`/`getModels` incluyen modelos con 0 listings (aparecerían con precio $0). Definir
política explícita:
- **Listado `/notebooks` y home**: **excluir** modelos con `listings.length === 0` (no mostrar cards
  a $0). Filtrar en `getModels`/`filterModels` o en las vistas.
- **Ficha `/notebooks/[brand]/[slug]`**: si el modelo existe pero no tiene ofertas confirmadas →
  renderizar en **modo "próximamente disponible"** (ver UI), no `notFound()`.
- **Sitemap**: incluir estas fichas (son SEO válido: "precio Lenovo XYZ") pero marcadas como sin oferta.

## Modelo de datos — migración `0007_model_notify.sql`
Se puede reutilizar `price_alerts` con un flag, o crear tabla propia (más limpio semánticamente):
```sql
create table if not exists model_notify (
  id           bigint generated always as identity primary key,
  email        text not null,
  model_id     text not null references models(id) on delete cascade,
  user_id      uuid,                       -- opcional, si hay login (spec 07)
  notified_at  timestamptz,
  created_at   timestamptz default now(),
  unique (email, model_id)
);
alter table model_notify enable row level security;
create policy "public insert model_notify" on model_notify for insert with check (true);
create index if not exists model_notify_model_idx on model_notify (model_id) where notified_at is null;
```
(Alternativa: agregar `kind text default 'price_drop'` a `price_alerts` con valor `'availability'` y
`target_price null`. Documentado, pero se prefiere tabla propia para no mezclar loops.)

## UI — ficha en modo "próximamente"
En `.../[brand]/[slug]/page.tsx`, cuando `model.listings.length === 0`:
- Ocultar bloque de "mejor precio", tabla de ofertas, termómetro e historial.
- Mostrar un estado claro: "Todavía ninguna tienda publicó este modelo. Te avisamos apenas aparezca."
- Formulario de captura de email (componente `NotifyAvailabilityForm`, hermano de `PriceAlertForm`)
  → `POST /api/notificar` → insert en `model_notify`. Confirmación inline + antifraude básico
  (honeypot, validación de email).
- Igual mostrar specs, recomendación por uso y modelos similares (con oferta) para no dejar la página
  vacía y dar salidas.

## Alta de estos modelos
- Desde `/admin/nuevo-modelo` (ya existe): permitir crear el modelo sin exigir listing. Marca visual en
  el admin de "modelo sin ofertas".
- Opcional: importación en lote (CSV/seed) de modelos "catálogo" conocidos aunque no estén a la venta.

## Worker de aviso (cron)
- Cuando el pipeline (`scrapers/run.mjs`) o el admin confirman la **primera** publicación de un modelo,
  disparar aviso a los `model_notify` con `notified_at is null` de ese `model_id`.
- Reutiliza la infra de emails pendiente (el mismo worker que las alertas de precio del BACKLOG). Al
  enviar, setear `notified_at`. Idempotente (el `unique(email, model_id)` evita duplicados).
- Enlaza con el TODO de `BACKLOG.md`: "worker de emails de alertas".

## Criterios de aceptación
- [ ] Un modelo con 0 listings no aparece en home ni en `/notebooks`, pero su ficha carga en modo
      "próximamente" (no 404).
- [ ] Dejar el email inserta en `model_notify` y confirma; reenviar el mismo email no duplica.
- [ ] Al publicarse la primera oferta, los suscriptores quedan marcados para aviso (`notified_at`).
- [ ] La ficha "próximamente" no muestra precio $0 ni tablas vacías.

## Notas
- El envío real de email depende del worker de correo (compartido con alertas de precio); mientras no
  exista, la captura igual acumula demanda (valor por sí sola).
- Si se implementa login (spec 07), asociar `user_id` cuando el usuario esté logueado, para poder
  mostrar "modelos que estás esperando" en su perfil.
