import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  private profileData(body: any) {
    return Object.fromEntries(['name', 'companyName', 'phone', 'email', 'gstNumber', 'panNumber', 'billingAddress', 'state']
      .filter(key => body[key] !== undefined)
      .map(key => [key, body[key]]));
  }

  findAll(query: any) {
    const where: any = { active: true };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { companyName: { contains: query.search } },
        { phone: { contains: query.search } },
        { email: { contains: query.search } },
      ];
    }
    return this.prisma.client.findMany({ where, orderBy: { id: 'desc' } });
  }

  async findOne(id: number) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: { bookings: true, invoices: true, payments: true },
    });
    if (!client) throw new NotFoundException('Client not found.');
    return client;
  }

  create(body: any) {
    return this.prisma.client.create({ data: { ...this.profileData(body), openingBalance: Number(body.openingBalance || 0) } as any });
  }

  update(id: number, body: any) {
    return this.prisma.client.update({ where: { id }, data: this.profileData(body) });
  }

  remove(id: number) {
    return this.prisma.client.update({ where: { id }, data: { active: false } });
  }
}
