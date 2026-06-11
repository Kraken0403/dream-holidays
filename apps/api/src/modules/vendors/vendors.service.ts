import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

function codeFromName(name: string) {
  return name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: any) {
    const where: any = { active: true };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { phone: { contains: query.search } },
        { email: { contains: query.search } },
      ];
    }
    if (query.categoryId) {
      where.categoryLinks = { some: { categoryId: Number(query.categoryId) } };
    }
    return this.prisma.vendor.findMany({
      where,
      include: { categoryLinks: { include: { category: { include: { parent: true } } } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: { categoryLinks: { include: { category: { include: { parent: true } } } }, vendorBills: true, vendorPayments: true },
    });
    if (!vendor) throw new NotFoundException('Vendor not found.');
    return vendor;
  }

  create(body: any) {
    const { categoryIds = [], ...vendor } = body;
    return this.prisma.vendor.create({
      data: {
        ...vendor,
        code: vendor.code || codeFromName(vendor.name),
        openingBalance: vendor.openingBalance || 0,
        creditDays: Number(vendor.creditDays || 0),
        categoryLinks: categoryIds.length ? { create: categoryIds.map((categoryId: number) => ({ categoryId })) } : undefined,
      },
      include: { categoryLinks: { include: { category: { include: { parent: true } } } } },
    });
  }

  update(id: number, body: any) {
    const { categoryIds, ...vendor } = body;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.vendor.update({
        where: { id },
        data: { ...vendor, creditDays: vendor.creditDays === undefined ? undefined : Number(vendor.creditDays) },
      });
      if (Array.isArray(categoryIds)) {
        await tx.vendorServiceCategory.deleteMany({ where: { vendorId: id } });
        if (categoryIds.length) {
          await tx.vendorServiceCategory.createMany({
            data: categoryIds.map((categoryId: number) => ({ vendorId: id, categoryId })),
            skipDuplicates: true,
          });
        }
      }
      return tx.vendor.findUnique({ where: { id: updated.id }, include: { categoryLinks: { include: { category: { include: { parent: true } } } } } });
    });
  }

  remove(id: number) {
    return this.prisma.vendor.update({ where: { id }, data: { active: false } });
  }
}
