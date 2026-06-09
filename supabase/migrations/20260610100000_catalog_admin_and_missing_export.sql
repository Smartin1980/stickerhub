insert into public.feature_flags (
  key,
  name,
  description,
  enabled_friends_family,
  enabled_public
)
values (
  'missing_list_export',
  'Fehllisten-Export',
  'Fehlende Sticker als PDF exportieren oder über WhatsApp teilen.',
  true,
  false
)
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description;

