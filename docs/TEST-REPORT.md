# Verification Report

## Automated verification

- Prisma schema validation: passed.
- NestJS production build: passed.
- Nuxt production build: passed.
- Functional accounting/authentication checks: 10 passed.
- Authenticated HTTP controller checks: 57 passed, covering every declared API route. The upload endpoint was verified to reject a missing file with HTTP 400.

The HTTP suite uses an isolated mocked data layer so every route and guard can be exercised without changing a real accounting database. Functional checks cover login normalization, invalid login rejection, inclusive date ranges, reversed-date rejection, quantity-based totals, manual-invoice journals, overpayment prevention, and balanced manual journals.

## Live MAMP smoke test

After starting MAMP, migrating, and seeding the database, run:

```bash
npm run smoke:api
```

Optional environment overrides:

```bash
API_BASE_URL=http://localhost:6001/api API_TEST_EMAIL=admin@dreamholidays.local API_TEST_PASSWORD=Admin@12345 npm run smoke:api
```

This performs a non-mutating login and authenticated GET smoke test against the real local database.
