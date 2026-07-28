# Deploy a Vercel (gratis) — paso a paso

Requisito único: instalar Node.js una sola vez. Vercel compila el sitio en la
nube, así que tu máquina solo ejecuta el comando de deploy.

## 1. Instalar Node.js (5 minutos, una sola vez)

**Opción A (recomendada)**: descargá el instalador LTS desde
https://nodejs.org/es → botón verde "LTS" → abrir el `.pkg` y seguir los pasos.

**Opción B (si usás Homebrew)**: `brew install node`

Verificá abriendo la Terminal:

```bash
node --version    # debería mostrar v20.x o superior
```

## 2. Deployar (3 comandos)

```bash
cd "/Users/alejandroocampo/Claude/Projects/Notebooks.com.ar/website"
npx vercel login       # elegí el método con el que creaste tu cuenta
npx vercel --prod      # aceptá los defaults (Enter a todo)
```

Al terminar te da una URL tipo `https://notebooks-com-ar.vercel.app` — ese es
el sitio online. Cada vez que quieras actualizar: `npx vercel --prod` de nuevo.

## 3. (Opcional) Conectar el dominio notebooks.com.ar

En el dashboard de Vercel: proyecto → Settings → Domains → agregar
`notebooks.com.ar` y `www.notebooks.com.ar`, y apuntar el DNS del dominio
según lo que te indique (un registro A y un CNAME).

## Notas

- **Bonus**: con Node instalado, lo local también te va a funcionar:
  `npm install && npm run dev` → http://localhost:3000
- El tracking de clics (`var/clicks.jsonl`) no persiste en Vercel (filesystem
  de solo lectura): los clics se ven en los logs del proyecto (Vercel →
  Deployments → Logs). El paso a base de datos está en el roadmap.
- Los datos son el seed de demo (10 modelos, 30 ofertas). El pipeline real de
  scrapers corre aparte (ver `scrapers/README.md`).
