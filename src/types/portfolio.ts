/* ═══════════════════════════════════════════════════════════════════════════════
   Shared types for portfolio data & localStorage persistence
   ═══════════════════════════════════════════════════════════════════════════════ */

/** How values are entered: absolute amounts or percentages of total */
export type InputMode = "amount" | "percentage";

/** A security returned from the server (raw data only) */
export interface SecurityResult {
  ticker: string;
  isin: string;
  name: string;
  type: "stock" | "etf";
}

/* ─── Frontend display helpers ─── */

/** Build a human-readable label for a security (frontend concern only) */
export function securityLabel(s: SecurityResult): string {
  return s.isin
    ? `${s.name} — ${s.ticker} — ${s.isin}`
    : `${s.name} — ${s.ticker}`;
}

/** Shorter display value shown in the autocomplete input when a security is selected */
export function securityDisplayValue(s: SecurityResult): string {
  return `${s.name} (${s.ticker})`;
}

/** Derive the canonical identifier for a security (ISIN preferred, ticker fallback) */
export function securityIdentifier(s: SecurityResult): string {
  return s.isin || s.ticker;
}

/** A single portfolio position */
export interface Position {
  id: number;
  /** Full security name */
  name: string;
  /** ISIN code */
  isin: string;
  /** Ticker symbol */
  ticker: string;
  /** The full security result (for re-hydration) */
  security: SecurityResult | null;
  /** Amount or percentage depending on mode (stored as string for input) */
  value: string;
}

/** The full portfolio data persisted to localStorage */
export interface PortfolioData {
  /** Schema version — bump when changing the shape */
  version: number;
  inputMode: InputMode;
  currency: string;
  /** Total portfolio value (only relevant in percentage mode, optional) */
  totalPortfolioValue: string;
  positions: Position[];
}

/* ─── Currency definitions ─── */

export interface CurrencyDef {
  value: string;
  label: string;
  symbol: string;
}

export const CURRENCIES: CurrencyDef[] = [
  { value: "USD", label: "USD ($)", symbol: "$" },
  { value: "EUR", label: "EUR (€)", symbol: "€" },
  { value: "GBP", label: "GBP (£)", symbol: "£" },
  { value: "CHF", label: "CHF (Fr)", symbol: "Fr" },
  { value: "JPY", label: "JPY (¥)", symbol: "¥" },
  { value: "CAD", label: "CAD (C$)", symbol: "C$" },
  { value: "AUD", label: "AUD (A$)", symbol: "A$" },
  { value: "SEK", label: "SEK (kr)", symbol: "kr" },
  { value: "NOK", label: "NOK (kr)", symbol: "kr" },
  { value: "DKK", label: "DKK (kr)", symbol: "kr" },
  { value: "HKD", label: "HKD (HK$)", symbol: "HK$" },
  { value: "SGD", label: "SGD (S$)", symbol: "S$" },
];

export const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({
  value: c.value,
  label: c.label,
}));

/** Quick lookup: currency code → symbol */
export const CURRENCY_SYMBOLS: Record<string, string> = Object.fromEntries(
  CURRENCIES.map((c) => [c.value, c.symbol]),
);

/** Get the symbol for a currency code, with a fallback */
export function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? code;
}
