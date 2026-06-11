import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

function n(v: any) { return Number(v || 0); }

@Injectable()
export class PassbookService {
  constructor(private readonly prisma: PrismaService) {}

  async clientPassbook(clientId: number, query: any) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found.');

    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to + 'T23:59:59') : undefined;
    const dateFilter = (field: string) => from || to ? { [field]: { ...(from && { gte: from }), ...(to && { lte: to }) } } : {};

    const [invoices, payments] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { clientId, status: { not: 'CANCELLED' }, ...dateFilter('invoiceDate') },
        include: { booking: { select: { bookingNumber: true } } },
        orderBy: { invoiceDate: 'asc' },
      }),
      this.prisma.clientPayment.findMany({
        where: { clientId, ...dateFilter('paymentDate') },
        orderBy: { paymentDate: 'asc' },
      }),
    ]);

    const entries: any[] = [];
    for (const inv of invoices) {
      entries.push({ date: inv.invoiceDate, type: 'INVOICE', description: `Invoice ${inv.invoiceNumber}${inv.booking ? ` (${inv.booking.bookingNumber})` : ''}`, debit: n(inv.grandTotal), credit: 0, ref: inv.invoiceNumber, id: inv.id });
    }
    for (const pmt of payments) {
      entries.push({ date: pmt.paymentDate, type: 'PAYMENT', description: `Payment received · ${pmt.paymentMode}${pmt.referenceNumber ? ' · ' + pmt.referenceNumber : ''}`, debit: 0, credit: n(pmt.amount), ref: pmt.referenceNumber, id: pmt.id });
    }
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const filtered = query.type === 'debit' ? entries.filter(e => e.debit > 0) : query.type === 'credit' ? entries.filter(e => e.credit > 0) : entries;

    let balance = n(client.openingBalance);
    const rows = filtered.map(e => {
      balance = balance + e.debit - e.credit;
      return { ...e, balance };
    });

    return {
      entity: { id: client.id, name: client.name, companyName: client.companyName, phone: client.phone, email: client.email },
      openingBalance: n(client.openingBalance),
      totalDebit: filtered.reduce((s, e) => s + e.debit, 0),
      totalCredit: filtered.reduce((s, e) => s + e.credit, 0),
      closingBalance: balance,
      rows,
    };
  }

  async vendorPassbook(vendorId: number, query: any) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found.');

    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to + 'T23:59:59') : undefined;
    const dateFilter = (field: string) => from || to ? { [field]: { ...(from && { gte: from }), ...(to && { lte: to }) } } : {};

    const [bills, payments] = await Promise.all([
      this.prisma.vendorBill.findMany({
        where: { vendorId, status: { not: 'CANCELLED' }, ...dateFilter('billDate') },
        include: { booking: { select: { bookingNumber: true } } },
        orderBy: { billDate: 'asc' },
      }),
      this.prisma.vendorPayment.findMany({
        where: { vendorId, ...dateFilter('paymentDate') },
        orderBy: { paymentDate: 'asc' },
      }),
    ]);

    const entries: any[] = [];
    for (const bill of bills) {
      entries.push({ date: bill.billDate, type: 'BILL', description: `Bill ${bill.billNumber}${bill.booking ? ` (${bill.booking.bookingNumber})` : ''}`, debit: n(bill.grandTotal), credit: 0, ref: bill.billNumber, id: bill.id });
    }
    for (const pmt of payments) {
      entries.push({ date: pmt.paymentDate, type: 'PAYMENT', description: `Payment made · ${pmt.paymentMode}${pmt.referenceNumber ? ' · ' + pmt.referenceNumber : ''}`, debit: 0, credit: n(pmt.amount), ref: pmt.referenceNumber, id: pmt.id });
    }
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const filtered = query.type === 'debit' ? entries.filter(e => e.debit > 0) : query.type === 'credit' ? entries.filter(e => e.credit > 0) : entries;

    let balance = n(vendor.openingBalance);
    const rows = filtered.map(e => {
      balance = balance + e.debit - e.credit;
      return { ...e, balance };
    });

    return {
      entity: { id: vendor.id, name: vendor.name, phone: vendor.phone, email: vendor.email },
      openingBalance: n(vendor.openingBalance),
      totalDebit: filtered.reduce((s, e) => s + e.debit, 0),
      totalCredit: filtered.reduce((s, e) => s + e.credit, 0),
      closingBalance: balance,
      rows,
    };
  }

  async listClients() {
    return this.prisma.client.findMany({ where: { active: true }, select: { id: true, name: true, companyName: true }, orderBy: { name: 'asc' } });
  }

  async listVendors() {
    return this.prisma.vendor.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
  }
}
