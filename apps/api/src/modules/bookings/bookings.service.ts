import { Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { money, sum } from '../../common/number';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextBookingNumber() {
    const count = await this.prisma.booking.count();
    return `BK-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }

  private normalizeItem(item: any) {
    const quantity = money(item.quantity || 1);
    const saleRate = money(item.saleRate);
    const saleTax = money(item.saleTax);
    const saleTotal = item.saleTotal === undefined ? money(quantity * saleRate + saleTax) : money(item.saleTotal);
    const vendorCost = money(item.vendorCost);
    const vendorTax = money(item.vendorTax);
    const vendorTotal = item.vendorTotal === undefined ? money(vendorCost + vendorTax) : money(item.vendorTotal);
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

  findAll(query: any) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.clientId) where.clientId = Number(query.clientId);
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
      include: { client: true, company: true, serviceItems: { include: { category: { include: { parent: true } }, vendor: true } } },
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
        invoices: true,
        vendorBills: { include: { vendor: true } },
        clientPayments: true,
        vendorPayments: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found.');
    return booking;
  }

  async create(body: any, userId?: number) {
    const items = (body.serviceItems || []).map((item: any) => this.normalizeItem(item));
    const totals = this.totals(items);
    const bookingNumber = body.bookingNumber || (await this.nextBookingNumber());

    return this.prisma.booking.create({
      data: {
        bookingNumber,
        bookingDate: body.bookingDate ? new Date(body.bookingDate) : new Date(),
        clientId: Number(body.clientId),
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
      include: { client: true, company: true, serviceItems: { include: { category: { include: { parent: true } }, vendor: true } } },
    });
  }

  async update(id: number, body: any) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Booking not found.');

      let totalsUpdate = {};
      if (Array.isArray(body.serviceItems)) {
        const items = body.serviceItems.map((item: any) => this.normalizeItem(item));
        totalsUpdate = this.totals(items);
        await tx.bookingServiceItem.deleteMany({ where: { bookingId: id } });
        if (items.length) await tx.bookingServiceItem.createMany({ data: items.map((item: any) => ({ ...item, bookingId: id })) });
      }

      const { serviceItems, passengers, ...booking } = body;
      await tx.booking.update({
        where: { id },
        data: {
          ...booking,
          clientId: booking.clientId ? Number(booking.clientId) : undefined,
          companyId: booking.companyId ? Number(booking.companyId) : undefined,
          passengerCount: booking.passengerCount ? Number(booking.passengerCount) : undefined,
          bookingDate: booking.bookingDate ? new Date(booking.bookingDate) : undefined,
          travelStartDate: booking.travelStartDate ? new Date(booking.travelStartDate) : undefined,
          travelEndDate: booking.travelEndDate ? new Date(booking.travelEndDate) : undefined,
          ...totalsUpdate,
        },
      });

      return tx.booking.findUnique({
        where: { id },
        include: { client: true, company: true, serviceItems: { include: { category: { include: { parent: true } }, vendor: true } } },
      });
    });
  }

  async recalculate(id: number) {
    const items = await this.prisma.bookingServiceItem.findMany({ where: { bookingId: id } });
    const totals = this.totals(items);
    return this.prisma.booking.update({ where: { id }, data: totals });
  }

  cancel(id: number) {
    return this.prisma.booking.update({ where: { id }, data: { status: BookingStatus.CANCELLED } });
  }
}
