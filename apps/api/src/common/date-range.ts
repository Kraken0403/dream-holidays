import { BadRequestException } from '@nestjs/common';

export type DateRange = {
  from?: Date;
  to?: Date;
};

function parseDateOnly(value: unknown, endOfDay = false): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const text = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new BadRequestException('Dates must use YYYY-MM-DD format.');
  }

  const date = new Date(`${text}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+05:30`);
  if (Number.isNaN(date.getTime())) throw new BadRequestException(`Invalid date: ${text}`);
  return date;
}

export function readDateRange(query: Record<string, any> = {}): DateRange {
  const from = parseDateOnly(query.from);
  const to = parseDateOnly(query.to, true);
  if (from && to && from.getTime() > to.getTime()) {
    throw new BadRequestException('The From date cannot be after the To date.');
  }
  return { from, to };
}

export function dateRangeWhere(range: DateRange) {
  if (!range.from && !range.to) return undefined;
  return {
    ...(range.from ? { gte: range.from } : {}),
    ...(range.to ? { lte: range.to } : {}),
  };
}

export function beforeDateWhere(from?: Date) {
  return from ? { lt: from } : undefined;
}
