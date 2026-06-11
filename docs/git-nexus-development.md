# Git + GitNexus Development Workflow

## Branches

```txt
main      production-ready code
develop   active integration branch
feature/* individual module branches
```

## Suggested feature branches

```txt
feature/auth-company-settings
feature/categories-vendors
feature/clients-bookings
feature/invoices-client-payments
feature/vendor-payables
feature/reports-dashboard
feature/pdf-export
```

## Pull request checklist

Every PR should include:

- What module changed
- Screenshots for frontend changes
- API endpoints changed/added
- Prisma migration notes
- Seed data changes
- Testing steps

## GitNexus review discipline

Use GitNexus/code review to inspect:

- Controller → service → Prisma flow
- Whether accounting updates are transactional
- Whether invoice/payment/vendor payment changes maintain outstanding balances
- Whether Prisma migrations match the UI fields
- Whether reports use DB-calculated values rather than frontend-only math

## Commit format

```txt
feat(bookings): add service item costing and margin
fix(invoices): prevent deleting paid invoice
refactor(vendors): normalize vendor category mapping
```
