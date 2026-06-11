import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

function n(value: any) { return Number(value || 0); }

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const [bookings, invoices, vendorBills, clientPayments, vendorPayments] = await Promise.all([
      this.prisma.booking.findMany({ select: { totalSaleAmount: true, totalVendorCost: true, grossMargin: true } }),
      this.prisma.invoice.findMany({ where: { status: { not: 'CANCELLED' } }, select: { grandTotal: true, outstandingAmount: true, paidAmount: true } }),
      this.prisma.vendorBill.findMany({ where: { status: { not: 'CANCELLED' } }, select: { grandTotal: true, outstandingAmount: true, paidAmount: true } }),
      this.prisma.clientPayment.findMany({ select: { amount: true } }),
      this.prisma.vendorPayment.findMany({ select: { amount: true } }),
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
      bookingSale,
      bookingCost,
      expectedMargin,
      invoiceSales,
      receivable,
      payable,
      clientReceived,
      vendorPaid,
      netCashPosition: clientReceived - vendorPaid,
      bookingCount: bookings.length,
      invoiceCount: invoices.length,
      vendorBillCount: vendorBills.length,
    };
  }
}
