import { strict as assert } from 'assert';
import * as bcrypt from 'bcryptjs';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../src/modules/auth/auth.service';
import { InvoicesService } from '../src/modules/invoices/invoices.service';
import { VendorPayablesService } from '../src/modules/vendor-payables/vendor-payables.service';
import { AccountsService } from '../src/modules/accounts/accounts.service';
import { BookingsService } from '../src/modules/bookings/bookings.service';
import { dateRangeWhere, readDateRange } from '../src/common/date-range';

let passed = 0;

async function test(name: string, callback: () => any | Promise<any>) {
  try {
    await callback();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

async function expectReject(callback: () => Promise<any>, type: any) {
  let rejected = false;
  try {
    await callback();
  } catch (error) {
    rejected = true;
    assert.ok(error instanceof type, `Expected ${type.name}, got ${(error as any)?.constructor?.name}`);
  }
  assert.equal(rejected, true, 'Expected promise to reject.');
}

async function main() {
  await test('date range includes the complete To day', () => {
    const range = readDateRange({ from: '2026-07-01', to: '2026-07-31' });
    const where = dateRangeWhere(range)!;
    assert.equal(where.gte?.getHours(), 0);
    assert.equal(where.lte?.getHours(), 23);
    assert.equal(where.lte?.getMinutes(), 59);
  });

  await test('date range rejects reversed dates', async () => {
    await expectReject(async () => readDateRange({ from: '2026-08-01', to: '2026-07-01' }), BadRequestException);
  });

  const passwordHash = await bcrypt.hash('Admin@12345', 4);
  const authPrisma: any = {
    user: {
      findUnique: async ({ where }: any) => where.email === 'admin@dreamholidays.local'
        ? { id: 1, name: 'Admin', email: where.email, passwordHash, role: 'ADMIN', active: true }
        : null,
    },
  };
  const auth = new AuthService(authPrisma, { signAsync: async () => 'signed-token' } as any);

  await test('login accepts normalized valid credentials', async () => {
    const result = await auth.login(' ADMIN@dreamholidays.local ', 'Admin@12345');
    assert.equal(result.accessToken, 'signed-token');
    assert.equal(result.user.email, 'admin@dreamholidays.local');
  });

  await test('login rejects an incorrect password', async () => {
    await expectReject(() => auth.login('admin@dreamholidays.local', 'wrong-password'), UnauthorizedException);
  });

  await test('manual invoice posts its matching accounting journal', async () => {
    let journalData: any;
    const tx: any = {
      invoice: {
        create: async ({ data }: any) => ({ id: 20, grandTotal: data.grandTotal }),
        findUnique: async () => ({ id: 20 }),
      },
      ledgerAccount: {
        findUnique: async ({ where }: any) => ({ id: where.code === 'CLIENTS' ? 1 : 2, code: where.code }),
      },
      journalEntry: { create: async ({ data }: any) => { journalData = data; return { id: 1 }; } },
    };
    const prisma: any = {
      company: { findUnique: async () => ({ invoicePrefix: 'DH' }) },
      globalSetting: { findUnique: async () => null, findMany: async () => [] },
      client: { findUnique: async () => ({ name: 'Test Client', state: 'Gujarat' }) },
      invoice: { count: async () => 0 },
      $transaction: async (callback: any) => callback(tx),
    };
    const service = new InvoicesService(prisma);
    await service.createManual({
      companyId: 1,
      clientId: 1,
      items: [{ description: 'Travel service', quantity: 1, rate: 1000, taxAmount: 180 }],
    });
    assert.equal(journalData.lines.create[0].debit, 1180);
    assert.equal(journalData.lines.create[1].credit, 1180);
  });

  await test('proforma invoice stays non-posting with no outstanding balance', async () => {
    let createdData: any;
    let journalCreated = false;
    const tx: any = {
      invoice: {
        create: async ({ data }: any) => { createdData = data; return { id: 21, ...data }; },
        findUnique: async () => ({ id: 21 }),
      },
      journalEntry: { create: async () => { journalCreated = true; } },
    };
    const prisma: any = {
      company: { findUnique: async () => ({ proformaPrefix: 'PI' }) },
      globalSetting: { findUnique: async () => null, findMany: async () => [] },
      client: { findUnique: async () => ({ name: 'Test Client', state: 'Gujarat' }) },
      invoice: { count: async () => 0 },
      $transaction: async (callback: any) => callback(tx),
    };
    const service = new InvoicesService(prisma);
    await service.createManual({
      documentType: 'PROFORMA', companyId: 1, clientId: 1,
      items: [{ description: 'Travel proposal', quantity: 1, rate: 1000, taxAmount: 180 }],
    });
    assert.equal(createdData.documentType, 'PROFORMA');
    assert.equal(createdData.taxAmount, 0);
    assert.equal(createdData.grandTotal, 1000);
    assert.equal(createdData.outstandingAmount, 0);
    assert.equal(journalCreated, false);
  });

  await test('proforma conversion creates one linked posting invoice and marks its source converted', async () => {
    let createdData: any;
    let sourceStatus: any;
    let journalData: any;
    const proforma: any = {
      id: 21, invoiceNumber: 'PI/2026-27/00001', documentType: 'PROFORMA', status: 'DRAFT', companyId: 1, clientId: 2,
      clientSnapshot: { name: 'Test Client' }, client: { name: 'Test Client' }, bookingId: null, booking: null,
      convertedInvoice: null, dueDate: null, placeOfSupply: 'Gujarat', notes: '', terms: '',
      items: [{ id: 31, description: 'Travel proposal', quantity: 1, rate: 1000, taxAmount: 0, total: 1000 }],
    };
    const tx: any = {
      invoice: {
        create: async ({ data }: any) => { createdData = data; return { id: 22, ...data }; },
        update: async ({ data }: any) => { sourceStatus = data.status; return {}; },
        findUnique: async () => ({ id: 22 }),
      },
      ledgerAccount: { findUnique: async ({ where }: any) => ({ id: where.code === 'CLIENTS' ? 1 : 2, code: where.code }) },
      journalEntry: { create: async ({ data }: any) => { journalData = data; return { id: 1 }; } },
    };
    const prisma: any = {
      company: { findUnique: async () => ({ invoicePrefix: 'DH' }) },
      globalSetting: { findUnique: async () => null, findMany: async () => [] },
      invoice: { findUnique: async () => proforma, count: async () => 0 },
      $transaction: async (callback: any) => callback(tx),
    };
    await new InvoicesService(prisma).convertProforma(21, {});
    assert.equal(createdData.documentType, 'INVOICE');
    assert.equal(createdData.convertedFromProformaId, 21);
    assert.equal(sourceStatus, 'CONVERTED');
    assert.equal(journalData.sourceType, 'INVOICE');
  });

  await test('proforma conversion rejects booking items already posted on an invoice', async () => {
    const proforma: any = {
      id: 23, invoiceNumber: 'PI/2026-27/00002', documentType: 'PROFORMA', status: 'DRAFT', companyId: 1, clientId: 2,
      clientSnapshot: { name: 'Test Client' }, client: { name: 'Test Client' }, bookingId: 9,
      booking: { id: 9, currentVersion: 1, serviceItems: [{ id: 91 }] },
      convertedInvoice: null, dueDate: null, placeOfSupply: 'Gujarat', notes: '', terms: '',
      items: [{ id: 32, bookingServiceItemId: 91, description: 'Travel proposal', quantity: 1, rate: 1000, taxAmount: 0, total: 1000 }],
    };
    const prisma: any = {
      invoice: { findUnique: async () => proforma },
      invoiceItem: { findMany: async () => [{ bookingServiceItemId: 91 }] },
    };
    await expectReject(() => new InvoicesService(prisma).convertProforma(23, {}), BadRequestException);
  });

  await test('refreshing an invoice format updates only its saved presentation settings', async () => {
    let updatedData: any;
    const prisma: any = {
      invoice: {
        findUnique: async () => ({ id: 22, invoiceNumber: 'DH/2026-27/00001' }),
        update: async ({ data }: any) => { updatedData = data; return { id: 22 }; },
      },
      globalSetting: {
        findMany: async () => [
          { key: 'invoiceTitle', value: 'Travel Tax Invoice' },
          { key: 'invoiceTerms', value: '<p><strong>Payment due</strong> in seven days.</p>' },
        ],
      },
    };
    await new InvoicesService(prisma).refreshFormat(22);
    assert.deepEqual(updatedData, {
      formatSettings: {
        invoiceTitle: 'Travel Tax Invoice',
        invoiceTerms: '<p><strong>Payment due</strong> in seven days.</p>',
      },
    });
  });

  await test('booking totals multiply both sale and vendor rates by quantity', () => {
    const service = new BookingsService({} as any);
    const item = (service as any).normalizeItem({
      categoryId: 1,
      quantity: 3,
      saleRate: 100,
      saleTax: 18,
      vendorCost: 60,
      vendorTax: 9,
    });
    assert.equal(item.saleTotal, 318);
    assert.equal(item.vendorTotal, 189);
    assert.equal(item.margin, 129);
  });

  await test('editing a booking creates the next immutable version snapshot', async () => {
    const existing: any = { id: 7, currentVersion: 2, status: 'DRAFT', title: 'Old title', clientId: 1, companyId: 1 };
    let current = { ...existing };
    let versionData: any;
    const tx: any = {
      booking: {
        findUnique: async ({ include }: any) => include ? { ...current, passengers: [], serviceItems: [] } : current,
        update: async ({ data }: any) => { current = { ...current, ...data }; return current; },
      },
      bookingVersion: { create: async ({ data }: any) => { versionData = data; return { id: 3 }; } },
    };
    const prisma: any = { $transaction: async (callback: any) => callback(tx) };
    const updated = await new BookingsService(prisma).update(7, { title: 'New title', expectedVersion: 2, changeNote: 'Customer changed the itinerary' }, 9);
    assert.equal(updated.currentVersion, 3);
    assert.equal(versionData.version, 3);
    assert.equal(versionData.changeType, 'UPDATED');
    assert.equal(versionData.snapshot.title, 'New title');
  });

  await test('vendor payable generation is recorded in booking version history', async () => {
    let versionData: any;
    const booking: any = {
      id: 8, currentVersion: 1, status: 'CONFIRMED',
      serviceItems: [{ id: 81, vendorId: 4, description: 'Hotel', quantity: 1, vendorCost: 500, vendorTax: 90, vendorTotal: 590 }],
    };
    const tx: any = {
      vendorBill: { create: async ({ data }: any) => ({ id: 50, grandTotal: data.grandTotal }) },
      ledgerAccount: { findUnique: async ({ where }: any) => ({ id: where.code, code: where.code }) },
      journalEntry: { create: async () => ({ id: 1 }) },
      booking: { update: async ({ data }: any) => ({ ...booking, ...data, passengers: [], serviceItems: booking.serviceItems }) },
      bookingVersion: { create: async ({ data }: any) => { versionData = data; return { id: 2 }; } },
    };
    const prisma: any = {
      booking: { findUnique: async () => booking },
      vendorBillItem: { findMany: async () => [] },
      vendorBill: { count: async () => 0 },
      $transaction: async (callback: any) => callback(tx),
    };
    const created = await new VendorPayablesService(prisma).generateFromBooking(8);
    assert.equal(created.length, 1);
    assert.equal(versionData.version, 2);
    assert.equal(versionData.changeType, 'VENDOR_PAYABLES_CREATED');
  });

  await test('booking cancellation reverses client and vendor documents before posting the cancellation fee', async () => {
    const invoiceCreates: any[] = [];
    const billCreates: any[] = [];
    const journals: any[] = [];
    const booking: any = {
      id: 1, bookingNumber: 'BK-1', title: 'Cancelled trip', clientId: 2, companyId: 3,
      status: 'INVOICED', currentVersion: 2, passengers: [], serviceItems: [],
      company: { invoicePrefix: 'DH', creditNotePrefix: 'CN', invoiceTerms: '' },
      invoices: [{ id: 10, invoiceNumber: 'DH/2026/00001', documentType: 'INVOICE', cancellationId: null, companyId: 3, clientId: 2, status: 'SENT', subtotal: 1000, taxAmount: 180, roundOff: 0, grandTotal: 1180, placeOfSupply: 'Gujarat', terms: '', items: [{ description: 'Trip', quantity: 1, rate: 1000, taxAmount: 180, total: 1180 }] }],
      vendorBills: [{ id: 20, billNumber: 'VB-2026-00001', documentType: 'BILL', cancellationId: null, vendorId: 4, status: 'PENDING', subtotal: 600, taxAmount: 108, grandTotal: 708, items: [{ description: 'Trip supply', quantity: 1, rate: 600, taxAmount: 108, total: 708 }] }],
    };
    const tx: any = {
      booking: {
        findUnique: async () => booking,
        update: async ({ data }: any) => ({ ...booking, ...data, passengers: [], serviceItems: [] }),
      },
      bookingCancellation: { create: async ({ data }: any) => ({ id: 30, ...data }) },
      bookingVersion: { create: async () => ({ id: 1 }) },
      bookingServiceItem: { updateMany: async () => ({ count: 0 }) },
      invoice: {
        count: async () => 0,
        create: async ({ data }: any) => { invoiceCreates.push(data); return { id: 100 + invoiceCreates.length, ...data }; },
        update: async () => ({}), updateMany: async () => ({ count: 0 }),
      },
      vendorBill: {
        count: async () => 0,
        create: async ({ data }: any) => { billCreates.push(data); return { id: 200 + billCreates.length, ...data }; },
        update: async () => ({}),
      },
      ledgerAccount: { findUnique: async ({ where }: any) => ({ id: where.code, code: where.code }) },
      journalEntry: { create: async ({ data }: any) => { journals.push(data); return { id: journals.length }; } },
    };
    const prisma: any = { ...tx, $transaction: async (callback: any) => callback(tx) };
    await new BookingsService(prisma).cancel(1, { reason: 'Traveller cancelled', clientChargeSubtotal: 100, clientChargeTax: 18 }, 9);
    assert.deepEqual(invoiceCreates.map((item) => item.documentType), ['CREDIT_NOTE', 'INVOICE']);
    assert.deepEqual(billCreates.map((item) => item.documentType), ['CREDIT_NOTE']);
    assert.deepEqual(journals.map((item) => item.sourceType), ['CREDIT_NOTE', 'INVOICE', 'VENDOR_CREDIT_NOTE']);
    assert.equal(invoiceCreates[1].grandTotal, 118);
  });

  await test('client payment cannot exceed invoice outstanding', async () => {
    const service = new InvoicesService({
      invoice: { findUnique: async () => ({ id: 1, documentType: 'INVOICE', status: 'SENT', outstandingAmount: 500 }) },
    } as any);
    await expectReject(() => service.recordPayment(1, { amount: 501 }), BadRequestException);
  });

  await test('vendor payment cannot exceed bill outstanding', async () => {
    const service = new VendorPayablesService({
      vendorBill: { findUnique: async () => ({ id: 1, documentType: 'BILL', status: 'PENDING', outstandingAmount: 500 }) },
    } as any);
    await expectReject(() => service.recordPayment(1, { amount: 501 }), BadRequestException);
  });

  await test('manual journal rejects unbalanced debit and credit', async () => {
    const service = new AccountsService({ journalEntry: { create: async () => ({}) } } as any);
    await expectReject(() => service.createManualEntry({
      narration: 'Invalid entry',
      lines: [
        { accountId: 1, debit: 100, credit: 0 },
        { accountId: 2, debit: 0, credit: 90 },
      ],
    }), BadRequestException);
  });

  await test('manual journal accepts a balanced entry', async () => {
    let created: any;
    const service = new AccountsService({
      journalEntry: { create: async (args: any) => { created = args; return { id: 1 }; } },
    } as any);
    await service.createManualEntry({
      narration: 'Bank adjustment',
      lines: [
        { accountId: 1, debit: 100, credit: 0 },
        { accountId: 2, debit: 0, credit: 100 },
      ],
    });
    assert.equal(created.data.lines.create.length, 2);
  });

  console.log(`\n${passed} functional API checks passed.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
