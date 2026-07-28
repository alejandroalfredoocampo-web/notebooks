# 05 — Chips de specs como filtros

## Objetivo
Convertir los chips de características (procesador, RAM, SSD, pantalla, GPU, OS) en **links a filtros**,
tanto en las cards de la home/listado como en la ficha. Al tocar "Intel Core i7" el usuario ve todas
las notebooks con ese procesador; al tocar "16 GB", todas con esa RAM. Aumenta la navegación lateral y
el tiempo en sitio, y expone el catálogo por atributo.

## Estado actual (reutilizar)
- `SpecChips.tsx` hoy renderiza `<span>` estáticos (compact en cards, completo en ficha).
- `filterModels` (`src/lib/data.ts`) ya filtra por `brands`, `cpus` (por `cpuFamily`), `rams`
  (buckets 8/16/32), `gpu` (integrada/dedicada), `price`, `fin`, `use`.
- `Filters.tsx` define los tokens de cada filtro (cpu: `i3/i5/i7/i9/ultra9/ryzen7/apple-m`; ram:
  `8/16/32`; gpu: `integrada/dedicada`).

## Alcance
- **MVP**: cada chip que mapea a un filtro existente se vuelve `<Link>` a `/notebooks?<param>=<token>`.
  Chips sin filtro correspondiente (SSD, pantalla) → o quedan como texto, o se agrega el eje de filtro.
- **Recomendado**: agregar dos ejes de filtro nuevos para que **todos** los chips sean accionables:
  almacenamiento y tamaño de pantalla. Ver abajo.

## Mapeo chip → filtro
Crear helper `chipToFilter(model, kind)` que devuelva `{ href } | null`:

| Chip | Param | Token | Notas |
|------|-------|-------|-------|
| Procesador | `cpu` | `cpuFamily` del modelo (`i7`, `ryzen7`, `apple-m`…) | Ya soportado por `filterModels`. Requiere que `cpuFamily` use el mismo vocabulario que `Filters.tsx`. |
| RAM | `ram` | bucket: `8`/`16`/`32` según `ramGb` | Mapear con la misma lógica de buckets de `filterModels`. |
| GPU | `gpu` | `gpuType` (`integrada`/`dedicada`) | Ya soportado. |
| SSD / almacenamiento | `storage` | bucket (ver abajo) | **Nuevo eje** — requiere extender `filterModels` + `Filters`. |
| Pantalla | `screen` | bucket por pulgadas (ver abajo) | **Nuevo eje** — opcional. |
| OS | `os` | `windows`/`macos`/… | **Nuevo eje** — opcional; o dejar OS como texto. |

## Ejes de filtro nuevos (recomendado) — solo código, sin DB
En `src/lib/data.ts` (`Filters` interface + `filterModels`) y `Filters.tsx`:
- **Almacenamiento** (`storage`): buckets `256` (≤256), `512` (257–512), `1000` (≥1 TB).
  `list.filter(m => rangos sobre m.storageGb)`.
- **Pantalla** (`screen`): buckets `13` (≤13.9"), `14` (14–14.9"), `15` (15–15.9"), `16` (≥16").
- Agregar los grupos correspondientes a `GROUPS` en `Filters.tsx` para que el filtro también sea
  visible/desmarcable en la barra lateral (coherencia: si un chip lleva a `?storage=512`, el sidebar
  debe reflejarlo marcado).

## Cambios en `SpecChips.tsx`
- Recibir prop opcional `linkify` (default `true` en ficha, `true` o `false` en card según performance).
- Cada chip pasa a `<Link href={chipToFilter(...)} scroll={false}>` con estilo hover (ya hay
  `hover:` en otros chips). Los que no mapean quedan `<span>`.
- En las **cards** (`ModelCard`), cuidar que el chip-link no compita con el link de la card completa
  al modelo: usar `<Link>` anidados no es válido en HTML. Opciones:
  1. En cards, mantener chips como texto (no linkificar) y linkificar **solo en la ficha**. (Más simple, recomendado para MVP.)
  2. O rediseñar la card para que el área clickeable al modelo no envuelva los chips.
- En la ficha no hay conflicto (los chips están fuera del link al modelo) → linkificar siempre.

## Criterios de aceptación
- [ ] En la ficha, tocar el chip de procesador lleva a `/notebooks?cpu=i7` y el listado muestra solo
      esos modelos, con el filtro marcado en el sidebar.
- [ ] El chip de RAM lleva al bucket correcto (`16 GB` → `?ram=16`).
- [ ] Si se agregan `storage`/`screen`, el sidebar los muestra y el chip los activa consistentemente.
- [ ] No se generan links anidados inválidos en las cards.

## Notas
- Prerrequisito de calidad de datos: `cpuFamily` debe estar normalizado con el vocabulario de
  `Filters.tsx`. Verificar con los modelos scrapeados (Ryzen desktop, Intel Ultra, MX). Si un modelo
  tiene `cpuFamily` fuera del set, el chip cae a `<span>` (no rompe).
- Esta spec es prerequisito "de comodidad" para 02 (marcas) y 06: los ejes nuevos enriquecen ambos.
