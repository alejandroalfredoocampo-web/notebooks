-- Reputación y perfil de tiendas (spec 04). Expone en el sitio la reputación de
-- Google (y datos de perfil) que ya captura el formulario `store_applications`.

alter table stores add column if not exists logo_url             text;
alter table stores add column if not exists description          text;    -- 1–2 frases
alter table stores add column if not exists google_rating        numeric; -- 0..5
alter table stores add column if not exists google_reviews_count int;
alter table stores add column if not exists google_maps_url      text;
alter table stores add column if not exists rating_updated_at    timestamptz;
alter table stores add column if not exists socials              jsonb;   -- { instagram, facebook, ... }
alter table stores add column if not exists payment_methods      text;
alter table stores add column if not exists ships_nationwide     boolean;
alter table stores add column if not exists physical_address     text;

-- NOTA: las tiendas del seed no tienen reputación. Se cargan al aprobar una
-- solicitud (el admin copia los campos de google_* de `store_applications`), o a
-- mano con un UPDATE. Ejemplo:
--   update stores set google_rating = 4.6, google_reviews_count = 1234,
--     google_maps_url = 'https://maps.google.com/...', rating_updated_at = now()
--   where id = 'cordoba-notebooks';
