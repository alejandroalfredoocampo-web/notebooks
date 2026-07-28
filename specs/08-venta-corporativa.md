# 08 — Venta corporativa / mayorista (RFQ)

## Objetivo
Una sección de **venta corporativa** para compras al por mayor. Dos capacidades:
1. **Comparativa de precio para compra en volumen**: dado un modelo (o config) y una cantidad, mostrar
   una estimación del costo total y las tiendas candidatas.
2. **Solicitud de presupuesto (RFQ)**: una empresa publica una solicitud (modelo/specs + cantidad +
   plazo) que las **tiendas pueden ver y responder** con una propuesta (precio diferencial por lote).
   Es un nuevo lado del marketplace (demanda B2B ↔ oferta de tiendas).

## Alcance
- **Fase A (MVP, sin login)**: landing `/corporativo` + formulario de solicitud → guarda RFQ →
  notifica al admin. El admin recopila presupuestos manualmente y responde por email. Valida demanda
  con mínimo desarrollo.
- **Fase B**: bandeja de RFQ para tiendas (portal) donde cada tienda ve solicitudes abiertas y carga
  una cotización; el solicitante compara cotizaciones. Requiere identidad de tienda (ver "Auth de
  tiendas").
- **Fuera de alcance**: pagos, contratos, facturación. Somos el punto de encuentro, no intermediamos
  pago (coherente con el modelo del sitio).

## Modelo de datos — migración `0009_bulk.sql`
```sql
create table if not exists bulk_requests (
  id            text primary key,           -- nanoid
  status        text default 'open' check (status in ('open','quoting','closed','cancelled')),
  -- Qué pide
  model_id      text references models(id) on delete set null,  -- null si describe specs libres
  specs_note    text,                        -- si no hay modelo canónico
  quantity      int not null check (quantity > 0),
  needed_by     date,
  -- Quién pide
  company_name  text not null,
  cuit          text,
  contact_name  text,
  contact_email text not null,
  contact_phone text,
  province      text,
  user_id       uuid,                        -- opcional (spec 07)
  message       text,
  created_at    timestamptz default now()
);

create table if not exists bulk_quotes (
  id             text primary key,
  request_id     text not null references bulk_requests(id) on delete cascade,
  store_id       text references stores(id) on delete set null,
  unit_price     int not null,
  total_price    int,
  valid_until    date,
  notes          text,
  status         text default 'submitted' check (status in ('submitted','accepted','declined')),
  created_at     timestamptz default now()
);

alter table bulk_requests enable row level security;
alter table bulk_quotes   enable row level security;
-- Fase A: el público puede crear solicitudes; solo admin (service_role) lee.
create policy "public insert bulk_requests" on bulk_requests for insert with check (true);
-- bulk_quotes: sin acceso público en Fase A (solo service_role). Las policies de tiendas
-- se agregan en Fase B junto con la auth de tiendas.
```
Tipos en `types.ts` + mappers.

## Fase A — landing + solicitud
- `/corporativo` (`src/app/corporativo/page.tsx`): explica la propuesta (mejor precio por volumen,
  múltiples tiendas compiten por tu compra), casos (empresas, escuelas, revendedores) y un
  **estimador rápido**: elegí modelo + cantidad → muestra "desde $X por unidad × N = $Y" usando el
  mejor precio actual (`getModelBySlug`/`getModels`) como piso de referencia, aclarando que es
  estimativo y que las tiendas pueden mejorarlo por volumen.
- Formulario RFQ (`BulkRequestForm`, patrón `StoreApplicationForm`) → `POST /api/corporativo` →
  insert en `bulk_requests`. Honeypot + validación. Confirmación clara ("recibirás propuestas por
  email").
- **Admin**: `/admin/corporativo` — bandeja de RFQ (leer, cambiar estado, cargar/editar cotizaciones
  a mano en `bulk_quotes` mientras no exista el portal de tiendas).

## Fase B — portal de tiendas (requiere identidad de tienda)
- **Auth de tiendas**: decisión pendiente. Opciones: (a) Supabase Auth con un rol/claim `store` ligado
  a un `store_id`; (b) magic-link por tienda; (c) reutilizar el flujo de aprobación de
  `store_applications` para emitir credenciales. Recomendado: Supabase Auth + tabla `store_members
  (user_id, store_id)` y RLS que deje a la tienda ver RFQ abiertas y escribir solo sus `bulk_quotes`.
- UI portal: lista de RFQ abiertas (con datos de la empresa parcialmente ofuscados hasta cotizar),
  formulario de cotización, estado de sus cotizaciones.
- UI solicitante: comparar cotizaciones recibidas (tabla precio unitario/total/validez), aceptar una
  (marca `accepted`, revela contacto de la tienda para cerrar fuera del sitio).

## Notificaciones
- Al crear RFQ: email al admin (Fase A) y, en Fase B, a las tiendas relevantes (por marca/categoría).
- Al recibir cotización: email al solicitante. Comparte el worker de emails del proyecto.

## Criterios de aceptación (Fase A)
- [ ] `/corporativo` permite estimar costo por volumen a partir de un modelo y una cantidad.
- [ ] Enviar una solicitud persiste en `bulk_requests` y notifica al admin; el público no puede leer
      solicitudes ajenas (RLS: solo insert).
- [ ] El admin ve las RFQ y puede registrar cotizaciones y cambiar el estado.

## Notas
- La Fase B es un mini-marketplace: no arrancarla hasta validar demanda con la Fase A.
- Encaja con el modelo de negocio (afiliación/CPA): una compra corporativa cerrada puede monetizarse
  como comisión negociada.
- Depende parcialmente de spec 07 (para asociar solicitudes/tiendas a usuarios), pero la Fase A
  funciona sin login.
