# Deployment guide

Recommended low-cost preview stack:

- Frontend: Netlify Free (Nuxt is detected automatically)
- Backend: Render Free Web Service
- Database: TiDB Cloud Starter (MySQL compatible)

This is suitable for evaluation and light internal testing. Free compute can sleep, has no
service-level guarantee, and is not appropriate for business-critical accounting data.

## 1. Create the database

1. Create a TiDB Cloud Starter instance.
2. In its **Connect** dialog, choose **Prisma** and copy the public connection string.
3. Keep TLS enabled. The URL should include `sslaccept=strict`.
4. From PowerShell, initialize the schema and master data:

```powershell
$env:DATABASE_URL = 'mysql://USER:PASSWORD@HOST:4000/DATABASE?sslaccept=strict'
$env:INITIAL_ADMIN_NAME = 'Dream Holidays Admin'
$env:INITIAL_ADMIN_EMAIL = 'your-real-admin@example.com'
$env:INITIAL_ADMIN_PASSWORD = 'use-a-long-unique-password'
$env:NODE_ENV = 'production'
npm run db:setup -- --seed
```

The cloud provider normally creates the named database. For local MySQL, or a server-level
account that may create databases, add `--create-database`:

```powershell
npm run db:setup -- --create-database --seed
```

The script is safe to rerun: Prisma applies only pending migrations and the seed uses upserts.

## 2. Deploy the API to Render

1. Push this repository to GitHub or GitLab.
2. In Render select **New > Blueprint** and connect the repository. Render reads `render.yaml`.
3. Select the Free instance and enter the prompted secrets:
   - `DATABASE_URL`: the TiDB Prisma connection string
   - `FRONTEND_URL`: use `https://placeholder.invalid` for the first deploy
   - `INITIAL_ADMIN_EMAIL`: the real administrator email
   - `INITIAL_ADMIN_PASSWORD`: a unique password of at least 8 characters
4. Deploy and confirm `https://YOUR-API.onrender.com/api/health` returns `status: ok`.

The build command applies pending Prisma migrations automatically. Never use `prisma migrate
dev` or `prisma migrate reset` against production.

## 3. Deploy the Nuxt frontend to Netlify

1. In Netlify choose **Add new project > Import an existing project** and connect the repo.
2. When Netlify detects the monorepo, select `apps/web` as the site/package directory and
   leave the base directory unset. Netlify then reads `apps/web/netlify.toml`; keep its command
   and publish directory.
3. Add this environment variable before deploying:
   - `NUXT_PUBLIC_API_BASE=https://YOUR-API.onrender.com/api`
4. Deploy and copy the final `https://YOUR-SITE.netlify.app` URL.

## 4. Complete CORS configuration

Return to Render, replace `FRONTEND_URL` with the exact Netlify URL (no trailing slash), and
redeploy the API. Log in through the Netlify site and verify a list page plus an invoice PDF.

## Uploaded logo warning

Render Free uses an ephemeral filesystem. Company logos uploaded through the current API can
disappear when the service sleeps, restarts, or redeploys. Before using this as a real production
system, move uploads to persistent object storage (for example Cloudinary, S3, or Supabase
Storage) or use a paid persistent disk. Database records themselves remain in TiDB.

## Production checklist

- Use unique database and administrator passwords.
- Keep `JWT_SECRET` secret; Render generates it from the Blueprint.
- Restrict the TiDB network allowlist as far as the hosting setup permits.
- Configure database backups/export snapshots.
- Move logo uploads to durable object storage.
- Upgrade the sleeping backend before relying on the app operationally.
