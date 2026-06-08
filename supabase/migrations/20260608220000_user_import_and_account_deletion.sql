create or replace function public.import_user_collection(
  rows jsonb,
  import_mode text default 'missing_replace'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid := auth.uid();
  item jsonb;
  target_sticker_id bigint;
  target_status public.sticker_status;
  imported integer := 0;
  unknown_items text[] := '{}';
begin
  if target_user_id is null then
    raise exception 'Anmeldung erforderlich.';
  end if;

  if import_mode not in ('missing_replace', 'merge') then
    raise exception 'Unbekannter Importmodus.';
  end if;

  if jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) = 0 then
    raise exception 'Die Importliste ist leer.';
  end if;

  if import_mode = 'missing_replace' then
    delete from public.trades where owner_user_id = target_user_id;

    insert into public.user_stickers (user_id, sticker_id, status)
    select target_user_id, sticker.id, 'owned'
    from public.stickers sticker
    on conflict (user_id, sticker_id)
    do update set status = excluded.status, updated_at = now();
  end if;

  for item in select * from jsonb_array_elements(rows)
  loop
    select sticker.id
    into target_sticker_id
    from public.stickers sticker
    join public.countries country on country.id = sticker.country_id
    where country.code = upper(trim(item ->> 'country_code'))
      and sticker.sticker_number = (item ->> 'sticker_number')::integer;

    if target_sticker_id is null then
      unknown_items := array_append(
        unknown_items,
        upper(trim(item ->> 'country_code')) || '-' || (item ->> 'sticker_number')
      );
      continue;
    end if;

    target_status := case
      when import_mode = 'missing_replace' then 'missing'::public.sticker_status
      else coalesce(nullif(item ->> 'status', ''), 'missing')::public.sticker_status
    end;

    insert into public.user_stickers (user_id, sticker_id, status)
    values (target_user_id, target_sticker_id, target_status)
    on conflict (user_id, sticker_id)
    do update set status = excluded.status, updated_at = now();

    delete from public.trades
    where owner_user_id = target_user_id
      and sticker_id = target_sticker_id;

    if target_status = 'duplicate' then
      insert into public.trades (owner_user_id, sticker_id, status)
      values (target_user_id, target_sticker_id, 'available')
      on conflict (owner_user_id, sticker_id)
      do update set status = 'available';
    end if;

    imported := imported + 1;
  end loop;

  if cardinality(unknown_items) > 0 then
    raise exception 'Unbekannte Sticker: %', array_to_string(unknown_items, ', ');
  end if;

  return jsonb_build_object(
    'imported', imported,
    'mode', import_mode
  );
end;
$$;

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user_id uuid := auth.uid();
begin
  if target_user_id is null then
    raise exception 'Anmeldung erforderlich.';
  end if;

  delete from auth.users where id = target_user_id;
end;
$$;

revoke all on function public.import_user_collection(jsonb, text) from public;
revoke all on function public.delete_own_account() from public;
grant execute on function public.import_user_collection(jsonb, text) to authenticated;
grant execute on function public.delete_own_account() to authenticated;

