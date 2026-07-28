-- Modelos sin publicaciones + aviso de disponibilidad (spec 06).
-- Captura de email para avisar cuando un modelo (hoy sin ofertas) se publique.
-- El público puede INSERTAR (como price_alerts); el envío lo hará el worker de mails.

create table if not exists model_notify (
  id           bigint generated always as identity primary key,
  email        text not null,
  model_id     text not null references models(id) on delete cascade,
  user_id      uuid,                       -- opcional, si hay login (spec 07)
  notified_at  timestamptz,
  created_at   timestamptz default now(),
  unique (email, model_id)
);
create index if not exists model_notify_model_idx on model_notify (model_id) where notified_at is null;

alter table model_notify enable row level security;
-- El público puede suscribirse; nadie lee con la anon key (solo service_role / worker).
create policy "public insert model_notify" on model_notify for insert with check (true);
