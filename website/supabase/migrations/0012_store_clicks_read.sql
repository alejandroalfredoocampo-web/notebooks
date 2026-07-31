-- Panel de tráfico para la tienda (feature de producto): una tienda vinculada
-- puede LEER sus propios click-outs (los que le mandamos). RLS por store_members.
-- click_outs ya tiene RLS activada (insert público en 0001); acá sumamos el select.

create policy "members read own clicks" on click_outs
  for select using (
    exists (
      select 1 from store_members m
      where m.user_id = auth.uid() and m.store_id = click_outs.store_id
    )
  );
