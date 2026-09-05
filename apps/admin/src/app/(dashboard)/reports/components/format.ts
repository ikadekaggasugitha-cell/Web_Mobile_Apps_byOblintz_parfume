export function compactCurrency(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} M`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} jt`;
  if (value >= 1_000) return `${Math.round(value / 1_000)} rb`;
  return String(value);
}
