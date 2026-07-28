# Especificaciones — nuevas secciones de Notebooks.com.ar

Este directorio contiene una especificación por cada funcionalidad nueva propuesta. Cada spec está
pensada para poder **construirse directo** sobre la arquitectura actual (Next.js 14 App Router +
TypeScript + Tailwind, datos en Supabase/Postgres con RLS). Ver [[project-overview]] /
`BACKLOG.md` para el estado del MVP.

## Convenciones que asumen todas las specs

- **Lecturas públicas** con la anon key (`src/lib/supabaseServer.ts`), `fetch cache:'no-store'`,
  páginas `force-dynamic`. **Escrituras** (pipeline, admin) con `service_role`
  (`src/lib/supabaseAdmin.ts`), que el asistente NO tiene → las migraciones y seeds los corre el usuario.
- **Migraciones** SQL numeradas en `website/supabase/migrations/` (van `0001`…`0003`). Cada spec que
  toca la DB propone su archivo `00NN_*.sql`. Los números de abajo son un orden sugerido; se pueden
  reordenar mientras la secuencia sea coherente.
- **RLS**: por defecto todo lo nuevo se lee público (`for select using (true)`), el público solo
  puede `insert` en tablas de captura (alertas, clicks, solicitudes), y el admin/pipeline escribe con
  `service_role` (bypassa RLS). Lo que dependa de un usuario logueado usa `auth.uid()` (ver spec 07).
- **Admin**: consola en `/admin`, auth por cookie (`ADMIN_PASSWORD` / `ADMIN_SESSION_TOKEN`,
  `src/lib/adminAuth.ts`). Las secciones de gestión nuevas (blog, tiendas, corporativo) cuelgan de ahí.
- **Mapeo de datos**: la DB usa `snake_case`; la app mapea a `camelCase` en `src/lib/data.ts`
  (`mapStore`/`mapModel`/`mapListing`). Toda columna nueva se agrega también a esos mappers y a
  `src/lib/types.ts`.

## Índice de specs

| # | Spec | Toca DB | Migración sugerida | Complejidad |
|---|------|:------:|:------:|:------:|
| 01 | [Blog + CMS básico](01-blog-cms.md) | sí | `0004` | Media-alta |
| 02 | [Landings por marca](02-landings-por-marca.md) | opcional | `0005` | Baja-media |
| 03 | [Búsqueda por voz en la home](03-busqueda-por-voz.md) | no | — | Baja |
| 04 | [Reputación y perfil de tiendas](04-reputacion-y-perfil-de-tiendas.md) | sí | `0006` | Media |
| 05 | [Chips de specs como filtros](05-chips-como-filtros.md) | no | — | Baja |
| 06 | [Modelos sin publicaciones + aviso por email](06-modelos-sin-publicaciones.md) | sí | `0007` | Media |
| 07 | [Login de usuarios + favoritos/intereses](07-login-favoritos-intereses.md) | sí | `0008` | Alta |
| 08 | [Venta corporativa / mayorista (RFQ)](08-venta-corporativa.md) | sí | `0009` | Alta |
| 09 | [Compartir en redes sociales](09-compartir-en-redes.md) | opcional | `0010` | Baja |

## Dependencias entre specs

- **05 (chips→filtros)** habilita ejes de filtro nuevos (procesador exacto, almacenamiento) que
  **02 (landings de marca)** y **06** reutilizan.
- **04 (reputación de tiendas)** consume el `google_rating` que ya captura el formulario
  `store_applications` (migración `0003`) — es el paso natural para exponerlo.
- **07 (login)** es prerequisito "fuerte" de las recomendaciones por mail y de favoritos, y
  **habilita** que **06 (aviso de modelo)** y **08 (corporativo)** asocien capturas a un usuario
  (aunque ambas funcionan también sólo con email, sin login).
- **09 (compartir)** se apoya en los tags Open Graph que conviene resolver junto con **01 (blog)** y
  **02 (marcas)** para que las tarjetas compartidas se vean bien.

## Fases sugeridas (para priorizar)

1. **Quick wins de front** (sin DB): 03 voz, 05 chips→filtros, 09 compartir. Alto valor, bajo riesgo.
2. **Confianza y SEO**: 04 reputación/perfil de tiendas, 02 landings de marca, 01 blog.
3. **Retención y demanda**: 06 modelos sin oferta, 07 login/favoritos.
4. **Nuevo modelo de negocio**: 08 venta corporativa.
