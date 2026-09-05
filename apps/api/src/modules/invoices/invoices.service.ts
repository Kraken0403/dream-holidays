import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { unlink } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { BookingStatus, InvoiceStatus, JournalSourceType } from '@prisma/client';
import { escapeRegex, maxSequenceFromValues, nextDocumentSequence } from '../../common/document-sequence';
import { money, sum } from '../../common/number';
import { dateRangeWhere, readDateRange } from '../../common/date-range';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_TRAVEL_SERVICE_HSN_SAC = '9985';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  private async currentFormatSettings() {
    const keys = ['invoiceTitle', 'proformaTitle', 'invoiceTerms', 'invoiceFooter', 'authorizedSignatureUrl', 'invoiceItemColumns', 'proformaItemColumns'];
    const rows = await this.prisma.globalSetting.findMany({ where: { key: { in: keys } } });
    return rows.reduce((settings, row) => ({ ...settings, [row.key]: row.value }), {} as Record<string, any>);
  }

  private clientSnapshot(client: any) {
    if (!client) return null;
    const { name, companyName, phone, email, gstNumber, panNumber, billingAddress, state } = client;
    return { name, companyName, phone, email, gstNumber, panNumber, billingAddress, state };
  }

  private async nextInvoiceNumber(tx: any, companyId: number, documentType: 'INVOICE' | 'PROFORMA' = 'INVOICE', documentDate = new Date()) {
    const company = await tx.company.findUnique({ where: { id: companyId } });
    const year = documentDate.getFullYear();
    const prefix = documentType === 'PROFORMA' ? company?.proformaPrefix || 'PI' : company?.invoicePrefix || 'DH';
    const formatKey = documentType === 'PROFORMA' ? 'proformaNumberFormat' : 'invoiceNumberFormat';
    const [formatSetting, financialYearSetting] = await Promise.all([
      tx.globalSetting.findUnique({ where: { key: formatKey } }),
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
      where: { companyId, documentType },
      select: { invoiceNumber: true },
    });
    const seed = maxSequenceFromValues(existing.map((row: any) => row.invoiceNumber), pattern);
    const sequenceKey = `invoice:${companyId}:${documentType}:${financialYear}:${prefix}`;

    for (let attempts = 0; attempts < 1000; attempts += 1) {
      const next = await nextDocumentSequence(tx, sequenceKey, seed);
      const candidate = resolvedTemplate.replaceAll('{NUMBER}', String(next).padStart(5, '0'));
      const collision = await tx.invoice.findUnique({ where: { invoiceNumber: candidate }, select: { id: true } });
      if (!collision) return candidate;
    }
    throw new BadRequestException(`Unable to allocate a unique ${documentType === 'PROFORMA' ? 'proforma' : 'invoice'} number.`);
  }

  private calcInvoiceTotals(items: any[]) {
    const subtotal = sum(items.map((i) => money(i.quantity || 1) * money(i.rate)));
    const taxAmount = sum(items.map((i) => i.taxAmount));
    const grandTotal = money(subtotal + taxAmount);
    return { subtotal, taxAmount, grandTotal, outstandingAmount: grandTotal };
  }

  findAll(query: any) {
    const where: any = {};
    const dateRange = dateRangeWhere(readDateRange(query));
    if (query.status) where.status = query.status;
    if (query.clientId) where.clientId = Number(query.clientId);
    if (query.companyId) where.companyId = Number(query.companyId);
    if (dateRange) where.invoiceDate = dateRange;
    if (query.search) {
      where.OR = [
        { invoiceNumber: { contains: query.search } },
        { client: { name: { contains: query.search } } },
        { client: { companyName: { contains: query.search } } },
        { booking: { bookingNumber: { contains: query.search } } },
      ];
    }
    return this.prisma.invoice.findMany({
      where,
      include: { client: true, company: true, booking: true, items: true, convertedInvoice: { select: { id: true, invoiceNumber: true } }, paymentAllocations: { include: { clientPayment: true } } },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        company: {
          include: {
            bankAccounts: {
              where: { active: true },
              orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
            },
          },
        },
        booking: true,
        originalInvoice: { select: { id: true, invoiceNumber: true } },
        creditNotes: { select: { id: true, invoiceNumber: true } },
        convertedFromProforma: { select: { id: true, invoiceNumber: true } },
        convertedInvoice: { select: { id: true, invoiceNumber: true } },
        items: { orderBy: { id: 'asc' } },
        paymentAllocations: { include: { clientPayment: true } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found.');
    return invoice;
  }

  async createManual(body: any) {
    const documentType = body.documentType === 'PROFORMA' ? 'PROFORMA' : 'INVOICE';
    const items = (body.items || []).map((item: any) => ({
      hsnSac: item.hsnSac || body.hsnSac || DEFAULT_TRAVEL_SERVICE_HSN_SAC,
      description: item.description,
      quantity: money(item.quantity || 1),
      rate: money(item.rate),
      taxAmount: documentType === 'PROFORMA' ? 0 : money(item.taxAmount),
      total: money(money(item.quantity || 1) * money(item.rate) + (documentType === 'PROFORMA' ? 0 : money(item.taxAmount))),
    }));
    if (!items.length) throw new BadRequestException('At least one invoice item is required.');

    const totals = this.calcInvoiceTotals(items);
    const client = await this.prisma.client.findUnique({ where: { id: Number(body.clientId) } });
    if (!client) throw new NotFoundException('Client not found.');
    const formatSettings = await this.currentFormatSettings();
    const invoiceDate = body.invoiceDate ? new Date(body.invoiceDate) : new Date();

    return this.prisma.$transaction(async (tx) => {
      const invoiceNumber = body.invoiceNumber || (await this.nextInvoiceNumber(tx, Number(body.companyId), documentType, invoiceDate));
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          documentType,
          companyId: Number(body.companyId),
          clientId: Number(body.clientId),
          clientSnapshot: this.clientSnapshot(client),
          bookingId: body.bookingId ? Number(body.bookingId) : null,
          invoiceDate,
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          placeOfSupply: body.placeOfSupply,
          status: body.status || (documentType === 'PROFORMA' ? InvoiceStatus.DRAFT : InvoiceStatus.SENT),
          notes: body.notes,
          terms: body.terms,
          formatSettings,
          ...totals,
          outstandingAmount: documentType === 'PROFORMA' ? 0 : totals.grandTotal,
          items: { create: items },
        },
      });
      if (documentType === 'INVOICE') await this.createJournalForInvoice(tx, invoice.id, Number(invoice.grandTotal));
      return tx.invoice.findUnique({
        where: { id: invoice.id },
        include: { client: true, company: true, items: true },
      });
    });
  }

  async previewFromBooking(bookingId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { serviceItems: true, client: true, company: true },
    });
    if (!booking) throw new NotFoundException('Booking not found.');
    const newerVersion = await this.prisma.booking.findFirst({ where: { previousVersionId: booking.id }, select: { bookingNumber: true } });
    if (newerVersion) throw new BadRequestException(`This booking has been superseded by ${newerVersion.bookingNumber}. Use the latest booking version.`);

    const invoicedItems = await this.prisma.invoiceItem.findMany({
      where: {
        bookingServiceItemId: { in: booking.serviceItems.map((item) => item.id) },
        invoice: { status: { not: InvoiceStatus.CANCELLED }, documentType: 'INVOICE' },
      },
      select: { bookingServiceItemId: true },
    });
    const invoicedIds = new Set(invoicedItems.map((item) => item.bookingServiceItemId));
    const serviceItems = booking.serviceItems.filter((item) => !invoicedIds.has(item.id));

    return {
      ...booking,
      serviceItems,
      unavailableItemCount: booking.serviceItems.length - serviceItems.length,
    };
  }

  async createFromBooking(bookingId: number, body: any) {
    const documentType = body.documentType === 'PROFORMA' ? 'PROFORMA' : 'INVOICE';
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { serviceItems: true, client: true, company: true },
    });
    if (!booking) throw new NotFoundException('Booking not found.');
    if (booking.status === BookingStatus.CANCELLED) throw new BadRequestException('A cancelled booking cannot be invoiced.');
    const newerVersion = await this.prisma.booking.findFirst({ where: { previousVersionId: booking.id }, select: { bookingNumber: true } });
    if (newerVersion) throw new BadRequestException(`This booking has been superseded by ${newerVersion.bookingNumber}. Generate accounting documents from the latest booking version.`);

    const suppliedItems = Array.isArray(body.items) ? body.items : [];
    const suppliedIds = suppliedItems.map((item: any) => Number(item.bookingServiceItemId)).filter(Boolean);
    const selectedIds = Array.isArray(body.serviceItemIds) ? body.serviceItemIds.map(Number) : suppliedIds;
    const requestedItems = selectedIds.length
      ? booking.serviceItems.filter((item) => selectedIds.includes(item.id))
      : booking.serviceItems;
    const alreadyInvoiced = await this.prisma.invoiceItem.findMany({
      where: {
        bookingServiceItemId: { in: requestedItems.map((item) => item.id) },
        invoice: { status: { not: InvoiceStatus.CANCELLED }, documentType: 'INVOICE' },
      },
      select: { bookingServiceItemId: true },
    });
    const invoicedIds = new Set(alreadyInvoiced.map((item) => item.bookingServiceItemId));
    const sourceItems = requestedItems.filter((item) => !invoicedIds.has(item.id));
    if (!sourceItems.length) throw new BadRequestException('No booking service items available for invoice.');

    const items = sourceItems.map((item) => {
      const supplied = suppliedItems.find((candidate: any) => Number(candidate.bookingServiceItemId) === item.id) || {};
      const quantity = money(supplied.quantity ?? item.quantity);
      const rate = money(supplied.rate ?? item.saleRate);
      const taxAmount = documentType === 'PROFORMA' ? 0 : money(supplied.taxAmount ?? item.saleTax);
      return {
        bookingServiceItemId: item.id,
        hsnSac: supplied.hsnSac || body.hsnSac || DEFAULT_TRAVEL_SERVICE_HSN_SAC,
        description: supplied.description || item.description,
        quantity,
        rate,
        taxAmount,
        total: money(quantity * rate + taxAmount),
      };
    });

    const totals = this.calcInvoiceTotals(items);
    const formatSettings = await this.currentFormatSettings();
    const invoiceDate = body.invoiceDate ? new Date(body.invoiceDate) : new Date();

    return this.prisma.$transaction(async (tx) => {
      const invoiceNumber = body.invoiceNumber || (await this.nextInvoiceNumber(tx, booking.companyId, documentType, invoiceDate));
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          documentType,
          companyId: booking.companyId,
          clientId: booking.clientId,
          clientSnapshot: booking.clientSnapshot || this.clientSnapshot(booking.client),
          bookingId: booking.id,
          invoiceDate,
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          placeOfSupply: body.placeOfSupply,
          status: body.status || (documentType === 'PROFORMA' ? InvoiceStatus.DRAFT : InvoiceStatus.SENT),
          notes: body.notes,
          terms: body.terms || booking.company.invoiceTerms,
          formatSettings,
          ...totals,
          outstandingAmount: documentType === 'PROFORMA' ? 0 : totals.grandTotal,
          items: { create: items },
        },
      });

      if (documentType === 'INVOICE') {
        const bookingStatus = invoicedIds.size + sourceItems.length >= booking.serviceItems.length
          ? BookingStatus.INVOICED
          : BookingStatus.PARTIALLY_INVOICED;
        const version = booking.currentVersion + 1;
        const versionedBooking = await tx.booking.update({
          where: { id: booking.id },
          data: { status: bookingStatus, currentVersion: version },
          include: { passengers: true, serviceItems: true },
        });
        await tx.bookingVersion.create({
          data: {
            bookingId: booking.id,
            version,
            changeType: 'INVOICED',
            changeNote: `Invoice ${invoice.invoiceNumber} created`,
            snapshot: JSON.parse(JSON.stringify(versionedBooking)),
          },
        });
        await this.createJournalForInvoice(tx, invoice.id, invoice.grandTotal as any);
      }
      return tx.invoice.findUnique({ where: { id: invoice.id }, include: { client: true, company: true, booking: true, items: true } });
    });
  }

  async convertProforma(proformaId: number, body: any = {}) {
    const proforma = await this.prisma.invoice.findUnique({
      where: { id: proformaId },
      include: { items: true, client: true, booking: { include: { serviceItems: true } }, convertedInvoice: true },
    });
    if (!proforma) throw new NotFoundException('Proforma invoice not found.');
    if (proforma.documentType !== 'PROFORMA') throw new BadRequestException('Only a proforma invoice can be converted.');
    if ((proforma as any).convertedInvoice) throw new BadRequestException('This proforma invoice has already been converted.');
    if (proforma.status === InvoiceStatus.CANCELLED) throw new BadRequestException('A cancelled proforma invoice cannot be converted.');

    const proformaBookingItemIds = proforma.items.map((item: any) => item.bookingServiceItemId).filter(Boolean);
    if (proforma.bookingId && proformaBookingItemIds.length) {
      const alreadyPosted = await this.prisma.invoiceItem.findMany({
        where: {
          bookingServiceItemId: { in: proformaBookingItemIds },
          invoice: {
            bookingId: proforma.bookingId,
            documentType: 'INVOICE',
            status: { not: InvoiceStatus.CANCELLED },
          },
        },
        select: { bookingServiceItemId: true },
      });
      if (alreadyPosted.length) {
        throw new BadRequestException('This proforma includes booking items that have already been invoiced.');
      }
    }

    const suppliedItems = Array.isArray(body.items) ? body.items : [];
    const items = proforma.items.map((item: any) => {
      const supplied = suppliedItems.find((candidate: any) => Number(candidate.id) === item.id) || {};
      const quantity = money(supplied.quantity ?? item.quantity);
      const rate = money(supplied.rate ?? item.rate);
      const taxAmount = money(supplied.taxAmount ?? 0);
      return {
        bookingServiceItemId: item.bookingServiceItemId,
        hsnSac: supplied.hsnSac ?? item.hsnSac,
        description: supplied.description ?? item.description,
        quantity,
        rate,
        taxAmount,
        total: money(quantity * rate + taxAmount),
      };
    });
    const totals = this.calcInvoiceTotals(items);
    const formatSettings = await this.currentFormatSettings();
    const invoiceDate = body.invoiceDate ? new Date(body.invoiceDate) : new Date();

    return this.prisma.$transaction(async (tx) => {
      const invoiceNumber = body.invoiceNumber || await this.nextInvoiceNumber(tx, proforma.companyId, 'INVOICE', invoiceDate);
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          documentType: 'INVOICE',
          convertedFromProformaId: proforma.id,
          companyId: proforma.companyId,
          clientId: proforma.clientId,
          clientSnapshot: proforma.clientSnapshot || this.clientSnapshot(proforma.client),
          bookingId: proforma.bookingId,
          invoiceDate,
          dueDate: body.dueDate ? new Date(body.dueDate) : proforma.dueDate,
          placeOfSupply: body.placeOfSupply ?? proforma.placeOfSupply,
          status: InvoiceStatus.SENT,
          notes: body.notes ?? proforma.notes,
          terms: body.terms ?? proforma.terms,
          formatSettings,
          ...totals,
          items: { create: items },
        },
      });
      await tx.invoice.update({ where: { id: proforma.id }, data: { status: 'CONVERTED' as any } });
      await this.createJournalForInvoice(tx, invoice.id, Number(invoice.grandTotal));

      if (proforma.bookingId && proforma.booking) {
        const postedItems = await tx.invoiceItem.findMany({
          where: {
            bookingServiceItemId: { not: null },
            invoice: { bookingId: proforma.bookingId, documentType: 'INVOICE', status: { not: InvoiceStatus.CANCELLED } },
          },
          select: { bookingServiceItemId: true },
        });
        const postedIds = new Set(postedItems.map((item) => item.bookingServiceItemId));
        const bookingStatus = postedIds.size >= proforma.booking.serviceItems.length ? BookingStatus.INVOICED : BookingStatus.PARTIALLY_INVOICED;
        const version = proforma.booking.currentVersion + 1;
        const versionedBooking = await tx.booking.update({
          where: { id: proforma.bookingId },
          data: { status: bookingStatus, currentVersion: version },
          include: { passengers: true, serviceItems: true },
        });
        await tx.bookingVersion.create({
          data: {
            bookingId: proforma.bookingId,
            version,
            changeType: 'INVOICED',
            changeNote: `Invoice ${invoice.invoiceNumber} converted from proforma ${proforma.invoiceNumber}`,
            snapshot: JSON.parse(JSON.stringify(versionedBooking)),
          },
        });
      }

      return tx.invoice.findUnique({ where: { id: invoice.id }, include: { client: true, company: true, booking: true, items: true, convertedFromProforma: true } });
    });
  }

  async refreshFormat(invoiceId: number) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId }, select: { id: true } });
    if (!invoice) throw new NotFoundException('Invoice not found.');
    const formatSettings = await this.currentFormatSettings();
    await this.prisma.invoice.update({ where: { id: invoiceId }, data: { formatSettings } });
    return this.findOne(invoiceId);
  }

  async recordPayment(invoiceId: number, body: any) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found.');
    if (invoice.documentType !== 'INVOICE') throw new BadRequestException('Payments can only be recorded against invoices.');
    const amount = money(body.amount);
    if (amount <= 0) throw new BadRequestException('Payment amount must be greater than zero.');
    if (invoice.status === InvoiceStatus.CANCELLED || invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('This invoice cannot accept another payment.');
    }
    if (amount > money(invoice.outstandingAmount)) {
      throw new BadRequestException('Payment cannot exceed the invoice outstanding amount.');
    }

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
          proofUrl: body.proofUrl,
          proofOriginalName: body.proofOriginalName,
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

  private async invoiceDeletionContext(db: any, invoiceId: number) {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        creditNotes: { select: { id: true, invoiceNumber: true, cancellationId: true } },
        convertedInvoice: { select: { id: true, invoiceNumber: true } },
        convertedFromProforma: { select: { id: true, invoiceNumber: true } },
        booking: { select: { id: true, bookingNumber: true, status: true, currentVersion: true } },
        items: { select: { id: true } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found.');

    const protectedCancellationDocument = Boolean(
      invoice.cancellationId && (invoice.documentType === 'CREDIT_NOTE' || invoice.status === InvoiceStatus.CANCELLED),
    );
    if (protectedCancellationDocument) {
      throw new BadRequestException('This is a system-generated cancellation reversal document. Delete the booking pipeline instead so cancellation accounting remains balanced.');
    }
    if (invoice.creditNotes?.length) {
      throw new BadRequestException('This invoice has linked credit note(s). Delete the booking pipeline instead so the reversal trail remains balanced.');
    }
    if (invoice.convertedInvoice) {
      throw new BadRequestException(`This proforma was converted to ${invoice.convertedInvoice.invoiceNumber}. Delete the converted invoice first.`);
    }

    const payments = await db.clientPayment.findMany({
      where: { allocations: { some: { invoiceId } } },
      select: {
        id: true,
        proofUrl: true,
        allocations: { select: { invoiceId: true } },
      },
    });
    const sharedPayment = payments.find((payment: any) => payment.allocations.some((allocation: any) => Number(allocation.invoiceId) !== invoiceId));
    if (sharedPayment) {
      throw new BadRequestException('This invoice has a payment shared with another invoice. Split that payment before permanently deleting this invoice.');
    }

    return { invoice, payments, paymentIds: payments.map((row: any) => Number(row.id)) };
  }

  async deletionPreview(invoiceId: number) {
    const { invoice, payments, paymentIds } = await this.invoiceDeletionContext(this.prisma, invoiceId);
    const [attachments, journalEntries] = await Promise.all([
      this.prisma.attachment.findMany({
        where: {
          OR: [
            { refType: { in: ['INVOICE', 'Invoice', 'invoice'] }, refId: invoiceId },
            { refType: { in: ['CLIENT_PAYMENT', 'ClientPayment', 'clientPayment'] }, refId: { in: paymentIds } },
          ],
        },
        select: { id: true, fileUrl: true },
      }),
      this.prisma.journalEntry.count({
        where: {
          OR: [
            { sourceType: { in: [JournalSourceType.INVOICE, JournalSourceType.CREDIT_NOTE] }, sourceId: invoiceId },
            { sourceType: JournalSourceType.CLIENT_PAYMENT, sourceId: { in: paymentIds } },
          ],
        },
      }),
    ]);

    return {
      document: {
        id: invoice.id,
        number: invoice.invoiceNumber,
        documentType: invoice.documentType,
        status: invoice.status,
        booking: invoice.booking,
      },
      counts: {
        invoiceItems: invoice.items?.length || 0,
        payments: paymentIds.length,
        journalEntries,
        storedFiles: attachments.length + payments.filter((row: any) => row.proofUrl).length,
      },
      warning: invoice.cancellationId
        ? 'This cancellation-charge invoice will be removed. The cancellation charge remains recorded and can be posted again later.'
        : 'The invoice, its exclusive receipts, payment allocations, journal entries and stored payment proofs will be permanently removed.',
    };
  }

  async hardDelete(invoiceId: number) {
    const fileUrls: string[] = [];
    const result = await this.prisma.$transaction(async (tx) => {
      const { invoice, payments, paymentIds } = await this.invoiceDeletionContext(tx, invoiceId);
      const attachments = await tx.attachment.findMany({
        where: {
          OR: [
            { refType: { in: ['INVOICE', 'Invoice', 'invoice'] }, refId: invoiceId },
            { refType: { in: ['CLIENT_PAYMENT', 'ClientPayment', 'clientPayment'] }, refId: { in: paymentIds } },
          ],
        },
        select: { id: true, fileUrl: true },
      });
      fileUrls.push(...attachments.map((row: any) => row.fileUrl).filter(Boolean));
      fileUrls.push(...payments.map((row: any) => row.proofUrl).filter(Boolean));

      const journalWhere = {
        OR: [
          { sourceType: { in: [JournalSourceType.INVOICE, JournalSourceType.CREDIT_NOTE] }, sourceId: invoiceId },
          { sourceType: JournalSourceType.CLIENT_PAYMENT, sourceId: { in: paymentIds } },
        ],
      };
      const journalEntries = await tx.journalEntry.count({ where: journalWhere });
      await tx.journalEntry.deleteMany({ where: journalWhere });
      await tx.attachment.deleteMany({ where: { id: { in: attachments.map((row: any) => Number(row.id)) } } });
      await tx.auditLog.deleteMany({
        where: {
          OR: [
            { entityType: { in: ['INVOICE', 'Invoice', 'invoice'] }, entityId: invoiceId },
            { entityType: { in: ['CLIENT_PAYMENT', 'ClientPayment', 'clientPayment'] }, entityId: { in: paymentIds } },
          ],
        },
      });
      await tx.clientPayment.deleteMany({ where: { id: { in: paymentIds } } });

      if (invoice.convertedFromProformaId) {
        await tx.invoice.update({ where: { id: invoice.convertedFromProformaId }, data: { status: InvoiceStatus.DRAFT } });
      }

      const cancellationChargeInvoice = Boolean(
        invoice.cancellationId && invoice.documentType === 'INVOICE' && invoice.status !== InvoiceStatus.CANCELLED,
      );
      await tx.invoice.delete({ where: { id: invoiceId } });

      if (cancellationChargeInvoice && invoice.cancellationId) {
        await tx.bookingCancellation.update({
          where: { id: invoice.cancellationId },
          data: { clientChargeInvoiceCreated: false },
        });
      }

      if (invoice.bookingId && invoice.booking?.status !== BookingStatus.CANCELLED) {
        const currentBooking = await tx.booking.findUnique({
          where: { id: invoice.bookingId },
          include: { serviceItems: true, passengers: true },
        });
        if (currentBooking) {
          const remainingItems = await tx.invoiceItem.findMany({
            where: {
              bookingServiceItemId: { not: null },
              invoice: {
                bookingId: invoice.bookingId,
                documentType: 'INVOICE',
                status: { not: InvoiceStatus.CANCELLED },
              },
            },
            select: { bookingServiceItemId: true },
          });
          const invoicedIds = new Set(remainingItems.map((item: any) => item.bookingServiceItemId).filter(Boolean));
          const invoiceDrivenStatuses: BookingStatus[] = [
            BookingStatus.PARTIALLY_INVOICED,
            BookingStatus.INVOICED,
            BookingStatus.PARTIALLY_PAID,
            BookingStatus.PAID,
            BookingStatus.CLOSED,
          ];
          let nextStatus = currentBooking.status;
          if (invoiceDrivenStatuses.includes(currentBooking.status)) {
            nextStatus = invoicedIds.size === 0
              ? BookingStatus.CONFIRMED
              : invoicedIds.size >= currentBooking.serviceItems.length
                ? BookingStatus.INVOICED
                : BookingStatus.PARTIALLY_INVOICED;
          }
          const version = currentBooking.currentVersion + 1;
          const updatedBooking = await tx.booking.update({
            where: { id: currentBooking.id },
            data: { status: nextStatus, currentVersion: version },
            include: { passengers: true, serviceItems: true },
          });
          await tx.bookingVersion.create({
            data: {
              bookingId: currentBooking.id,
              version,
              changeType: 'INVOICE_DELETED',
              changeNote: `Invoice ${invoice.invoiceNumber} permanently deleted`,
              snapshot: JSON.parse(JSON.stringify(updatedBooking)),
            },
          });
        }
      }

      return {
        deleted: { id: invoice.id, invoiceNumber: invoice.invoiceNumber },
        counts: {
          invoices: 1,
          invoiceItems: invoice.items?.length || 0,
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
