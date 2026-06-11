import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.company.findMany({
      where: { active: true },
      include: { bankAccounts: true },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: { bankAccounts: true },
    });
    if (!company) throw new NotFoundException('Company not found.');
    return company;
  }

  create(body: any) {
    const { bankAccounts = [], ...company } = body;
    return this.prisma.company.create({
      data: {
        ...company,
        bankAccounts: bankAccounts.length ? { create: bankAccounts } : undefined,
      },
      include: { bankAccounts: true },
    });
  }

  update(id: number, body: any) {
    const { bankAccounts, ...company } = body;
    return this.prisma.company.update({ where: { id }, data: company, include: { bankAccounts: true } });
  }

  remove(id: number) {
    return this.prisma.company.update({ where: { id }, data: { active: false } });
  }
}
