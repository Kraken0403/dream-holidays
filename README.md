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
cd apps/api
copy .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
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

Default login after seed:

```txt
Email: admin@dreamholidays.local
Password: Admin@12345
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
http://localhost:3000
```

Backend:

```txt
http://localhost:4000/api
```

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
- Prisma seed using Dream Holidays vendor/service Excel structure

## Git development flow

See `docs/git-nexus-development.md`.

## Notes

This is a strong starter codebase. It intentionally keeps UI simple and clean so we can iterate module-by-module without breaking the accounting core.
