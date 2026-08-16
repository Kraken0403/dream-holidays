# Dream Holidays Accounting Module

A production-ready starter implementation for Dream Holidays' travel-agency accounting module.

This version is configured for **MAMP MySQL** by default. Docker is not required.

## Stack

- Frontend: Nuxt 3
- Backend: NestJS
- Database: MySQL through MAMP
- ORM: Prisma
- Auth: JWT
- PDF-ready invoice structure included

## Core business flow

Client → Booking / Trip File → Service Items → Vendor Costing → Client Invoice → Client Payment → Vendor Payable → Vendor Payment → Margin / Outstanding Reports

## Apps

```bash
apps/api # NestJS backend
apps/web # Nuxt frontend
```

## MAMP MySQL setup

### 1. Start MAMP

Open MAMP and start the servers.

Then check your MySQL port in:

```txt
MAMP > Preferences > Ports
```

MAMP commonly uses:

```txt
MySQL Port: 8889
Username: root
Password: root
```

If your MAMP is set to standard MySQL ports, your MySQL port may be:

```txt
3306
```

### 2. Create the database

Open MAMP phpMyAdmin and create this database:

```sql
CREATE DATABASE dream_holidays_accounting;
```

Or run the SQL file included here:

```txt
database/mamp-init.sql
```

## Backend setup

```bash
copy apps\\api\\.env.example apps\\api\\.env
npm install
cd apps/api
npm run setup
npm run start:dev
```

If your MAMP MySQL port is `3306`, open `apps/api/.env` and change this:

```env
DATABASE_URL="mysql://root:root@127.0.0.1:8889/dream_holidays_accounting"
```

to this:

```env
DATABASE_URL="mysql://root:root@127.0.0.1:3306/dream_holidays_accounting"
```

If your MAMP MySQL password is empty or different, update the same URL accordingly.

Before `npm run setup`, also set a real `INITIAL_ADMIN_EMAIL` and a unique
`INITIAL_ADMIN_PASSWORD` of at least 8 characters in `apps/api/.env`.

Administrator login after seed uses the `INITIAL_ADMIN_EMAIL` and
`INITIAL_ADMIN_PASSWORD` values from `apps/api/.env`:

```txt
Email: value of INITIAL_ADMIN_EMAIL
Password: value of INITIAL_ADMIN_PASSWORD
```

## Frontend setup

Open a second terminal:

```bash
cd apps/web
copy .env.example .env
npm install
npm run dev
```

Open:

```txt
http://localhost:3001
```

Backend:

```txt
http://localhost:6001/api
```

The initial admin is created automatically only when there is no active administrator. Configure it in `apps/api/.env` before production use.

## Included modules

- Login/Auth
- Dashboard
- Companies
- Global Settings
- Service Categories + Subcategories
- Vendors + category mapping
- Clients
- Bookings / Trip Files
- Booking service items with sale/cost/margin
- Client invoices from booking
- Client payment receipts
- Vendor bills/payables
- Vendor payments
- Reports summary
- Monthly, quarterly, half-yearly, financial-year and custom-date reports
- Search, related filters, pagination and applicable date ranges on lists
- CSV exports for reports and passbooks
- Prisma seed using Dream Holidays vendor/service Excel structure

## Verification commands

```bash
npm run build
npm run test:api
npm run smoke:api
```

See `docs/PROJECT-BRIEF.md` and `docs/TEST-REPORT.md` for the handover summary.

## Git development flow

See `docs/git-nexus-development.md`.

## Notes

Change the initial admin password and JWT secret before production deployment. Keep database backups before applying migrations to an existing installation.
