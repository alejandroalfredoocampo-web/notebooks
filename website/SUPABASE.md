# Deploy con Supabase — runbook

## Recomendación de arquitectura (importante)

Para una **URL de prueba lo antes posible**, lo más simple es:

- **Render** hostea toda la app Next.js como servidor **Node** (`next start`).
- **Supabase** es la base de datos Postgres.
- Cloudflare queda **opcional** (DNS/CDN) para más adelante.

**Por qué Render y no Cloudflare Pages para el MVP:** el admin y las API routes
usan runtime **Node** (leen/escriben datos). En Cloudflare Pages (edge) eso
rompe el build y hay que partir la app. En Render corre Node nativo, así que
**el sitio público + el admin + el pipeline funcionan sin gimnasia de edge**, y
además destraba updates en vivo (sin rebuild) y las alertas. Cloudflare Pages lo
sumamos después si queremos edge/CDN para la parte pública.

Un solo servicio web en Render + Supabase = sitio completo online.

## Pasos

### 1. Supabase (base de datos)
1. Crear un proyecto en https://supabase.com (free tier alcanza).
2. En **SQL Editor**, pegar y correr `supabase/migrations/0001_init.sql`.
3. Anotar de **Project Settings → API**:
   - `SUPABASE_URL` (Project URL)
   - `SUPABASE_ANON_KEY` (anon public)
   - `SUPABASE_SERVICE_ROLE_KEY` (service_role — **secreta**, solo server)

### 2. Cargar los datos actuales
Desde `website/`, con las envs seteadas:
```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed:supabase
```
Carga tiendas, modelos, publicaciones (el seed queda `confirmed`) e historial.

### 3. Render (hosting)
1. Crear un **Web Service** en https://render.com apuntando al repo.
2. Config:
   - Root directory: `website`
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
3. Variables de entorno:
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD`, `ADMIN_SESSION_TOKEN` (para el admin)
4. Deploy → Render da una URL `https://notebooks-com-ar.onrender.com`.

### 4. Scraping periódico (opcional, después)
Un **Cron Job** en Render (o GitHub Actions) que corra `npm run scrape` una vez
por día y escriba en Supabase. Así el historial real empieza a acumularse.

## Estado del código

**Sitio público → Supabase: ✅ hecho y verificado.**
- `src/lib/data.ts` lee todo de Supabase (`getModels/getStores/getDeals/filterModels/...`,
  ahora async). Páginas dinámicas (server-rendered en cada request → datos en vivo).
- `/salir` registra el click-out en la tabla `click_outs`.
- El form de alertas guarda en `price_alerts` vía `/api/alertas`.

**Admin → Supabase: pendiente (próximo paso).** La consola de admin (`adminData.ts`)
todavía lee/escribe archivos JSON. En Render eso funciona para *ver* datos, pero las
escrituras del admin **no persisten entre redeploys** (filesystem efímero). Por eso el
siguiente paso es migrar `adminData.ts` a Supabase (con la `service_role`). Para el
primer deploy de prueba con usuarios no bloquea: los usuarios usan el sitio público,
no el admin.

> El worker que compara precios y **envía** los emails de alerta queda para el cron
> (hoy sólo se **capturan** las suscripciones).

## Qué necesito de vos

No puedo crear cuentas ni completar los logins (OAuth) de Supabase/Render desde
acá. Necesito que:
1. Crees el proyecto de Supabase y corras la migración (paso 1), y
2. Me pases `SUPABASE_URL` + `SUPABASE_ANON_KEY` (la anon es pública, no hay
   problema en compartirla). La `service_role` **no me la pases por chat**:
   seteala vos directo en las envs de Render/local.

Con eso conecto la capa de datos y dejamos el sitio online.
