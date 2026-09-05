export async function nextDocumentSequence(tx: any, key: string, seed = 0): Promise<number> {
  const safeSeed = Math.max(0, Math.trunc(Number(seed) || 0));

  await tx.documentSequence.upsert({
    where: { key },
    create: { key, lastNumber: safeSeed },
    update: {},
  });

  if (safeSeed > 0) {
    await tx.documentSequence.updateMany({
      where: { key, lastNumber: { lt: safeSeed } },
      data: { lastNumber: safeSeed },
    });
  }

  const sequence = await tx.documentSequence.update({
    where: { key },
    data: { lastNumber: { increment: 1 } },
    select: { lastNumber: true },
  });

  return sequence.lastNumber;
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function maxSequenceFromValues(values: Array<string | null | undefined>, pattern: RegExp): number {
  let max = 0;
  for (const value of values) {
    if (!value) continue;
    const match = value.match(pattern);
    const parsed = match?.[1] ? Number(match[1]) : 0;
    if (Number.isFinite(parsed) && parsed > max) max = parsed;
  }
  return max;
}
