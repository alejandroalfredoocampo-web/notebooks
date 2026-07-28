-- Capa de confianza de tiendas: flag editorial "verificada".
-- (Señales adicionales como envío/garantía se derivan de datos reales o las
--  curará el operador; no se inventan reseñas ni ratings.)

alter table stores add column if not exists verified boolean default false;

-- Tiendas establecidas / de trayectoria conocida en AR (designación editorial;
-- el operador puede ajustarla). El resto queda en false por defecto.
update stores set verified = true
where id in ('cordobanotebooks','fullh4rd','fravega','cetrogar','musimundo','naldo','maximus','venex');
