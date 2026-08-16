import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JournalSourceType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { dateRangeWhere, readDateRange } from '../../common/date-range';
import { money } from '../../common/number';

function n(v: any) { return Number(v || 0); }

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async chartOfAccounts() {
    const accounts = await this.prisma.ledgerAccount.findMany({
      include: {
        _count: { select: { lines: true } },
        lines: { select: { debit: true, credit: true } },
      },
      orderBy: { code: 'asc' },
    });

    return accounts.map(a => ({
      id: a.id, code: a.code, name: a.name, type: a.type,
      totalDebit: a.lines.reduce((s, l) => s + n(l.debit), 0),
      totalCredit: a.lines.reduce((s, l) => s + n(l.credit), 0),
      balance: a.lines.reduce((s, l) => s + n(l.debit) - n(l.credit), 0),
      transactionCount: a._count.lines,
    }));
  }

  async ledger(accountId: number, query: any) {
    const account = await this.prisma.ledgerAccount.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Ledger account not found.');

    const range = readDateRange(query);
    const dates = dateRangeWhere(range);

    const prior = range.from ? await this.prisma.journalEntryLine.aggregate({
      where: {
        ledgerAccountId: accountId,
        journalEntry: { entryDate: { lt: range.from } },
      },
      _sum: { debit: true, credit: true },
    }) : null;

    const lines = await this.prisma.journalEntryLine.findMany({
      where: {
        ledgerAccountId: accountId,
        journalEntry: dates ? { entryDate: dates } : undefined,
      },
      include: {
        journalEntry: { select: { entryDate: true, narration: true, sourceType: true, sourceId: true } },
      },
      orderBy: { journalEntry: { entryDate: 'asc' } },
    });

    const openingBalance = n(prior?._sum.debit) - n(prior?._sum.credit);
    let balance = openingBalance;
    const rows = lines.map(l => {
      const debit = n(l.debit);
      const credit = n(l.credit);
      balance = balance + debit - credit;
      return {
        id: l.id,
        date: l.journalEntry.entryDate,
        narration: l.journalEntry.narration,
        sourceType: l.journalEntry.sourceType,
        sourceId: l.journalEntry.sourceId,
        debit,
        credit,
        balance,
      };
    });

    return {
      account: { id: account.id, code: account.code, name: account.name, type: account.type },
      totalDebit: rows.reduce((s, r) => s + r.debit, 0),
      totalCredit: rows.reduce((s, r) => s + r.credit, 0),
      openingBalance,
      closingBalance: balance,
      rows,
    };
  }

  async createManualEntry(body: any) {
    const lines = (body.lines || []) as Array<{ accountId: number; debit: number; credit: number }>;
    const normalized = lines
      .map((line) => ({
        ledgerAccountId: Number(line.accountId),
        debit: money(line.debit),
        credit: money(line.credit),
      }))
      .filter((line) => line.ledgerAccountId && (line.debit > 0 || line.credit > 0));
    if (normalized.length < 2) throw new BadRequestException('A journal entry requires at least two non-empty lines.');
    if (normalized.some((line) => line.debit > 0 && line.credit > 0)) {
      throw new BadRequestException('Each journal line must contain either a debit or a credit, not both.');
    }
    const totalDebit = money(normalized.reduce((sum, line) => sum + line.debit, 0));
    const totalCredit = money(normalized.reduce((sum, line) => sum + line.credit, 0));
    if (totalDebit !== totalCredit) {
      throw new BadRequestException('Journal entry debits and credits must balance.');
    }
    if (!String(body.narration || '').trim()) throw new BadRequestException('Narration is required.');

    return this.prisma.journalEntry.create({
      data: {
        sourceType: JournalSourceType.MANUAL,
        sourceId: null,
        entryDate: body.date ? new Date(body.date) : new Date(),
        narration: body.narration,
        lines: {
          create: normalized,
        },
      },
      include: { lines: { include: { ledgerAccount: true } } },
    });
  }
}
