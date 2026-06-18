# StickerHub Release Process

## Branches

- `main`: production
- `stg`: pre-production at `https://stickerhub-stg.bsone.ch`
- feature branches: short-lived work branches

## Normal Flow

1. Develop on a feature branch or directly on `stg` for small changes.
2. Deploy `stg` to `https://stickerhub-stg.bsone.ch`.
3. Test with `STAGING_CHECKLIST.md`.
4. Apply and verify Supabase migrations on `stg`.
5. Back up production before database changes.
6. Merge `stg` into `main`.
7. Deploy production from `main`.
8. Run a short production smoke test.

## Supabase Rule

`stg` and production must use different Supabase projects:

- stg: `stickerhub-stg`
- production: existing production project

Never point `stg` at the production database.

## Hostpoint/FTP Notes

The current project appears to deploy as static files via Hostpoint FTP. For
stg, use a separate FTP account or remote path that serves
`https://stickerhub-stg.bsone.ch`.

stg FTP target:

- Host: `ftp.bsone.ch`
- Protocol: `ftp`
- Port: `21`
- Username: `mselva@stickerhub-stg.bsone.ch`
- Remote path: `/`

prod FTP target:

- Host: `ftp.bsone.ch`
- Protocol: `ftp`
- Port: `21`
- Username: `mselva@stickerhub.bsone.ch`
- Remote path: `/`

The VS Code SFTP extension reads `.vscode/sftp.json`. This file is local and
gitignored. Activate the right target before uploading:

```powershell
.\scripts\prepare-deploy-stg.cmd
.\scripts\prepare-deploy-prod.cmd
```

The scripts refuse to switch to `stg` unless the current Git branch is `stg`,
and refuse to switch to production unless the current Git branch is `main`.
They also copy the matching Supabase frontend config into `js/config.js`, so
the deployed app points at the correct Supabase project.

Before uploading stg:

1. Stay on branch `stg`.
2. Run `.\scripts\prepare-deploy-stg.cmd`.
3. Upload the static frontend files to the stg webroot.
4. Do not upload `.git`, `.vscode`, `.tools`, or private notes.

Before uploading production:

1. Stay on branch `main`.
2. Run `.\scripts\prepare-deploy-prod.cmd`.
3. Verify `js/config.js` contains the production Supabase project.
4. Upload the static frontend files to the production webroot.
