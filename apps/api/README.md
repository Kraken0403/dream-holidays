# Dream Holidays API

NestJS + Prisma API configured for MAMP MySQL.

## Setup

Start MAMP first, then create database:

```sql
CREATE DATABASE dream_holidays_accounting;
```

Then run:

```bash
copy .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run start:dev
```

Default database URL in `.env.example`:

```env
DATABASE_URL="mysql://root:root@127.0.0.1:8889/dream_holidays_accounting"
```

If your MAMP MySQL port is `3306`, change `8889` to `3306`.
