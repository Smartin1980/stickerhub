drop function if exists public.admin_list_users();

create function public.admin_list_users()
returns table (
  id uuid,
  email text,
  display_name text,
  role public.user_role,
  is_friends_family boolean,
  created_at timestamptz,
  sticker_count bigint,
  has_stickers boolean
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
    profile.created_at,
    count(user_sticker.id)::bigint,
    count(user_sticker.id) > 0
  from public.profiles profile
  left join public.user_stickers user_sticker on user_sticker.user_id = profile.id
  group by
    profile.id,
    profile.email,
    profile.display_name,
    profile.role,
    profile.is_friends_family,
    profile.created_at
  order by profile.created_at desc;
end;
$$;

create or replace function public.admin_delete_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Nur Administratoren dürfen Benutzer löschen.';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Das eigene Administratorkonto kann hier nicht gelöscht werden.';
  end if;

  delete from auth.users where id = target_user_id;

  if not found then
    raise exception 'Benutzer wurde nicht gefunden.';
  end if;
end;
$$;

revoke all on function public.admin_list_users() from public;
revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;

