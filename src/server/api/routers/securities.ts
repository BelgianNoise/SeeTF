import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as cheerio from "cheerio";
import { execFile } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

/* ─── Types (raw data only — no display formatting) ─── */
export interface Security {
  ticker: string;
  isin: string;
  name: string;
  type: "stock" | "etf";
}

/* ─── Yahoo Finance response types ─── */
interface YahooQuote {
  symbol: string;
  shortname?: string;
  longname?: string;
  quoteType: string;
  exchange: string;
  exchDisp?: string;
  isYahooFinance: boolean;
}

interface YahooSearchResponse {
  quotes: YahooQuote[];
  count: number;
}

interface YahooTrendingResponse {
  finance: {
    result?: Array<{
      quotes: Array<{ symbol: string }>;
    }>;
    error?: unknown;
  };
}

interface YahooBulkQuote {
  symbol: string;
  shortName?: string;
  longName?: string;
  quoteType?: string;
}

interface YahooBulkQuoteResponse {
  quoteResponse: {
    result: YahooBulkQuote[];
    error?: unknown;
  };
}

interface YahooScreenerResponse {
  finance: {
    result?: Array<{
      quotes: YahooBulkQuote[];
    }>;
    error?: unknown;
  };
}

/* ─── Simple in-memory cache ─── */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/* ─── JustETF ETF database ─── */

interface JustEtfEntry {
  isin: string;
  name: string;
  wkn: string;
}

const ETF_DB_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
let etfDatabaseCache: CacheEntry<JustEtfEntry[]> | null = null;

/** Ticker cache populated lazily when ETF profile pages are scraped */
const etfTickerCache = new Map<string, string>();

/**
 * Fetch the full JustETF ETF database by parsing the embedded JSON
 * on the "List of all ETFs" overview page. Cached for 24 hours.
 */
async function fetchJustEtfDatabase(): Promise<JustEtfEntry[]> {
  if (etfDatabaseCache && Date.now() < etfDatabaseCache.expiresAt) {
    return etfDatabaseCache.data;
  }

  const res = await fetch(
    "https://www.justetf.com/en/etf-list-overview.html",
    {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(30_000),
    },
  );

  if (!res.ok) {
    throw new Error(`JustETF list page returned status ${res.status}`);
  }

  const html = await res.text();
  const entries: JustEtfEntry[] = [];
  const seen = new Set<string>();

  // The page embeds ETF data in JS variables: var id10Etfs = [{...}, ...]; /* ... */
  const regex = /Etfs\s*=\s*(\[.*?\]);\s*\/\*/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    try {
      const arr = JSON.parse(match[1]!) as Array<{
        isin?: string;
        fundName?: string;
        wkn?: string;
      }>;
      for (const item of arr) {
        if (item.isin && !seen.has(item.isin)) {
          seen.add(item.isin);
          entries.push({
            isin: item.isin,
            name: item.fundName ?? "",
            wkn: item.wkn ?? "",
          });
        }
      }
    } catch {
      // skip malformed JSON blocks
    }
  }

  etfDatabaseCache = {
    data: entries,
    expiresAt: Date.now() + ETF_DB_CACHE_TTL_MS,
  };

  return entries;
}

/**
 * Resolve an ETF ticker symbol by scraping the JustETF profile page.
 * Results are cached permanently in memory.
 */
async function resolveEtfTicker(isin: string): Promise<string> {
  const cached = etfTickerCache.get(isin);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(
      `https://www.justetf.com/en/etf-profile.html?isin=${encodeURIComponent(isin)}`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!res.ok) {
      etfTickerCache.set(isin, isin);
      return isin;
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const ticker = $(
      '[data-testid="etf-profile-header_identifier-value-ticker"]',
    )
      .text()
      .trim();

    const resolved = ticker || isin;
    etfTickerCache.set(isin, resolved);
    return resolved;
  } catch {
    etfTickerCache.set(isin, isin);
    return isin;
  }
}

/**
 * Search the JustETF ETF database for matching ETFs.
 * Matches against fund name, ISIN, and WKN. Returns up to 10 results
 * with ticker symbols resolved from profile pages (cached after first lookup).
 */
async function searchJustEtfEtfs(query: string): Promise<Security[]> {
  const db = await fetchJustEtfDatabase();
  const q = query.toLowerCase();

  const matches = db
    .filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.isin.toLowerCase().includes(q) ||
        e.wkn.toLowerCase().includes(q),
    )
    .slice(0, 10);

  if (matches.length === 0) return [];

  // Resolve tickers in parallel (profile page scraping, cached after first hit)
  const tickers = await Promise.all(
    matches.map((e) => resolveEtfTicker(e.isin)),
  );

  return matches.map(
    (e, i): Security => ({
      ticker: tickers[i]!,
      isin: e.isin,
      name: e.name,
      type: "etf",
    }),
  );
}

/* ─── JustETF search cache ─── */
const JUSTETF_SEARCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const JUSTETF_SEARCH_CACHE_MAX_SIZE = 500;
const justEtfSearchCache = new Map<string, CacheEntry<Security[]>>();

async function cachedSearchJustEtfEtfs(
  query: string,
): Promise<Security[]> {
  const key = query.toLowerCase();
  const cached = justEtfSearchCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const data = await searchJustEtfEtfs(query);

  if (justEtfSearchCache.size >= JUSTETF_SEARCH_CACHE_MAX_SIZE) {
    const firstKey = justEtfSearchCache.keys().next().value;
    if (firstKey !== undefined) justEtfSearchCache.delete(firstKey);
  }

  justEtfSearchCache.set(key, {
    data,
    expiresAt: Date.now() + JUSTETF_SEARCH_CACHE_TTL_MS,
  });

  return data;
}

/* ─── Yahoo Finance helpers ─── */

const YAHOO_HEADERS = { "User-Agent": "Mozilla/5.0" };
const YAHOO_TIMEOUT = 8_000;

/** Search Yahoo Finance for a query string (returns raw Security[]) */
const YAHOO_SEARCH_URL = "https://query2.finance.yahoo.com/v1/finance/search";

async function searchYahooFinance(query: string): Promise<Security[]> {
  const url = new URL(YAHOO_SEARCH_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("quotesCount", "20");
  url.searchParams.set("newsCount", "0");
  url.searchParams.set("listsCount", "0");

  const response = await fetch(url.toString(), {
    headers: YAHOO_HEADERS,
    signal: AbortSignal.timeout(YAHOO_TIMEOUT),
  });

  if (!response.ok) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Yahoo Finance API returned status ${response.status}`,
    });
  }

  const data = (await response.json()) as YahooSearchResponse;

  // Only return stocks — ETFs are searched via JustETF instead
  return data.quotes
    .filter((q) => q.isYahooFinance && q.quoteType === "EQUITY")
    .map(
      (q): Security => ({
        ticker: q.symbol,
        isin: "",
        name: q.longname ?? q.shortname ?? q.symbol,
        type: "stock",
      }),
    );
}

/** Fetch trending tickers for a region from Yahoo Finance */
async function fetchTrendingTickers(region = "US"): Promise<string[]> {
  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/trending/${region}`;
    const res = await fetch(url, {
      headers: YAHOO_HEADERS,
      signal: AbortSignal.timeout(YAHOO_TIMEOUT),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as YahooTrendingResponse;
    return (
      data.finance?.result?.[0]?.quotes?.map((q) => q.symbol).filter(Boolean) ??
      []
    );
  } catch {
    return [];
  }
}

/** Fetch tickers from a Yahoo Finance predefined screener (e.g. most_actives, day_gainers) */
async function fetchScreenerTickers(
  screenerId: string,
  count = 25,
): Promise<YahooBulkQuote[]> {
  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=${screenerId}&count=${count}`;
    const res = await fetch(url, {
      headers: YAHOO_HEADERS,
      signal: AbortSignal.timeout(YAHOO_TIMEOUT),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as YahooScreenerResponse;
    return data.finance?.result?.[0]?.quotes ?? [];
  } catch {
    return [];
  }
}

/** Bulk-fetch quote details for a list of symbols */
async function fetchBulkQuotes(symbols: string[]): Promise<YahooBulkQuote[]> {
  if (symbols.length === 0) return [];
  try {
    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(","))}`;
    const res = await fetch(url, {
      headers: YAHOO_HEADERS,
      signal: AbortSignal.timeout(YAHOO_TIMEOUT),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as YahooBulkQuoteResponse;
    return data.quoteResponse?.result ?? [];
  } catch {
    return [];
  }
}

/** Convert a YahooBulkQuote to a Security (stocks only — ETFs come from JustETF) */
function quoteToSecurity(q: YahooBulkQuote): Security | null {
  if (!q.symbol) return null;
  const qType = (q.quoteType ?? "").toUpperCase();
  // Only return stocks; ETFs are handled via JustETF
  if (qType !== "EQUITY") return null;

  return {
    ticker: q.symbol,
    name: q.longName ?? q.shortName ?? q.symbol,
    type: "stock",
    isin: "",
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ETF Composition (JustETF scraping)
   ═══════════════════════════════════════════════════════════════════════════════ */

interface WeightedItem {
  name: string;
  weight: number;
}

interface EtfComposition {
  holdings: WeightedItem[];
  countries: WeightedItem[];
  sectors: WeightedItem[];
  /** Asset class label scraped from the profile page (e.g. "Equity", "Precious Metals", "Bonds") */
  assetClass: string;
  /** Whether the profile page has a holdings section at all */
  hasHoldingsSection: boolean;
}

interface EtfReturns {
  oneMonth: string;
  threeMonths: string;
  sixMonths: string;
  ytd: string;
  oneYear: string;
  threeYears: string;
  fiveYears: string;
  max: string;
}

interface EtfFullComposition extends EtfComposition {
  /** Full ETF name scraped from the profile page header */
  etfName: string;
  /** Number of total holdings (e.g. "3,624 holdings") */
  totalHoldings: string;
  /** Extended holdings from cbonds.com (~100 items) — empty if unavailable */
  cbondsHoldings: WeightedItem[];
  /** cbonds.com numeric ETF ID (for attribution link) — empty if unavailable */
  cbondsId: string;
  /** Fund size as displayed (e.g. "EUR 110,458") */
  fundSize: string;
  /** TER as displayed (e.g. "0.20% p.a.") */
  ter: string;
  /** Replication method (e.g. "Physical") */
  replication: string;
  /** Distribution policy (e.g. "Accumulating") */
  distributionPolicy: string;
  /** Cumulative return data scraped from the returns section */
  returns: EtfReturns;
}

const ETF_COMP_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const ETF_COMP_CACHE_MAX_SIZE = 200;
const etfCompositionCache = new Map<string, CacheEntry<EtfComposition>>();
const etfFullCompositionCache = new Map<string, CacheEntry<EtfFullComposition>>();

/** Parse a percentage string like "5.21%" into a number 5.21 */
function parsePct(raw: string): number {
  const num = parseFloat(raw.replace(",", ".").replace("%", "").trim());
  return isNaN(num) ? 0 : num;
}

const JUSTETF_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Extract cookies from a fetch Response's Set-Cookie headers */
function extractCookiesFromResponse(res: Response): string {
  try {
    const setCookies = res.headers.getSetCookie?.() ?? [];
    if (setCookies.length > 0) {
      return setCookies.map((c) => c.split(";")[0]).join("; ");
    }
  } catch {
    // getSetCookie() may not be available in all environments
  }
  // Fallback: try raw header
  const raw = res.headers.get("set-cookie");
  if (raw) {
    return raw
      .split(/,(?=\s*\w+=)/)
      .map((c) => c.split(";")[0]!.trim())
      .filter(Boolean)
      .join("; ");
  }
  return "";
}

/**
 * Parse a Wicket AJAX XML response and extract table rows as WeightedItem[].
 * The AJAX response wraps HTML inside CDATA sections.
 */
function parseWicketAjaxTable(
  ajaxXml: string,
  rowTestId: string,
  nameTestId: string,
  pctTestId: string,
): WeightedItem[] {
  const items: WeightedItem[] = [];
  // Extract content from CDATA sections, stripping the <![CDATA[ ... ]]> wrappers
  const cdataMatches = ajaxXml.match(/<!\[CDATA\[([\s\S]*?)\]\]>/g);
  if (!cdataMatches) return items;

  const htmlContent = cdataMatches
    .map((s) => s.slice(9, -3)) // strip "<![CDATA[" (9 chars) and "]]>" (3 chars)
    .join("");

  const $ = cheerio.load(htmlContent);
  $(`tr[data-testid="${rowTestId}"]`).each((_, row) => {
    const name = $(row)
      .find(`[data-testid="${nameTestId}"]`)
      .text()
      .trim();
    const weight = parsePct(
      $(row).find(`[data-testid="${pctTestId}"]`).text(),
    );
    if (name) items.push({ name, weight });
  });

  return items;
}

/**
 * Fetch expanded countries & sectors from JustETF via Wicket AJAX calls.
 * Requires the main profile page HTML (to extract AJAX URLs) and session cookies.
 * Returns empty arrays if the AJAX calls fail (callers should fall back to main page data).
 */
async function fetchExpandedCompositionData(
  html: string,
  cookies: string,
  isin: string,
): Promise<{ countries: WeightedItem[]; sectors: WeightedItem[] }> {
  // Extract Wicket AJAX URLs from the page's inline JavaScript
  const ajaxCalls = html.match(/Wicket\.Ajax\.ajax\(\{[^}]+\}/g) ?? [];
  let countriesUrl = "";
  let sectorsUrl = "";
  for (const call of ajaxCalls) {
    const urlMatch = /"u":"([^"]+)"/.exec(call);
    if (!urlMatch) continue;
    const url = urlMatch[1]!;
    if (url.includes("loadMoreCountries")) countriesUrl = url;
    if (url.includes("loadMoreSectors")) sectorsUrl = url;
  }

  const ajaxHeaders = {
    "User-Agent": JUSTETF_UA,
    "Wicket-Ajax": "true",
    "Wicket-Ajax-BaseURL": `en/etf-profile.html?isin=${encodeURIComponent(isin)}`,
    Cookie: cookies,
  };

  let countries: WeightedItem[] = [];
  let sectors: WeightedItem[] = [];

  const tasks: Promise<void>[] = [];

  if (countriesUrl && cookies) {
    tasks.push(
      fetch(`https://www.justetf.com${countriesUrl}`, {
        headers: ajaxHeaders,
        signal: AbortSignal.timeout(10_000),
      })
        .then((r) => (r.ok ? r.text() : ""))
        .then((xml) => {
          if (xml) {
            countries = parseWicketAjaxTable(
              xml,
              "etf-holdings_countries_row",
              "tl_etf-holdings_countries_value_name",
              "tl_etf-holdings_countries_value_percentage",
            );
          }
        })
        .catch(() => {
          /* silently fall back to main page data */
        }),
    );
  }

  if (sectorsUrl && cookies) {
    tasks.push(
      fetch(`https://www.justetf.com${sectorsUrl}`, {
        headers: ajaxHeaders,
        signal: AbortSignal.timeout(10_000),
      })
        .then((r) => (r.ok ? r.text() : ""))
        .then((xml) => {
          if (xml) {
            sectors = parseWicketAjaxTable(
              xml,
              "etf-holdings_sectors_row",
              "tl_etf-holdings_sectors_value_name",
              "tl_etf-holdings_sectors_value_percentage",
            );
          }
        })
        .catch(() => {
          /* silently fall back to main page data */
        }),
    );
  }

  await Promise.all(tasks);
  return { countries, sectors };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   cbonds.com extended holdings (via Python helper)
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Convert an ALL-CAPS holding name to Title Case for display.
 * Only transforms if the entire name is uppercase (to avoid mangling already well-cased names).
 * Handles common abbreviations (PLC, AG, etc.), corporate suffixes (Inc, Corp),
 * and lowercase articles/prepositions.
 */
function toTitleCase(name: string): string {
  const trimmed = name.trim();
  // Only transform if the entire name is uppercase
  if (!/[a-zA-Z]/.test(trimmed)) return trimmed;
  if (trimmed !== trimmed.toUpperCase()) return trimmed;
  // Skip very short names (likely abbreviations like "AMD", "SAP")
  if (trimmed.length <= 4 && !/\s/.test(trimmed)) return trimmed;

  // Words that should stay lowercase (when not the first word)
  const lowercaseWords = new Set([
    "OF", "THE", "AND", "IN", "FOR", "DE", "DU", "VON", "VAN", "DER", "DEL", "LA", "LE",
  ]);

  // Words/abbreviations that should stay UPPERCASE
  const keepUppercase = new Set([
    "PLC", "AG", "SA", "SE", "NV", "LLC", "LP", "ASA", "OYJ", "AB", "KK",
    "ETF", "ADR", "REIT",
    "II", "III", "IV", "VI", "VII", "VIII", "IX", "XI", "XII",
    "USA", "US", "UK", "EU",
    "N.V.", "S.A.", "A.G.",
  ]);

  return trimmed
    .split(/\s+/)
    .map((word, i) => {
      if (keepUppercase.has(word)) return word;
      if (i > 0 && lowercaseWords.has(word)) return word.toLowerCase();
      // Title case: first letter uppercase, rest lowercase
      return word.charAt(0) + word.slice(1).toLowerCase();
    })
    .join(" ");
}

interface CbondsResult {
  holdings: WeightedItem[];
  cbondsId: string;
}

const CBONDS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CBONDS_CACHE_MAX_SIZE = 200;
const cbondsHoldingsCache = new Map<string, CacheEntry<CbondsResult>>();

/**
 * Resolve the Python executable, preferring the project .venv if available.
 * Falls back to system python3 / python.
 */
function resolvePythonExe(): string {
  const cwd = process.cwd();
  // Windows venv
  const winVenv = join(cwd, ".venv", "Scripts", "python.exe");
  if (existsSync(winVenv)) return winVenv;
  // Unix venv
  const unixVenv = join(cwd, ".venv", "bin", "python3");
  if (existsSync(unixVenv)) return unixVenv;
  const unixVenv2 = join(cwd, ".venv", "bin", "python");
  if (existsSync(unixVenv2)) return unixVenv2;
  // System fallback
  return process.platform === "win32" ? "python" : "python3";
}

/**
 * Fetch extended ETF holdings (~100 items) from cbonds.com.
 * Uses a Python helper script (scripts/cbonds_fetch.py) with curl_cffi
 * to bypass Cloudflare TLS fingerprint checks.
 * Returns empty result on failure — never throws.
 */
async function fetchCbondsHoldings(isin: string): Promise<CbondsResult> {
  const empty: CbondsResult = { holdings: [], cbondsId: "" };

  // Check cache first
  const key = isin.toUpperCase();
  const cached = cbondsHoldingsCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  try {
    const scriptPath = join(process.cwd(), "scripts", "cbonds_fetch.py");
    const pythonExe = resolvePythonExe();
    const result = await new Promise<CbondsResult>((resolve) => {
      execFile(
        pythonExe,
        [scriptPath, isin],
        { timeout: 45_000, maxBuffer: 5 * 1024 * 1024 },
        (err, stdout, _stderr) => {
          if (err) {
            console.error("[cbonds] script error:", err.message);
            resolve(empty);
            return;
          }
          try {
            const parsed = JSON.parse(stdout.trim()) as {
              holdings?: Array<{ name: string; weight: number }>;
              cbondsId?: string;
              error?: string;
            };
            if (parsed.error) {
              console.warn("[cbonds] API warning:", parsed.error);
            }
            resolve({
              holdings: (parsed.holdings ?? []).map((h) => ({
                name: toTitleCase(h.name),
                weight: h.weight,
              })),
              cbondsId: parsed.cbondsId ?? "",
            });
          } catch (parseErr) {
            console.error("[cbonds] JSON parse error:", parseErr);
            resolve(empty);
          }
        },
      );
    });

    // Cache the result (even if empty, to avoid repeated failures)
    if (cbondsHoldingsCache.size >= CBONDS_CACHE_MAX_SIZE) {
      const firstKey = cbondsHoldingsCache.keys().next().value;
      if (firstKey !== undefined) cbondsHoldingsCache.delete(firstKey);
    }
    cbondsHoldingsCache.set(key, {
      data: result,
      expiresAt: Date.now() + CBONDS_CACHE_TTL_MS,
    });

    return result;
  } catch (e) {
    console.error("[cbonds] unexpected error:", e);
    return empty;
  }
}

/** Parse countries from the main profile page HTML (fallback when AJAX is unavailable) */
function parseCountriesFromPage($: cheerio.CheerioAPI): WeightedItem[] {
  const countries: WeightedItem[] = [];
  $('tr[data-testid="etf-holdings_countries_row"]').each((_, row) => {
    const name = $(row)
      .find('[data-testid="tl_etf-holdings_countries_value_name"]')
      .text()
      .trim();
    const weight = parsePct(
      $(row)
        .find('[data-testid="tl_etf-holdings_countries_value_percentage"]')
        .text(),
    );
    if (name) countries.push({ name, weight });
  });
  return countries;
}

/** Parse sectors from the main profile page HTML (fallback when AJAX is unavailable) */
function parseSectorsFromPage($: cheerio.CheerioAPI): WeightedItem[] {
  const sectors: WeightedItem[] = [];
  $('tr[data-testid="etf-holdings_sectors_row"]').each((_, row) => {
    const name = $(row)
      .find('[data-testid="tl_etf-holdings_sectors_value_name"]')
      .text()
      .trim();
    const weight = parsePct(
      $(row)
        .find('[data-testid="tl_etf-holdings_sectors_value_percentage"]')
        .text(),
    );
    if (name) sectors.push({ name, weight });
  });
  return sectors;
}

/** Fetch & parse ETF composition from JustETF (with expanded countries/sectors via Wicket AJAX) */
async function fetchEtfComposition(isin: string): Promise<EtfComposition> {
  const url = `https://www.justetf.com/en/etf-profile.html?isin=${encodeURIComponent(isin)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": JUSTETF_UA },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `JustETF returned status ${res.status} for ISIN ${isin}`,
    });
  }

  const html = await res.text();
  const cookies = extractCookiesFromResponse(res);
  const $ = cheerio.load(html);

  // ── Asset class & holdings-section detection ──
  const assetClass = $('[data-testid="etf-quote-section_tag-link-0"]')
    .text()
    .replace(/\s*\(\d+\)\s*$/, "")
    .trim();
  const hasHoldingsSection =
    $('[data-testid="etf-profile-tabs_holdings-tab-link"]').length > 0 ||
    $('[data-testid="etf-holdings_top-holdings_container"]').length > 0;

  // ── Top 10 Holdings ──
  const holdings: WeightedItem[] = [];
  $('tr[data-testid="etf-holdings_top-holdings_row"]').each((_, row) => {
    const name = $(row)
      .find('[data-testid="tl_etf-holdings_top-holdings_link_name"] span')
      .text()
      .trim();
    const weight = parsePct(
      $(row)
        .find('[data-testid="tl_etf-holdings_top-holdings_value_percentage"]')
        .text(),
    );
    if (name) holdings.push({ name, weight });
  });

  // ── Countries & Sectors via Wicket AJAX (expanded data) ──
  const { countries: ajaxCountries, sectors: ajaxSectors } =
    await fetchExpandedCompositionData(html, cookies, isin);

  // Fallback: parse from main page if AJAX didn't return data
  const countries = ajaxCountries.length > 0 ? ajaxCountries : parseCountriesFromPage($);
  const sectors = ajaxSectors.length > 0 ? ajaxSectors : parseSectorsFromPage($);

  return { holdings, countries, sectors, assetClass, hasHoldingsSection };
}

/**
 * Fetch FULL ETF composition by:
 * 1. Fetching the main profile page (getting session cookies + top 10 holdings)
 * 2. Making Wicket AJAX calls for expanded countries & sectors
 */
async function fetchEtfFullComposition(isin: string): Promise<EtfFullComposition> {
  const profileUrl = `https://www.justetf.com/en/etf-profile.html?isin=${encodeURIComponent(isin)}`;

  const mainRes = await fetch(profileUrl, {
    headers: { "User-Agent": JUSTETF_UA },
    signal: AbortSignal.timeout(15_000),
  });

  if (!mainRes.ok) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `JustETF returned status ${mainRes.status} for ISIN ${isin}`,
    });
  }

  const html = await mainRes.text();
  const cookies = extractCookiesFromResponse(mainRes);
  const $ = cheerio.load(html);

  // ── ETF name ──
  const etfName = $('[data-testid="etf-profile-header_etf-name"]').text().trim();

  // ── Key facts from profile header ──
  const fundSize = $('[data-testid="etf-profile-header_fund-size-value-wrapper"]').text().trim();
  const ter = $('[data-testid="etf-profile-header_ter-value"]').text().trim();
  const replication = $('[data-testid="etf-profile-header_replication-value"]').text().trim();
  const distributionPolicy = $('[data-testid="etf-profile-header_distribution-policy-value"]').text().trim();

  // ── Returns ──
  const returns: EtfReturns = {
    oneMonth: $('[data-testid="etf-returns-section_month-return"]').text().trim(),
    threeMonths: $('[data-testid="etf-returns-section_3month-return"]').text().trim(),
    sixMonths: $('[data-testid="etf-returns-section_6month-return"]').text().trim(),
    ytd: $('[data-testid="etf-returns-section_ytd-return"]').text().trim(),
    oneYear: $('[data-testid="etf-returns-section_1year-return"]').text().trim(),
    threeYears: $('[data-testid="etf-returns-section_3year-return"]').text().trim(),
    fiveYears: $('[data-testid="etf-returns-section_5year-return"]').text().trim(),
    max: $('[data-testid="etf-returns-section_max-return"]').text().trim(),
  };

  // ── Asset class & holdings-section detection ──
  const assetClass = $('[data-testid="etf-quote-section_tag-link-0"]')
    .text()
    .replace(/\s*\(\d+\)\s*$/, "")
    .trim();
  const hasHoldingsSection =
    $('[data-testid="etf-profile-tabs_holdings-tab-link"]').length > 0 ||
    $('[data-testid="etf-holdings_top-holdings_container"]').length > 0;

  // ── Total holdings count ──
  const rawTotalHoldings = $('[data-testid="tl_etf-holdings_top-holdings_count"]').text().trim();
  // Raw text is e.g. "out of 3,624" — extract just the number and reformat
  const totalHoldingsMatch = /([\d,.]+)/.exec(rawTotalHoldings);
  const totalHoldings = totalHoldingsMatch ? `${totalHoldingsMatch[1]} holdings` : rawTotalHoldings;

  // ── Top 10 Holdings ──
  const holdings: WeightedItem[] = [];
  $('tr[data-testid="etf-holdings_top-holdings_row"]').each((_, row) => {
    const name = $(row)
      .find('[data-testid="tl_etf-holdings_top-holdings_link_name"] span')
      .text()
      .trim();
    const weight = parsePct(
      $(row)
        .find('[data-testid="tl_etf-holdings_top-holdings_value_percentage"]')
        .text(),
    );
    if (name) holdings.push({ name, weight });
  });

  // ── Countries & Sectors via Wicket AJAX (expanded data) ──
  const [{ countries: ajaxCountries, sectors: ajaxSectors }, cbondsResult] =
    await Promise.all([
      fetchExpandedCompositionData(html, cookies, isin),
      fetchCbondsHoldings(isin),
    ]);

  // Fallback: parse from main page if AJAX didn't return data
  const countries = ajaxCountries.length > 0 ? ajaxCountries : parseCountriesFromPage($);
  const sectors = ajaxSectors.length > 0 ? ajaxSectors : parseSectorsFromPage($);

  return {
    holdings,
    countries,
    sectors,
    assetClass,
    hasHoldingsSection,
    etfName,
    totalHoldings,
    cbondsHoldings: cbondsResult.holdings,
    cbondsId: cbondsResult.cbondsId,
    fundSize,
    ter,
    replication,
    distributionPolicy,
    returns,
  };
}

/** Cached wrapper for full ETF composition fetching */
async function cachedFetchEtfFullComposition(isin: string): Promise<EtfFullComposition> {
  const key = isin.toUpperCase();
  const cached = etfFullCompositionCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  const data = await fetchEtfFullComposition(isin);

  if (etfFullCompositionCache.size >= ETF_COMP_CACHE_MAX_SIZE) {
    const firstKey = etfFullCompositionCache.keys().next().value;
    if (firstKey !== undefined) etfFullCompositionCache.delete(firstKey);
  }

  etfFullCompositionCache.set(key, {
    data,
    expiresAt: Date.now() + ETF_COMP_CACHE_TTL_MS,
  });

  return data;
}

/** Cached wrapper for ETF composition fetching */
async function cachedFetchEtfComposition(isin: string): Promise<EtfComposition> {
  const key = isin.toUpperCase();
  const cached = etfCompositionCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  const data = await fetchEtfComposition(isin);

  if (etfCompositionCache.size >= ETF_COMP_CACHE_MAX_SIZE) {
    const firstKey = etfCompositionCache.keys().next().value;
    if (firstKey !== undefined) etfCompositionCache.delete(firstKey);
  }

  etfCompositionCache.set(key, {
    data,
    expiresAt: Date.now() + ETF_COMP_CACHE_TTL_MS,
  });

  return data;
}

/* ─── Per-query search cache (cached server-side for 24 hours) ─── */
const SEARCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const SEARCH_CACHE_MAX_SIZE = 500;
const searchCache = new Map<string, CacheEntry<Security[]>>();

async function cachedSearchYahooFinance(query: string): Promise<Security[]> {
  const key = query.toLowerCase();
  const cached = searchCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  const data = await searchYahooFinance(query);

  // Evict oldest entries if cache is full
  if (searchCache.size >= SEARCH_CACHE_MAX_SIZE) {
    const firstKey = searchCache.keys().next().value;
    if (firstKey !== undefined) searchCache.delete(firstKey);
  }

  searchCache.set(key, {
    data,
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
  });

  return data;
}

/* ─── Bulk securities list (dynamic, cached server-side for 24 hours) ─── */

let allSecuritiesCache: CacheEntry<Security[]> | null = null;
const ALL_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Dynamically fetches a list of popular/active securities by combining:
 *  1. Yahoo Finance trending tickers (US)
 *  2. Yahoo Finance predefined screeners (most_actives, day_gainers)
 * Then resolves full quote details via the bulk quote API.
 * No hardcoded ticker lists are used.
 */
async function fetchAllSecurities(): Promise<Security[]> {
  if (allSecuritiesCache && Date.now() < allSecuritiesCache.expiresAt) {
    return allSecuritiesCache.data;
  }

  // ── Step 1: gather candidate symbols from dynamic sources ────────────
  const [trendingSymbols, mostActiveQuotes, dayGainerQuotes] =
    await Promise.allSettled([
      fetchTrendingTickers("US"),
      fetchScreenerTickers("most_actives", 25),
      fetchScreenerTickers("day_gainers", 25),
    ]);

  // Collect unique symbols
  const symbolSet = new Set<string>();
  // Securities we can build directly from screener results (they include name & type)
  const screenerSecurities = new Map<string, Security>();

  // Trending only gives symbols — we'll need to bulk-fetch details later
  if (trendingSymbols.status === "fulfilled") {
    for (const sym of trendingSymbols.value) {
      symbolSet.add(sym);
    }
  }

  // Screener results include full quote data
  for (const result of [mostActiveQuotes, dayGainerQuotes]) {
    if (result.status === "fulfilled") {
      for (const q of result.value) {
        if (q.symbol) {
          symbolSet.add(q.symbol);
          const sec = quoteToSecurity(q);
          if (sec) screenerSecurities.set(sec.ticker, sec);
        }
      }
    }
  }

  // ── Step 2: resolve details for symbols that came from trending only ─
  const unresolvedSymbols = [...symbolSet].filter(
    (s) => !screenerSecurities.has(s),
  );

  if (unresolvedSymbols.length > 0) {
    const bulkQuotes = await fetchBulkQuotes(unresolvedSymbols);
    for (const q of bulkQuotes) {
      const sec = quoteToSecurity(q);
      if (sec) screenerSecurities.set(sec.ticker, sec);
    }
  }

  // ── Step 3: assemble deduplicated list ───────────────────────────────
  const securities = [...screenerSecurities.values()];

  allSecuritiesCache = {
    data: securities,
    expiresAt: Date.now() + ALL_CACHE_TTL_MS,
  };

  return securities;
}

/* ─── Router ─── */
export const securitiesRouter = createTRPCRouter({
  /**
   * Return a dynamically-fetched list of trending / most-active securities.
   * The frontend caches this in localStorage and does all filtering client-side.
   */
  getAll: publicProcedure.query(async () => {
    try {
      return await fetchAllSecurities();
    } catch (err) {
      console.error("[securities.getAll] error:", err);
      return [] as Security[];
    }
  }),

  /**
   * Per-keystroke search combining Yahoo Finance (stocks only) and
   * JustETF (ETFs only). Both sources run in parallel.
   */
  search: publicProcedure
    .input(
      z.object({
        query: z.string().max(100),
      }),
    )
    .query(async ({ input }) => {
      const q = input.query.trim();
      if (q.length === 0) return [] as Security[];

      try {
        const [yahooResult, etfResult] = await Promise.allSettled([
          cachedSearchYahooFinance(q),
          cachedSearchJustEtfEtfs(q),
        ]);

        const stocks =
          yahooResult.status === "fulfilled" ? yahooResult.value : [];
        const etfs =
          etfResult.status === "fulfilled" ? etfResult.value : [];

        // ETFs first, then stocks
        return [...etfs, ...stocks];
      } catch (err) {
        console.error("[securities.search] error:", err);
        return [] as Security[];
      }
    }),

  /**
   * Fetch ETF composition (top holdings, countries, sectors) from JustETF.
   * Results are cached server-side for 24 hours.
   */
  getEtfComposition: publicProcedure
    .input(
      z.object({
        isin: z.string().min(1).max(20),
      }),
    )
    .query(async ({ input }) => {
      try {
        const data = await cachedFetchEtfComposition(input.isin);
        return data;
      } catch (err) {
        console.error("[securities.getEtfComposition] error:", err);
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch ETF composition for ISIN ${input.isin}: ${err instanceof Error ? err.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Fetch FULL ETF composition (expanded countries & sectors via Wicket AJAX).
   * Includes ETF name, top 10 holdings, all available countries, all available sectors.
   * Results are cached server-side for 24 hours.
   */
  getEtfFullComposition: publicProcedure
    .input(
      z.object({
        isin: z.string().min(1).max(20),
      }),
    )
    .query(async ({ input }) => {
      try {
        const data = await cachedFetchEtfFullComposition(input.isin);
        return data;
      } catch (err) {
        console.error("[securities.getEtfFullComposition] error:", err);
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch full ETF composition for ISIN ${input.isin}: ${err instanceof Error ? err.message : "Unknown error"}`,
        });
      }
    }),
});
