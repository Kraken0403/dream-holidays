export function money(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
}

export function sum(values: any[]): number {
  return Number(values.reduce((acc, value) => acc + money(value), 0).toFixed(2));
}
