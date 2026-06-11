import { Injectable, NotFoundException } from '@nestjs/common';
import { JournalSourceType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

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

    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to + 'T23:59:59') : undefined;

    const lines = await this.prisma.journalEntryLine.findMany({
      where: {
        ledgerAccountId: accountId,
        journalEntry: from || to ? { entryDate: { ...(from && { gte: from }), ...(to && { lte: to }) } } : undefined,
      },
      include: {
        journalEntry: { select: { entryDate: true, narration: true, sourceType: true, sourceId: true } },
      },
      orderBy: { journalEntry: { entryDate: 'asc' } },
    });

    let balance = 0;
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
      closingBalance: balance,
      rows,
    };
  }

  async createManualEntry(body: any) {
    const lines = (body.lines || []) as Array<{ accountId: number; debit: number; credit: number }>;
    return this.prisma.journalEntry.create({
      data: {
        sourceType: JournalSourceType.MANUAL,
        sourceId: null,
        entryDate: body.date ? new Date(body.date) : new Date(),
        narration: body.narration,
        lines: {
          create: lines.map(l => ({
            ledgerAccountId: Number(l.accountId),
            debit: n(l.debit),
            credit: n(l.credit),
          })),
        },
      },
      include: { lines: { include: { ledgerAccount: true } } },
    });
  }
}
