import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, InvoiceStatus, JournalSourceType } from '@prisma/client';
import { money, sum } from '../../common/number';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextInvoiceNumber(companyId: number) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const count = await this.prisma.invoice.count({ where: { companyId } });
    const year = new Date().getFullYear();
    return `${company?.invoicePrefix || 'DH'}/${year}/${String(count + 1).padStart(5, '0')}`;
  }

  private calcInvoiceTotals(items: any[]) {
    const subtotal = sum(items.map((i) => money(i.quantity || 1) * money(i.rate)));
    const taxAmount = sum(items.map((i) => i.taxAmount));
    const grandTotal = money(subtotal + taxAmount);
    return { subtotal, taxAmount, grandTotal, outstandingAmount: grandTotal };
  }

  findAll(query: any) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.clientId) where.clientId = Number(query.clientId);
    if (query.companyId) where.companyId = Number(query.companyId);
    return this.prisma.invoice.findMany({
      where,
      include: { client: true, company: true, booking: true, items: true },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { client: true, company: true, booking: true, items: true, paymentAllocations: { include: { clientPayment: true } } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found.');
    return invoice;
  }

  async createManual(body: any) {
    const items = (body.items || []).map((item: any) => ({
      description: item.description,
      quantity: money(item.quantity || 1),
      rate: money(item.rate),
      taxAmount: money(item.taxAmount),
      total: item.total === undefined ? money(money(item.quantity || 1) * money(item.rate) + money(item.taxAmount)) : money(item.total),
    }));
    if (!items.length) throw new BadRequestException('At least one invoice item is required.');

    const totals = this.calcInvoiceTotals(items);
    const invoiceNumber = body.invoiceNumber || (await this.nextInvoiceNumber(Number(body.companyId)));

    return this.prisma.invoice.create({
      data: {
        invoiceNumber,
        companyId: Number(body.companyId),
        clientId: Number(body.clientId),
        bookingId: body.bookingId ? Number(body.bookingId) : null,
        invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : new Date(),
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        placeOfSupply: body.placeOfSupply,
        status: body.status || InvoiceStatus.SENT,
        notes: body.notes,
        terms: body.terms,
        ...totals,
        items: { create: items },
      },
      include: { client: true, company: true, items: true },
    });
  }

  async createFromBooking(bookingId: number, body: any) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { serviceItems: true, client: true, company: true },
    });
    if (!booking) throw new NotFoundException('Booking not found.');

    const selectedIds = Array.isArray(body.serviceItemIds) ? body.serviceItemIds.map(Number) : [];
    const sourceItems = selectedIds.length
      ? booking.serviceItems.filter((item) => selectedIds.includes(item.id))
      : booking.serviceItems;
    if (!sourceItems.length) throw new BadRequestException('No booking service items available for invoice.');

    const items = sourceItems.map((item) => ({
      bookingServiceItemId: item.id,
      description: item.description,
      quantity: item.quantity,
      rate: item.saleRate,
      taxAmount: item.saleTax,
      total: item.saleTotal,
    }));

    const totals = this.calcInvoiceTotals(items);
    const invoiceNumber = body.invoiceNumber || (await this.nextInvoiceNumber(booking.companyId));

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          companyId: booking.companyId,
          clientId: booking.clientId,
          bookingId: booking.id,
          invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : new Date(),
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          placeOfSupply: body.placeOfSupply,
          status: body.status || InvoiceStatus.SENT,
          notes: body.notes,
          terms: body.terms || booking.company.invoiceTerms,
          ...totals,
          items: { create: items },
        },
      });

      await tx.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.INVOICED } });

      await this.createJournalForInvoice(tx, invoice.id, invoice.grandTotal as any);
      return tx.invoice.findUnique({ where: { id: invoice.id }, include: { client: true, company: true, booking: true, items: true } });
    });
  }

  async recordPayment(invoiceId: number, body: any) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found.');
    const amount = money(body.amount);
    if (amount <= 0) throw new BadRequestException('Payment amount must be greater than zero.');

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.clientPayment.create({
        data: {
          clientId: invoice.clientId,
          bookingId: invoice.bookingId || null,
          paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
          amount,
          paymentMode: body.paymentMode || 'Bank Transfer',
          bankAccountId: body.bankAccountId ? Number(body.bankAccountId) : null,
          referenceNumber: body.referenceNumber,
          notes: body.notes,
          allocations: { create: [{ invoiceId, amount }] },
        },
      });

      const paidAmount = money(Number(invoice.paidAmount) + amount);
      const outstandingAmount = money(Number(invoice.grandTotal) - paidAmount);
      const status = outstandingAmount <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;
      await tx.invoice.update({ where: { id: invoiceId }, data: { paidAmount, outstandingAmount, status } });
      await this.createJournalForClientPayment(tx, payment.id, amount);
      return tx.clientPayment.findUnique({ where: { id: payment.id }, include: { allocations: true } });
    });
  }

  private async getLedger(tx: any, code: string) {
    const account = await tx.ledgerAccount.findUnique({ where: { code } });
    if (!account) throw new BadRequestException(`Ledger account missing: ${code}`);
    return account;
  }

  private async createJournalForInvoice(tx: any, invoiceId: number, amount: number) {
    const clients = await this.getLedger(tx, 'CLIENTS');
    const sales = await this.getLedger(tx, 'SALES');
    await tx.journalEntry.create({
      data: {
        sourceType: JournalSourceType.INVOICE,
        sourceId: invoiceId,
        narration: `Invoice ${invoiceId} created`,
        lines: { create: [
          { ledgerAccountId: clients.id, debit: amount, credit: 0 },
          { ledgerAccountId: sales.id, debit: 0, credit: amount },
        ] },
      },
    });
  }

  private async createJournalForClientPayment(tx: any, paymentId: number, amount: number) {
    const bank = await this.getLedger(tx, 'BANK');
    const clients = await this.getLedger(tx, 'CLIENTS');
    await tx.journalEntry.create({
      data: {
        sourceType: JournalSourceType.CLIENT_PAYMENT,
        sourceId: paymentId,
        narration: `Client payment ${paymentId} received`,
        lines: { create: [
          { ledgerAccountId: bank.id, debit: amount, credit: 0 },
          { ledgerAccountId: clients.id, debit: 0, credit: amount },
        ] },
      },
    });
  }
}
