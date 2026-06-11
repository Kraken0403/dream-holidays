import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.serviceCategory.findMany({
      where: { active: true },
      include: { parent: true, children: true },
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  tree() {
    return this.prisma.serviceCategory.findMany({
      where: { parentId: null, active: true },
      include: { children: { where: { active: true }, orderBy: { name: 'asc' } } },
      orderBy: { name: 'asc' },
    });
  }

  create(body: any) {
    const slugBase = body.parentName ? `${body.parentName}-${body.name}` : body.name;
    return this.prisma.serviceCategory.create({
      data: {
        name: body.name,
        slug: body.slug || slugify(slugBase),
        parentId: body.parentId || null,
        sortOrder: Number(body.sortOrder || 0),
        active: body.active ?? true,
      },
    });
  }

  update(id: number, body: any) {
    return this.prisma.serviceCategory.update({
      where: { id },
      data: {
        name: body.name,
        parentId: body.parentId === undefined ? undefined : body.parentId || null,
        sortOrder: body.sortOrder === undefined ? undefined : Number(body.sortOrder),
        active: body.active,
      },
    });
  }

  remove(id: number) {
    return this.prisma.serviceCategory.update({ where: { id }, data: { active: false } });
  }
}
