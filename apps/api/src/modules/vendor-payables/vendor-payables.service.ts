import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { unlink } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { JournalSourceType, VendorBillStatus } from '@prisma/client';
import { maxSequenceFromValues, nextDocumentSequence } from '../../common/document-sequence';
import { money, sum } from '../../common/number';
import { dateRangeWhere, readDateRange } from '../../common/date-range';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VendorPayablesService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextBillNumber(tx: any, billDate = new Date()) {
    const year = billDate.getFullYear();
    const existing = await tx.vendorBill.findMany({
      where: { documentType: 'BILL' },
      select: { billNumber: true },
    });
    const seed = maxSequenceFromValues(existing.map((row: any) => row.billNumber), new RegExp(`^VB-${year}-(\\d+)$`));
    const sequenceKey = `vendor-bill:${year}`;
    for (let attempts = 0; attempts < 1000; attempts += 1) {
      const next = await nextDocumentSequence(tx, sequenceKey, seed);
      const candidate = `VB-${year}-${String(next).padStart(5, '0')}`;
      const collision = await tx.vendorBill.findUnique({ where: { billNumber: candidate }, select: { id: true } });
      if (!collision) return candidate;
    }
    throw new BadRequestException('Unable to allocate a unique vendor bill number.');
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
      include: { vendor: true, booking: true, items: true, paymentAllocations: { include: { vendorPayment: true } } },
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
    const billDate = body.billDate ? new Date(body.billDate) : new Date();

    return this.prisma.$transaction(async (tx) => {
      const billNumber = body.billNumber || (await this.nextBillNumber(tx, billDate));
      const bill = await tx.vendorBill.create({
        data: {
          billNumber,
          vendorInvoiceNo: body.vendorInvoiceNo,
          vendorId: Number(body.vendorId),
          bookingId: body.bookingId ? Number(body.bookingId) : null,
          billDate,
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
    if (booking.status === 'CANCELLED') throw new BadRequestException('Vendor bills cannot be generated for a cancelled booking.');
    const newerVersion = await this.prisma.booking.findFirst({ where: { previousVersionId: booking.id }, select: { bookingNumber: true } });
    if (newerVersion) throw new BadRequestException(`This booking has been superseded by ${newerVersion.bookingNumber}. Generate vendor payables from the latest booking version.`);

    const itemsByVendor = new Map<number, any[]>();
    const existingItems = await this.prisma.vendorBillItem.findMany({
      where: {
        bookingServiceItemId: { in: booking.serviceItems.map((item) => item.id) },
        vendorBill: { status: { not: VendorBillStatus.CANCELLED }, documentType: 'BILL' },
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

    return this.prisma.$transaction(async (tx) => {
      const created: any[] = [];
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
        const billDate = new Date();
        const billNumber = await this.nextBillNumber(tx, billDate);
        const bill = await tx.vendorBill.create({
          data: {
            billNumber,
            vendorId,
            bookingId,
            billDate,
            status: VendorBillStatus.PENDING,
            ...totals,
            items: { create: billItems },
          },
        });
        await this.createJournalForVendorBill(tx, bill.id, bill.grandTotal as any);
        created.push(bill);
      }
      const version = booking.currentVersion + 1;
      const versionedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { currentVersion: version },
        include: { passengers: true, serviceItems: true },
      });
      await tx.bookingVersion.create({
        data: {
          bookingId,
          version,
          changeType: 'VENDOR_PAYABLES_CREATED',
          changeNote: `${created.length} vendor payable(s) created`,
          snapshot: JSON.parse(JSON.stringify(versionedBooking)),
        },
      });
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
    if (bill.documentType !== 'BILL') throw new BadRequestException('Payments can only be recorded against vendor bills.');
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
          proofUrl: body.proofUrl,
          proofOriginalName: body.proofOriginalName,
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

  private localUploadPath(fileUrl?: string | null) {
    if (!fileUrl) return null;
    try {
      const pathname = /^https?:\/\//i.test(fileUrl) ? new URL(fileUrl).pathname : fileUrl;
      const decodedPath = decodeURIComponent(pathname).replace(/\\/g, '/');
      if (!decodedPath.startsWith('/uploads/')) return null;
      const uploadRoot = resolve(process.cwd(), 'uploads');
      const absolutePath = resolve(process.cwd(), decodedPath.replace(/^\/+/, ''));
      const rootKey = uploadRoot.toLowerCase();
      const pathKey = absolutePath.toLowerCase();
      if (pathKey !== rootKey && !pathKey.startsWith(`${rootKey}${sep.toLowerCase()}`)) return null;
      return absolutePath;
    } catch {
      return null;
    }
  }

  private async removeLocalFiles(fileUrls: Array<string | null | undefined>) {
    const paths = [...new Set(fileUrls.map((fileUrl) => this.localUploadPath(fileUrl)).filter(Boolean) as string[])];
    let removed = 0;
    for (const path of paths) {
      try {
        await unlink(path);
        removed += 1;
      } catch (error: any) {
        if (error?.code !== 'ENOENT') continue;
      }
    }
    return removed;
  }

  private async billDeletionContext(db: any, vendorBillId: number) {
    const bill = await db.vendorBill.findUnique({
      where: { id: vendorBillId },
      include: {
        creditNotes: { select: { id: true, billNumber: true, cancellationId: true } },
        booking: { select: { id: true, bookingNumber: true, status: true, currentVersion: true } },
        vendor: { select: { id: true, name: true } },
        items: { select: { id: true } },
      },
    });
    if (!bill) throw new NotFoundException('Vendor bill not found.');

    const protectedCancellationDocument = Boolean(
      bill.cancellationId && (bill.documentType === 'CREDIT_NOTE' || bill.status === VendorBillStatus.CANCELLED),
    );
    if (protectedCancellationDocument) {
      throw new BadRequestException('This is a system-generated cancellation reversal document. Delete the booking pipeline instead so cancellation accounting remains balanced.');
    }
    if (bill.creditNotes?.length) {
      throw new BadRequestException('This vendor bill has linked credit note(s). Delete the booking pipeline instead so the reversal trail remains balanced.');
    }

    const payments = await db.vendorPayment.findMany({
      where: { allocations: { some: { vendorBillId } } },
      select: {
        id: true,
        proofUrl: true,
        allocations: { select: { vendorBillId: true } },
      },
    });
    const sharedPayment = payments.find((payment: any) => payment.allocations.some((allocation: any) => Number(allocation.vendorBillId) !== vendorBillId));
    if (sharedPayment) {
      throw new BadRequestException('This vendor payable has a payment shared with another payable. Split that payment before permanently deleting this vendor payable.');
    }

    return { bill, payments, paymentIds: payments.map((row: any) => Number(row.id)) };
  }

  async deletionPreview(vendorBillId: number) {
    const { bill, payments, paymentIds } = await this.billDeletionContext(this.prisma, vendorBillId);
    const [attachments, journalEntries] = await Promise.all([
      this.prisma.attachment.findMany({
        where: {
          OR: [
            { refType: { in: ['VENDOR_BILL', 'VendorBill', 'vendorBill', 'vendor-bill'] }, refId: vendorBillId },
            { refType: { in: ['VENDOR_PAYMENT', 'VendorPayment', 'vendorPayment'] }, refId: { in: paymentIds } },
          ],
        },
        select: { id: true, fileUrl: true },
      }),
      this.prisma.journalEntry.count({
        where: {
          OR: [
            { sourceType: { in: [JournalSourceType.VENDOR_BILL, JournalSourceType.VENDOR_CREDIT_NOTE] }, sourceId: vendorBillId },
            { sourceType: JournalSourceType.VENDOR_PAYMENT, sourceId: { in: paymentIds } },
          ],
        },
      }),
    ]);

    return {
      document: {
        id: bill.id,
        number: bill.billNumber,
        documentType: bill.documentType,
        status: bill.status,
        vendor: bill.vendor,
        booking: bill.booking,
      },
      counts: {
        billItems: bill.items?.length || 0,
        payments: paymentIds.length,
        journalEntries,
        storedFiles: attachments.length + payments.filter((row: any) => row.proofUrl).length,
      },
      warning: bill.cancellationId
        ? 'This cancellation-charge vendor payable will be removed. The vendor cancellation charge remains recorded and can be posted again later.'
        : 'The vendor payable, its exclusive payments, payment allocations, journal entries and stored payment proofs will be permanently removed.',
    };
  }

  async hardDelete(vendorBillId: number) {
    const fileUrls: string[] = [];
    const result = await this.prisma.$transaction(async (tx) => {
      const { bill, payments, paymentIds } = await this.billDeletionContext(tx, vendorBillId);
      const attachments = await tx.attachment.findMany({
        where: {
          OR: [
            { refType: { in: ['VENDOR_BILL', 'VendorBill', 'vendorBill', 'vendor-bill'] }, refId: vendorBillId },
            { refType: { in: ['VENDOR_PAYMENT', 'VendorPayment', 'vendorPayment'] }, refId: { in: paymentIds } },
          ],
        },
        select: { id: true, fileUrl: true },
      });
      fileUrls.push(...attachments.map((row: any) => row.fileUrl).filter(Boolean));
      fileUrls.push(...payments.map((row: any) => row.proofUrl).filter(Boolean));

      const journalWhere = {
        OR: [
          { sourceType: { in: [JournalSourceType.VENDOR_BILL, JournalSourceType.VENDOR_CREDIT_NOTE] }, sourceId: vendorBillId },
          { sourceType: JournalSourceType.VENDOR_PAYMENT, sourceId: { in: paymentIds } },
        ],
      };
      const journalEntries = await tx.journalEntry.count({ where: journalWhere });
      await tx.journalEntry.deleteMany({ where: journalWhere });
      await tx.attachment.deleteMany({ where: { id: { in: attachments.map((row: any) => Number(row.id)) } } });
      await tx.auditLog.deleteMany({
        where: {
          OR: [
            { entityType: { in: ['VENDOR_BILL', 'VendorBill', 'vendorBill'] }, entityId: vendorBillId },
            { entityType: { in: ['VENDOR_PAYMENT', 'VendorPayment', 'vendorPayment'] }, entityId: { in: paymentIds } },
          ],
        },
      });
      await tx.vendorPayment.deleteMany({ where: { id: { in: paymentIds } } });

      const cancellationChargeBill = Boolean(
        bill.cancellationId && bill.documentType === 'BILL' && bill.status !== VendorBillStatus.CANCELLED,
      );
      await tx.vendorBill.delete({ where: { id: vendorBillId } });

      if (cancellationChargeBill && bill.cancellationId) {
        const remainingCancellationBills = await tx.vendorBill.count({
          where: {
            cancellationId: bill.cancellationId,
            documentType: 'BILL',
            status: { not: VendorBillStatus.CANCELLED },
          },
        });
        await tx.bookingCancellation.update({
          where: { id: bill.cancellationId },
          data: { vendorChargeBillsCreated: remainingCancellationBills > 0 },
        });
      }

      if (bill.bookingId && bill.booking) {
        const currentBooking = await tx.booking.findUnique({
          where: { id: bill.bookingId },
          include: { passengers: true, serviceItems: true },
        });
        if (currentBooking) {
          const version = currentBooking.currentVersion + 1;
          const updatedBooking = await tx.booking.update({
            where: { id: currentBooking.id },
            data: { currentVersion: version },
            include: { passengers: true, serviceItems: true },
          });
          await tx.bookingVersion.create({
            data: {
              bookingId: currentBooking.id,
              version,
              changeType: 'VENDOR_PAYABLE_DELETED',
              changeNote: `Vendor payable ${bill.billNumber} permanently deleted`,
              snapshot: JSON.parse(JSON.stringify(updatedBooking)),
            },
          });
        }
      }

      return {
        deleted: { id: bill.id, billNumber: bill.billNumber },
        counts: {
          vendorBills: 1,
          billItems: bill.items?.length || 0,
          payments: paymentIds.length,
          journalEntries,
          storedFiles: attachments.length + payments.filter((row: any) => row.proofUrl).length,
        },
      };
    });

    const filesRemoved = await this.removeLocalFiles(fileUrls);
    return { ...result, filesRemoved };
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
