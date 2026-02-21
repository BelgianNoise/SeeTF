"use client";

import { Fragment, useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowUpDownIcon,
  AlertCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  InfoIcon,
  Loader2Icon,
  PercentIcon,
} from "lucide-react";
import Link from "next/link";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { type PortfolioData, type Position, CURRENCY_SYMBOLS } from "~/types/portfolio";
import { loadPortfolio } from "~/lib/storage";
import { api } from "~/trpc/react";

/* ═══════════════════════════════════════════════════════════════════════════════
   ETF COMPOSITION CARD — shows top holdings, countries & sectors for one ETF
   ═══════════════════════════════════════════════════════════════════════════════ */
/** Check whether a security type represents an ETF (case-insensitive, includes ETP) */
function isEtfType(type: string | undefined | null): boolean {
  if (!type) return false;
  const t = type.toLowerCase();
  return t === "etf" || t === "etp";
}

/**
 * Normalize a holding name for deduplication.
 * Converts to uppercase, strips dots, class/share designations,
 * trailing suffixes like Inc, Corp, Ltd, etc., removes punctuation,
 * and collapses whitespace so that
 * "Apple Inc" / "APPLE INC" / "Apple Inc." all map to "APPLE",
 * "Amazon.com Inc" / "AMAZON COM INC" both map to "AMAZON COM",
 * "Alphabet Inc Class A" / "ALPHABET INC" both map to "ALPHABET".
 */
function normalizeHoldingName(name: string): string {
  let n = name.trim().toUpperCase();

  // Replace dots with spaces ("AMAZON.COM" → "AMAZON COM", "N.V." → "N V")
  n = n.replace(/\./g, " ");

  // Strip share-class designations: "CLASS A", "CL A", "SERIES A", "SER A", etc.
  n = n.replace(/\s+(CLASS|CL|SERIES|SER)[\s-]+[A-Z]\b/g, "");

  // Strip common corporate suffixes (order matters: longer first)
  const suffixes = [
    "INCORPORATED",
    "CORPORATION",
    "LIMITED",
    "COMPANY",
    "HOLDINGS",
    "GROUP",
    "INC",
    "CORP",
    "LTD",
    "CO",
    "PLC",
    "AG",
    "SA",
    "SE",
    "NV",
    "N V",
  ];
  const suffixPattern = new RegExp(
    `\\s+(${suffixes.join("|")})\\s*$`,
  );
  // Apply suffix removal up to 2 times to handle e.g. "Holdings Inc"
  for (let i = 0; i < 2; i++) {
    n = n.replace(suffixPattern, "");
  }
  // Remove trailing commas, dots, dashes
  n = n.replace(/[,.\-]+$/, "");
  // Collapse multiple spaces
  n = n.replace(/\s+/g, " ").trim();
  return n;
}

/**
 * Pick the better display name between two variants.
 * Prefers title-case (mixed case) over ALL-CAPS.
 */
function pickDisplayName(existing: string, incoming: string): string {
  const isAllUpper = (s: string) => s === s.toUpperCase();
  // If existing is all-caps and incoming is not, prefer incoming
  if (isAllUpper(existing) && !isAllUpper(incoming)) return incoming;
  // Otherwise keep existing (first-seen or already nice)
  return existing;
}

/** Limit a list to `max` visible items, grouping the remainder under "Other" (so at most max + 1 entries). */
function limitWithOthers(
  items: Array<{ name: string; weight: number }>,
  max = 10,
): Array<{ name: string; weight: number }> {
  if (items.length <= max) return items;
  const visible = items.slice(0, max);
  const othersWeight = items.slice(max).reduce((sum, item) => sum + item.weight, 0);
  return [...visible, { name: "Other", weight: othersWeight }];
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PIE CHART COLOUR PALETTE
   ═══════════════════════════════════════════════════════════════════════════════ */
const PIE_PALETTES = {
  sky: [
    "#38bdf8", "#0ea5e9", "#0284c7", "#0369a1", "#075985",
    "#7dd3fc", "#bae6fd", "#e0f2fe", "#22d3ee", "#06b6d4",
    "#0891b2", "#67e8f9", "#a5f3fc", "#cffafe", "#155e75", "#164e63",
    "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8", "#1e40af", "#93c5fd",
    "#818cf8", "#6366f1", "#4f46e5", "#4338ca", "#3730a3", "#a5b4fc",
    "#2dd4bf", "#14b8a6", "#0d9488", "#0f766e",
  ],
  violet: [
    "#a78bfa", "#8b5cf6", "#7c3aed", "#6d28d9", "#5b21b6",
    "#c4b5fd", "#ddd6fe", "#ede9fe", "#c084fc", "#a855f7",
    "#9333ea", "#e879f9", "#d946ef", "#f0abfc", "#86198f", "#701a75",
    "#f472b6", "#ec4899", "#db2777", "#be185d", "#9d174d", "#f9a8d4",
    "#fb7185", "#f43f5e", "#e11d48", "#be123c", "#9f1239", "#fda4af",
    "#d8b4fe", "#c084fc", "#a855f7", "#7e22ce",
  ],
  emerald: [
    "#34d399", "#10b981", "#059669", "#047857", "#065f46",
    "#6ee7b7", "#a7f3d0", "#d1fae5", "#2dd4bf", "#14b8a6",
    "#0d9488", "#5eead4", "#99f6e4", "#ccfbf1", "#115e59", "#134e4a",
    "#4ade80", "#22c55e", "#16a34a", "#15803d", "#166534", "#86efac",
    "#fbbf24", "#f59e0b", "#d97706", "#b45309", "#92400e", "#fcd34d",
    "#a3e635", "#84cc16", "#65a30d", "#4d7c0f",
  ],
} as const;

const OTHERS_COLOR = "#4b5563"; // gray-600

/* ─── Helper: group small items into "Other" ─── */
function groupSmallEntries(
  items: { name: string; weight: number }[],
  maxSlices = 8,
) {
  if (items.length <= maxSlices) return mergeOtherEntries(items);

  const sorted = [...items].sort((a, b) => b.weight - a.weight);
  const top = sorted.slice(0, maxSlices);
  const rest = sorted.slice(maxSlices);
  const othersWeight = rest.reduce((sum, i) => sum + i.weight, 0);

  if (othersWeight > 0) {
    top.push({ name: "Other", weight: parseFloat(othersWeight.toFixed(2)) });
  }
  return mergeOtherEntries(top);
}

/** Merge duplicate "Other" entries into a single one */
function mergeOtherEntries(items: { name: string; weight: number }[]) {
  const others = items.filter((i) => i.name === "Other");
  if (others.length <= 1) return items;
  const merged = others.reduce((sum, i) => sum + i.weight, 0);
  return [
    ...items.filter((i) => i.name !== "Other"),
    { name: "Other", weight: parseFloat(merged.toFixed(2)) },
  ];
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PORTFOLIO DISTRIBUTION — aggregated country & sector pie charts
   ═══════════════════════════════════════════════════════════════════════════════ */

/** Custom tooltip for dark theme (matches ETF detail page) */
function PortfolioPieTooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { fill: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  if (!entry) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-gray-900 px-3 py-2 shadow-xl">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: entry.payload.fill }}
        />
        <span className="text-sm text-gray-200">{entry.name}</span>
      </div>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-white">
        {entry.value.toFixed(2)}%
      </p>
    </div>
  );
}

/** Hook: fetch FULL composition for one ETF isin (includes cbondsHoldings). Returns { data, isLoading } */
function useEtfFullComposition(isin: string | null) {
  return api.securities.getEtfFullComposition.useQuery(
    { isin: isin ?? "__placeholder__" },
    { enabled: !!isin && isin.trim().length > 0, staleTime: 24 * 60 * 60 * 1000, retry: 1 },
  );
}

/**
 * Fetches composition for a single ETF and reports data to the parent
 * via the onData / onLoading callbacks. Renders nothing.
 */
type CompositionData = {
  countries: Array<{ name: string; weight: number }>;
  sectors: Array<{ name: string; weight: number }>;
  holdings: Array<{ name: string; weight: number }>;
  ter?: string;
};

function EtfDataFetcher({
  isin,
  onData,
  onLoading,
}: {
  isin: string;
  onData: (isin: string, data: CompositionData | null) => void;
  onLoading: (isin: string, loading: boolean) => void;
}) {
  const { data, isLoading } = useEtfFullComposition(isin);

  useEffect(() => {
    onLoading(isin, isLoading);
  }, [isin, isLoading, onLoading]);

  useEffect(() => {
    if (data) {
      // Prefer investEngineHoldings (all) > cbondsHoldings (~100) > JustETF top 10
      const holdings =
        data.investEngineHoldings?.length > 0 ? data.investEngineHoldings :
        data.cbondsHoldings?.length > 0 ? data.cbondsHoldings : data.holdings;
      onData(isin, { countries: data.countries, sectors: data.sectors, holdings, ter: data.ter });
    } else if (!isLoading) {
      onData(isin, null);
    }
  }, [isin, data, isLoading, onData]);

  return null;
}

function PortfolioDistribution({
  positions,
  inputMode,
  totalPortfolioValue: _totalPortfolioValue,
}: {
  positions: Position[];
  inputMode: "amount" | "percentage";
  totalPortfolioValue: number | null;
}) {
  // Only ETF positions with ISIN
  const etfPositions = useMemo(
    () => positions.filter((p) => isEtfType(p.security?.type) && p.isin?.trim()),
    [positions],
  );

  // State: { isin -> compositionData }
  const [compositionMap, setCompositionMap] = useState<
    Record<string, CompositionData | null>
  >({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [overlapVisible, setOverlapVisible] = useState(5);
  const [overlapCollapsing, setOverlapCollapsing] = useState(false);

  const handleData = useCallback(
    (isin: string, data: CompositionData | null) => {
      setCompositionMap((prev) => {
        if (prev[isin] === data) return prev;
        return { ...prev, [isin]: data };
      });
    },
    [],
  );

  const handleLoading = useCallback(
    (isin: string, loading: boolean) => {
      setLoadingMap((prev) => {
        if (prev[isin] === loading) return prev;
        return { ...prev, [isin]: loading };
      });
    },
    [],
  );

  // Compute position weights (fraction of total portfolio, for ALL positions)
  const positionWeights = useMemo(() => {
    const weights: Record<string, number> = {};
    if (inputMode === "amount") {
      const totalValue = positions.reduce((sum, p) => sum + (parseFloat(p.value) || 0), 0);
      if (totalValue > 0) {
        for (const p of positions) {
          const key = p.isin || `__ticker_${p.ticker}`;
          weights[key] = (parseFloat(p.value) || 0) / totalValue;
        }
      }
    } else {
      // percentage mode: value is already a percentage
      const totalPct = positions.reduce((sum, p) => sum + (parseFloat(p.value) || 0), 0);
      for (const p of positions) {
        const key = p.isin || `__ticker_${p.ticker}`;
        const pct = parseFloat(p.value) || 0;
        weights[key] = totalPct > 0 ? pct / totalPct : 0;
      }
    }
    return weights;
  }, [positions, inputMode]);

  // Compute ETF-only position weights (for country/sector aggregation, excluding stocks)
  const etfPositionWeights = useMemo(() => {
    const weights: Record<string, number> = {};
    if (inputMode === "amount") {
      const totalValue = etfPositions.reduce((sum, p) => sum + (parseFloat(p.value) || 0), 0);
      if (totalValue > 0) {
        for (const p of etfPositions) {
          weights[p.isin] = (parseFloat(p.value) || 0) / totalValue;
        }
      }
    } else {
      const totalPct = etfPositions.reduce((sum, p) => sum + (parseFloat(p.value) || 0), 0);
      for (const p of etfPositions) {
        const pct = parseFloat(p.value) || 0;
        weights[p.isin] = totalPct > 0 ? pct / totalPct : 0;
      }
    }
    return weights;
  }, [etfPositions, inputMode]);

  // Check loading state
  const anyLoading = etfPositions.some((p) => loadingMap[p.isin] !== false);
  const allLoaded = etfPositions.every((p) => loadingMap[p.isin] === false);

  // Holdings show more/less state
  const HOLDINGS_DEFAULT_VISIBLE = 20;
  const [holdingsVisible, setHoldingsVisible] = useState(HOLDINGS_DEFAULT_VISIBLE);
  const [holdingsCollapsing, setHoldingsCollapsing] = useState(false);

  // Determine how many extra holdings to reveal per click based on screen width
  const [holdingsIncrement, setHoldingsIncrement] = useState(5);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w >= 1280) setHoldingsIncrement(25);
      else if (w >= 1024) setHoldingsIncrement(15);
      else if (w >= 768) setHoldingsIncrement(10);
      else setHoldingsIncrement(5);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);



  // Aggregate weighted data
  const { aggregatedCountries, aggregatedSectors, aggregatedHoldings } = useMemo(() => {
    const countryMap: Record<string, number> = {};
    const sectorMap: Record<string, number> = {};
    // Holdings use normalized keys to merge duplicates like "APPLE INC" / "Apple Inc"
    const holdingsWeightMap: Record<string, number> = {};
    const holdingsDisplayMap: Record<string, string> = {};

    /** Add a holding entry, merging by normalized name */
    const addHolding = (rawName: string, weightContribution: number) => {
      const displayName = rawName === "Others" ? "Other" : rawName;
      const key = displayName === "Other" ? "Other" : normalizeHoldingName(displayName);
      holdingsWeightMap[key] = (holdingsWeightMap[key] ?? 0) + weightContribution;
      if (holdingsDisplayMap[key]) {
        holdingsDisplayMap[key] = pickDisplayName(holdingsDisplayMap[key] ?? "", displayName);
      } else {
        holdingsDisplayMap[key] = displayName;
      }
    };

    for (const pos of etfPositions) {
      const comp = compositionMap[pos.isin];
      if (!comp) continue;

      // Countries & sectors use ETF-only weights (exclude stocks from allocation)
      const etfWeight = etfPositionWeights[pos.isin] ?? 0;
      if (etfWeight > 0) {
        for (const c of comp.countries) {
          const cName = c.name === "Others" ? "Other" : c.name;
          countryMap[cName] = (countryMap[cName] ?? 0) + (c.weight * etfWeight) / 100;
        }
        for (const s of comp.sectors) {
          const sName = s.name === "Others" ? "Other" : s.name;
          sectorMap[sName] = (sectorMap[sName] ?? 0) + (s.weight * etfWeight) / 100;
        }
      }

      // Holdings use full portfolio weights (include stocks)
      const weight = positionWeights[pos.isin] ?? 0;
      if (weight > 0) {
        for (const h of comp.holdings) {
          addHolding(h.name, (h.weight * weight) / 100);
        }
      }
    }

    // Include non-ETF (stock) positions as direct holdings
    for (const pos of positions) {
      if (isEtfType(pos.security?.type)) continue;
      const name = pos.name || pos.ticker;
      if (!name) continue;
      const key = pos.isin || `__ticker_${pos.ticker}`;
      const weight = positionWeights[key] ?? 0;
      if (weight === 0) continue;
      addHolding(name, weight);
    }

    // Convert to sorted arrays, multiply by 100 to get back to percentage, group < 2% into Other
    const toSortedList = (map: Record<string, number>, minWeight = 2) => {
      const entries = Object.entries(map)
        .map(([name, w]) => ({ name, weight: w * 100 }))
        .sort((a, b) => b.weight - a.weight);

      const main: Array<{ name: string; weight: number }> = [];
      let othersWeight = 0;
      for (const e of entries) {
        if (e.weight < minWeight) {
          othersWeight += e.weight;
        } else {
          main.push(e);
        }
      }
      if (othersWeight > 0) {
        main.push({ name: "Other", weight: othersWeight });
      }
      return main;
    };

    // For holdings, don't group into Other at aggregation level — keep all for show more/less
    // Use display names from holdingsDisplayMap instead of normalized keys
    const holdingsEntries = Object.entries(holdingsWeightMap)
      .map(([key, w]) => ({ name: holdingsDisplayMap[key] ?? key, weight: w * 100 }))
      .sort((a, b) => b.weight - a.weight);

    return {
      aggregatedCountries: limitWithOthers(toSortedList(countryMap)),
      aggregatedSectors: limitWithOthers(toSortedList(sectorMap)),
      aggregatedHoldings: holdingsEntries,
    };
  }, [etfPositions, positions, compositionMap, positionWeights, etfPositionWeights]);

  // Compute ETF overlap — holdings appearing in 2+ ETFs
  const overlapData = useMemo(() => {
    const holdingEtfMap: Record<string, { displayName: string; etfWeights: Array<{ label: string; weight: number }>; totalWeight: number }> = {};

    for (const pos of etfPositions) {
      const comp = compositionMap[pos.isin];
      if (!comp) continue;
      const etfLabel = pos.name || pos.ticker || pos.isin;

      for (const h of comp.holdings) {
        const displayName = h.name === "Others" ? "Other" : h.name;
        if (displayName === "Other") continue;
        const key = normalizeHoldingName(displayName);

        holdingEtfMap[key] ??= { displayName, etfWeights: [], totalWeight: 0 };
        const entry = holdingEtfMap[key];
        if (!entry) continue;
        entry.displayName = pickDisplayName(entry.displayName, displayName);
        const existing = entry.etfWeights.find(e => e.label === etfLabel);
        if (!existing) {
          entry.etfWeights.push({ label: etfLabel, weight: h.weight });
        }
        entry.totalWeight += h.weight;
      }
    }

    const totalEtfCount = etfPositions.filter(p => compositionMap[p.isin]).length;

    return Object.values(holdingEtfMap)
      .filter((e) => e.etfWeights.length >= 2)
      .map((e) => ({
        ...e,
        etfWeights: [...e.etfWeights].sort((a, b) => b.weight - a.weight),
        overlapPct: totalEtfCount > 0 ? (e.etfWeights.length / totalEtfCount) * 100 : 0,
      }))
      .sort((a, b) => b.overlapPct - a.overlapPct || b.totalWeight - a.totalWeight);
  }, [etfPositions, compositionMap]);

  const totalEtfCountWithData = useMemo(
    () => etfPositions.filter((p) => compositionMap[p.isin]).length,
    [etfPositions, compositionMap],
  );

  if (etfPositions.length === 0 && aggregatedHoldings.length === 0) return null;

  const hasData = aggregatedCountries.length > 0 || aggregatedSectors.length > 0 || aggregatedHoldings.length > 0;

  return (
    <>
      {/* Hidden fetcher components — one per ETF */}
      {etfPositions.map((p) => (
        <EtfDataFetcher
          key={p.isin}
          isin={p.isin}
          onData={handleData}
          onLoading={handleLoading}
        />
      ))}

      <div className="mt-6">
        <h2 className="mb-3 text-base font-bold text-white">Overall Allocation</h2>

        {/* Loading state */}
        {anyLoading && !hasData && (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/5 bg-gray-900/60 px-6 py-12 backdrop-blur-sm">
            <Loader2Icon className="h-5 w-5 animate-spin text-sky-400" />
            <span className="text-sm text-gray-400">Loading portfolio composition data…</span>
          </div>
        )}

        {/* Loaded but no data */}
        {allLoaded && !hasData && (
          <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-gray-900/60 px-6 py-8 backdrop-blur-sm">
            <AlertCircleIcon className="h-4 w-4 shrink-0 text-gray-500" />
            <p className="text-sm text-gray-400">
              No country or sector composition data available for the ETFs in this portfolio.
            </p>
          </div>
        )}

        {/* Holdings — aggregate pie chart of all stock holdings across ETFs */}
        {aggregatedHoldings.length > 0 && (() => {
          // For the pie chart: top 20 + "Other"
          const pieData = (() => {
            if (aggregatedHoldings.length <= HOLDINGS_DEFAULT_VISIBLE) return aggregatedHoldings;
            const top = aggregatedHoldings.slice(0, HOLDINGS_DEFAULT_VISIBLE);
            const restWeight = aggregatedHoldings.slice(HOLDINGS_DEFAULT_VISIBLE).reduce((s, i) => s + i.weight, 0);
            return [...top, { name: "Other", weight: parseFloat(restWeight.toFixed(2)) }];
          })();
          const pieGrouped = groupSmallEntries(pieData, HOLDINGS_DEFAULT_VISIBLE + 1);
          const palette = PIE_PALETTES.emerald;
          const canShowMore = aggregatedHoldings.length > holdingsVisible;
          const canShowLess = holdingsVisible > HOLDINGS_DEFAULT_VISIBLE;
          const visibleItems = aggregatedHoldings.slice(0, holdingsVisible);
          const maxWeight = aggregatedHoldings.length > 0 ? Math.max(...aggregatedHoldings.map((i) => i.weight)) : 0;
          return (
            <div className="mb-6 overflow-hidden rounded-2xl border border-white/5 bg-gray-900/60 backdrop-blur-sm">
              <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
                <h3 className="text-sm font-bold text-white">Holdings</h3>
                <span className="ml-auto rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium text-gray-400">
                  {aggregatedHoldings.length} {aggregatedHoldings.length === 1 ? "item" : "items"}
                </span>
              </div>
              <div>
                {/* Pie chart */}
                <div className="flex items-center justify-center border-b border-white/5 py-2">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieGrouped}
                        dataKey="weight"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={80}
                        paddingAngle={2}
                        strokeWidth={0}
                      >
                        {pieGrouped.map((entry, idx) => (
                          <Cell
                            key={`${entry.name}-${idx}`}
                            fill={
                              entry.name === "Other"
                                ? OTHERS_COLOR
                                : palette[idx % palette.length]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<PortfolioPieTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Compact grid of holdings */}
                <div className="overflow-hidden p-3 transition-[max-height] duration-300 ease-in-out" style={{ maxHeight: `${visibleItems.length * 42 + 24}px` }}>
                  <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2 lg:grid-cols-3">
                    {visibleItems.map((item, i) => {
                      const barPct = maxWeight > 0 ? (item.weight / maxWeight) * 100 : 0;
                      const color = palette[i % palette.length] ?? OTHERS_COLOR;
                      const isCollapsing = holdingsCollapsing && i >= HOLDINGS_DEFAULT_VISIBLE;
                      return (
                        <div
                          key={i}
                          className={`${isCollapsing ? 'animate-fade-slide-out' : 'animate-fade-slide-in'} relative overflow-hidden rounded-lg bg-white/[0.03] px-2 py-1.5`}
                          style={{ animationDelay: `${isCollapsing ? (i - HOLDINGS_DEFAULT_VISIBLE) * 15 : i * 15}ms` }}
                        >
                          {/* tiny progress bar background */}
                          <div
                            className="pointer-events-none absolute inset-y-0 left-0 rounded-lg opacity-[0.07]"
                            style={{ width: `${barPct}%`, backgroundColor: color }}
                          />
                          <div className="relative flex items-center gap-2">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span className="min-w-0 flex-1 truncate text-xs text-gray-300">
                              {item.name}
                            </span>
                            <span className="shrink-0 text-xs font-medium tabular-nums text-gray-400">
                              {item.weight.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Show more / Show less toggle */}
                {(canShowMore || canShowLess) && (
                  <div className="border-t border-white/5 px-4 py-2 text-center flex items-center justify-center gap-2">
                    {canShowLess && (
                      <button
                        onClick={() => {
                          setHoldingsCollapsing(true);
                          setTimeout(() => {
                            setHoldingsVisible(HOLDINGS_DEFAULT_VISIBLE);
                            setHoldingsCollapsing(false);
                          }, 150);
                        }}
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20"
                      >
                        Show less
                      </button>
                    )}
                    {canShowMore && (
                      <button
                        onClick={() => setHoldingsVisible((v) => v + holdingsIncrement)}
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20"
                      >
                        Show more ({aggregatedHoldings.length - holdingsVisible} remaining)
                      </button>
                    )}
                  </div>
                )}
              </div>
              {anyLoading && (
                <div className="border-t border-white/5 px-4 py-2">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Loader2Icon className="h-3 w-3 animate-spin" />
                    Still loading some ETFs…
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Charts — matching ETF detail page style */}
        {hasData && (
          <div className="mt-4 grid gap-6 md:grid-cols-2">

            {/* Countries */}
            {aggregatedCountries.length > 0 && (() => {
              const grouped = groupSmallEntries(aggregatedCountries, 10);
              const palette = PIE_PALETTES.sky;
              const maxWeight = Math.max(...grouped.map((i) => i.weight));
              return (
                <div className="overflow-hidden rounded-2xl border border-white/5 bg-gray-900/60 backdrop-blur-sm">
                  <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
                    <h3 className="text-sm font-bold text-white">Countries</h3>
                    <span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-gray-400">
                      {grouped.length} {grouped.length === 1 ? "item" : "items"}
                    </span>
                    <div className="group relative">
                      <InfoIcon className="h-3.5 w-3.5 text-gray-500 cursor-help" />
                      <div className="pointer-events-none absolute right-0 top-full z-50 mt-1 w-64 rounded-lg bg-gray-800 px-3 py-2 text-xs text-gray-200 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                        Country and sector charts are based on ETF holdings only. Individual stocks are excluded.
                      </div>
                    </div>
                  </div>
                  <div className="border-b border-white/5">
                    <div className="flex items-center justify-center py-2">
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={grouped}
                            dataKey="weight"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={80}
                            paddingAngle={2}
                            strokeWidth={0}
                          >
                            {grouped.map((entry, idx) => (
                              <Cell
                                key={`${entry.name}-${idx}`}
                                fill={
                                  entry.name === "Other"
                                    ? OTHERS_COLOR
                                    : palette[idx % palette.length]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<PortfolioPieTooltipContent />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="overflow-hidden p-3">
                    <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-1.5">
                      {grouped.map((item, i) => {
                        const barPct = maxWeight > 0 ? (item.weight / maxWeight) * 100 : 0;
                        const color = item.name === "Other" ? OTHERS_COLOR : palette[i % palette.length];
                        return (
                          <div
                            key={i}
                            className="animate-fade-slide-in relative overflow-hidden rounded-lg bg-white/[0.03] px-2 py-1.5"
                            style={{ animationDelay: `${i * 15}ms` }}
                          >
                            <div
                              className="pointer-events-none absolute inset-y-0 left-0 rounded-lg opacity-[0.07]"
                              style={{ width: `${barPct}%`, backgroundColor: color }}
                            />
                            <div className="relative flex items-center gap-2">
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                              <span className="min-w-0 flex-1 truncate text-xs text-gray-300">
                                {item.name}
                              </span>
                              <span className="shrink-0 text-xs font-medium tabular-nums text-gray-400">
                                {item.weight.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {anyLoading && (
                    <div className="border-t border-white/5 px-4 py-2">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Loader2Icon className="h-3 w-3 animate-spin" />
                        Still loading some ETFs…
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Sectors */}
            {aggregatedSectors.length > 0 && (() => {
              const grouped = groupSmallEntries(aggregatedSectors, 10);
              const palette = PIE_PALETTES.violet;
              const maxWeight = Math.max(...grouped.map((i) => i.weight));
              return (
                <div className="overflow-hidden rounded-2xl border border-white/5 bg-gray-900/60 backdrop-blur-sm">
                  <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
                    <h3 className="text-sm font-bold text-white">Sectors</h3>
                    <span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-gray-400">
                      {grouped.length} {grouped.length === 1 ? "item" : "items"}
                    </span>
                    <div className="group relative">
                      <InfoIcon className="h-3.5 w-3.5 text-gray-500 cursor-help" />
                      <div className="pointer-events-none absolute right-0 top-full z-50 mt-1 w-64 rounded-lg bg-gray-800 px-3 py-2 text-xs text-gray-200 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                        Country and sector charts are based on ETF holdings only. Individual stocks are excluded.
                      </div>
                    </div>
                  </div>
                  <div className="border-b border-white/5">
                    <div className="flex items-center justify-center py-2">
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={grouped}
                            dataKey="weight"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={80}
                            paddingAngle={2}
                            strokeWidth={0}
                          >
                            {grouped.map((entry, idx) => (
                              <Cell
                                key={`${entry.name}-${idx}`}
                                fill={
                                  entry.name === "Other"
                                    ? OTHERS_COLOR
                                    : palette[idx % palette.length]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<PortfolioPieTooltipContent />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="overflow-hidden p-3">
                    <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-1.5">
                      {grouped.map((item, i) => {
                        const barPct = maxWeight > 0 ? (item.weight / maxWeight) * 100 : 0;
                        const color = item.name === "Other" ? OTHERS_COLOR : palette[i % palette.length];
                        return (
                          <div
                            key={i}
                            className="animate-fade-slide-in relative overflow-hidden rounded-lg bg-white/[0.03] px-2 py-1.5"
                            style={{ animationDelay: `${i * 15}ms` }}
                          >
                            <div
                              className="pointer-events-none absolute inset-y-0 left-0 rounded-lg opacity-[0.07]"
                              style={{ width: `${barPct}%`, backgroundColor: color }}
                            />
                            <div className="relative flex items-center gap-2">
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                              <span className="min-w-0 flex-1 truncate text-xs text-gray-300">
                                {item.name}
                              </span>
                              <span className="shrink-0 text-xs font-medium tabular-nums text-gray-400">
                                {item.weight.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {anyLoading && (
                    <div className="border-t border-white/5 px-4 py-2">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Loader2Icon className="h-3 w-3 animate-spin" />
                        Still loading some ETFs…
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      {/* TER Section — expense ratios for all positions */}
      {allLoaded && hasData && (() => {
        // Parse TER string to number (e.g., "0.20% p.a." → 0.20)
        const parseTer = (terStr: string | undefined): number => {
          if (!terStr) return 0;
          const match = /([\d.]+)\s*%/.exec(terStr);
          return match ? parseFloat(match[1] ?? "0") : 0;
        };

        // Build TER list for ETF positions only (stocks have 0% TER)
        const terItems: Array<{ name: string; ticker?: string; ter: number; terStr: string; weight: number }> = [];

        for (const pos of positions) {
          const isEtf = isEtfType(pos.security?.type);
          if (!isEtf || !pos.isin) continue;

          const key = pos.isin;
          const weight = positionWeights[key] ?? 0;
          const name = pos.name || pos.ticker || "Unknown";
          const comp = compositionMap[pos.isin];
          const terNum = parseTer(comp?.ter);
          terItems.push({
            name,
            ticker: pos.ticker,
            ter: terNum,
            terStr: comp?.ter ? `${terNum.toFixed(2)}%` : "N/A",
            weight,
          });
        }

        // Weighted TER
        const weightedTer = terItems.reduce((sum, item) => sum + item.weight * item.ter, 0);

        return (
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/5 bg-gray-900/60 backdrop-blur-sm">
            <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
              <PercentIcon className="h-4 w-4 text-teal-400" />
              <h3 className="text-sm font-bold text-white">Total Expense Ratio (TER)</h3>
              <span className="ml-auto rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-semibold text-teal-400">
                Weighted: {weightedTer.toFixed(2)}% p.a.
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-2 lg:grid-cols-3">
              {terItems.map((item, i) => (
                <div
                  key={i}
                  className="animate-fade-slide-in rounded-lg border border-white/5 bg-gray-800/50 px-3 py-2 transition-colors hover:bg-white/[0.05]"
                  style={{ animationDelay: `${i * 15}ms` }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 truncate text-xs font-medium text-gray-300">{item.name}</span>
                      {item.ticker && <span className="shrink-0 text-[11px] text-gray-500">{item.ticker}</span>}
                    </div>
                    <span className={`shrink-0 text-xs font-semibold tabular-nums ${
                      item.ter > 0 ? "text-teal-400" : "text-gray-500"
                    }`}>
                      {item.terStr}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {anyLoading && (
              <div className="border-t border-white/5 px-4 py-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Loader2Icon className="h-3 w-3 animate-spin" />
                  Still loading some ETFs…
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ETF Overlap — stocks appearing in multiple ETFs */}
      {overlapData.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/5 bg-gray-900/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
            <h3 className="text-sm font-bold text-white">ETF Overlap</h3>
            <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
              Top {Math.min(overlapVisible, overlapData.length)} of {overlapData.length} stocks in 2+ ETFs
            </span>
          </div>
          <div className="overflow-hidden transition-[max-height] duration-300 ease-in-out" style={{ maxHeight: `${Math.min(overlapVisible, overlapData.length) * 86 + 24}px` }}>
          <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-2 lg:grid-cols-3">
            {overlapData.slice(0, overlapVisible).map((item, i) => {
              const isCollapsing = overlapCollapsing && i >= 5;
              return (
              <div key={i} className={`${isCollapsing ? 'animate-fade-slide-out' : 'animate-fade-slide-in'} rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 transition-colors hover:bg-white/[0.05]`} style={{ animationDelay: `${isCollapsing ? (i - 5) * 15 : i * 15}ms` }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs font-medium text-gray-300">{item.displayName}</span>
                  <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
                    {item.overlapPct.toFixed(0)}%
                    <span className="font-normal text-amber-400/50"> ({item.etfWeights.length}/{totalEtfCountWithData})</span>
                  </span>
                </div>
                <div className="mt-1.5 space-y-0.5">
                  {item.etfWeights.map((ew, j) => (
                    <div key={j} className="flex items-center gap-1.5">
                      <span className="min-w-0 flex-1 truncate text-[11px] text-gray-500">{ew.label}</span>
                      <span className="shrink-0 text-[11px] font-semibold tabular-nums text-amber-400">{ew.weight.toFixed(2)}%</span>
                      <div className="w-10 shrink-0">
                        <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full bg-amber-500/40"
                            style={{ width: `${Math.min(ew.weight * 3, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              );
            })}
          </div>
          </div>
          {(overlapVisible > 5 || overlapVisible < overlapData.length) && (
            <div className="border-t border-white/5 px-4 py-2 text-center flex items-center justify-center gap-2">
              {overlapVisible > 5 && (
                <button
                  onClick={() => {
                    setOverlapCollapsing(true);
                    setTimeout(() => {
                      setOverlapVisible(5);
                      setOverlapCollapsing(false);
                    }, 150);
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 transition-colors hover:bg-amber-500/20"
                >
                  Show less
                </button>
              )}
              {overlapVisible < overlapData.length && (
                <button
                  onClick={() => setOverlapVisible((v) => v + 5)}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 transition-colors hover:bg-amber-500/20"
                >
                  Show more
                </button>
              )}
            </div>
          )}
          {anyLoading && (
            <div className="border-t border-white/5 px-4 py-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Loader2Icon className="h-3 w-3 animate-spin" />
                Still loading some ETFs…
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ETF ROW EXPANSION — inline composition inside the positions table
   ═══════════════════════════════════════════════════════════════════════════════ */
function EtfRowExpansion({
  position,
  expanded,
  colCount,
}: {
  position: Position;
  expanded: boolean;
  colCount: number;
}) {
  const isin = position.isin;
  const hasIsin = !!isin && isin.trim().length > 0;

  const { data, isLoading, isError, error } =
    api.securities.getEtfComposition.useQuery(
      { isin: isin || "__placeholder__" },
      { enabled: expanded && hasIsin, staleTime: 24 * 60 * 60 * 1000, retry: 1 },
    );

  return (
    <tr>
      <td colSpan={colCount} className="p-0 border-none">
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
            expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className={`border-t border-white/5 bg-gray-950/40 px-6 pb-4 pt-3 ${expanded ? "" : "invisible"}`}>
              {/* No ISIN available */}
              {!hasIsin && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                  <AlertCircleIcon className="h-4 w-4 shrink-0 text-amber-400" />
                  <p className="text-sm text-amber-300">
                    No ISIN available for this ETF — composition data cannot be fetched.
                    You can add the ISIN manually in the portfolio editor to enable this feature.
                  </p>
                </div>
              )}

              {/* Loading state */}
              {hasIsin && isLoading && (
                <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  Loading composition…
                </div>
              )}

              {/* Error state */}
              {hasIsin && isError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
                  <AlertCircleIcon className="h-4 w-4 shrink-0 text-red-400" />
                  <p className="text-sm text-red-300">
                    Failed to load ETF composition data.
                    {error?.message ? ` (${error.message})` : " Please try again later."}
                  </p>
                </div>
              )}

              {hasIsin && data && !isLoading && (
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Top Holdings */}
                  {data.holdings.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Top {Math.min(data.holdings.length, 10)} Holdings
                      </h4>
                      <div className="space-y-1">
                        {limitWithOthers(data.holdings).map((h, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2">
                                <span className="min-w-0 flex-1 truncate text-xs text-gray-300">
                                  {h.name}
                                </span>
                                <span className="ml-2 shrink-0 text-xs font-semibold tabular-nums text-emerald-400">
                                  {h.weight.toFixed(2)}%
                                </span>
                              </div>
                              <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-white/5">
                                <div
                                  className="h-full rounded-full bg-emerald-500/40"
                                  style={{ width: `${Math.min(h.weight * 2, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Countries */}
                  {data.countries.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Countries
                      </h4>
                      <div className="space-y-1">
                        {limitWithOthers(data.countries, 9).map((c, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2">
                                <span className="min-w-0 flex-1 truncate text-xs text-gray-300">
                                  {c.name}
                                </span>
                                <span className="ml-2 shrink-0 text-xs font-semibold tabular-nums text-sky-400">
                                  {c.weight.toFixed(2)}%
                                </span>
                              </div>
                              <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-white/5">
                                <div
                                  className="h-full rounded-full bg-sky-500/40"
                                  style={{ width: `${Math.min(c.weight, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sectors */}
                  {data.sectors.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Sectors
                      </h4>
                      <div className="space-y-1">
                        {limitWithOthers(data.sectors, 9).map((s, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2">
                                <span className="min-w-0 flex-1 truncate text-xs text-gray-300">
                                  {s.name}
                                </span>
                                <span className="ml-2 shrink-0 text-xs font-semibold tabular-nums text-violet-400">
                                  {s.weight.toFixed(2)}%
                                </span>
                              </div>
                              <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-white/5">
                                <div
                                  className="h-full rounded-full bg-violet-500/40"
                                  style={{ width: `${Math.min(s.weight, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {data.holdings.length === 0 &&
                    data.countries.length === 0 &&
                    data.sectors.length === 0 && (
                      <div className="col-span-3 flex items-center gap-2 rounded-lg border border-sky-500/20 bg-sky-500/5 px-4 py-3">
                        <AlertCircleIcon className="h-4 w-4 shrink-0 text-sky-400" />
                        <p className="text-sm text-sky-300">
                          {!data.hasHoldingsSection ? (
                            <>
                              This product{data.assetClass ? ` (${data.assetClass})` : ""} does not have equity holdings data.
                              Composition breakdowns are only available for equity and multi-asset ETFs.
                            </>
                          ) : (
                            <>
                              No composition data found for ISIN <span className="font-mono">{isin}</span>.
                              The ETF may not be listed on JustETF, or the page structure may have changed.
                            </>
                          )}
                        </p>
                      </div>
                    )}

                  {/* View Full Details */}
                  {(data.holdings.length > 0 ||
                    data.countries.length > 0 ||
                    data.sectors.length > 0) && (
                    <div className="col-span-full mt-2 flex justify-start sm:justify-end">
                      <Link
                        href={`/etf/${encodeURIComponent(isin ?? "")}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-sm font-medium text-emerald-400 transition hover:border-emerald-500/40 hover:bg-emerald-500/10"
                      >
                        View Full Details
                        <ChevronRightIcon className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PORTFOLIO OVERVIEW PAGE
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function PortfolioOverviewPage() {
  const router = useRouter();
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState<"value" | "percentage">("value");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  /* ─── Row expand toggle handler ─── */
  const toggleRow = useCallback((id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  /* ─── Sort toggle handler ─── */
  const handleSort = (column: "value" | "percentage") => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  /* ─── Load portfolio from localStorage ─── */
  useEffect(() => {
    const data = loadPortfolio();
    if (data) {
      setPortfolio(data);
    }
    setLoading(false);
  }, []);

  /* ─── Sort positions by selected column & direction ─── */
  const sortedPositions = useMemo(() => {
    if (!portfolio) return [];
    return [...portfolio.positions].sort((a, b) => {
      let aVal: number;
      let bVal: number;

      if (sortColumn === "percentage" && portfolio.inputMode === "amount") {
        const t = portfolio.positions.reduce(
          (sum, p) => sum + (parseFloat(p.value) || 0),
          0,
        );
        aVal = t > 0 ? ((parseFloat(a.value) || 0) / t) * 100 : 0;
        bVal = t > 0 ? ((parseFloat(b.value) || 0) / t) * 100 : 0;
      } else {
        aVal = parseFloat(a.value) || 0;
        bVal = parseFloat(b.value) || 0;
      }

      return sortDirection === "desc" ? bVal - aVal : aVal - bVal;
    });
  }, [portfolio, sortColumn, sortDirection]);

  /* ─── Derived values ─── */
  const currencySymbol =
    portfolio?.inputMode === "amount"
      ? (CURRENCY_SYMBOLS[portfolio.currency] ?? portfolio.currency)
      : null;

  /* Total portfolio value for percentage mode */
  const totalPortfolioValue = useMemo(() => {
    if (portfolio?.inputMode !== "percentage") return null;
    const val = parseFloat(portfolio.totalPortfolioValue ?? "");
    if (isNaN(val) || val <= 0) return null;
    return val;
  }, [portfolio]);

  const percentageCurrencySymbol =
    portfolio?.inputMode === "percentage" && totalPortfolioValue
      ? (CURRENCY_SYMBOLS[portfolio.currency ?? "USD"] ?? "$")
      : null;

  const total = useMemo(() => {
    if (!portfolio) return 0;
    return portfolio.positions.reduce(
      (sum, p) => sum + (parseFloat(p.value) || 0),
      0,
    );
  }, [portfolio]);

  /* ─── Format helpers ─── */
  const formatValue = (raw: string) => {
    const num = parseFloat(raw);
    if (isNaN(num)) return raw;
    if (portfolio?.inputMode === "amount") {
      return num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return `${num.toFixed(1)}%`;
  };

  /** Format the computed amount for a percentage position given a total portfolio value */
  const formatComputedAmount = (raw: string) => {
    if (!totalPortfolioValue) return null;
    const pct = parseFloat(raw);
    if (isNaN(pct)) return null;
    const amount = totalPortfolioValue * pct / 100;
    return amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-400">
        <div className="animate-pulse text-sm">Loading portfolio…</div>
      </main>
    );
  }

  /* ─── No portfolio found ─── */
  if (!portfolio) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-950 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-yellow-500/20 bg-yellow-500/10">
          <AlertCircleIcon className="h-7 w-7 text-yellow-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">No portfolio found</h1>
          <p className="mt-2 text-sm text-gray-400">
            It looks like you haven&apos;t entered any positions yet.
          </p>
        </div>
        <button
          onClick={() => router.push("/portfolio")}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-gray-950 transition hover:bg-emerald-400"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Build Portfolio
        </button>
      </main>
    );
  }

  /* ─── Column count for expanded rows ─── */
  const colCount = 6 + (portfolio.inputMode === "amount" ? 1 : 0) + (totalPortfolioValue ? 1 : 0);

  /* ─── Main overview ─── */
  return (
    <main className="min-h-screen bg-gray-950 font-sans text-gray-100 overflow-x-hidden">
      {/* ─── Compact Header ─── */}
      <section className="border-b border-white/5 bg-gray-900/40">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold tracking-tight text-white">
              See<span className="text-emerald-400">TF</span>
            </Link>
            <div className="h-5 w-px bg-white/10" />
            <h1 className="text-lg font-bold text-white sm:text-xl">
              Portfolio Overview
            </h1>
          </div>
          <button
            onClick={() => router.push("/portfolio?edit=true")}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-gray-900 px-3 py-1.5 text-sm font-medium text-gray-300 transition hover:border-emerald-500/30 hover:text-emerald-400"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Edit Portfolio
          </button>
        </div>
      </section>

      {/* ─── Table ─── */}
      <section className="pb-24 pt-6">
        <div className="mx-auto max-w-5xl px-6">
          {/* Summary stats */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Positions", value: `${sortedPositions.length}` },
              {
                label: "Total Value",
                value: portfolio.inputMode === "amount"
                  ? `${currencySymbol ?? ""}${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : totalPortfolioValue && percentageCurrencySymbol
                    ? `${percentageCurrencySymbol}${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : `${total.toFixed(1)}%`,
                positive: true,
              },
              {
                label: "ETFs",
                value: `${sortedPositions.filter((p) => isEtfType(p.security?.type)).length}`,
              },
              {
                label: "Stocks",
                value: `${sortedPositions.filter((p) => p.security?.type?.toLowerCase() === "stock").length}`,
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-white/5 bg-gray-900/60 px-5 py-4 backdrop-blur-sm"
              >
                <p className="text-xs uppercase tracking-wider text-gray-500">
                  {s.label}
                </p>
                <p
                  className={`mt-1 text-lg font-semibold ${
                    s.positive ? "text-emerald-400" : "text-white"
                  }`}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Table container */}
          <div className="overflow-hidden rounded-2xl border border-white/5 bg-gray-900/60 backdrop-blur-sm">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-gray-900/80">
                    <th className="whitespace-nowrap px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      #
                    </th>
                    <th className="whitespace-nowrap px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Name
                    </th>
                    <th className="whitespace-nowrap px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Ticker
                    </th>
                    <th className="whitespace-nowrap px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      ISIN
                    </th>
                    <th className="whitespace-nowrap px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Type
                    </th>
                    <th className="whitespace-nowrap px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      <button
                        onClick={() => handleSort("value")}
                        className="ml-auto inline-flex items-center gap-1.5 cursor-pointer rounded px-1 py-0.5 transition-colors hover:text-gray-300 hover:bg-white/5"
                      >
                        {portfolio.inputMode === "amount"
                          ? `Value (${portfolio.currency})`
                          : "Allocation"}
                        {sortColumn === "value" ? (
                          sortDirection === "desc" ? (
                            <ChevronDownIcon className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <ChevronUpIcon className="h-3.5 w-3.5 text-emerald-400" />
                          )
                        ) : (
                          <ArrowUpDownIcon className="h-3.5 w-3.5 text-gray-600" />
                        )}
                      </button>
                    </th>
                    {totalPortfolioValue && (
                      <th className="whitespace-nowrap px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                        <button
                          onClick={() => handleSort("value")}
                          className="ml-auto inline-flex items-center gap-1.5 cursor-pointer rounded px-1 py-0.5 transition-colors hover:text-gray-300 hover:bg-white/5"
                        >
                          Value ({portfolio.currency ?? "USD"})
                          {sortColumn === "value" ? (
                            sortDirection === "desc" ? (
                              <ChevronDownIcon className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <ChevronUpIcon className="h-3.5 w-3.5 text-emerald-400" />
                            )
                          ) : (
                            <ArrowUpDownIcon className="h-3.5 w-3.5 text-gray-600" />
                          )}
                        </button>
                      </th>
                    )}
                    {portfolio.inputMode === "amount" && (
                    <th className="whitespace-nowrap px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                        <button
                          onClick={() => handleSort("percentage")}
                          className="ml-auto inline-flex items-center gap-1.5 cursor-pointer rounded px-1 py-0.5 transition-colors hover:text-gray-300 hover:bg-white/5"
                        >
                          %
                          {sortColumn === "percentage" ? (
                            sortDirection === "desc" ? (
                              <ChevronDownIcon className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <ChevronUpIcon className="h-3.5 w-3.5 text-emerald-400" />
                            )
                          ) : (
                            <ArrowUpDownIcon className="h-3.5 w-3.5 text-gray-600" />
                          )}
                        </button>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {sortedPositions.map((pos, idx) => {
                    const isEtf = isEtfType(pos.security?.type);
                    const isExpanded = expandedRows.has(pos.id);
                    return (
                      <Fragment key={pos.id}>
                        <tr
                          className={`transition-colors hover:bg-white/[0.02] ${isEtf ? "cursor-pointer" : ""}`}
                          onClick={isEtf ? () => toggleRow(pos.id) : undefined}
                        >
                          {/* Row number */}
                          <td className="whitespace-nowrap px-5 py-4 text-gray-500 font-medium">
                            <div className="flex items-center gap-1.5">
                              {isEtf && (
                                <ChevronRightIcon
                                  className={`h-3.5 w-3.5 shrink-0 text-gray-500 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                                />
                              )}
                              {idx + 1}
                            </div>
                          </td>

                      {/* Name */}
                      <td className="px-5 py-4 font-medium text-white">
                        <span className="line-clamp-1">
                          {pos.name || "—"}
                        </span>
                      </td>

                      {/* Ticker */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="inline-flex items-center rounded-md bg-white/5 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                          {pos.ticker || "—"}
                        </span>
                      </td>

                      {/* ISIN */}
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-gray-400">
                        {pos.isin || "—"}
                      </td>

                      {/* Type */}
                      <td className="whitespace-nowrap px-5 py-4">
                        {pos.security?.type ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              pos.security.type === "etf"
                                ? "bg-sky-500/10 text-sky-400"
                                : "bg-violet-500/10 text-violet-400"
                            }`}
                          >
                            {pos.security.type === "etf" ? "ETF" : "Stock"}
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>

                      {/* Value */}
                      <td className="whitespace-nowrap px-5 py-4 text-right font-semibold tabular-nums text-white">
                        {currencySymbol && (
                          <span className="mr-1 text-gray-500">
                            {currencySymbol}
                          </span>
                        )}
                        {formatValue(pos.value)}
                      </td>

                      {/* Computed amount (percentage mode with total value) */}
                      {totalPortfolioValue && (
                        <td className="whitespace-nowrap px-5 py-4 text-right font-semibold tabular-nums text-white">
                          <span className="mr-1 text-gray-500">
                            {percentageCurrencySymbol}
                          </span>
                          {formatComputedAmount(pos.value) ?? "—"}
                        </td>
                      )}

                      {/* Percentage of portfolio */}
                      {portfolio.inputMode === "amount" && (
                        <td className="whitespace-nowrap px-5 py-4 text-right font-semibold tabular-nums text-gray-300">
                          {total > 0
                            ? `${(((parseFloat(pos.value) || 0) / total) * 100).toFixed(2)}%`
                            : "0.00%"}
                        </td>
                      )}
                        </tr>
                        {isEtf && (
                          <EtfRowExpansion
                            position={pos}
                            expanded={isExpanded}
                            colCount={colCount}
                          />
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>

                {/* ─── Footer / Total ─── */}
                <tfoot>
                  <tr className="border-t border-white/10 bg-gray-900/80">
                    <td
                      colSpan={5}
                      className="px-5 py-4 text-sm font-semibold text-gray-400"
                    >
                      Total
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-bold tabular-nums text-emerald-400">
                      {currencySymbol && (
                        <span className="mr-1 text-emerald-400/60">
                          {currencySymbol}
                        </span>
                      )}
                      {portfolio.inputMode === "amount"
                        ? total.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : `${total.toFixed(1)}%`}
                    </td>
                    {totalPortfolioValue && (
                      <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-bold tabular-nums text-emerald-400">
                        <span className="mr-1 text-emerald-400/60">
                          {percentageCurrencySymbol}
                        </span>
                        {totalPortfolioValue.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    )}
                    {portfolio.inputMode === "amount" && (
                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-bold tabular-nums text-emerald-400">
                        {total > 0 ? "100.00%" : "0.00%"}
                      </td>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ─── Portfolio Distribution (aggregated pie charts) ─── */}
          {sortedPositions.some((p) => isEtfType(p.security?.type)) && (
            <PortfolioDistribution
              positions={sortedPositions}
              inputMode={portfolio.inputMode}
              totalPortfolioValue={totalPortfolioValue}
            />
          )}


        </div>
      </section>
    </main>
  );
}
