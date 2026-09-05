import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { unlink } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { BookingStatus, InvoiceStatus, JournalSourceType, VendorBillStatus } from '@prisma/client';
import { escapeRegex, maxSequenceFromValues, nextDocumentSequence } from '../../common/document-sequence';
import { money, sum } from '../../common/number';
import { dateRangeWhere, readDateRange } from '../../common/date-range';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextBookingNumber(tx: any, bookingDate = new Date()) {
    const year = bookingDate.getFullYear();
    const existing = await tx.booking.findMany({ select: { bookingNumber: true } });
    const seed = maxSequenceFromValues(existing.map((row: any) => row.bookingNumber), new RegExp(`^BK-${year}-(\\d+)$`));
    const sequenceKey = `booking:${year}`;
    for (let attempts = 0; attempts < 1000; attempts += 1) {
      const next = await nextDocumentSequence(tx, sequenceKey, seed);
      const candidate = `BK-${year}-${String(next).padStart(5, '0')}`;
      const collision = await tx.booking.findUnique({ where: { bookingNumber: candidate }, select: { id: true } });
      if (!collision) return candidate;
    }
    throw new BadRequestException('Unable to allocate a unique booking number.');
  }

  private async nextInvoiceNumber(tx: any, companyId: number, documentDate = new Date()) {
    const company = await tx.company.findUnique({ where: { id: companyId } });
    const year = documentDate.getFullYear();
    const prefix = company?.invoicePrefix || 'DH';
    const [formatSetting, financialYearSetting] = await Promise.all([
      tx.globalSetting.findUnique({ where: { key: 'invoiceNumberFormat' } }),
      tx.globalSetting.findUnique({ where: { key: 'financialYearStartMonth' } }),
    ]);
    const format = typeof formatSetting?.value === 'string' ? formatSetting.value : '{PREFIX}/{FY}/{NUMBER}';
    const startMonth = Math.min(12, Math.max(1, Number(financialYearSetting?.value || 4)));
    const startYear = documentDate.getMonth() + 1 >= startMonth ? year : year - 1;
    const financialYear = `${startYear}-${String(startYear + 1).slice(-2)}`;
    const resolvedTemplate = format
      .replaceAll('{PREFIX}', prefix)
      .replaceAll('{FY}', financialYear)
      .replaceAll('{YEAR}', String(year));
    if (!resolvedTemplate.includes('{NUMBER}')) throw new BadRequestException('Invoice number format must contain {NUMBER}.');
    const [beforeNumber, afterNumber = ''] = resolvedTemplate.split('{NUMBER}');
    const pattern = new RegExp(`^${escapeRegex(beforeNumber)}(\\d+)${escapeRegex(afterNumber)}$`);
    const existing = await tx.invoice.findMany({
      where: { companyId, documentType: 'INVOICE' },
      select: { invoiceNumber: true },
    });
    const seed = maxSequenceFromValues(existing.map((row: any) => row.invoiceNumber), pattern);
    const sequenceKey = `invoice:${companyId}:INVOICE:${financialYear}:${prefix}`;
    for (let attempts = 0; attempts < 1000; attempts += 1) {
      const next = await nextDocumentSequence(tx, sequenceKey, seed);
      const candidate = resolvedTemplate.replaceAll('{NUMBER}', String(next).padStart(5, '0'));
      const collision = await tx.invoice.findUnique({ where: { invoiceNumber: candidate }, select: { id: true } });
      if (!collision) return candidate;
    }
    throw new BadRequestException('Unable to allocate a unique invoice number.');
  }

  private async nextCreditNoteNumber(tx: any, company: any, documentDate = new Date()) {
    const year = documentDate.getFullYear();
    const prefix = company?.creditNotePrefix || 'CN';
    const existing = await tx.invoice.findMany({
      where: { companyId: company.id, documentType: 'CREDIT_NOTE' },
      select: { invoiceNumber: true },
    });
    const seed = maxSequenceFromValues(existing.map((row: any) => row.invoiceNumber), new RegExp(`^${escapeRegex(prefix)}/${year}/(\\d+)$`));
    const sequenceKey = `credit-note:${company.id}:${year}:${prefix}`;
    for (let attempts = 0; attempts < 1000; attempts += 1) {
      const next = await nextDocumentSequence(tx, sequenceKey, seed);
      const candidate = `${prefix}/${year}/${String(next).padStart(5, '0')}`;
      const collision = await tx.invoice.findUnique({ where: { invoiceNumber: candidate }, select: { id: true } });
      if (!collision) return candidate;
    }
    throw new BadRequestException('Unable to allocate a unique credit note number.');
  }

  private async nextVendorBillNumber(tx: any, documentDate = new Date()) {
    const year = documentDate.getFullYear();
    const existing = await tx.vendorBill.findMany({ where: { documentType: 'BILL' }, select: { billNumber: true } });
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

  private async nextVendorCreditNoteNumber(tx: any, documentDate = new Date()) {
    const year = documentDate.getFullYear();
    const existing = await tx.vendorBill.findMany({ where: { documentType: 'CREDIT_NOTE' }, select: { billNumber: true } });
    const seed = maxSequenceFromValues(existing.map((row: any) => row.billNumber), new RegExp(`^VCN-${year}-(\\d+)$`));
    const sequenceKey = `vendor-credit-note:${year}`;
    for (let attempts = 0; attempts < 1000; attempts += 1) {
      const next = await nextDocumentSequence(tx, sequenceKey, seed);
      const candidate = `VCN-${year}-${String(next).padStart(5, '0')}`;
      const collision = await tx.vendorBill.findUnique({ where: { billNumber: candidate }, select: { id: true } });
      if (!collision) return candidate;
    }
    throw new BadRequestException('Unable to allocate a unique vendor credit note number.');
  }

  private normalizeItem(item: any) {
    const quantity = money(item.quantity || 1);
    const saleRate = money(item.saleRate);
    const saleTax = money(item.saleTax);
    const saleTotal = money(quantity * saleRate + saleTax);
    const vendorCost = money(item.vendorCost);
    const vendorTax = money(item.vendorTax);
    const vendorTotal = money(quantity * vendorCost + vendorTax);
    const margin = money(saleTotal - vendorTotal);
    return {
      categoryId: Number(item.categoryId),
      vendorId: item.vendorId ? Number(item.vendorId) : null,
      description: item.description || '',
      serviceDate: item.serviceDate ? new Date(item.serviceDate) : null,
      quantity,
      saleRate,
      saleTax,
      saleTotal,
      vendorCost,
      vendorTax,
      vendorTotal,
      margin,
      status: item.status || 'ACTIVE',
    };
  }

  private totals(items: any[]) {
    const totalSaleAmount = sum(items.map((i) => i.saleTotal));
    const totalVendorCost = sum(items.map((i) => i.vendorTotal));
    const grossMargin = money(totalSaleAmount - totalVendorCost);
    return { totalSaleAmount, totalVendorCost, grossMargin };
  }

  private snapshot(booking: any) {
    return JSON.parse(JSON.stringify(booking));
  }

  private clientSnapshot(client: any) {
    if (!client) return null;
    const { name, companyName, phone, email, gstNumber, panNumber, billingAddress, state } = client;
    return { name, companyName, phone, email, gstNumber, panNumber, billingAddress, state };
  }

  private async getLedger(tx: any, code: string) {
    const account = await tx.ledgerAccount.findUnique({ where: { code } });
    if (!account) throw new BadRequestException(`Ledger account missing: ${code}`);
    return account;
  }

  private async postJournal(tx: any, sourceType: JournalSourceType, sourceId: number, narration: string, debitCode: string, creditCode: string, amount: number) {
    if (money(amount) <= 0) return;
    const [debit, credit] = await Promise.all([this.getLedger(tx, debitCode), this.getLedger(tx, creditCode)]);
    await tx.journalEntry.create({
      data: {
        sourceType,
        sourceId,
        narration,
        lines: { create: [
          { ledgerAccountId: debit.id, debit: money(amount), credit: 0 },
          { ledgerAccountId: credit.id, debit: 0, credit: money(amount) },
        ] },
      },
    });
  }

  private async invoiceFormatSettings(tx: any) {
    const keys = ['invoiceTitle', 'proformaTitle', 'invoiceTerms', 'invoiceFooter', 'authorizedSignatureUrl', 'invoiceItemColumns', 'proformaItemColumns'];
    const rows = await tx.globalSetting.findMany({ where: { key: { in: keys } } });
    return rows.reduce((settings: Record<string, any>, row: any) => ({ ...settings, [row.key]: row.value }), {});
  }

  private async createCancellationClientInvoice(tx: any, booking: any, cancellation: any) {
    const total = money(cancellation.clientChargeTotal);
    if (total <= 0) return null;

    const existing = await tx.invoice.findFirst({
      where: {
        cancellationId: cancellation.id,
        documentType: 'INVOICE',
        status: { not: InvoiceStatus.CANCELLED },
      },
    });
    if (existing) return existing;

    const invoiceDate = new Date(cancellation.cancelledAt);
    const invoiceNumber = await this.nextInvoiceNumber(tx, booking.companyId, invoiceDate);
    const formatSettings = await this.invoiceFormatSettings(tx);
    const chargeInvoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        documentType: 'INVOICE',
        cancellationId: cancellation.id,
        companyId: booking.companyId,
        clientId: booking.clientId,
        clientSnapshot: booking.clientSnapshot,
        bookingId: booking.id,
        invoiceDate,
        status: InvoiceStatus.SENT,
        subtotal: cancellation.clientChargeSubtotal,
        taxAmount: cancellation.clientChargeTax,
        grandTotal: cancellation.clientChargeTotal,
        outstandingAmount: cancellation.clientChargeTotal,
        notes: `Cancellation charge for ${booking.bookingNumber}: ${cancellation.reason}`,
        terms: booking.company?.invoiceTerms,
        formatSettings,
        items: {
          create: [{
            description: `Cancellation charges - ${booking.title}`,
            quantity: 1,
            rate: cancellation.clientChargeSubtotal,
            taxAmount: cancellation.clientChargeTax,
            total: cancellation.clientChargeTotal,
            hsnSac: '9985',
          }],
        },
      },
    });
    await this.postJournal(
      tx,
      JournalSourceType.INVOICE,
      chargeInvoice.id,
      `Cancellation charge invoice ${chargeInvoice.invoiceNumber} for ${booking.bookingNumber}`,
      'CLIENTS',
      'CANCELLATION_INCOME',
      total,
    );
    return chargeInvoice;
  }

  private async createCancellationVendorBills(tx: any, booking: any, cancellation: any, vendorCharges: any[]) {
    if (!vendorCharges.length) return [];

    const existingBills = await tx.vendorBill.findMany({
      where: {
        cancellationId: cancellation.id,
        documentType: 'BILL',
        status: { not: VendorBillStatus.CANCELLED },
      },
      select: { vendorId: true },
    });
    const postedVendorIds = new Set(existingBills.map((bill: any) => Number(bill.vendorId)));
    const grouped = new Map<number, any[]>();
    for (const charge of vendorCharges) {
      const vendorId = Number(charge.vendorId);
      if (!vendorId || postedVendorIds.has(vendorId)) continue;
      const list = grouped.get(vendorId) || [];
      list.push(charge);
      grouped.set(vendorId, list);
    }

    const created: any[] = [];
    for (const [vendorId, charges] of grouped.entries()) {
      const subtotal = sum(charges.map((charge: any) => charge.subtotal));
      const taxAmount = sum(charges.map((charge: any) => charge.taxAmount));
      const total = money(subtotal + taxAmount);
      if (total <= 0) continue;
      const billDate = new Date(cancellation.cancelledAt);
      const billNumber = await this.nextVendorBillNumber(tx, billDate);
      const bill = await tx.vendorBill.create({
        data: {
          billNumber,
          documentType: 'BILL',
          cancellationId: cancellation.id,
          vendorId,
          bookingId: booking.id,
          billDate,
          status: VendorBillStatus.PENDING,
          subtotal,
          taxAmount,
          grandTotal: total,
          outstandingAmount: total,
          notes: `Vendor cancellation charges for ${booking.bookingNumber}`,
          items: {
            create: charges.map((charge: any) => ({
              description: charge.notes || `Cancellation charges - ${booking.title}`,
              quantity: 1,
              rate: charge.subtotal,
              taxAmount: charge.taxAmount,
              total: money(Number(charge.subtotal) + Number(charge.taxAmount)),
            })),
          },
        },
      });
      await this.postJournal(
        tx,
        JournalSourceType.VENDOR_BILL,
        bill.id,
        `Vendor cancellation charge ${bill.billNumber} for ${booking.bookingNumber}`,
        'CANCELLATION_EXPENSE',
        'VENDORS',
        total,
      );
      created.push(bill);
    }
    return created;
  }

  private async bookingSnapshot(tx: any, id: number) {
    return tx.booking.findUnique({
      where: { id },
      include: { passengers: true, serviceItems: true },
    });
  }

  private async addVersion(tx: any, booking: any, changeType: string, changeNote?: string, changedById?: number) {
    await tx.bookingVersion.create({
      data: {
        bookingId: booking.id,
        version: booking.currentVersion,
        changeType,
        changeNote: changeNote || null,
        changedById: changedById || null,
        snapshot: this.snapshot(booking),
      },
    });
  }

  findAll(query: any) {
    const where: any = {};
    const dateRange = dateRangeWhere(readDateRange(query));
    if (query.status) where.status = query.status;
    if (query.clientId) where.clientId = Number(query.clientId);
    if (query.companyId) where.companyId = Number(query.companyId);
    if (dateRange) where.bookingDate = dateRange;
    if (query.search) {
      where.OR = [
        { bookingNumber: { contains: query.search } },
        { title: { contains: query.search } },
        { destination: { contains: query.search } },
        { client: { name: { contains: query.search } } },
      ];
    }
    return this.prisma.booking.findMany({
      where,
      include: {
        client: true,
        company: true,
        nextVersion: { select: { id: true, bookingNumber: true, bookingVersion: true } },
        serviceItems: { include: { category: { include: { parent: true } }, vendor: true } },
      },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        client: true,
        company: true,
        salesPerson: true,
        passengers: true,
        serviceItems: { include: { category: { include: { parent: true } }, vendor: true } },
        invoices: { orderBy: { id: 'desc' }, include: { paymentAllocations: { include: { clientPayment: true } } } },
        vendorBills: { include: { vendor: true, paymentAllocations: { include: { vendorPayment: true } } } },
        clientPayments: true,
        vendorPayments: true,
        versions: { orderBy: { version: 'desc' } },
        seriesRoot: { select: { id: true, bookingNumber: true, bookingVersion: true } },
        previousVersion: { select: { id: true, bookingNumber: true, bookingVersion: true } },
        nextVersion: { select: { id: true, bookingNumber: true, bookingVersion: true } },
        cancellation: { include: { vendorCharges: { include: { vendor: true } }, invoices: true, vendorBills: { include: { vendor: true } } } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found.');
    const rootId = booking.seriesRootId || booking.id;
    const seriesVersions = await this.prisma.booking.findMany({
      where: { OR: [{ id: rootId }, { seriesRootId: rootId }] },
      select: {
        id: true,
        bookingNumber: true,
        bookingVersion: true,
        status: true,
        title: true,
        createdAt: true,
        previousVersionId: true,
      },
      orderBy: { bookingVersion: 'asc' },
    });
    return { ...booking, seriesVersions };
  }

  private async bookingSeriesScope(db: any, id: number) {
    const selected = await db.booking.findUnique({
      where: { id },
      select: { id: true, bookingNumber: true, title: true, seriesRootId: true },
    });
    if (!selected) throw new NotFoundException('Booking not found.');

    const rootId = selected.seriesRootId || selected.id;
    const series = await db.booking.findMany({
      where: { OR: [{ id: rootId }, { seriesRootId: rootId }] },
      select: { id: true, bookingNumber: true, bookingVersion: true, title: true, status: true },
      orderBy: { bookingVersion: 'asc' },
    });
    return { selected, rootId, series, seriesIds: series.map((booking: any) => Number(booking.id)) };
  }

  private linkedAttachmentWhere(seriesIds: number[], invoiceIds: number[], vendorBillIds: number[], clientPaymentIds: number[], vendorPaymentIds: number[]) {
    return {
      OR: [
        { refType: { in: ['BOOKING', 'Booking', 'booking'] }, refId: { in: seriesIds } },
        { refType: { in: ['INVOICE', 'Invoice', 'invoice'] }, refId: { in: invoiceIds } },
        { refType: { in: ['VENDOR_BILL', 'VendorBill', 'vendorBill', 'vendor-bill'] }, refId: { in: vendorBillIds } },
        { refType: { in: ['CLIENT_PAYMENT', 'ClientPayment', 'clientPayment'] }, refId: { in: clientPaymentIds } },
        { refType: { in: ['VENDOR_PAYMENT', 'VendorPayment', 'vendorPayment'] }, refId: { in: vendorPaymentIds } },
      ],
    };
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

  async deletionPreview(id: number) {
    const { selected, series, seriesIds } = await this.bookingSeriesScope(this.prisma, id);
    const [invoices, vendorBills, cancellationCount, serviceItemCount, passengerCount, historyCount] = await Promise.all([
      this.prisma.invoice.findMany({ where: { bookingId: { in: seriesIds } }, select: { id: true } }),
      this.prisma.vendorBill.findMany({ where: { bookingId: { in: seriesIds } }, select: { id: true } }),
      this.prisma.bookingCancellation.count({ where: { bookingId: { in: seriesIds } } }),
      this.prisma.bookingServiceItem.count({ where: { bookingId: { in: seriesIds } } }),
      this.prisma.bookingPassenger.count({ where: { bookingId: { in: seriesIds } } }),
      this.prisma.bookingVersion.count({ where: { bookingId: { in: seriesIds } } }),
    ]);
    const invoiceIds = invoices.map((row: any) => Number(row.id));
    const vendorBillIds = vendorBills.map((row: any) => Number(row.id));
    const [clientPayments, vendorPayments] = await Promise.all([
      this.prisma.clientPayment.findMany({
        where: { OR: [{ bookingId: { in: seriesIds } }, { allocations: { some: { invoiceId: { in: invoiceIds } } } }] },
        select: { id: true, proofUrl: true },
      }),
      this.prisma.vendorPayment.findMany({
        where: { OR: [{ bookingId: { in: seriesIds } }, { allocations: { some: { vendorBillId: { in: vendorBillIds } } } }] },
        select: { id: true, proofUrl: true },
      }),
    ]);
    const clientPaymentIds = clientPayments.map((row: any) => Number(row.id));
    const vendorPaymentIds = vendorPayments.map((row: any) => Number(row.id));
    const [attachmentCount, journalCount] = await Promise.all([
      this.prisma.attachment.count({ where: this.linkedAttachmentWhere(seriesIds, invoiceIds, vendorBillIds, clientPaymentIds, vendorPaymentIds) }),
      this.prisma.journalEntry.count({
        where: {
          OR: [
            { sourceType: { in: [JournalSourceType.INVOICE, JournalSourceType.CREDIT_NOTE] }, sourceId: { in: invoiceIds } },
            { sourceType: { in: [JournalSourceType.VENDOR_BILL, JournalSourceType.VENDOR_CREDIT_NOTE] }, sourceId: { in: vendorBillIds } },
            { sourceType: JournalSourceType.CLIENT_PAYMENT, sourceId: { in: clientPaymentIds } },
            { sourceType: JournalSourceType.VENDOR_PAYMENT, sourceId: { in: vendorPaymentIds } },
          ],
        },
      }),
    ]);

    return {
      booking: { id: selected.id, bookingNumber: selected.bookingNumber, title: selected.title },
      series,
      deletesWholeSeries: series.length > 1,
      counts: {
        bookings: series.length,
        invoices: invoiceIds.length,
        vendorBills: vendorBillIds.length,
        clientPayments: clientPaymentIds.length,
        vendorPayments: vendorPaymentIds.length,
        cancellations: cancellationCount,
        serviceItems: serviceItemCount,
        passengers: passengerCount,
        bookingHistory: historyCount,
        journalEntries: journalCount,
        storedFiles: attachmentCount + clientPayments.filter((row: any) => row.proofUrl).length + vendorPayments.filter((row: any) => row.proofUrl).length,
      },
    };
  }

  async hardDelete(id: number, _userId?: number) {
    const fileUrls: string[] = [];
    const deleted = await this.prisma.$transaction(async (tx) => {
      const { selected, series, seriesIds } = await this.bookingSeriesScope(tx, id);

      const [invoices, vendorBills] = await Promise.all([
        tx.invoice.findMany({ where: { bookingId: { in: seriesIds } }, select: { id: true } }),
        tx.vendorBill.findMany({ where: { bookingId: { in: seriesIds } }, select: { id: true } }),
      ]);
      const invoiceIds = invoices.map((row: any) => Number(row.id));
      const vendorBillIds = vendorBills.map((row: any) => Number(row.id));

      const [clientPayments, vendorPayments] = await Promise.all([
        tx.clientPayment.findMany({
          where: { OR: [{ bookingId: { in: seriesIds } }, { allocations: { some: { invoiceId: { in: invoiceIds } } } }] },
          select: { id: true, bookingId: true, proofUrl: true, allocations: { select: { invoiceId: true } } },
        }),
        tx.vendorPayment.findMany({
          where: { OR: [{ bookingId: { in: seriesIds } }, { allocations: { some: { vendorBillId: { in: vendorBillIds } } } }] },
          select: { id: true, bookingId: true, proofUrl: true, allocations: { select: { vendorBillId: true } } },
        }),
      ]);
      const invoiceIdSet = new Set(invoiceIds);
      const vendorBillIdSet = new Set(vendorBillIds);
      const sharedClientPayment = clientPayments.find((payment: any) => payment.allocations.some((allocation: any) => !invoiceIdSet.has(Number(allocation.invoiceId))));
      if (sharedClientPayment) throw new BadRequestException('This booking has a client payment allocated to another booking as well. Split that payment before permanently deleting this booking.');
      const sharedVendorPayment = vendorPayments.find((payment: any) => payment.allocations.some((allocation: any) => !vendorBillIdSet.has(Number(allocation.vendorBillId))));
      if (sharedVendorPayment) throw new BadRequestException('This booking has a vendor payment allocated to another booking as well. Split that payment before permanently deleting this booking.');

      const clientPaymentIds = clientPayments.map((row: any) => Number(row.id));
      const vendorPaymentIds = vendorPayments.map((row: any) => Number(row.id));
      const attachments = await tx.attachment.findMany({
        where: this.linkedAttachmentWhere(seriesIds, invoiceIds, vendorBillIds, clientPaymentIds, vendorPaymentIds),
        select: { id: true, fileUrl: true },
      });
      fileUrls.push(...attachments.map((row: any) => row.fileUrl).filter(Boolean));
      fileUrls.push(...clientPayments.map((row: any) => row.proofUrl).filter(Boolean));
      fileUrls.push(...vendorPayments.map((row: any) => row.proofUrl).filter(Boolean));

      const journalWhere = {
        OR: [
          { sourceType: { in: [JournalSourceType.INVOICE, JournalSourceType.CREDIT_NOTE] }, sourceId: { in: invoiceIds } },
          { sourceType: { in: [JournalSourceType.VENDOR_BILL, JournalSourceType.VENDOR_CREDIT_NOTE] }, sourceId: { in: vendorBillIds } },
          { sourceType: JournalSourceType.CLIENT_PAYMENT, sourceId: { in: clientPaymentIds } },
          { sourceType: JournalSourceType.VENDOR_PAYMENT, sourceId: { in: vendorPaymentIds } },
        ],
      };
      const journalCount = await tx.journalEntry.count({ where: journalWhere });
      await tx.journalEntry.deleteMany({ where: journalWhere });
      await tx.attachment.deleteMany({ where: { id: { in: attachments.map((row: any) => Number(row.id)) } } });

      await tx.auditLog.deleteMany({
        where: {
          OR: [
            { entityType: { in: ['BOOKING', 'Booking', 'booking'] }, entityId: { in: seriesIds } },
            { entityType: { in: ['INVOICE', 'Invoice', 'invoice'] }, entityId: { in: invoiceIds } },
            { entityType: { in: ['VENDOR_BILL', 'VendorBill', 'vendorBill'] }, entityId: { in: vendorBillIds } },
            { entityType: { in: ['CLIENT_PAYMENT', 'ClientPayment', 'clientPayment'] }, entityId: { in: clientPaymentIds } },
            { entityType: { in: ['VENDOR_PAYMENT', 'VendorPayment', 'vendorPayment'] }, entityId: { in: vendorPaymentIds } },
          ],
        },
      });

      await tx.clientPayment.deleteMany({ where: { id: { in: clientPaymentIds } } });
      await tx.vendorPayment.deleteMany({ where: { id: { in: vendorPaymentIds } } });

      await tx.invoice.updateMany({
        where: { OR: [{ originalInvoiceId: { in: invoiceIds } }, { convertedFromProformaId: { in: invoiceIds } }] },
        data: { originalInvoiceId: null, convertedFromProformaId: null },
      });
      await tx.vendorBill.updateMany({
        where: { originalBillId: { in: vendorBillIds } },
        data: { originalBillId: null },
      });
      await tx.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
      await tx.vendorBill.deleteMany({ where: { id: { in: vendorBillIds } } });

      const cancellationCount = await tx.bookingCancellation.count({ where: { bookingId: { in: seriesIds } } });
      await tx.bookingCancellation.deleteMany({ where: { bookingId: { in: seriesIds } } });

      const [serviceItemCount, passengerCount, historyCount] = await Promise.all([
        tx.bookingServiceItem.count({ where: { bookingId: { in: seriesIds } } }),
        tx.bookingPassenger.count({ where: { bookingId: { in: seriesIds } } }),
        tx.bookingVersion.count({ where: { bookingId: { in: seriesIds } } }),
      ]);

      await tx.booking.updateMany({
        where: { OR: [{ seriesRootId: { in: seriesIds } }, { previousVersionId: { in: seriesIds } }] },
        data: { seriesRootId: null, previousVersionId: null },
      });
      await tx.booking.updateMany({ where: { id: { in: seriesIds } }, data: { seriesRootId: null, previousVersionId: null } });
      await tx.booking.deleteMany({ where: { id: { in: seriesIds } } });

      return {
        bookingNumber: selected.bookingNumber,
        deletedSeries: series.map((booking: any) => booking.bookingNumber),
        counts: {
          bookings: seriesIds.length,
          invoices: invoiceIds.length,
          vendorBills: vendorBillIds.length,
          clientPayments: clientPaymentIds.length,
          vendorPayments: vendorPaymentIds.length,
          cancellations: cancellationCount,
          serviceItems: serviceItemCount,
          passengers: passengerCount,
          bookingHistory: historyCount,
          journalEntries: journalCount,
          attachments: attachments.length,
        },
      };
    });

    const filesRemoved = await this.removeLocalFiles(fileUrls);
    return { ...deleted, filesRemoved };
  }

  async create(body: any, userId?: number) {
    const items = (body.serviceItems || []).map((item: any) => this.normalizeItem(item));
    const totals = this.totals(items);

    return this.prisma.$transaction(async (tx) => {
      const client = await tx.client.findUnique({ where: { id: Number(body.clientId) } });
      if (!client) throw new NotFoundException('Client not found.');
      const bookingDate = body.bookingDate ? new Date(body.bookingDate) : new Date();
      const bookingNumber = body.bookingNumber || (await this.nextBookingNumber(tx, bookingDate));
      const created = await tx.booking.create({
        data: {
        bookingNumber,
        bookingDate,
        clientId: Number(body.clientId),
        clientSnapshot: this.clientSnapshot(client),
        companyId: Number(body.companyId),
        salesPersonId: body.salesPersonId ? Number(body.salesPersonId) : userId || null,
        title: body.title,
        destination: body.destination,
        travelStartDate: body.travelStartDate ? new Date(body.travelStartDate) : null,
        travelEndDate: body.travelEndDate ? new Date(body.travelEndDate) : null,
        passengerCount: Number(body.passengerCount || 1),
        status: body.status || BookingStatus.DRAFT,
        internalNotes: body.internalNotes,
        clientNotes: body.clientNotes,
        ...totals,
        passengers: Array.isArray(body.passengers) && body.passengers.length ? { create: body.passengers } : undefined,
        serviceItems: items.length ? { create: items } : undefined,
        },
        include: { passengers: true, serviceItems: true },
      });
      await this.addVersion(tx, created, 'CREATED', body.changeNote, userId);
      return tx.booking.findUnique({
        where: { id: created.id },
        include: { client: true, company: true, serviceItems: { include: { category: { include: { parent: true } }, vendor: true } } },
      });
    });
  }

  async createVersion(id: number, body: any, userId?: number) {
    const changeNote = String(body?.changeNote || '').trim();
    if (!changeNote) throw new BadRequestException('Describe what changed in this booking version.');

    try {
      const createdId = await this.prisma.$transaction(async (tx) => {
        const source = await tx.booking.findUnique({
          where: { id },
          include: { passengers: true, serviceItems: true },
        });
        if (!source) throw new NotFoundException('Booking not found.');

        if (source.status !== BookingStatus.CANCELLED) {
          const [activeInvoices, activeVendorBills] = await Promise.all([
            tx.invoice.count({ where: { bookingId: source.id, documentType: 'INVOICE', status: { not: InvoiceStatus.CANCELLED } } }),
            tx.vendorBill.count({ where: { bookingId: source.id, documentType: 'BILL', status: { not: VendorBillStatus.CANCELLED } } }),
          ]);
          if (activeInvoices > 0 || activeVendorBills > 0) {
            throw new BadRequestException('This booking has posted accounting documents. Cancel/reverse the current booking first, then create the replacement booking version.');
          }
        }

        const rootId = source.seriesRootId || source.id;
        const series = await tx.booking.findMany({
          where: { OR: [{ id: rootId }, { seriesRootId: rootId }] },
          orderBy: { bookingVersion: 'desc' },
          take: 1,
        });
        const latest = series[0];
        if (!latest || latest.id !== source.id) {
          throw new BadRequestException(`Create the next version from the latest booking version (${latest?.bookingNumber || 'unknown'}).`);
        }

        const root = rootId === source.id
          ? source
          : await tx.booking.findUnique({ where: { id: rootId } });
        if (!root) throw new BadRequestException('Booking version root could not be resolved.');

        const nextVersion = Number(latest.bookingVersion || 1) + 1;
        const rootBookingNumber = String(root.bookingNumber).replace(/-v\d+$/i, '');
        const bookingNumber = `${rootBookingNumber}-v${nextVersion}`;
        const numberExists = await tx.booking.findUnique({ where: { bookingNumber }, select: { id: true } });
        if (numberExists) throw new BadRequestException(`Booking ${bookingNumber} already exists.`);

        const requestedItems = (Array.isArray(body?.serviceItems) ? body.serviceItems : source.serviceItems)
          .map((item: any) => ({ ...this.normalizeItem(item), status: 'ACTIVE' }));
        const totals = this.totals(requestedItems);

        const clientId = body?.clientId ? Number(body.clientId) : source.clientId;
        const client = await tx.client.findUnique({ where: { id: clientId } });
        if (!client) throw new NotFoundException('Client not found.');

        const requestedStatus = body?.status;
        const status = [BookingStatus.DRAFT, BookingStatus.CONFIRMED].includes(requestedStatus)
          ? requestedStatus
          : BookingStatus.DRAFT;
        const passengers = Array.isArray(body?.passengers)
          ? body.passengers
          : source.passengers.map((passenger: any) => ({
            fullName: passenger.fullName,
            phone: passenger.phone,
            email: passenger.email,
            passportNo: passenger.passportNo,
            notes: passenger.notes,
          }));

        const created = await tx.booking.create({
          data: {
            bookingNumber,
            bookingVersion: nextVersion,
            seriesRootId: rootId,
            previousVersionId: source.id,
            bookingDate: body?.bookingDate ? new Date(body.bookingDate) : source.bookingDate,
            clientId,
            clientSnapshot: this.clientSnapshot(client),
            companyId: body?.companyId ? Number(body.companyId) : source.companyId,
            salesPersonId: body?.salesPersonId ? Number(body.salesPersonId) : source.salesPersonId,
            title: body?.title ?? source.title,
            destination: body?.destination ?? source.destination,
            travelStartDate: body?.travelStartDate ? new Date(body.travelStartDate) : source.travelStartDate,
            travelEndDate: body?.travelEndDate ? new Date(body.travelEndDate) : source.travelEndDate,
            passengerCount: body?.passengerCount ? Number(body.passengerCount) : source.passengerCount,
            status,
            internalNotes: body?.internalNotes ?? source.internalNotes,
            clientNotes: body?.clientNotes ?? source.clientNotes,
            ...totals,
            passengers: passengers.length ? { create: passengers } : undefined,
            serviceItems: requestedItems.length ? { create: requestedItems } : undefined,
          },
          include: { passengers: true, serviceItems: true },
        });

        await this.addVersion(tx, created, 'VERSION_CREATED', `Created from ${source.bookingNumber}: ${changeNote}`, userId);
        return created.id;
      });

      return this.findOne(createdId);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestException('Another booking version was created at the same time. Refresh and create the version from the latest booking.');
      }
      throw error;
    }
  }

  async update(id: number, body: any, userId?: number) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Booking not found.');
      const newerVersion = await tx.booking.findFirst({ where: { previousVersionId: id }, select: { bookingNumber: true } });
      if (newerVersion) throw new BadRequestException(`This booking has been superseded by ${newerVersion.bookingNumber}. Edit the latest booking version instead.`);
      if (existing.status === BookingStatus.CANCELLED) throw new BadRequestException('A cancelled booking cannot be edited.');
      if (body.status === BookingStatus.CANCELLED) throw new BadRequestException('Use the cancellation workflow to cancel a booking.');

      let totalsUpdate = {};
      if (Array.isArray(body.serviceItems)) {
        const billedItems = await tx.bookingServiceItem.count({
          where: {
            bookingId: id,
            OR: [
              { invoiceItems: { some: { invoice: { documentType: 'INVOICE', status: { not: InvoiceStatus.CANCELLED } } } } },
              { vendorBillItems: { some: { vendorBill: { documentType: 'BILL', status: { not: VendorBillStatus.CANCELLED } } } } },
            ],
          },
        });
        if (billedItems > 0) {
          throw new BadRequestException(
            'Service items cannot be replaced after an invoice or vendor bill has been generated.',
          );
        }
        const items = body.serviceItems.map((item: any) => this.normalizeItem(item));
        totalsUpdate = this.totals(items);
        await tx.bookingServiceItem.deleteMany({ where: { bookingId: id } });
        if (items.length) await tx.bookingServiceItem.createMany({ data: items.map((item: any) => ({ ...item, bookingId: id })) });
      }

      const { serviceItems, passengers, changeNote, expectedVersion, ...booking } = body;
      if (expectedVersion !== undefined && Number(expectedVersion) !== existing.currentVersion) {
        throw new BadRequestException(`Booking has changed. Expected version ${expectedVersion}, current version is ${existing.currentVersion}.`);
      }
      const nextVersion = existing.currentVersion + 1;
      const changedClient = booking.clientId && Number(booking.clientId) !== existing.clientId
        ? await tx.client.findUnique({ where: { id: Number(booking.clientId) } }) : null;
      if (booking.clientId && !changedClient && Number(booking.clientId) !== existing.clientId) throw new NotFoundException('Client not found.');
      await tx.booking.update({
        where: { id },
        data: {
          ...booking,
          clientId: booking.clientId ? Number(booking.clientId) : undefined,
          clientSnapshot: changedClient ? this.clientSnapshot(changedClient) : undefined,
          companyId: booking.companyId ? Number(booking.companyId) : undefined,
          passengerCount: booking.passengerCount ? Number(booking.passengerCount) : undefined,
          bookingDate: booking.bookingDate ? new Date(booking.bookingDate) : undefined,
          travelStartDate: booking.travelStartDate ? new Date(booking.travelStartDate) : undefined,
          travelEndDate: booking.travelEndDate ? new Date(booking.travelEndDate) : undefined,
          ...totalsUpdate,
          currentVersion: nextVersion,
        },
      });

      const updated = await this.bookingSnapshot(tx, id);
      await this.addVersion(tx, updated, 'UPDATED', changeNote, userId);

      return tx.booking.findUnique({
        where: { id },
        include: { client: true, company: true, serviceItems: { include: { category: { include: { parent: true } }, vendor: true } } },
      });
    });
  }

  async recalculate(id: number, userId?: number) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Booking not found.');
      const newerVersion = await tx.booking.findFirst({ where: { previousVersionId: id }, select: { bookingNumber: true } });
      if (newerVersion) throw new BadRequestException(`This booking has been superseded by ${newerVersion.bookingNumber}. Recalculate the latest booking version instead.`);
      if (existing.status === BookingStatus.CANCELLED) throw new BadRequestException('A cancelled booking cannot be recalculated.');
      const items = await tx.bookingServiceItem.findMany({ where: { bookingId: id } });
      const totals = this.totals(items);
      const updated = await tx.booking.update({ where: { id }, data: { ...totals, currentVersion: existing.currentVersion + 1 }, include: { passengers: true, serviceItems: true } });
      await this.addVersion(tx, updated, 'RECALCULATED', 'Booking totals recalculated', userId);
      return updated;
    });
  }

  async cancel(id: number, body: any, userId?: number) {
    const reason = String(body?.reason || '').trim();
    if (!reason) throw new BadRequestException('A cancellation reason is required.');

    const clientSubtotal = money(body?.clientChargeSubtotal);
    const clientTax = money(body?.clientChargeTax);
    if (clientSubtotal < 0 || clientTax < 0) throw new BadRequestException('Client cancellation charges cannot be negative.');

    const normalizedVendorCharges = (Array.isArray(body?.vendorCharges) ? body.vendorCharges : [])
      .map((charge: any) => ({
        vendorId: Number(charge.vendorId),
        subtotal: money(charge.subtotal),
        taxAmount: money(charge.taxAmount),
        notes: String(charge.notes || '').trim() || null,
      }));
    if (normalizedVendorCharges.some((charge: any) => charge.subtotal < 0 || charge.taxAmount < 0)) {
      throw new BadRequestException('Vendor cancellation charges cannot be negative.');
    }
    const vendorCharges = normalizedVendorCharges.filter((charge: any) => charge.vendorId && (charge.subtotal > 0 || charge.taxAmount > 0));
    const generateClientChargeInvoice = body?.generateClientChargeInvoice !== false;
    const generateVendorChargeBills = body?.generateVendorChargeBills !== false;

    await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id },
        include: {
          company: true,
          invoices: { where: { status: { not: InvoiceStatus.CANCELLED } }, include: { items: true } },
          vendorBills: { where: { status: { not: VendorBillStatus.CANCELLED } }, include: { items: true } },
        },
      });
      if (!booking) throw new NotFoundException('Booking not found.');
      const newerVersion = await tx.booking.findFirst({ where: { previousVersionId: id }, select: { bookingNumber: true } });
      if (newerVersion) throw new BadRequestException(`This booking has been superseded by ${newerVersion.bookingNumber}. Cancel the latest booking version instead.`);
      if (booking.status === BookingStatus.CANCELLED) throw new BadRequestException('This booking is already cancelled.');

      if (vendorCharges.length) {
        const vendorIds: number[] = Array.from(new Set<number>(vendorCharges.map((charge: any) => Number(charge.vendorId))));
        const validVendors = await tx.vendor.findMany({ where: { id: { in: vendorIds } }, select: { id: true } });
        if (validVendors.length !== vendorIds.length) throw new BadRequestException('One or more cancellation-charge vendors are invalid.');
      }

      const invoices = booking.invoices.filter((invoice: any) => invoice.documentType === 'INVOICE' && !invoice.cancellationId);
      const proformas = booking.invoices.filter((invoice: any) => invoice.documentType === 'PROFORMA');
      const vendorBills = booking.vendorBills.filter((bill: any) => bill.documentType === 'BILL' && !bill.cancellationId);
      const cancellationDate = body?.cancelledAt ? new Date(body.cancelledAt) : new Date();
      if (Number.isNaN(cancellationDate.getTime())) throw new BadRequestException('Cancellation date is invalid.');
      const reversedInvoiceTotal = sum(invoices.map((invoice: any) => invoice.grandTotal));
      const reversedVendorBillTotal = sum(vendorBills.map((bill: any) => bill.grandTotal));
      const clientChargeTotal = money(clientSubtotal + clientTax);

      const cancellation = await tx.bookingCancellation.create({
        data: {
          bookingId: id,
          reason,
          cancelledAt: cancellationDate,
          clientChargeSubtotal: clientSubtotal,
          clientChargeTax: clientTax,
          clientChargeTotal,
          reversedInvoiceTotal,
          reversedVendorBillTotal,
          clientChargeInvoiceCreated: false,
          vendorChargeBillsCreated: false,
          createdById: userId || null,
          vendorCharges: {
            create: vendorCharges.map((charge: any) => ({ ...charge, total: money(charge.subtotal + charge.taxAmount) })),
          },
        },
      });

      if (proformas.length) {
        await tx.invoice.updateMany({
          where: { id: { in: proformas.map((invoice: any) => invoice.id) } },
          data: { status: InvoiceStatus.CANCELLED, outstandingAmount: 0, cancellationId: cancellation.id },
        });
      }

      for (const invoice of invoices) {
        const creditNoteNumber = await this.nextCreditNoteNumber(tx, booking.company, cancellationDate);
        const creditNote = await tx.invoice.create({
          data: {
            invoiceNumber: creditNoteNumber,
            documentType: 'CREDIT_NOTE',
            originalInvoiceId: invoice.id,
            cancellationId: cancellation.id,
            companyId: invoice.companyId,
            clientId: invoice.clientId,
            clientSnapshot: invoice.clientSnapshot || booking.clientSnapshot,
            bookingId: id,
            invoiceDate: cancellationDate,
            placeOfSupply: invoice.placeOfSupply,
            status: InvoiceStatus.SENT,
            subtotal: invoice.subtotal,
            taxAmount: invoice.taxAmount,
            roundOff: invoice.roundOff,
            grandTotal: invoice.grandTotal,
            paidAmount: 0,
            outstandingAmount: 0,
            notes: `Full reversal of ${invoice.invoiceNumber}. Booking cancelled: ${reason}`,
            terms: invoice.terms,
            formatSettings: invoice.formatSettings,
            items: { create: invoice.items.map((item: any) => ({
              bookingServiceItemId: item.bookingServiceItemId,
              hsnSac: item.hsnSac,
              description: item.description,
              quantity: item.quantity,
              rate: item.rate,
              taxAmount: item.taxAmount,
              total: item.total,
            })) },
          },
        });
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: InvoiceStatus.CANCELLED, outstandingAmount: 0, cancellationId: cancellation.id },
        });
        await this.postJournal(
          tx,
          JournalSourceType.CREDIT_NOTE,
          creditNote.id,
          `Credit note ${creditNote.invoiceNumber} reverses ${invoice.invoiceNumber}`,
          'SALES',
          'CLIENTS',
          Number(invoice.grandTotal),
        );
      }

      let clientChargeInvoiceCreated = false;
      if (clientChargeTotal > 0 && generateClientChargeInvoice) {
        await this.createCancellationClientInvoice(tx, booking, cancellation);
        clientChargeInvoiceCreated = true;
      }

      for (const bill of vendorBills) {
        const creditNoteNumber = await this.nextVendorCreditNoteNumber(tx, cancellationDate);
        const creditNote = await tx.vendorBill.create({
          data: {
            billNumber: creditNoteNumber,
            documentType: 'CREDIT_NOTE',
            originalBillId: bill.id,
            cancellationId: cancellation.id,
            vendorId: bill.vendorId,
            bookingId: id,
            billDate: cancellationDate,
            status: VendorBillStatus.PAID,
            subtotal: bill.subtotal,
            taxAmount: bill.taxAmount,
            grandTotal: bill.grandTotal,
            outstandingAmount: 0,
            notes: `Full reversal of ${bill.billNumber}. Booking cancelled: ${reason}`,
            items: { create: bill.items.map((item: any) => ({
              bookingServiceItemId: item.bookingServiceItemId,
              description: item.description,
              quantity: item.quantity,
              rate: item.rate,
              taxAmount: item.taxAmount,
              total: item.total,
            })) },
          },
        });
        await tx.vendorBill.update({
          where: { id: bill.id },
          data: { status: VendorBillStatus.CANCELLED, outstandingAmount: 0, cancellationId: cancellation.id },
        });
        await this.postJournal(
          tx,
          JournalSourceType.VENDOR_CREDIT_NOTE,
          creditNote.id,
          `Vendor credit note ${creditNote.billNumber} reverses ${bill.billNumber}`,
          'VENDORS',
          'PURCHASE',
          Number(bill.grandTotal),
        );
      }

      let vendorChargeBillsCreated = false;
      if (vendorCharges.length && generateVendorChargeBills) {
        await this.createCancellationVendorBills(tx, booking, cancellation, vendorCharges);
        vendorChargeBillsCreated = true;
      }

      await tx.bookingCancellation.update({
        where: { id: cancellation.id },
        data: { clientChargeInvoiceCreated, vendorChargeBillsCreated },
      });

      await tx.bookingServiceItem.updateMany({ where: { bookingId: id }, data: { status: 'CANCELLED' } });
      const updated = await tx.booking.update({
        where: { id },
        data: { status: BookingStatus.CANCELLED, currentVersion: booking.currentVersion + 1 },
      });
      const snapshot = await this.bookingSnapshot(tx, updated.id);
      await this.addVersion(tx, snapshot, 'CANCELLED', reason, userId);
    });

    return this.findOne(id);
  }

  async postCancellationCharges(id: number, body: any, userId?: number) {
    const postClientInvoice = body?.clientInvoice === true;
    const postVendorBills = body?.vendorBills === true;
    if (!postClientInvoice && !postVendorBills) throw new BadRequestException('Select at least one cancellation charge to post.');

    await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id },
        include: {
          company: true,
          cancellation: { include: { vendorCharges: true } },
        },
      });
      if (!booking) throw new NotFoundException('Booking not found.');
      if (!booking.cancellation || booking.status !== BookingStatus.CANCELLED) {
        throw new BadRequestException('This booking does not have a completed cancellation.');
      }

      const cancellation = booking.cancellation;
      let createdDocumentCount = 0;

      if (postClientInvoice && money(cancellation.clientChargeTotal) > 0) {
        const existing = await tx.invoice.findFirst({
          where: {
            cancellationId: cancellation.id,
            documentType: 'INVOICE',
            status: { not: InvoiceStatus.CANCELLED },
          },
          select: { id: true },
        });
        if (!existing) {
          await this.createCancellationClientInvoice(tx, booking, cancellation);
          createdDocumentCount += 1;
        }
      }

      if (postVendorBills && cancellation.vendorCharges.length) {
        const createdBills = await this.createCancellationVendorBills(tx, booking, cancellation, cancellation.vendorCharges);
        createdDocumentCount += createdBills.length;
      }

      const [activeClientChargeInvoice, activeVendorBills] = await Promise.all([
        tx.invoice.findFirst({
          where: { cancellationId: cancellation.id, documentType: 'INVOICE', status: { not: InvoiceStatus.CANCELLED } },
          select: { id: true },
        }),
        tx.vendorBill.findMany({
          where: { cancellationId: cancellation.id, documentType: 'BILL', status: { not: VendorBillStatus.CANCELLED } },
          select: { vendorId: true },
        }),
      ]);
      const requiredVendorIds = [...new Set(cancellation.vendorCharges
        .filter((charge: any) => money(Number(charge.subtotal) + Number(charge.taxAmount)) > 0)
        .map((charge: any) => Number(charge.vendorId)))];
      const postedVendorIds = new Set(activeVendorBills.map((bill: any) => Number(bill.vendorId)));
      const vendorChargesPosted = requiredVendorIds.length > 0 && requiredVendorIds.every((vendorId) => postedVendorIds.has(vendorId));

      await tx.bookingCancellation.update({
        where: { id: cancellation.id },
        data: {
          clientChargeInvoiceCreated: money(cancellation.clientChargeTotal) > 0 && Boolean(activeClientChargeInvoice),
          vendorChargeBillsCreated: vendorChargesPosted,
        },
      });

      if (createdDocumentCount > 0) {
        const updated = await tx.booking.update({
          where: { id },
          data: { currentVersion: booking.currentVersion + 1 },
        });
        const snapshot = await this.bookingSnapshot(tx, updated.id);
        await this.addVersion(
          tx,
          snapshot,
          'CANCELLATION_CHARGES_POSTED',
          `${createdDocumentCount} pending cancellation document(s) posted`,
          userId,
        );
      }
    });

    return this.findOne(id);
  }
}
