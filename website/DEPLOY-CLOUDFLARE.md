# Deploy a Cloudflare Pages (gratis, sin dominio custom)

El sitio usa SSR (filtros de `/notebooks` y el redirect `/salir`), así que se
deploya con el adaptador oficial **`@cloudflare/next-on-pages`**. El resultado
es un sitio en `https://<proyecto>.pages.dev` sin costo ni dominio propio.

## Opción A — Subir el ZIP por el dashboard (lo más rápido)

El zip `notebooks-cloudflare-pages.zip` ya contiene el build listo
(`.vercel/output/static`).

1. Entrá a https://dash.cloudflare.com → **Workers & Pages** → **Create** →
   pestaña **Pages** → **Upload assets**.
2. Nombre del proyecto: `notebooks-com-ar` (define tu URL `*.pages.dev`).
3. Arrastrá el archivo **`notebooks-cloudflare-pages.zip`** y **Deploy**.
4. ⚠️ **Paso obligatorio** (sin esto, las páginas con SSR tiran error 500):
   entrá al proyecto → **Settings → Runtime → Compatibility flags** y agregá
   la flag **`nodejs_compat`** en **Production** *y* en **Preview**. Poné
   también **Compatibility date** = `2024-09-23` o posterior. Después,
   **Deployments → Retry deployment** (o resubí el zip) para que tome la flag.
5. Listo: tu sitio queda en `https://notebooks-com-ar.pages.dev`.

## Opción B — Deploy por CLI (si preferís la terminal)

Requiere Node instalado (ver `DEPLOY.md`). Desde `website/`:

```bash
npm install
npm run pages:build     # genera .vercel/output/static
npx wrangler login      # abre el navegador una vez
npm run pages:deploy    # sube a Cloudflare Pages
```

Con la CLI, la flag `nodejs_compat` la toma automáticamente de `wrangler.toml`.

## Regenerar el zip después de un cambio

```bash
cd website
npm run pages:build
cd .vercel/output/static && zip -r ../../../../notebooks-cloudflare-pages.zip . && cd -
```

## Notas

- **`nodejs_compat` es imprescindible** en el dashboard: la Opción A no lee
  `wrangler.toml`, hay que setear la flag a mano una vez.
- El **tracking de clics** (`/salir`) no persiste a disco en Cloudflare: cada
  clic se emite por `console.log` y se ve en **Deployments → Functions → Logs**
  (o `npx wrangler pages deployment tail`). El paso a base de datos está en el
  roadmap.
- Los datos son el **seed de demo** (10 modelos, 30 ofertas). El pipeline real
  de scrapers corre aparte (ver `scrapers/README.md`).
- Probar el build de Cloudflare en local antes de subir:
  `npm run pages:preview` → http://localhost:8788
