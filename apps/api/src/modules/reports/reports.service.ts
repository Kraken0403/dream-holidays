import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { beforeDateWhere, dateRangeWhere, readDateRange } from '../../common/date-range';

function n(value: any) { return Number(value || 0); }

function ageBucket(dueDate: Date | null): string {
  if (!dueDate) return 'CURRENT';
  const days = Math.floor((Date.now() - dueDate.getTime()) / 86400000);
  if (days <= 0) return 'CURRENT';
  if (days <= 30) return '1_30';
  if (days <= 60) return '31_60';
  if (days <= 90) return '61_90';
  return '90_PLUS';
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(query: any = {}) {
    const range = readDateRange(query);
    const dateFilter = dateRangeWhere(range);
    const [bookings, invoices, vendorBills, clientPayments, vendorPayments] = await Promise.all([
      this.prisma.booking.findMany({ where: dateFilter ? { bookingDate: dateFilter } : undefined, select: { totalSaleAmount: true, totalVendorCost: true, grossMargin: true } }),
      this.prisma.invoice.findMany({ where: { status: { not: 'CANCELLED' }, ...(dateFilter ? { invoiceDate: dateFilter } : {}) }, select: { grandTotal: true, outstandingAmount: true, paidAmount: true } }),
      this.prisma.vendorBill.findMany({ where: { status: { not: 'CANCELLED' }, ...(dateFilter ? { billDate: dateFilter } : {}) }, select: { grandTotal: true, outstandingAmount: true, paidAmount: true } }),
      this.prisma.clientPayment.findMany({ where: dateFilter ? { paymentDate: dateFilter } : undefined, select: { amount: true } }),
      this.prisma.vendorPayment.findMany({ where: dateFilter ? { paymentDate: dateFilter } : undefined, select: { amount: true } }),
    ]);

    const bookingSale = bookings.reduce((acc, b) => acc + n(b.totalSaleAmount), 0);
    const bookingCost = bookings.reduce((acc, b) => acc + n(b.totalVendorCost), 0);
    const expectedMargin = bookings.reduce((acc, b) => acc + n(b.grossMargin), 0);
    const invoiceSales = invoices.reduce((acc, i) => acc + n(i.grandTotal), 0);
    const receivable = invoices.reduce((acc, i) => acc + n(i.outstandingAmount), 0);
    const payable = vendorBills.reduce((acc, b) => acc + n(b.outstandingAmount), 0);
    const clientReceived = clientPayments.reduce((acc, p) => acc + n(p.amount), 0);
    const vendorPaid = vendorPayments.reduce((acc, p) => acc + n(p.amount), 0);

    return {
      bookingSale, bookingCost, expectedMargin, invoiceSales,
      receivable, payable, clientReceived, vendorPaid,
      netCashPosition: clientReceived - vendorPaid,
      bookingCount: bookings.length,
      invoiceCount: invoices.length,
      vendorBillCount: vendorBills.length,
      from: range.from || null,
      to: range.to || null,
    };
  }

  async agingReceivables() {
    const invoices = await this.prisma.invoice.findMany({
      where: { status: { notIn: ['CANCELLED', 'PAID'] } },
      include: { client: { select: { id: true, name: true, companyName: true } } },
      orderBy: { dueDate: 'asc' },
    });

    const buckets: Record<string, { label: string; total: number; invoices: any[] }> = {
      CURRENT: { label: 'Current / Not Due', total: 0, invoices: [] },
      '1_30':  { label: '1–30 Days',         total: 0, invoices: [] },
      '31_60': { label: '31–60 Days',         total: 0, invoices: [] },
      '61_90': { label: '61–90 Days',         total: 0, invoices: [] },
      '90_PLUS': { label: '90+ Days',          total: 0, invoices: [] },
    };

    for (const inv of invoices) {
      const outstanding = n(inv.outstandingAmount);
      if (outstanding <= 0) continue;
      const key = ageBucket(inv.dueDate);
      if (!buckets[key]) continue;
      buckets[key].total += outstanding;
      buckets[key].invoices.push({ id: inv.id, invoiceNumber: inv.invoiceNumber, client: inv.client, invoiceDate: inv.invoiceDate, dueDate: inv.dueDate, grandTotal: n(inv.grandTotal), outstanding });
    }

    const grandTotal = Object.values(buckets).reduce((s, b) => s + b.total, 0);
    return { buckets: Object.entries(buckets).map(([key, b]) => ({ key, ...b })), grandTotal };
  }

  async agingPayables() {
    const bills = await this.prisma.vendorBill.findMany({
      where: { status: { notIn: ['CANCELLED', 'PAID'] } },
      include: { vendor: { select: { id: true, name: true } } },
      orderBy: { dueDate: 'asc' },
    });

    const buckets: Record<string, { label: string; total: number; bills: any[] }> = {
      CURRENT: { label: 'Current / Not Due', total: 0, bills: [] },
      '1_30':  { label: '1–30 Days',         total: 0, bills: [] },
      '31_60': { label: '31–60 Days',         total: 0, bills: [] },
      '61_90': { label: '61–90 Days',         total: 0, bills: [] },
      '90_PLUS': { label: '90+ Days',          total: 0, bills: [] },
    };

    for (const bill of bills) {
      const outstanding = n(bill.outstandingAmount);
      if (outstanding <= 0) continue;
      const key = ageBucket(bill.dueDate);
      if (!buckets[key]) continue;
      buckets[key].total += outstanding;
      buckets[key].bills.push({ id: bill.id, billNumber: bill.billNumber, vendor: bill.vendor, billDate: bill.billDate, dueDate: bill.dueDate, grandTotal: n(bill.grandTotal), outstanding });
    }

    const grandTotal = Object.values(buckets).reduce((s, b) => s + b.total, 0);
    return { buckets: Object.entries(buckets).map(([key, b]) => ({ key, ...b })), grandTotal };
  }

  async profitAndLoss(query: any) {
    const requested = readDateRange(query);
    const from = requested.from || new Date(new Date().getFullYear(), 3, 1); // April 1
    const to = requested.to || new Date();

    const [invoices, vendorBills] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { status: { not: 'CANCELLED' }, invoiceDate: { gte: from, lte: to } },
        include: { items: { include: { bookingServiceItem: { include: { category: { include: { parent: true } } } } } } },
      }),
      this.prisma.vendorBill.findMany({
        where: { status: { not: 'CANCELLED' }, billDate: { gte: from, lte: to } },
        include: { items: { include: { bookingServiceItem: { include: { category: { include: { parent: true } } } } } } },
      }),
    ]);

    const totalRevenue = invoices.reduce((s, i) => s + n(i.grandTotal), 0);
    const totalCost = vendorBills.reduce((s, b) => s + n(b.grandTotal), 0);
    const grossProfit = totalRevenue - totalCost;

    const byCategory: Record<string, { name: string; revenue: number; cost: number; margin: number }> = {};
    for (const inv of invoices) {
      for (const item of inv.items) {
        const cat = item.bookingServiceItem?.category;
        const key = cat ? (cat.parent ? `${cat.parent.name} / ${cat.name}` : cat.name) : 'Uncategorised';
        if (!byCategory[key]) byCategory[key] = { name: key, revenue: 0, cost: 0, margin: 0 };
        byCategory[key].revenue += n(item.total);
      }
    }
    for (const bill of vendorBills) {
      for (const item of bill.items) {
        const cat = item.bookingServiceItem?.category;
        const key = cat ? (cat.parent ? `${cat.parent.name} / ${cat.name}` : cat.name) : 'Uncategorised';
        if (!byCategory[key]) byCategory[key] = { name: key, revenue: 0, cost: 0, margin: 0 };
        byCategory[key].cost += n(item.total);
      }
    }
    const breakdown = Object.values(byCategory).map(c => ({ ...c, margin: c.revenue - c.cost }));

    return { from, to, totalRevenue, totalCost, grossProfit, marginPct: totalRevenue ? (grossProfit / totalRevenue) * 100 : 0, breakdown };
  }

  async trialBalance(query: any = {}) {
    const range = readDateRange(query);
    const dateFilter = dateRangeWhere(range);
    const accounts = await this.prisma.ledgerAccount.findMany({
      include: {
        lines: {
          where: dateFilter ? { journalEntry: { entryDate: dateFilter } } : undefined,
          select: { debit: true, credit: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    const rows = accounts.map(a => ({
      code: a.code, name: a.name, type: a.type,
      totalDebit: a.lines.reduce((s, l) => s + n(l.debit), 0),
      totalCredit: a.lines.reduce((s, l) => s + n(l.credit), 0),
    }));

    const totals = rows.reduce((acc, r) => ({ debit: acc.debit + r.totalDebit, credit: acc.credit + r.totalCredit }), { debit: 0, credit: 0 });
    return { rows, totals, from: range.from || null, to: range.to || null };
  }

  async clientStatement(clientId: number, query: any) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return null;
    const range = readDateRange(query);
    const df = dateRangeWhere(range);

    const [priorInvoices, priorPayments] = range.from ? await Promise.all([
      this.prisma.invoice.findMany({ where: { clientId, status: { not: 'CANCELLED' }, invoiceDate: beforeDateWhere(range.from) }, select: { grandTotal: true } }),
      this.prisma.clientPayment.findMany({ where: { clientId, paymentDate: beforeDateWhere(range.from) }, select: { amount: true } }),
    ]) : [[], []];

    const [invoices, payments] = await Promise.all([
      this.prisma.invoice.findMany({ where: { clientId, status: { not: 'CANCELLED' }, ...(df ? { invoiceDate: df } : {}) }, include: { booking: { select: { bookingNumber: true } } }, orderBy: { invoiceDate: 'asc' } }),
      this.prisma.clientPayment.findMany({ where: { clientId, ...(df ? { paymentDate: df } : {}) }, orderBy: { paymentDate: 'asc' } }),
    ]);

    const entries: any[] = [
      ...invoices.map(i => ({ date: i.invoiceDate, type: 'Invoice', ref: i.invoiceNumber, description: i.booking?.bookingNumber || '', debit: n(i.grandTotal), credit: 0 })),
      ...payments.map(p => ({ date: p.paymentDate, type: 'Payment', ref: p.referenceNumber || '', description: p.paymentMode, debit: 0, credit: n(p.amount) })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const openingBalance = n(client.openingBalance)
      + priorInvoices.reduce((sum, invoice) => sum + n(invoice.grandTotal), 0)
      - priorPayments.reduce((sum, payment) => sum + n(payment.amount), 0);
    let balance = openingBalance;
    const rows = entries.map(e => { balance += e.debit - e.credit; return { ...e, balance }; });

    return { client: { id: client.id, name: client.name, companyName: client.companyName, email: client.email, phone: client.phone }, openingBalance, rows, closingBalance: balance, from: range.from || null, to: range.to || null };
  }

  async vendorStatement(vendorId: number, query: any) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) return null;
    const range = readDateRange(query);
    const df = dateRangeWhere(range);

    const [priorBills, priorPayments] = range.from ? await Promise.all([
      this.prisma.vendorBill.findMany({ where: { vendorId, status: { not: 'CANCELLED' }, billDate: beforeDateWhere(range.from) }, select: { grandTotal: true } }),
      this.prisma.vendorPayment.findMany({ where: { vendorId, paymentDate: beforeDateWhere(range.from) }, select: { amount: true } }),
    ]) : [[], []];

    const [bills, payments] = await Promise.all([
      this.prisma.vendorBill.findMany({ where: { vendorId, status: { not: 'CANCELLED' }, ...(df ? { billDate: df } : {}) }, include: { booking: { select: { bookingNumber: true } } }, orderBy: { billDate: 'asc' } }),
      this.prisma.vendorPayment.findMany({ where: { vendorId, ...(df ? { paymentDate: df } : {}) }, orderBy: { paymentDate: 'asc' } }),
    ]);

    const entries: any[] = [
      ...bills.map(b => ({ date: b.billDate, type: 'Bill', ref: b.billNumber, description: b.booking?.bookingNumber || '', debit: n(b.grandTotal), credit: 0 })),
      ...payments.map(p => ({ date: p.paymentDate, type: 'Payment', ref: p.referenceNumber || '', description: p.paymentMode, debit: 0, credit: n(p.amount) })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const openingBalance = n(vendor.openingBalance)
      + priorBills.reduce((sum, bill) => sum + n(bill.grandTotal), 0)
      - priorPayments.reduce((sum, payment) => sum + n(payment.amount), 0);
    let balance = openingBalance;
    const rows = entries.map(e => { balance += e.debit - e.credit; return { ...e, balance }; });

    return { vendor: { id: vendor.id, name: vendor.name, email: vendor.email, phone: vendor.phone }, openingBalance, rows, closingBalance: balance, from: range.from || null, to: range.to || null };
  }

  async listClients() { return this.prisma.client.findMany({ where: { active: true }, select: { id: true, name: true, companyName: true }, orderBy: { name: 'asc' } }); }
  async listVendors() { return this.prisma.vendor.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }); }
}
