import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { beforeDateWhere, dateRangeWhere, readDateRange } from '../../common/date-range';

function n(v: any) { return Number(v || 0); }

@Injectable()
export class PassbookService {
  constructor(private readonly prisma: PrismaService) {}

  private combinePassbooks(books: any[], kind: 'client' | 'vendor', type?: string) {
    const openingBalance = books.reduce((sum, book) => sum + n(book.openingBalance), 0);
    const entries = books.flatMap(book => book.rows.map((row: any) => ({
      ...row,
      id: `${book.entity.id}-${row.type}-${row.id}`,
      entityId: book.entity.id,
      entityName: book.entity.name,
    }))).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let balance = openingBalance;
    const allRows = entries.map((entry: any) => {
      balance = balance + n(entry.debit) - n(entry.credit);
      return { ...entry, balance };
    });
    const rows = type === 'debit' ? allRows.filter(row => row.debit > 0)
      : type === 'credit' ? allRows.filter(row => row.credit > 0) : allRows;

    return {
      entity: { id: 'all', name: kind === 'client' ? 'All Clients' : 'All Vendors' },
      openingBalance,
      totalDebit: rows.reduce((sum, row) => sum + n(row.debit), 0),
      totalCredit: rows.reduce((sum, row) => sum + n(row.credit), 0),
      closingBalance: balance,
      rows,
    };
  }

  async allClientsPassbook(query: any) {
    const clients = await this.prisma.client.findMany({ select: { id: true } });
    const books = await Promise.all(clients.map(client => this.clientPassbook(client.id, { ...query, type: undefined })));
    return this.combinePassbooks(books, 'client', query.type);
  }

  async allVendorsPassbook(query: any) {
    const vendors = await this.prisma.vendor.findMany({ select: { id: true } });
    const books = await Promise.all(vendors.map(vendor => this.vendorPassbook(vendor.id, { ...query, type: undefined })));
    return this.combinePassbooks(books, 'vendor', query.type);
  }

  async clientPassbook(clientId: number, query: any) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found.');

    const range = readDateRange(query);
    const dates = dateRangeWhere(range);
    const dateFilter = (field: string) => dates ? { [field]: dates } : {};

    const [priorInvoices, priorPayments] = range.from ? await Promise.all([
      this.prisma.invoice.findMany({ where: { clientId, documentType: { not: 'PROFORMA' }, invoiceDate: beforeDateWhere(range.from) }, select: { grandTotal: true, documentType: true } }),
      this.prisma.clientPayment.findMany({ where: { clientId, paymentDate: beforeDateWhere(range.from) }, select: { amount: true } }),
    ]) : [[], []];

    const [invoices, payments] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { clientId, documentType: { not: 'PROFORMA' }, ...dateFilter('invoiceDate') },
        include: { booking: { select: { id: true, bookingNumber: true, title: true, bookingVersion: true, destination: true } } },
        orderBy: { invoiceDate: 'asc' },
      }),
      this.prisma.clientPayment.findMany({
        where: { clientId, ...dateFilter('paymentDate') },
        include: { booking: { select: { id: true, bookingNumber: true, title: true, bookingVersion: true, destination: true } } },
        orderBy: { paymentDate: 'asc' },
      }),
    ]);

    const entries: any[] = [];
    for (const inv of invoices) {
      const isCreditNote = inv.documentType === 'CREDIT_NOTE';
      entries.push({ date: inv.invoiceDate, type: isCreditNote ? 'CREDIT_NOTE' : 'INVOICE', description: `${isCreditNote ? 'Credit note' : 'Invoice'} ${inv.invoiceNumber}`, debit: isCreditNote ? 0 : n(inv.grandTotal), credit: isCreditNote ? n(inv.grandTotal) : 0, ref: inv.invoiceNumber, id: inv.id, sourceType: 'INVOICE', sourceId: inv.id, bookingId: inv.booking?.id || null, bookingNumber: inv.booking?.bookingNumber || '', bookingTitle: inv.booking?.title || '', bookingVersion: inv.booking?.bookingVersion || null, bookingDestination: inv.booking?.destination || '' });
    }
    for (const pmt of payments) {
      entries.push({ date: pmt.paymentDate, type: 'PAYMENT', description: `Payment received · ${pmt.paymentMode}${pmt.referenceNumber ? ' · ' + pmt.referenceNumber : ''}`, debit: 0, credit: n(pmt.amount), ref: pmt.referenceNumber, id: pmt.id, sourceType: 'CLIENT_PAYMENT', sourceId: pmt.id, bookingId: pmt.booking?.id || null, bookingNumber: pmt.booking?.bookingNumber || '', bookingTitle: pmt.booking?.title || '', bookingVersion: pmt.booking?.bookingVersion || null, bookingDestination: pmt.booking?.destination || '' });
    }
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const openingBalance = n(client.openingBalance)
      + priorInvoices.reduce((sum, invoice) => sum + (invoice.documentType === 'CREDIT_NOTE' ? -n(invoice.grandTotal) : n(invoice.grandTotal)), 0)
      - priorPayments.reduce((sum, payment) => sum + n(payment.amount), 0);
    let balance = openingBalance;
    const allRows = entries.map(e => {
      balance = balance + e.debit - e.credit;
      return { ...e, balance };
    });
    const rows = query.type === 'debit' ? allRows.filter(e => e.debit > 0) : query.type === 'credit' ? allRows.filter(e => e.credit > 0) : allRows;

    return {
      entity: { id: client.id, name: client.name, companyName: client.companyName, phone: client.phone, email: client.email },
      openingBalance,
      totalDebit: rows.reduce((s, e) => s + e.debit, 0),
      totalCredit: rows.reduce((s, e) => s + e.credit, 0),
      closingBalance: balance,
      rows,
    };
  }

  async vendorPassbook(vendorId: number, query: any) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found.');

    const range = readDateRange(query);
    const dates = dateRangeWhere(range);
    const dateFilter = (field: string) => dates ? { [field]: dates } : {};

    const [priorBills, priorPayments] = range.from ? await Promise.all([
      this.prisma.vendorBill.findMany({ where: { vendorId, billDate: beforeDateWhere(range.from) }, select: { grandTotal: true, documentType: true } }),
      this.prisma.vendorPayment.findMany({ where: { vendorId, paymentDate: beforeDateWhere(range.from) }, select: { amount: true } }),
    ]) : [[], []];

    const [bills, payments] = await Promise.all([
      this.prisma.vendorBill.findMany({
        where: { vendorId, ...dateFilter('billDate') },
        include: { booking: { select: { id: true, bookingNumber: true, title: true, bookingVersion: true, destination: true } } },
        orderBy: { billDate: 'asc' },
      }),
      this.prisma.vendorPayment.findMany({
        where: { vendorId, ...dateFilter('paymentDate') },
        include: { booking: { select: { id: true, bookingNumber: true, title: true, bookingVersion: true, destination: true } } },
        orderBy: { paymentDate: 'asc' },
      }),
    ]);

    const entries: any[] = [];
    for (const bill of bills) {
      const isCreditNote = bill.documentType === 'CREDIT_NOTE';
      entries.push({ date: bill.billDate, type: isCreditNote ? 'VENDOR_CREDIT_NOTE' : 'BILL', description: `${isCreditNote ? 'Vendor credit note' : 'Bill'} ${bill.billNumber}`, debit: isCreditNote ? 0 : n(bill.grandTotal), credit: isCreditNote ? n(bill.grandTotal) : 0, ref: bill.billNumber, id: bill.id, sourceType: 'VENDOR_BILL', sourceId: bill.id, bookingId: bill.booking?.id || null, bookingNumber: bill.booking?.bookingNumber || '', bookingTitle: bill.booking?.title || '', bookingVersion: bill.booking?.bookingVersion || null, bookingDestination: bill.booking?.destination || '' });
    }
    for (const pmt of payments) {
      entries.push({ date: pmt.paymentDate, type: 'PAYMENT', description: `Payment made · ${pmt.paymentMode}${pmt.referenceNumber ? ' · ' + pmt.referenceNumber : ''}`, debit: 0, credit: n(pmt.amount), ref: pmt.referenceNumber, id: pmt.id, sourceType: 'VENDOR_PAYMENT', sourceId: pmt.id, bookingId: pmt.booking?.id || null, bookingNumber: pmt.booking?.bookingNumber || '', bookingTitle: pmt.booking?.title || '', bookingVersion: pmt.booking?.bookingVersion || null, bookingDestination: pmt.booking?.destination || '' });
    }
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const openingBalance = n(vendor.openingBalance)
      + priorBills.reduce((sum, bill) => sum + (bill.documentType === 'CREDIT_NOTE' ? -n(bill.grandTotal) : n(bill.grandTotal)), 0)
      - priorPayments.reduce((sum, payment) => sum + n(payment.amount), 0);
    let balance = openingBalance;
    const allRows = entries.map(e => {
      balance = balance + e.debit - e.credit;
      return { ...e, balance };
    });
    const rows = query.type === 'debit' ? allRows.filter(e => e.debit > 0) : query.type === 'credit' ? allRows.filter(e => e.credit > 0) : allRows;

    return {
      entity: { id: vendor.id, name: vendor.name, phone: vendor.phone, email: vendor.email },
      openingBalance,
      totalDebit: rows.reduce((s, e) => s + e.debit, 0),
      totalCredit: rows.reduce((s, e) => s + e.credit, 0),
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
