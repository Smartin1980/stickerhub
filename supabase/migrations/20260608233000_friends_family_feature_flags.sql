alter table public.profiles
add column if not exists is_friends_family boolean not null default false;

create table if not exists public.feature_flags (
  key text primary key check (key ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  description text not null default '',
  enabled_friends_family boolean not null default false,
  enabled_public boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.feature_flags (
  key,
  name,
  description,
  enabled_friends_family,
  enabled_public
)
values (
  'collection_import',
  'Sammlungsimport',
  'CSV-Import und mobile Fotoerkennung für persönliche Sammlungen.',
  true,
  false
)
on conflict (key) do nothing;

alter table public.feature_flags enable row level security;

create policy "Authenticated users read feature flags"
  on public.feature_flags for select
  to authenticated
  using (true);

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role
     or old.is_friends_family is distinct from new.is_friends_family then
    if not public.is_admin() then
      raise exception 'Nur Administratoren dürfen Berechtigungen ändern.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileges on public.profiles;
create trigger protect_profile_privileges
  before update on public.profiles
  for each row execute function public.protect_profile_privileges();

create or replace function public.is_feature_enabled(feature_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select
      profile.role = 'admin'
      or flag.enabled_public
      or (profile.is_friends_family and flag.enabled_friends_family)
    from public.profiles profile
    join public.feature_flags flag on flag.key = feature_key
    where profile.id = auth.uid()
  ), false);
$$;

create or replace function public.get_my_feature_flags()
returns table (
  key text,
  enabled boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select flag.key, public.is_feature_enabled(flag.key)
  from public.feature_flags flag
  order by flag.key;
$$;

create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  display_name text,
  role public.user_role,
  is_friends_family boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nur Administratoren dürfen Benutzer verwalten.';
  end if;

  return query
  select
    profile.id,
    profile.email,
    profile.display_name,
    profile.role,
    profile.is_friends_family,
    profile.created_at
  from public.profiles profile
  order by profile.created_at desc;
end;
$$;

create or replace function public.admin_set_user_access(
  target_user_id uuid,
  friends_family boolean,
  target_role public.user_role default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nur Administratoren dürfen Benutzer verwalten.';
  end if;

  update public.profiles
  set
    is_friends_family = friends_family,
    role = coalesce(target_role, role)
  where id = target_user_id;

  if not found then
    raise exception 'Benutzer wurde nicht gefunden.';
  end if;
end;
$$;

create or replace function public.admin_list_feature_flags()
returns setof public.feature_flags
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nur Administratoren dürfen Features verwalten.';
  end if;
  return query select * from public.feature_flags order by name;
end;
$$;

create or replace function public.admin_update_feature_flag(
  feature_key text,
  friends_family_enabled boolean,
  public_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nur Administratoren dürfen Features verwalten.';
  end if;

  update public.feature_flags
  set
    enabled_friends_family = friends_family_enabled,
    enabled_public = public_enabled,
    updated_at = now(),
    updated_by = auth.uid()
  where key = feature_key;

  if not found then
    raise exception 'Feature wurde nicht gefunden.';
  end if;
end;
$$;

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

  if not public.is_feature_enabled('collection_import') then
    raise exception 'Dieses Feature ist für dein Konto noch nicht freigeschaltet.';
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
    select sticker.id into target_sticker_id
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
    where owner_user_id = target_user_id and sticker_id = target_sticker_id;

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

  return jsonb_build_object('imported', imported, 'mode', import_mode);
end;
$$;

revoke all on function public.is_feature_enabled(text) from public;
revoke all on function public.get_my_feature_flags() from public;
revoke all on function public.admin_list_users() from public;
revoke all on function public.admin_set_user_access(uuid, boolean, public.user_role) from public;
revoke all on function public.admin_list_feature_flags() from public;
revoke all on function public.admin_update_feature_flag(text, boolean, boolean) from public;

grant execute on function public.is_feature_enabled(text) to authenticated;
grant execute on function public.get_my_feature_flags() to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_set_user_access(uuid, boolean, public.user_role) to authenticated;
grant execute on function public.admin_list_feature_flags() to authenticated;
grant execute on function public.admin_update_feature_flag(text, boolean, boolean) to authenticated;

