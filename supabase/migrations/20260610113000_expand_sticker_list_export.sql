update public.feature_flags
set
  name = 'Stickerlisten-Export',
  description = 'Fehlende und doppelte Sticker als PDF exportieren oder über WhatsApp teilen.'
where key = 'missing_list_export';

