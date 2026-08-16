import { strict as assert } from 'assert';
import * as bcrypt from 'bcryptjs';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

function model(defaultUnique: any = {}) {
  return {
    findMany: async () => [],
    findUnique: async () => defaultUnique,
    findFirst: async () => defaultUnique,
    count: async () => 0,
    aggregate: async () => ({ _sum: { debit: 0, credit: 0 } }),
    create: async ({ data }: any) => ({ id: 1, ...data }),
    update: async ({ data }: any) => ({ id: 1, ...data }),
    upsert: async ({ create }: any) => ({ id: 1, ...create }),
    deleteMany: async () => ({ count: 0 }),
    createMany: async () => ({ count: 0 }),
  };
}

async function main() {
  const passwordHash = await bcrypt.hash('Admin@12345', 4);
  const prisma: any = {
    user: {
      ...model(),
      count: async () => 1,
      findUnique: async () => ({ id: 1, name: 'Admin', email: 'admin@dreamholidays.local', passwordHash, role: 'ADMIN', active: true }),
    },
    company: model({ id: 1, name: 'Dream Holidays', bankAccounts: [] }),
    companyBankAccount: model(),
    globalSetting: model(),
    serviceCategory: model({ id: 1, name: 'Air Ticket', children: [] }),
    vendor: model({ id: 1, name: 'Vendor', openingBalance: 0 }),
    vendorServiceCategory: model(),
    client: model({ id: 1, name: 'Client', openingBalance: 0 }),
    booking: model({
      id: 1,
      bookingNumber: 'BK-1',
      companyId: 1,
      clientId: 1,
      company: { invoiceTerms: '' },
      serviceItems: [{
        id: 1, categoryId: 1, vendorId: 1, description: 'Travel service', quantity: 1,
        saleRate: 100, saleTax: 18, saleTotal: 118, vendorCost: 60, vendorTax: 9, vendorTotal: 69,
      }],
      invoices: [],
      vendorBills: [],
    }),
    bookingServiceItem: model(),
    invoice: model({ id: 1, invoiceNumber: 'DH/1', status: 'SENT', grandTotal: 100, paidAmount: 0, outstandingAmount: 100, items: [], company: { bankAccounts: [] } }),
    invoiceItem: model(),
    clientPayment: model(),
    vendorBill: model({ id: 1, billNumber: 'VB-1', status: 'PENDING', grandTotal: 100, paidAmount: 0, outstandingAmount: 100, items: [] }),
    vendorBillItem: model(),
    vendorPayment: model(),
    ledgerAccount: model({ id: 1, code: 'BANK', name: 'Bank', type: 'ASSET' }),
    journalEntry: model(),
    journalEntryLine: model(),
    $transaction: async (value: any) => typeof value === 'function' ? value(prisma) : Promise.all(value),
  };

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  await app.listen(0, '127.0.0.1');
  const baseUrl = await app.getUrl();

  try {
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@dreamholidays.local', password: 'Admin@12345' }),
    });
    assert.equal(loginResponse.status, 201);
    const { accessToken } = await loginResponse.json() as any;
    assert.ok(accessToken);

    const getRoutes = [
      '/auth/me', '/companies', '/companies/1', '/settings', '/categories', '/categories/tree',
      '/vendors', '/vendors/1', '/clients', '/clients/1', '/bookings', '/bookings/1',
      '/invoices', '/invoices/1', '/vendor-payables', '/vendor-payables/1',
      '/reports/dashboard', '/reports/aging/receivables', '/reports/aging/payables', '/reports/pl',
      '/reports/trial-balance', '/reports/clients', '/reports/vendors',
      '/reports/client-statement/1', '/reports/vendor-statement/1',
      '/passbook/clients', '/passbook/vendors', '/passbook/client/1', '/passbook/vendor/1',
      '/accounts', '/accounts/ledger/1',
    ];

    for (const route of getRoutes) {
      const response = await fetch(`${baseUrl}/api${route}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      assert.equal(response.status, 200, `${route} returned ${response.status}: ${await response.text()}`);
      console.log(`PASS GET ${route}`);
    }

    const mutationRoutes = [
      { method: 'PUT', route: '/settings', body: { defaultCurrency: 'INR' } },
      { method: 'POST', route: '/companies', body: { name: 'Test Company' } },
      { method: 'PATCH', route: '/companies/1', body: { name: 'Updated Company' } },
      { method: 'DELETE', route: '/companies/1' },
      { method: 'POST', route: '/categories', body: { name: 'Test Category' } },
      { method: 'PATCH', route: '/categories/1', body: { name: 'Updated Category' } },
      { method: 'DELETE', route: '/categories/1' },
      { method: 'POST', route: '/vendors', body: { name: 'Test Vendor' } },
      { method: 'PATCH', route: '/vendors/1', body: { name: 'Updated Vendor' } },
      { method: 'DELETE', route: '/vendors/1' },
      { method: 'POST', route: '/clients', body: { name: 'Test Client' } },
      { method: 'PATCH', route: '/clients/1', body: { name: 'Updated Client' } },
      { method: 'DELETE', route: '/clients/1' },
      { method: 'POST', route: '/bookings', body: { clientId: 1, companyId: 1, title: 'Test Booking', serviceItems: [] } },
      { method: 'PATCH', route: '/bookings/1', body: { title: 'Updated Booking' } },
      { method: 'DELETE', route: '/bookings/1' },
      { method: 'POST', route: '/bookings/1/recalculate' },
      { method: 'POST', route: '/invoices', body: { clientId: 1, companyId: 1, items: [{ description: 'Service', quantity: 1, rate: 100, taxAmount: 18 }] } },
      { method: 'POST', route: '/invoices/from-booking/1', body: {} },
      { method: 'POST', route: '/invoices/1/payments', body: { amount: 50 } },
      { method: 'POST', route: '/vendor-payables', body: { vendorId: 1, items: [{ description: 'Service', quantity: 1, rate: 60, taxAmount: 9 }] } },
      { method: 'POST', route: '/vendor-payables/from-booking/1' },
      { method: 'POST', route: '/vendor-payables/1/payments', body: { amount: 50 } },
      { method: 'POST', route: '/accounts/journal', body: { narration: 'Test', lines: [{ accountId: 1, debit: 100, credit: 0 }, { accountId: 2, debit: 0, credit: 100 }] } },
    ];

    for (const item of mutationRoutes) {
      const response = await fetch(`${baseUrl}/api${item.route}`, {
        method: item.method,
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: item.body === undefined ? undefined : JSON.stringify(item.body),
      });
      assert.ok(response.status >= 200 && response.status < 300, `${item.method} ${item.route} returned ${response.status}: ${await response.text()}`);
      console.log(`PASS ${item.method} ${item.route}`);
    }

    const uploadWithoutFile = await fetch(`${baseUrl}/api/uploads/company-logo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    assert.equal(uploadWithoutFile.status, 400);
    console.log('PASS POST /uploads/company-logo (rejects missing file)');

    const total = getRoutes.length + mutationRoutes.length + 2;
    console.log(`\n${total} authenticated HTTP route checks passed (including login and upload validation).`);
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
