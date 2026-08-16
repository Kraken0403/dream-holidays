# Dream Holidays Accounting — Project Brief

Dream Holidays Accounting is a browser-based travel-agency accounting system built with Nuxt 3, NestJS, Prisma, and MySQL. It connects each trip file to the client sale, supplier cost, invoices, receipts, vendor bills, payments, ledgers, and profitability reports.

## What is included

- Secure administrator login with JWT sessions and first-run admin provisioning.
- Multiple billing companies with GST/PAN, invoice prefixes, logos, bank accounts, and invoice terms.
- Client and vendor masters, including vendor-to-service-category mapping.
- Hierarchical travel service categories such as tickets, hotels, visas, insurance, cars, cruises, and packages.
- Booking/trip files with passengers, travel dates, service items, sale values, vendor costs, taxes, and expected margin.
- Client invoices created manually or from uninvoiced booking services.
- Client payment allocation and receivable tracking.
- Vendor bills created manually or generated from unbilled booking services.
- Vendor payment allocation and payable tracking.
- Chart of accounts, automatic journals, balanced manual journals, ledgers, and passbooks.
- Dashboard, receivable/payable aging, profit and loss, trial balance, client statements, and vendor statements.
- Monthly, quarterly, half-yearly, financial-year, previous-period, all-date, and custom-date reporting.
- Search, relevant filters, pagination, and date ranges across operational lists where dates apply.
- CSV exports for P&L, trial balance, statements, and passbooks; printable/PDF-ready invoices.

## Accounting flow

Client → Booking → Service sale and vendor cost → Client invoice → Client receipt → Vendor bill → Vendor payment → Ledger and profitability reports.

## Reliability controls added in this revision

- Prevents client or vendor payments from exceeding the outstanding amount.
- Prevents duplicate invoicing and duplicate vendor billing of the same booking service.
- Prevents replacing booking services after they are referenced by invoices or vendor bills.
- Calculates sale and vendor totals correctly when quantity is greater than one.
- Creates accounting journals for manual as well as booking-generated invoices.
- Rejects unbalanced manual journal entries.
- Carries pre-period activity into opening balances for statements, passbooks, and ledgers.
- Includes invoices and bills without due dates in the current aging bucket.
