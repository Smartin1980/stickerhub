# StickerHub - FIFA 2026 Sticker Manager

Responsive Web-Applikation zur Verwaltung einer FIFA-2026-Stickersammlung. Das
Frontend verwendet HTML, CSS und Vanilla JavaScript. Authentifizierung und
Datenhaltung laufen über Supabase.

## Schnellstart

1. Das Projekt über einen lokalen Webserver öffnen, zum Beispiel mit der
   VS-Code-Erweiterung "Live Server".
2. Ohne Supabase-Konfiguration startet die App automatisch im Demo-Modus.
3. Für den Produktivbetrieb ein Supabase-Projekt erstellen.
4. `supabase/schema.sql` im Supabase SQL Editor ausführen.
5. `supabase/seed.sql` ausführen.
6. In `js/config.js` die Projekt-URL und den öffentlichen Anon-Key eintragen.

```js
export const SUPABASE_URL = 'https://PROJECT.supabase.co';
export const SUPABASE_ANON_KEY = 'PUBLIC_ANON_KEY';
```

## Supabase Auth

Unter **Authentication > URL Configuration** die produktive Hostpoint-URL als
Site URL setzen und die lokalen sowie produktiven Redirect-URLs ergänzen.
E-Mail/Passwort und Magic Link funktionieren ohne weitere Frontend-Anpassung.
Google, Microsoft und Apple können später als OAuth Provider aktiviert werden.

Der erste Administrator wird im SQL Editor gesetzt:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@example.com';
```

## CSV Import

Administratoren können unter `pages/admin.html` CSV-Dateien dieses Formats
importieren:

```csv
country_code,sticker_number
SUI,1
SUI,2
GER,1
```

## Deployment auf Hostpoint

Den gesamten Projektinhalt in das Webroot hochladen. Es wird kein PHP und kein
Build-Schritt benötigt. Die HTML-Dateien müssen über HTTPS ausgeliefert werden.

## Struktur

- `css/` - gemeinsames responsives Design
- `js/` - Konfiguration, Datenzugriff und Seitenmodule
- `pages/` - Admin und Statistik
- `assets/` - statische Assets
- `supabase/` - Datenbankschema und Seed
