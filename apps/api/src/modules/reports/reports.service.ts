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
      this.prisma.booking.findMany({
        where: { status: { not: 'CANCELLED' }, ...(dateFilter ? { bookingDate: dateFilter } : {}) },
        select: {
          id: true, bookingNumber: true, bookingVersion: true, title: true, status: true, bookingDate: true,
          totalSaleAmount: true, totalVendorCost: true, grossMargin: true,
          client: { select: { name: true, companyName: true } },
        },
        orderBy: { bookingDate: 'desc' },
      }),
      this.prisma.invoice.findMany({
        where: { documentType: { not: 'PROFORMA' }, ...(dateFilter ? { invoiceDate: dateFilter } : {}) },
        select: { id: true, invoiceNumber: true, invoiceDate: true, status: true, documentType: true, grandTotal: true, outstandingAmount: true, paidAmount: true, booking: { select: { bookingNumber: true, title: true } } },
        orderBy: { invoiceDate: 'desc' },
      }),
      this.prisma.vendorBill.findMany({ where: dateFilter ? { billDate: dateFilter } : undefined, select: { documentType: true, grandTotal: true, outstandingAmount: true, paidAmount: true } }),
      this.prisma.clientPayment.findMany({ where: dateFilter ? { paymentDate: dateFilter } : undefined, select: { amount: true } }),
      this.prisma.vendorPayment.findMany({ where: dateFilter ? { paymentDate: dateFilter } : undefined, select: { amount: true } }),
    ]);

    const bookingSale = bookings.reduce((acc, b) => acc + n(b.totalSaleAmount), 0);
    const bookingCost = bookings.reduce((acc, b) => acc + n(b.totalVendorCost), 0);
    const expectedMargin = bookings.reduce((acc, b) => acc + n(b.grossMargin), 0);
    const invoiceSales = invoices.reduce((acc, i) => acc + (i.documentType === 'CREDIT_NOTE' ? -n(i.grandTotal) : n(i.grandTotal)), 0);
    const receivable = invoices.reduce((acc, i) => acc + n(i.outstandingAmount), 0);
    const payable = vendorBills.reduce((acc, b) => acc + n(b.outstandingAmount), 0);
    const clientReceived = clientPayments.reduce((acc, p) => acc + n(p.amount), 0);
    const vendorPaid = vendorPayments.reduce((acc, p) => acc + n(p.amount), 0);

    return {
      bookingSale, bookingCost, expectedMargin, invoiceSales,
      receivable, payable, clientReceived, vendorPaid,
      netCashPosition: clientReceived - vendorPaid,
      bookingCount: bookings.length,
      invoiceCount: invoices.filter((invoice) => invoice.documentType === 'INVOICE').length,
      vendorBillCount: vendorBills.filter((bill) => bill.documentType === 'BILL').length,
      bookingStatusBreakdown: Object.entries(bookings.reduce((acc: Record<string, number>, booking: any) => {
        acc[booking.status] = (acc[booking.status] || 0) + 1;
        return acc;
      }, {})).map(([status, count]) => ({ status, count: Number(count) })),
      recentBookings: bookings.slice(0, 5).map((booking: any) => ({
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        bookingVersion: booking.bookingVersion,
        title: booking.title,
        status: booking.status,
        bookingDate: booking.bookingDate,
        grossMargin: n(booking.grossMargin),
        clientName: booking.client?.companyName || booking.client?.name || '',
      })),
      recentInvoices: invoices.filter((invoice) => invoice.documentType === 'INVOICE').slice(0, 5).map((invoice: any) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        status: invoice.status,
        grandTotal: n(invoice.grandTotal),
        outstandingAmount: n(invoice.outstandingAmount),
        bookingNumber: invoice.booking?.bookingNumber || '',
        bookingTitle: invoice.booking?.title || '',
      })),
      from: range.from || null,
      to: range.to || null,
    };
  }

  async agingReceivables() {
    const invoices = await this.prisma.invoice.findMany({
      where: { documentType: 'INVOICE', status: { notIn: ['CANCELLED', 'PAID'] } },
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
      where: { documentType: 'BILL', status: { notIn: ['CANCELLED', 'PAID'] } },
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
        where: { documentType: { not: 'PROFORMA' }, invoiceDate: { gte: from, lte: to } },
        include: { items: { include: { bookingServiceItem: { include: { category: { include: { parent: true } } } } } } },
      }),
      this.prisma.vendorBill.findMany({
        where: { billDate: { gte: from, lte: to } },
        include: { items: { include: { bookingServiceItem: { include: { category: { include: { parent: true } } } } } } },
      }),
    ]);

    const totalRevenue = invoices.reduce((s, i) => s + (i.documentType === 'CREDIT_NOTE' ? -n(i.grandTotal) : n(i.grandTotal)), 0);
    const totalCost = vendorBills.reduce((s, b) => s + (b.documentType === 'CREDIT_NOTE' ? -n(b.grandTotal) : n(b.grandTotal)), 0);
    const grossProfit = totalRevenue - totalCost;

    const byCategory: Record<string, { name: string; revenue: number; cost: number; margin: number }> = {};
    for (const inv of invoices) {
      for (const item of inv.items) {
        const cat = item.bookingServiceItem?.category;
        const key = cat ? (cat.parent ? `${cat.parent.name} / ${cat.name}` : cat.name) : inv.cancellationId ? 'Cancellation Charges' : 'Uncategorised';
        if (!byCategory[key]) byCategory[key] = { name: key, revenue: 0, cost: 0, margin: 0 };
        byCategory[key].revenue += inv.documentType === 'CREDIT_NOTE' ? -n(item.total) : n(item.total);
      }
    }
    for (const bill of vendorBills) {
      for (const item of bill.items) {
        const cat = item.bookingServiceItem?.category;
        const key = cat ? (cat.parent ? `${cat.parent.name} / ${cat.name}` : cat.name) : bill.cancellationId ? 'Cancellation Charges' : 'Uncategorised';
        if (!byCategory[key]) byCategory[key] = { name: key, revenue: 0, cost: 0, margin: 0 };
        byCategory[key].cost += bill.documentType === 'CREDIT_NOTE' ? -n(item.total) : n(item.total);
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
      this.prisma.invoice.findMany({ where: { clientId, documentType: { not: 'PROFORMA' }, invoiceDate: beforeDateWhere(range.from) }, select: { grandTotal: true, documentType: true } }),
      this.prisma.clientPayment.findMany({ where: { clientId, paymentDate: beforeDateWhere(range.from) }, select: { amount: true } }),
    ]) : [[], []];

    const [invoices, payments] = await Promise.all([
      this.prisma.invoice.findMany({ where: { clientId, documentType: { not: 'PROFORMA' }, ...(df ? { invoiceDate: df } : {}) }, include: { booking: { select: { id: true, bookingNumber: true, title: true, bookingVersion: true, destination: true } } }, orderBy: { invoiceDate: 'asc' } }),
      this.prisma.clientPayment.findMany({ where: { clientId, ...(df ? { paymentDate: df } : {}) }, include: { booking: { select: { id: true, bookingNumber: true, title: true, bookingVersion: true, destination: true } } }, orderBy: { paymentDate: 'asc' } }),
    ]);

    const entries: any[] = [
      ...invoices.map(i => ({
        date: i.invoiceDate,
        type: i.documentType === 'CREDIT_NOTE'
          ? (i.cancellationId ? 'Cancellation Credit Note' : 'Credit Note')
          : i.cancellationId
            ? (i.status === 'CANCELLED' ? 'Invoice (Cancelled)' : 'Cancellation Charge Invoice')
            : 'Invoice',
        ref: i.invoiceNumber,
        sourceType: 'INVOICE',
        sourceId: i.id,
        description: i.cancellationId ? 'Cancellation accounting document' : 'Invoice accounting document',
        bookingId: i.booking?.id || null,
        bookingNumber: i.booking?.bookingNumber || '',
        bookingTitle: i.booking?.title || '',
        bookingVersion: i.booking?.bookingVersion || null,
        bookingDestination: i.booking?.destination || '',
        debit: i.documentType === 'CREDIT_NOTE' ? 0 : n(i.grandTotal),
        credit: i.documentType === 'CREDIT_NOTE' ? n(i.grandTotal) : 0,
      })),
      ...payments.map(p => ({ date: p.paymentDate, type: 'Payment', ref: p.referenceNumber || '', sourceType: 'CLIENT_PAYMENT', sourceId: p.id, description: p.paymentMode, bookingId: p.booking?.id || null, bookingNumber: p.booking?.bookingNumber || '', bookingTitle: p.booking?.title || '', bookingVersion: p.booking?.bookingVersion || null, bookingDestination: p.booking?.destination || '', debit: 0, credit: n(p.amount) })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const openingBalance = n(client.openingBalance)
      + priorInvoices.reduce((sum, invoice) => sum + (invoice.documentType === 'CREDIT_NOTE' ? -n(invoice.grandTotal) : n(invoice.grandTotal)), 0)
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
      this.prisma.vendorBill.findMany({ where: { vendorId, billDate: beforeDateWhere(range.from) }, select: { grandTotal: true, documentType: true } }),
      this.prisma.vendorPayment.findMany({ where: { vendorId, paymentDate: beforeDateWhere(range.from) }, select: { amount: true } }),
    ]) : [[], []];

    const [bills, payments] = await Promise.all([
      this.prisma.vendorBill.findMany({ where: { vendorId, ...(df ? { billDate: df } : {}) }, include: { booking: { select: { id: true, bookingNumber: true, title: true, bookingVersion: true, destination: true } } }, orderBy: { billDate: 'asc' } }),
      this.prisma.vendorPayment.findMany({ where: { vendorId, ...(df ? { paymentDate: df } : {}) }, include: { booking: { select: { id: true, bookingNumber: true, title: true, bookingVersion: true, destination: true } } }, orderBy: { paymentDate: 'asc' } }),
    ]);

    const entries: any[] = [
      ...bills.map(b => ({
        date: b.billDate,
        type: b.documentType === 'CREDIT_NOTE'
          ? (b.cancellationId ? 'Cancellation Vendor Credit Note' : 'Vendor Credit Note')
          : b.cancellationId
            ? (b.status === 'CANCELLED' ? 'Bill (Cancelled)' : 'Cancellation Charge Payable')
            : 'Bill',
        ref: b.billNumber,
        sourceType: 'VENDOR_BILL',
        sourceId: b.id,
        description: b.cancellationId ? 'Cancellation accounting document' : 'Vendor payable accounting document',
        bookingId: b.booking?.id || null,
        bookingNumber: b.booking?.bookingNumber || '',
        bookingTitle: b.booking?.title || '',
        bookingVersion: b.booking?.bookingVersion || null,
        bookingDestination: b.booking?.destination || '',
        debit: b.documentType === 'CREDIT_NOTE' ? 0 : n(b.grandTotal),
        credit: b.documentType === 'CREDIT_NOTE' ? n(b.grandTotal) : 0,
      })),
      ...payments.map(p => ({ date: p.paymentDate, type: 'Payment', ref: p.referenceNumber || '', sourceType: 'VENDOR_PAYMENT', sourceId: p.id, description: p.paymentMode, bookingId: p.booking?.id || null, bookingNumber: p.booking?.bookingNumber || '', bookingTitle: p.booking?.title || '', bookingVersion: p.booking?.bookingVersion || null, bookingDestination: p.booking?.destination || '', debit: 0, credit: n(p.amount) })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const openingBalance = n(vendor.openingBalance)
      + priorBills.reduce((sum, bill) => sum + (bill.documentType === 'CREDIT_NOTE' ? -n(bill.grandTotal) : n(bill.grandTotal)), 0)
      - priorPayments.reduce((sum, payment) => sum + n(payment.amount), 0);
    let balance = openingBalance;
    const rows = entries.map(e => { balance += e.debit - e.credit; return { ...e, balance }; });

    return { vendor: { id: vendor.id, name: vendor.name, email: vendor.email, phone: vendor.phone }, openingBalance, rows, closingBalance: balance, from: range.from || null, to: range.to || null };
  }

  async listClients() { return this.prisma.client.findMany({ where: { active: true }, select: { id: true, name: true, companyName: true }, orderBy: { name: 'asc' } }); }
  async listVendors() { return this.prisma.vendor.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }); }
}
