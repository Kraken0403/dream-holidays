# Accounting and cancellation flow test

Use a dedicated test client, vendor, and booking so the expected balances are easy to identify. The amounts below deliberately avoid tax; repeat once with tax after the base flow passes.

## Baseline scenario

1. Note the current balances for `CLIENTS`, `SALES`, `PURCHASE`, `VENDORS`, and `BANK` on Accounts / Ledger.
2. Create a client and vendor, then create a confirmed booking with one service item:
   - sale total: ₹1,000
   - vendor cost: ₹600
3. Open the booking. Confirm version 1 exists and no accounting balance changed merely because the booking was created.
4. Create a proforma invoice. Confirm it appears only in the Proforma Invoices tab, has no outstanding amount, and creates no passbook or ledger entry.
5. Create the real invoice for ₹1,000. Expected journal: debit `CLIENTS` ₹1,000; credit `SALES` ₹1,000.
6. Generate vendor payables. Expected journal: debit `PURCHASE` ₹600; credit `VENDORS` ₹600. Reopening the booking must show **View Vendor Payables**, not generate another bill.
7. Add a client payment of ₹400 with an optional proof. Expected journal: debit `BANK` ₹400; credit `CLIENTS` ₹400. Open Payment Receipts and verify the proof can be viewed/downloaded.
8. Add a vendor payment of ₹200 with an optional proof. Expected journal: debit `VENDORS` ₹200; credit `BANK` ₹200. Verify its receipt history and proof.

Before cancellation, the test client should owe ₹600 and the test vendor should be owed ₹400.

## Cancellation scenario

1. Open the booking and click **Cancel Booking** below the right-hand summary.
2. Confirm the preview lists the ₹1,000 invoice and ₹600 vendor payable. On a booking without either document, confirm the modal explicitly says none exist.
3. Enter a reason, a client cancellation charge of ₹100, and a vendor cancellation charge of ₹50, then confirm.
4. Confirm the booking becomes `CANCELLED`, a new booking version is present, and the original documents are retained but marked cancelled.
5. Confirm these new documents and journals exist:
   - client credit note ₹1,000: debit `SALES`, credit `CLIENTS`
   - vendor credit note ₹600: debit `VENDORS`, credit `PURCHASE`
   - cancellation invoice ₹100: debit `CLIENTS`, credit `SALES`
   - vendor cancellation bill ₹50: debit `PURCHASE`, credit `VENDORS`
6. Confirm existing payments were not deleted. They remain as account credits/advances until refunded or adjusted.

For this example, the final client balance is a ₹300 credit (₹1,000 invoice − ₹400 receipt − ₹1,000 credit note + ₹100 charge). The final vendor balance is a ₹150 advance/credit (₹600 bill − ₹200 payment − ₹600 credit note + ₹50 charge).

The net P&L effect of the cancelled booking should be ₹100 revenue, ₹50 purchase/cancellation cost, and ₹50 gross profit. The original ₹1,000 sale and ₹600 purchase are fully reversed.

## Cross-page checks

- Passbook: test the individual client/vendor and the default **All** option; balances and rows must agree.
- Payments: cancelled original documents must not appear as outstanding; cancellation documents appear only while unpaid.
- Reports: Trial Balance remains balanced; P&L shows only the net cancellation amounts.
- Invoices: proformas remain separate and never affect accounting.
- Booking history: invoice creation and cancellation create successive immutable versions.
- Clients: edit the test client, then archive it. Historical bookings, invoices, payments, and ledger entries must remain; the client disappears only from active-client selectors.
