/* ═══════════════════════════════════════════════════════════════════════════════
   localStorage utilities for portfolio data
   ─────────────────────────────────────────────────────────────────────────────
   Centralises save / load / clear logic with:
     • Schema versioning (bump CURRENT_VERSION when the shape changes)
     • Validation of required fields and types on load
     • Graceful handling of corrupted / missing / migrated data
   ═══════════════════════════════════════════════════════════════════════════════ */

import {
  CURRENCIES,
  type InputMode,
  type PortfolioData,
  type Position,
  type SecurityResult,
} from "~/types/portfolio";

/* ─── Constants ─── */
export const STORAGE_KEY = "seetf-portfolio";

/**
 * Bump this whenever the persisted schema changes.
 * The `migratePortfolio` function should handle all older versions.
 */
export const CURRENT_VERSION = 2;

/* ═══════════════════════════════════════════════════════════════════════════════
   Validation helpers
   ═══════════════════════════════════════════════════════════════════════════════ */

function isInputMode(v: unknown): v is InputMode {
  return v === "amount" || v === "percentage";
}

function isValidCurrency(v: unknown): v is string {
  return typeof v === "string" && CURRENCIES.some((c) => c.value === v);
}

/** Validate and normalise a single SecurityResult blob (raw data only) */
function validateSecurity(raw: unknown): SecurityResult | null {
  if (raw == null || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.ticker !== "string") return null;
  if (typeof obj.name !== "string") return null;
  if (obj.type !== "stock" && obj.type !== "etf") return null;
  return {
    ticker: obj.ticker,
    isin: typeof obj.isin === "string" ? obj.isin : "",
    name: obj.name,
    type: obj.type,
  };
}

/** Validate and normalise a single position */
function validatePosition(raw: unknown, fallbackId: number): Position | null {
  if (raw == null || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const id = typeof obj.id === "number" && obj.id > 0 ? obj.id : fallbackId;
  const security = validateSecurity(obj.security);

  // Prefer explicit top-level fields; fall back to security object for migration
  const name =
    typeof obj.name === "string" ? obj.name : (security?.name ?? "");
  const isin =
    typeof obj.isin === "string" ? obj.isin : (security?.isin ?? "");
  const ticker =
    typeof obj.ticker === "string" ? obj.ticker : (security?.ticker ?? "");
  const value = typeof obj.value === "string" ? obj.value : "";

  // A position that has no security AND no name/ticker is effectively empty;
  // we still keep it so the user doesn't silently lose rows.
  return { id, name, isin, ticker, security, value };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Migration
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Migrate data from an older version to `CURRENT_VERSION`.
 * Currently only v0 (no version field) → v1 is supported.
 */
function migratePortfolio(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const version = typeof raw.version === "number" ? raw.version : 0;

  if (version < 1) {
    // v0 → v1: add the version field, ensure totalPortfolioValue is a string
    raw.version = 1;
    if (typeof raw.totalPortfolioValue !== "string") {
      raw.totalPortfolioValue = "";
    }
  }

  // Future migrations go here:
  // if (version < 3) { ... }

  if (version < 2) {
    // v1 → v2: add name, isin, ticker as top-level position fields
    raw.version = 2;
    if (Array.isArray(raw.positions)) {
      for (const pos of raw.positions as Record<string, unknown>[]) {
        const sec = pos.security as Record<string, unknown> | null | undefined;
        if (typeof pos.name !== "string") {
          pos.name = sec && typeof sec.name === "string" ? sec.name : "";
        }
        if (typeof pos.isin !== "string") {
          pos.isin = sec && typeof sec.isin === "string" ? sec.isin : "";
        }
        if (typeof pos.ticker !== "string") {
          pos.ticker = sec && typeof sec.ticker === "string" ? sec.ticker : "";
        }
      }
    }
  }

  return raw;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Public API
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Load, validate, and (if necessary) migrate the persisted portfolio.
 * Returns `null` when no data exists or the data is irrecoverably corrupt.
 */
export function loadPortfolio(): PortfolioData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // JSON is corrupted – wipe it
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    const obj = migratePortfolio(parsed as Record<string, unknown>);

    // Validate top-level fields
    const inputMode: InputMode = isInputMode(obj.inputMode)
      ? obj.inputMode
      : "amount";
    const currency: string = isValidCurrency(obj.currency)
      ? obj.currency
      : "USD";
    const totalPortfolioValue =
      typeof obj.totalPortfolioValue === "string"
        ? obj.totalPortfolioValue
        : "";

    // Validate positions
    const positions: Position[] = [];
    if (Array.isArray(obj.positions)) {
      let nextId = 1;
      for (const item of obj.positions) {
        const pos = validatePosition(item, nextId);
        if (pos) {
          positions.push(pos);
          if (pos.id >= nextId) nextId = pos.id + 1;
        }
      }
    }

    if (positions.length === 0) {
      // No usable positions — treat as empty
      return null;
    }

    const data: PortfolioData = {
      version: CURRENT_VERSION,
      inputMode,
      currency,
      totalPortfolioValue,
      positions,
    };

    // Persist the (possibly migrated / corrected) version back
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // quota exceeded — not critical
    }

    return data;
  } catch {
    // localStorage entirely unavailable
    return null;
  }
}

/**
 * Save a portfolio to localStorage.
 * Automatically stamps the current schema version.
 */
export function savePortfolio(data: Omit<PortfolioData, "version">): void {
  try {
    const payload: PortfolioData = { ...data, version: CURRENT_VERSION };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage full or unavailable – silently ignore
  }
}

/**
 * Remove the portfolio from localStorage entirely.
 */
export function clearPortfolio(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Derive the highest position ID currently stored, so callers can
 * continue generating unique IDs without collisions.
 */
export function highestPositionId(positions: Position[]): number {
  if (positions.length === 0) return 0;
  return Math.max(...positions.map((p) => p.id));
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Securities list cache (localStorage, 24-hour TTL)
   ═══════════════════════════════════════════════════════════════════════════════ */

const SECURITIES_CACHE_KEY = "seetf-securities";
const SECURITIES_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface SecuritiesCachePayload {
  securities: SecurityResult[];
  expiresAt: number;
}

/**
 * Load the cached list of securities from localStorage.
 * Returns null if missing, expired, or corrupt.
 */
export function loadSecuritiesCache(): SecurityResult[] | null {
  try {
    const raw = localStorage.getItem(SECURITIES_CACHE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

    const obj = parsed as Record<string, unknown>;
    if (typeof obj.expiresAt !== "number" || Date.now() > obj.expiresAt) {
      localStorage.removeItem(SECURITIES_CACHE_KEY);
      return null;
    }

    if (!Array.isArray(obj.securities)) return null;

    const securities: SecurityResult[] = [];
    for (const item of obj.securities) {
      const sec = validateSecurity(item);
      if (sec) securities.push(sec);
    }

    return securities.length > 0 ? securities : null;
  } catch {
    return null;
  }
}

/**
 * Save the securities list to localStorage with a 24-hour TTL.
 */
export function saveSecuritiesCache(securities: SecurityResult[]): void {
  try {
    const payload: SecuritiesCachePayload = {
      securities,
      expiresAt: Date.now() + SECURITIES_CACHE_TTL_MS,
    };
    localStorage.setItem(SECURITIES_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage full or unavailable
  }
}
