"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  SearchIcon,
  Loader2,
  ArrowRightIcon,
} from "lucide-react";
import { api } from "~/trpc/react";
import { type SecurityResult } from "~/types/portfolio";
import { loadSecuritiesCache, saveSecuritiesCache } from "~/lib/storage";

const MAX_RESULTS = 30;

export default function AnalyzerPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  /* ── Securities list (cached in localStorage, fetched via getAll) ── */
  const [securities, setSecurities] = useState<SecurityResult[]>([]);

  const { data: serverSecurities } = api.securities.getAll.useQuery(undefined, {
    staleTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  useEffect(() => {
    const cached = loadSecuritiesCache();
    if (cached) setSecurities(cached);
  }, []);

  useEffect(() => {
    if (serverSecurities && serverSecurities.length > 0) {
      setSecurities(serverSecurities);
      saveSecuritiesCache(serverSecurities);
    }
  }, [serverSecurities]);

  /* ── Debounce search query for server-side search ── */
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setDebouncedQuery("");
      return;
    }
    const timer = setTimeout(() => setDebouncedQuery(trimmed), 300);
    return () => clearTimeout(timer);
  }, [query]);

  /* ── Server-side search ── */
  const { data: searchResults, isFetching } = api.securities.search.useQuery(
    { query: debouncedQuery },
    {
      enabled: debouncedQuery.length >= 1,
      staleTime: 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  );

  const isSearching =
    isFetching || (query.trim().length >= 1 && query.trim() !== debouncedQuery);

  /* ── Merged & filtered results (ETFs only) ── */
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    // Client-side filtering
    let clientFiltered: SecurityResult[];
    if (!q) {
      clientFiltered = securities.filter((s) => s.type === "etf");
    } else {
      clientFiltered = securities.filter(
        (s) =>
          s.type === "etf" &&
          (s.ticker.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q) ||
            s.isin?.toLowerCase().includes(q)),
      );
    }

    // Merge server search results (deduplicated by ticker, ETFs only)
    const serverResults = ((searchResults ?? []) as SecurityResult[]).filter(
      (s) => s.type === "etf",
    );
    const seen = new Set(clientFiltered.map((s) => s.ticker));
    const merged = [...clientFiltered];
    for (const s of serverResults) {
      if (!seen.has(s.ticker)) {
        merged.push(s);
        seen.add(s.ticker);
      }
    }

    return merged.slice(0, MAX_RESULTS);
  }, [securities, query, searchResults]);

  /* ── Highlight matched text helper ── */
  const highlightMatch = (text: string, q: string) => {
    if (!q.trim()) return text;
    const idx = text.toLowerCase().indexOf(q.trim().toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="font-semibold text-emerald-400">
          {text.slice(idx, idx + q.length)}
        </span>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      {/* ─── Hero / Header ─── */}
      <section className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="mx-auto flex max-w-4xl flex-col items-center px-6 pb-12 pt-28 text-center md:pt-36">
          <span className="mb-5 inline-block rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1 text-xs font-medium tracking-wide text-emerald-400">
            ETF Analyzer
          </span>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
            Explore any ETF in
            <span className="text-emerald-400"> detail</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-400">
            Search by name, ticker, or ISIN and dive deep into holdings,
            countries, sectors, returns, and more — no portfolio needed.
          </p>
        </div>
      </section>

      {/* ─── Search ─── */}
      <section className="mx-auto max-w-3xl px-6 pb-6">
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
            <SearchIcon className="h-5 w-5" />
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ETFs by name, ticker, or ISIN…"
            className="h-14 w-full rounded-2xl border border-white/10 bg-gray-900 pl-12 pr-12 text-base text-white placeholder-gray-600 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
            autoFocus
          />
          {isSearching && (
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </span>
          )}
        </div>
      </section>

      {/* ─── Results ─── */}
      <section className="mx-auto max-w-3xl px-6 pb-24">
        {/* Loading state */}
        {isSearching && results.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
            <span>Searching…</span>
          </div>
        )}

        {/* No results */}
        {!isSearching && results.length === 0 && query.trim().length > 0 && (
          <div className="py-12 text-center text-gray-500">
            No ETFs found for &ldquo;{query.trim()}&rdquo;
          </div>
        )}

        {/* Empty state — no query yet */}
        {query.trim().length === 0 && results.length === 0 && securities.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-emerald-400" />
            Loading ETF database…
          </div>
        )}

        {/* Results list */}
        {results.length > 0 && (
          <div className="space-y-2">
            <p className="mb-4 text-sm text-gray-500">
              {query.trim()
                ? `${results.length} ETF${results.length !== 1 ? "s" : ""} found`
                : `Showing ${results.length} ETFs — search to narrow results`}
            </p>

            {results.map((etf) => (
              <Link
                key={`${etf.ticker}-${etf.isin}`}
                href={`/etf/${etf.isin}`}
                className="group flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-gray-900/60 px-5 py-4 transition hover:border-emerald-500/30 hover:bg-gray-900"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white group-hover:text-emerald-400">
                    {highlightMatch(etf.name, query)}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                    <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-emerald-400/70">
                      {highlightMatch(etf.ticker, query)}
                    </span>
                    {etf.isin && (
                      <span className="font-mono text-gray-600">
                        {highlightMatch(etf.isin, query)}
                      </span>
                    )}
                    <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-400">
                      ETF
                    </span>
                  </div>
                </div>
                <ArrowRightIcon className="h-4 w-4 shrink-0 text-gray-600 transition group-hover:text-emerald-400" />
              </Link>
            ))}
          </div>
        )}

        {/* Show popular/all ETFs when no query */}
        {query.trim().length === 0 && results.length > 0 && (
          <p className="mt-4 text-center text-xs text-gray-600">
            Type to search from {securities.filter((s) => s.type === "etf").length}+ ETFs
          </p>
        )}
      </section>
    </main>
  );
}
