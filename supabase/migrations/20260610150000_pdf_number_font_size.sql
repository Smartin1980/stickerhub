alter table public.profiles
add column if not exists pdf_number_font_size smallint not null default 9
check (pdf_number_font_size between 8 and 11);

