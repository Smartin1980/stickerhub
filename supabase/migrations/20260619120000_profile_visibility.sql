alter table public.profiles
add column if not exists is_public boolean not null default true;

drop policy if exists "Profiles visible to authenticated users" on public.profiles;
create policy "Profiles visible to authenticated users"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or is_public or public.is_admin());

drop policy if exists "Trades are readable" on public.trades;
create policy "Trades are readable"
  on public.trades for select
  to authenticated
  using (
    owner_user_id = auth.uid()
    or exists (
      select 1
      from public.profiles profile
      where profile.id = owner_user_id
        and profile.is_public
    )
  );

create or replace view public.user_statistics
with (security_invoker = true)
as
select
  p.id,
  p.display_name,
  count(us.*) filter (where us.status = 'owned') as owned,
  count(us.*) filter (where us.status = 'duplicate') as duplicates,
  count(s.*) - count(us.*) filter (where us.status in ('owned', 'duplicate')) as missing,
  round(
    100.0 * count(us.*) filter (where us.status in ('owned', 'duplicate'))
    / nullif(count(s.*), 0)
  ) as completion
from public.profiles p
cross join public.stickers s
left join public.user_stickers us on us.user_id = p.id and us.sticker_id = s.id
where p.is_public
group by p.id, p.display_name;

create or replace function public.get_user_statistics()
returns table (
  id uuid,
  display_name text,
  owned bigint,
  duplicates bigint,
  missing bigint,
  completion numeric
)
language sql stable security definer set search_path = public
as $$
  select
    p.id,
    p.display_name,
    count(us.*) filter (where us.status = 'owned') as owned,
    count(us.*) filter (where us.status = 'duplicate') as duplicates,
    count(s.*) - count(us.*) filter (where us.status in ('owned', 'duplicate')) as missing,
    round(
      100.0 * count(us.*) filter (where us.status in ('owned', 'duplicate'))
      / nullif(count(s.*), 0)
    ) as completion
  from public.profiles p
  cross join public.stickers s
  left join public.user_stickers us on us.user_id = p.id and us.sticker_id = s.id
  where p.is_public
  group by p.id, p.display_name
  order by completion desc nulls last
  limit 10;
$$;
