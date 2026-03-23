/** Whole-dollar currency: $1,234,567 */
export function fmtCurrency(value: number | null | undefined): string {
  const n = value ?? 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

/** Currency with cents: $11.75 */
export function fmtCurrencyCents(value: number | null | undefined): string {
  const n = value ?? 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Integer with commas: 424,710 */
export function fmtInt(value: number | null | undefined): string {
  const n = value ?? 0;
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(n);
}

/** Two-decimal number: 9.75 */
export function fmtDecimal(value: number | null | undefined): string {
  const n = value ?? 0;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Format a situs string into line-broken display address */
export function fmtSitus(situs: string): string[] {
  return situs
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Return true if ApprMethod starts with the given letter (case-insensitive) */
export function hasApproach(apprMethod: string, letter: "C" | "I" | "M"): boolean {
  return apprMethod.trim().toUpperCase().startsWith(letter);
}
