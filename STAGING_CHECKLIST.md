# StickerHub stg Checklist

Environment:

- Branch: `stg`
- URL: `https://stickerhub-stg.bsone.ch`
- Supabase project: `stickerhub-stg`
- Demo admin: `martin.selva@bsone.ch`
- Demo user: `ixwyts@gmail.com`

## Supabase Setup

- Create or open the `stickerhub-stg` Supabase project.
- Run `supabase/schema.sql` in the stg SQL editor.
- Run all files in `supabase/migrations/` in filename order.
- Run `supabase/seed.sql`.
- Create/register the demo users in Supabase Auth or via the app.
- Run `supabase/seed.stg.sql` after both users exist.
- Set Site URL to `https://stickerhub-stg.bsone.ch`.
- Add redirect URLs:
  - `https://stickerhub-stg.bsone.ch/login.html`
  - `https://stickerhub-stg.bsone.ch/dashboard.html`
  - `https://stickerhub-stg.bsone.ch/reset-password.html`

## Frontend Config

- Copy the stg Supabase Project URL and public anon key into `js/config.js` on the `stg` branch.
- Do not use the production Supabase project in `stg`.
- Do not commit service_role keys or database passwords.

## Hostpoint FTP

- Activate the stg FTP config:
  ```powershell
  .\scripts\use-sftp-stg.cmd
  ```
- Confirm `js/config.js` contains the stg Supabase project:
  - `dlucnxhpqulhirhqtabw`
- Confirm `.vscode/sftp.json` uses:
  - Host: `ftp.bsone.ch`
  - Protocol: `ftp`
  - Port: `21`
  - Username: `mselva@stickerhub-stg.bsone.ch`
  - Remote path: `/`
- Upload from branch `stg` only.
- Do not upload `.git`, `.vscode`, `.tools`, or private notes.

## Functional Smoke Test

- Open `https://stickerhub-stg.bsone.ch`.
- Log in as `martin.selva@bsone.ch`.
- Verify admin access under `pages/admin.html`.
- Verify feature flags are visible and editable.
- Log in as `ixwyts@gmail.com`.
- Verify dashboard loads.
- Verify country page loads, for example `country.html?code=SUI`.
- Change a sticker status to owned, missing, and duplicate.
- Publish and remove a trade.
- Open `trades.html` and verify duplicate stickers appear.
- Open `pages/statistics.html` and verify both demo users are included.
- Test password reset redirect to `reset-password.html`.
- Test mobile layout for login, dashboard, country page, and trades.

## Before Production Delivery

- Confirm all stg smoke tests pass.
- Confirm production Supabase backup exists.
- Apply migrations to production only after stg is green.
- Merge tested changes from `stg` to `main`.
- Deploy production from `main`.
