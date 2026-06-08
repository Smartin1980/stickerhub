with country_seed(code, name) as (
  values
    ('MEX','Mexiko'),('RSA','Südafrika'),('KOR','Südkorea'),('CZE','Tschechien'),
    ('CAN','Kanada'),('BIH','Bosnien und Herzegowina'),('QAT','Katar'),('SUI','Schweiz'),
    ('BRA','Brasilien'),('MAR','Marokko'),('HAI','Haiti'),('SCO','Schottland'),
    ('USA','USA'),('PAR','Paraguay'),('AUS','Australien'),('TUR','Türkei'),
    ('GER','Deutschland'),('CUW','Curaçao'),('CIV','Elfenbeinküste'),('ECU','Ecuador'),
    ('NED','Niederlande'),('JPN','Japan'),('SWE','Schweden'),('TUN','Tunesien'),
    ('BEL','Belgien'),('EGY','Ägypten'),('IRN','Iran'),('NZL','Neuseeland'),
    ('ESP','Spanien'),('CPV','Kap Verde'),('KSA','Saudi-Arabien'),('URU','Uruguay'),
    ('FRA','Frankreich'),('SEN','Senegal'),('IRQ','Irak'),('NOR','Norwegen'),
    ('ARG','Argentinien'),('ALG','Algerien'),('AUT','Österreich'),('JOR','Jordanien'),
    ('POR','Portugal'),('COD','DR Kongo'),('UCB','Interkontinental-Playoff'),
    ('COL','Kolumbien'),('ENG','England'),('CRO','Kroatien'),('GHA','Ghana'),
    ('PAN','Panama'),('FWC','FIFA World Cup'),('COLA','Coca-Cola')
)
insert into public.countries(code, name)
select code, name from country_seed
on conflict (code) do update set name = excluded.name;

insert into public.stickers(country_id, sticker_number)
select countries.id, numbers.value
from public.countries
cross join generate_series(1, 20) as numbers(value)
on conflict (country_id, sticker_number) do nothing;
