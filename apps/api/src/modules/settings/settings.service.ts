import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const rows = await this.prisma.globalSetting.findMany({ orderBy: { key: 'asc' } });
    return rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {} as Record<string, any>);
  }

  async upsertMany(settings: Record<string, any>) {
    const ops = Object.entries(settings).map(([key, value]) =>
      this.prisma.globalSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      }),
    );
    await this.prisma.$transaction(ops);
    return this.findAll();
  }
}
