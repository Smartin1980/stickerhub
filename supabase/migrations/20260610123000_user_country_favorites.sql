create table if not exists public.user_country_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  country_id bigint not null references public.countries(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, country_id)
);

alter table public.user_country_favorites enable row level security;

create policy "Users read own country favorites"
  on public.user_country_favorites for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users add own country favorites"
  on public.user_country_favorites for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users remove own country favorites"
  on public.user_country_favorites for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, delete on public.user_country_favorites to authenticated;
