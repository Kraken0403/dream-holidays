import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JournalSourceType, VendorBillStatus } from '@prisma/client';
import { money, sum } from '../../common/number';
import { dateRangeWhere, readDateRange } from '../../common/date-range';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VendorPayablesService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextBillNumber() {
    const count = await this.prisma.vendorBill.count();
    return `VB-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }

  private totals(items: any[]) {
    const subtotal = sum(items.map((i) => money(i.quantity || 1) * money(i.rate)));
    const taxAmount = sum(items.map((i) => i.taxAmount));
    const grandTotal = money(subtotal + taxAmount);
    return { subtotal, taxAmount, grandTotal, outstandingAmount: grandTotal };
  }

  findAll(query: any) {
    const where: any = {};
    const dateRange = dateRangeWhere(readDateRange(query));
    if (query.status) where.status = query.status;
    if (query.vendorId) where.vendorId = Number(query.vendorId);
    if (query.bookingId) where.bookingId = Number(query.bookingId);
    if (dateRange) where.billDate = dateRange;
    if (query.search) {
      where.OR = [
        { billNumber: { contains: query.search } },
        { vendorInvoiceNo: { contains: query.search } },
        { vendor: { name: { contains: query.search } } },
        { booking: { bookingNumber: { contains: query.search } } },
      ];
    }
    return this.prisma.vendorBill.findMany({
      where,
      include: { vendor: true, booking: true, items: true },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number) {
    const bill = await this.prisma.vendorBill.findUnique({
      where: { id },
      include: { vendor: true, booking: true, items: true, paymentAllocations: { include: { vendorPayment: true } } },
    });
    if (!bill) throw new NotFoundException('Vendor bill not found.');
    return bill;
  }

  async createManual(body: any) {
    const items = (body.items || []).map((item: any) => ({
      description: item.description,
      quantity: money(item.quantity || 1),
      rate: money(item.rate),
      taxAmount: money(item.taxAmount),
      total: money(money(item.quantity || 1) * money(item.rate) + money(item.taxAmount)),
    }));
    if (!items.length) throw new BadRequestException('At least one vendor bill item is required.');

    const totals = this.totals(items);
    const billNumber = body.billNumber || (await this.nextBillNumber());

    return this.prisma.$transaction(async (tx) => {
      const bill = await tx.vendorBill.create({
        data: {
          billNumber,
          vendorInvoiceNo: body.vendorInvoiceNo,
          vendorId: Number(body.vendorId),
          bookingId: body.bookingId ? Number(body.bookingId) : null,
          billDate: body.billDate ? new Date(body.billDate) : new Date(),
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          status: body.status || VendorBillStatus.PENDING,
          notes: body.notes,
          ...totals,
          items: { create: items },
        },
      });
      await this.createJournalForVendorBill(tx, bill.id, bill.grandTotal as any);
      return tx.vendorBill.findUnique({ where: { id: bill.id }, include: { vendor: true, booking: true, items: true } });
    });
  }

  async generateFromBooking(bookingId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { serviceItems: true },
    });
    if (!booking) throw new NotFoundException('Booking not found.');

    const itemsByVendor = new Map<number, any[]>();
    const existingItems = await this.prisma.vendorBillItem.findMany({
      where: {
        bookingServiceItemId: { in: booking.serviceItems.map((item) => item.id) },
        vendorBill: { status: { not: VendorBillStatus.CANCELLED } },
      },
      select: { bookingServiceItemId: true },
    });
    const billedIds = new Set(existingItems.map((item) => item.bookingServiceItemId));
    for (const item of booking.serviceItems) {
      if (!item.vendorId || Number(item.vendorTotal) <= 0 || billedIds.has(item.id)) continue;
      const list = itemsByVendor.get(item.vendorId) || [];
      list.push(item);
      itemsByVendor.set(item.vendorId, list);
    }
    if (!itemsByVendor.size) throw new BadRequestException('No vendor-costed service items found.');

    const baseCount = await this.prisma.vendorBill.count();

    return this.prisma.$transaction(async (tx) => {
      const created: any[] = [];
      let index = 0;
      for (const [vendorId, serviceItems] of itemsByVendor.entries()) {
        const billItems = serviceItems.map((item) => ({
          bookingServiceItemId: item.id,
          description: item.description,
          quantity: item.quantity,
          rate: item.vendorCost,
          taxAmount: item.vendorTax,
          total: item.vendorTotal,
        }));
        const totals = this.totals(billItems);
        index += 1;
        const billNumber = `VB-${new Date().getFullYear()}-${String(baseCount + index).padStart(5, '0')}`;
        const bill = await tx.vendorBill.create({
          data: {
            billNumber,
            vendorId,
            bookingId,
            billDate: new Date(),
            status: VendorBillStatus.PENDING,
            ...totals,
            items: { create: billItems },
          },
        });
        await this.createJournalForVendorBill(tx, bill.id, bill.grandTotal as any);
        created.push(bill);
      }
      return created;
    });
  }

  async generateFromBookings(bookingIds: unknown) {
    const ids = [...new Set((Array.isArray(bookingIds) ? bookingIds : []).map(Number).filter((id) => Number.isInteger(id) && id > 0))];
    if (!ids.length) throw new BadRequestException('Select at least one booking.');

    const results: Array<{ bookingId: number; success: boolean; createdCount: number; message?: string }> = [];
    for (const bookingId of ids) {
      try {
        const created = await this.generateFromBooking(bookingId);
        results.push({ bookingId, success: true, createdCount: created.length });
      } catch (error: any) {
        results.push({ bookingId, success: false, createdCount: 0, message: error?.message || 'Unable to generate vendor payables.' });
      }
    }

    return {
      successCount: results.filter((result) => result.success).length,
      failedCount: results.filter((result) => !result.success).length,
      createdCount: results.reduce((total, result) => total + result.createdCount, 0),
      results,
    };
  }

  async recordPayment(vendorBillId: number, body: any) {
    const bill = await this.prisma.vendorBill.findUnique({ where: { id: vendorBillId } });
    if (!bill) throw new NotFoundException('Vendor bill not found.');
    const amount = money(body.amount);
    if (amount <= 0) throw new BadRequestException('Payment amount must be greater than zero.');
    if (bill.status === VendorBillStatus.CANCELLED || bill.status === VendorBillStatus.PAID) {
      throw new BadRequestException('This vendor bill cannot accept another payment.');
    }
    if (amount > money(bill.outstandingAmount)) {
      throw new BadRequestException('Payment cannot exceed the vendor bill outstanding amount.');
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.vendorPayment.create({
        data: {
          vendorId: bill.vendorId,
          bookingId: bill.bookingId || null,
          paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
          amount,
          paymentMode: body.paymentMode || 'Bank Transfer',
          bankAccountId: body.bankAccountId ? Number(body.bankAccountId) : null,
          referenceNumber: body.referenceNumber,
          notes: body.notes,
          allocations: { create: [{ vendorBillId, amount }] },
        },
      });

      const paidAmount = money(Number(bill.paidAmount) + amount);
      const outstandingAmount = money(Number(bill.grandTotal) - paidAmount);
      const status = outstandingAmount <= 0 ? VendorBillStatus.PAID : VendorBillStatus.PARTIALLY_PAID;
      await tx.vendorBill.update({ where: { id: vendorBillId }, data: { paidAmount, outstandingAmount, status } });
      await this.createJournalForVendorPayment(tx, payment.id, amount);
      return tx.vendorPayment.findUnique({ where: { id: payment.id }, include: { allocations: true } });
    });
  }

  private async getLedger(tx: any, code: string) {
    const account = await tx.ledgerAccount.findUnique({ where: { code } });
    if (!account) throw new BadRequestException(`Ledger account missing: ${code}`);
    return account;
  }

  private async createJournalForVendorBill(tx: any, billId: number, amount: number) {
    const purchase = await this.getLedger(tx, 'PURCHASE');
    const vendors = await this.getLedger(tx, 'VENDORS');
    await tx.journalEntry.create({
      data: {
        sourceType: JournalSourceType.VENDOR_BILL,
        sourceId: billId,
        narration: `Vendor bill ${billId} created`,
        lines: { create: [
          { ledgerAccountId: purchase.id, debit: amount, credit: 0 },
          { ledgerAccountId: vendors.id, debit: 0, credit: amount },
        ] },
      },
    });
  }

  private async createJournalForVendorPayment(tx: any, paymentId: number, amount: number) {
    const vendors = await this.getLedger(tx, 'VENDORS');
    const bank = await this.getLedger(tx, 'BANK');
    await tx.journalEntry.create({
      data: {
        sourceType: JournalSourceType.VENDOR_PAYMENT,
        sourceId: paymentId,
        narration: `Vendor payment ${paymentId} made`,
        lines: { create: [
          { ledgerAccountId: vendors.id, debit: amount, credit: 0 },
          { ledgerAccountId: bank.id, debit: 0, credit: amount },
        ] },
      },
    });
  }
}
