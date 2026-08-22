-- Contador de ventanas para el rate limiting de los endpoints públicos.
--
-- Por qué en la base y no en memoria: el sitio corre en un runtime serverless, así que
-- "la memoria del proceso" son N memorias que no se ven entre sí. Un contador en memoria
-- deja pasar N veces el límite y da una sensación de piso que no existe.
--
-- La clave trae la ventana adentro (`alerta:1.2.3.4:2026082214`), así que cada ventana es
-- una fila nueva: no hay que leer antes de escribir ni resetear nada.

create table if not exists rate_limits (
  clave  text primary key,
  cuenta integer     not null default 0,
  vence  timestamptz not null
);

create index if not exists rate_limits_vence_idx on rate_limits (vence);

-- Suma 1 y devuelve el total de la ventana, en un solo statement atómico.
--
-- Que sea atómico es el punto: con `select` + `update` hay una ventana entre leer y
-- escribir donde dos requests simultáneos leen lo mismo y el límite se pasa. Acá el
-- `on conflict do update ... returning` los serializa la base.
create or replace function bump_rate_limit(p_clave text, p_segundos integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cuenta integer;
begin
  insert into rate_limits (clave, cuenta, vence)
  values (p_clave, 1, now() + make_interval(secs => p_segundos))
  on conflict (clave) do update
    set cuenta = rate_limits.cuenta + 1
  returning cuenta into v_cuenta;

  return v_cuenta;
end;
$$;

-- Borra ventanas vencidas. Es mantenimiento: si se atrasa un rato no cambia ninguna
-- decisión, por eso se llama de vez en cuando y no en cada request.
create or replace function purge_rate_limits()
returns void
language sql
security definer
set search_path = public
as $$
  delete from rate_limits where vence < now();
$$;

-- RLS prendida y sin políticas: la tabla es inaccesible desde la anon key. El contador se
-- toca sólo por la función (`security definer`), que sí se puede ejecutar. Así un visitante
-- no puede leer los contadores de otros ni, peor, borrar el suyo.
alter table rate_limits enable row level security;

revoke all on function bump_rate_limit(text, integer) from public;
grant execute on function bump_rate_limit(text, integer) to anon, authenticated, service_role;
revoke all on function purge_rate_limits() from public;
grant execute on function purge_rate_limits() to service_role;
