-- StickerHub stg demo data.
--
-- Run order in the Supabase SQL editor for the stg project:
-- 1. supabase/schema.sql
-- 2. supabase/migrations/*.sql in filename order
-- 3. supabase/seed.sql
-- 4. Create/register the two Auth users:
--    - martin.selva@bsone.ch
--    - ixwyts@gmail.com
-- 5. Run this file.
--
-- This file is idempotent. It does not create Auth users because hosted
-- Supabase Auth users should be created via the Auth UI, signup flow, or Admin
-- API with a service_role key.
--
-- The privilege-protection trigger is disabled only for this seed step because
-- the Supabase SQL editor does not run as an authenticated app admin.

alter table public.profiles disable trigger protect_profile_privileges;

update public.profiles
set
  display_name = 'Martin Selva',
  role = 'admin',
  is_friends_family = true
where email = 'martin.selva@bsone.ch';

update public.profiles
set
  display_name = 'Sticker Tester',
  role = 'user',
  is_friends_family = true
where email = 'ixwyts@gmail.com';

alter table public.profiles enable trigger protect_profile_privileges;

insert into public.feature_flags (
  key,
  name,
  description,
  enabled_friends_family,
  enabled_public
)
values
  (
    'collection_import',
    'Sammlungsimport',
    'CSV-Import und mobile Fotoerkennung fuer persoenliche Sammlungen.',
    true,
    true
  ),
  (
    'missing_list_export',
    'Fehllisten-Export',
    'Fehlende Sticker als PDF exportieren oder ueber WhatsApp teilen.',
    true,
    true
  )
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description,
  enabled_friends_family = excluded.enabled_friends_family,
  enabled_public = excluded.enabled_public,
  updated_at = now();

with demo_profiles as (
  select id, email
  from public.profiles
  where email in ('martin.selva@bsone.ch', 'ixwyts@gmail.com')
),
demo_stickers as (
  select
    profile.id as user_id,
    sticker.id as sticker_id,
    case
      when profile.email = 'martin.selva@bsone.ch'
        and country.code in ('SUI', 'GER', 'BRA', 'ARG')
        and sticker.sticker_number in (3, 7, 11, 15, 19)
        then 'duplicate'::public.sticker_status
      when profile.email = 'ixwyts@gmail.com'
        and country.code in ('SUI', 'GER', 'FRA', 'ESP')
        and sticker.sticker_number in (2, 5, 8, 13, 17)
        then 'duplicate'::public.sticker_status
      when profile.email = 'martin.selva@bsone.ch'
        and (sticker.sticker_number % 6) = 0
        then 'missing'::public.sticker_status
      when profile.email = 'ixwyts@gmail.com'
        and (sticker.sticker_number % 4) = 0
        then 'missing'::public.sticker_status
      else 'owned'::public.sticker_status
    end as status
  from demo_profiles profile
  cross join public.stickers sticker
  join public.countries country on country.id = sticker.country_id
  where country.code in ('SUI', 'GER', 'BRA', 'ARG', 'FRA', 'ESP')
)
insert into public.user_stickers (user_id, sticker_id, status)
select user_id, sticker_id, status
from demo_stickers
on conflict (user_id, sticker_id)
do update set status = excluded.status, updated_at = now();

with duplicate_stickers as (
  select user_id, sticker_id
  from public.user_stickers
  where status = 'duplicate'
    and user_id in (
      select id
      from public.profiles
      where email in ('martin.selva@bsone.ch', 'ixwyts@gmail.com')
    )
)
insert into public.trades (owner_user_id, sticker_id, status)
select user_id, sticker_id, 'available'
from duplicate_stickers
on conflict (owner_user_id, sticker_id)
do update set status = 'available';

do $$
begin
  if not exists (select 1 from public.profiles where email = 'martin.selva@bsone.ch') then
    raise notice 'stg demo user missing: martin.selva@bsone.ch';
  end if;

  if not exists (select 1 from public.profiles where email = 'ixwyts@gmail.com') then
    raise notice 'stg demo user missing: ixwyts@gmail.com';
  end if;
end $$;
