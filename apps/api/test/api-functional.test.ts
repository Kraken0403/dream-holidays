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

  await test('client payment cannot exceed invoice outstanding', async () => {
    const service = new InvoicesService({
      invoice: { findUnique: async () => ({ id: 1, status: 'SENT', outstandingAmount: 500 }) },
    } as any);
    await expectReject(() => service.recordPayment(1, { amount: 501 }), BadRequestException);
  });

  await test('vendor payment cannot exceed bill outstanding', async () => {
    const service = new VendorPayablesService({
      vendorBill: { findUnique: async () => ({ id: 1, status: 'PENDING', outstandingAmount: 500 }) },
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
