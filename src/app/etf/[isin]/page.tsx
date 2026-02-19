"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  Loader2Icon,
  AlertCircleIcon,
  GlobeIcon,
  PieChartIcon,
  LayersIcon,
  ExternalLinkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MoreHorizontalIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CopyIcon,
  CheckIcon,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api } from "~/trpc/react";

/* ─── Color palettes for pie charts ─── */
const PIE_PALETTES = {
  emerald: [
    "#34d399", "#10b981", "#059669", "#047857", "#065f46",
    "#6ee7b7", "#a7f3d0", "#d1fae5", "#2dd4bf", "#14b8a6",
    "#0d9488", "#5eead4", "#99f6e4", "#ccfbf1", "#115e59", "#134e4a",
    "#4ade80", "#16a34a", "#15803d", "#166534", "#86efac", "#bbf7d0",
    "#22c55e", "#059212", "#0a7544", "#0c5132", "#a3e635", "#84cc16",
    "#65a30d", "#4d7c0f", "#3f6212", "#bef264",
  ],
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

/* ─── Custom tooltip for dark theme ─── */
function PieTooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { fill: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]!;
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

/* ─── Pie chart component ─── */
function SectionPieChart({
  items,
  color,
  maxSlices,
}: {
  items: { name: string; weight: number }[];
  color: "emerald" | "sky" | "violet";
  maxSlices?: number;
}) {
  const grouped = groupSmallEntries(items, maxSlices);
  const palette = PIE_PALETTES[color];

  return (
    <div className="flex items-center justify-center py-4">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={grouped}
            dataKey="weight"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={100}
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
          <Tooltip content={<PieTooltipContent />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Weighted item row with progress bar ─── */
function WeightedRow({
  name,
  weight,
  color,
  maxWeight,
}: {
  name: string;
  weight: number;
  color: "emerald" | "sky" | "violet";
  maxWeight: number;
}) {
  const barWidth = maxWeight > 0 ? (weight / maxWeight) * 100 : 0;

  const colorClasses = {
    emerald: {
      text: "text-emerald-400",
      bar: "bg-emerald-500/50",
    },
    sky: {
      text: "text-sky-400",
      bar: "bg-sky-500/50",
    },
    violet: {
      text: "text-violet-400",
      bar: "bg-violet-500/50",
    },
  };

  const c = colorClasses[color];

  return (
    <tr className="transition-colors hover:bg-white/[0.03]">
      <td className="max-w-0 truncate py-2.5 pl-4 pr-3">
        <span className="text-sm text-gray-300">{name}</span>
      </td>
      <td className="w-20 whitespace-nowrap px-3 py-2.5 text-right">
        <span className={`text-sm font-semibold tabular-nums ${c.text}`}>
          {weight.toFixed(2)}%
        </span>
      </td>
      <td className="hidden w-40 py-2.5 pl-3 pr-4 sm:table-cell">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className={`h-full rounded-full ${c.bar} transition-all duration-300`}
            style={{ width: `${Math.min(barWidth, 100)}%` }}
          />
        </div>
      </td>
    </tr>
  );
}

/* ─── Section component ─── */
function DataSection({
  title,
  icon,
  items,
  color,
  emptyText,
  showRemainder = false,
  collapsible = false,
  defaultVisibleCount = 10,
  maxPieSlices,
}: {
  title: string;
  icon: React.ReactNode;
  items: { name: string; weight: number }[];
  color: "emerald" | "sky" | "violet";
  emptyText: string;
  showRemainder?: boolean;
  collapsible?: boolean;
  defaultVisibleCount?: number;
  maxPieSlices?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const maxWeight = items.length > 0 ? Math.max(...items.map((i) => i.weight)) : 0;
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  const remainderWeight = 100 - totalWeight;
  const hasRemainder = showRemainder && remainderWeight > 0.01;

  const canCollapse = collapsible && items.length > defaultVisibleCount;
  const visibleItems = canCollapse && !expanded ? items.slice(0, defaultVisibleCount) : items;
  const showOtherRow = hasRemainder && (!canCollapse || expanded);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/5 bg-gray-900/60 backdrop-blur-sm">
      <div className="flex items-center gap-3 border-b border-white/5 px-5 py-4">
        {icon}
        <h2 className="text-base font-bold text-white">{title}</h2>
        <span className="ml-auto rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium text-gray-400">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </div>

      {/* Pie chart — always reflects all items */}
      {items.length > 0 && (
        <div className="border-b border-white/5">
          <SectionPieChart items={items} color={color} maxSlices={maxPieSlices} />
        </div>
      )}

      {items.length > 0 ? (
        <div className="overflow-hidden">
          <table className="w-full table-fixed text-left">
            <thead>
              <tr className="border-b border-white/5 bg-gray-900/80">
                <th className="max-w-0 py-2.5 pl-4 pr-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="w-20 whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Weight
                </th>
                <th className="hidden w-40 py-2.5 pl-3 pr-4 text-xs font-semibold uppercase tracking-wider text-gray-500 sm:table-cell">
                  &nbsp;
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {visibleItems.map((item, i) => (
                <WeightedRow
                  key={i}
                  name={item.name}
                  weight={item.weight}
                  color={color}
                  maxWeight={maxWeight}
                />
              ))}
              {showOtherRow && (
                <tr className="bg-white/[0.02]">
                  <td className="max-w-0 truncate py-2.5 pl-4 pr-3">
                    <span className="text-sm italic text-gray-500">Other</span>
                  </td>
                  <td className="w-20 whitespace-nowrap px-3 py-2.5 text-right">
                    <span className="text-sm font-semibold tabular-nums italic text-gray-500">
                      {remainderWeight.toFixed(2)}%
                    </span>
                  </td>
                  <td className="hidden w-40 py-2.5 pl-3 pr-4 sm:table-cell">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gray-600/50 transition-all duration-300"
                        style={{ width: `${Math.min((remainderWeight / maxWeight) * 100, 100)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Show more / Show less toggle */}
          {canCollapse && (
            <div className="border-t border-white/5 px-5 py-3">
              <button
                onClick={() => setExpanded((prev) => !prev)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white/[0.04] px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/[0.08] hover:text-white"
              >
                {expanded ? (
                  <>
                    <ChevronUpIcon className="h-4 w-4" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDownIcon className="h-4 w-4" />
                    Show more ({items.length - defaultVisibleCount} remaining)
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="px-5 py-8 text-center text-sm text-gray-500">
          {emptyText}
        </div>
      )}
    </div>
  );
}

/* ─── Holdings grid section (matches portfolio overview style) ─── */
function HoldingsGridSection({
  title,
  items,
  showRemainder = false,
  maxPieSlices,
}: {
  title: string;
  items: { name: string; weight: number }[];
  showRemainder?: boolean;
  maxPieSlices?: number;
}) {
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

  if (items.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-gray-900/60 backdrop-blur-sm">
        <div className="flex items-center gap-3 border-b border-white/5 px-5 py-4">
          <LayersIcon className="h-5 w-5 text-emerald-400" />
          <h2 className="text-base font-bold text-white">{title}</h2>
        </div>
        <div className="px-5 py-8 text-center text-sm text-gray-500">
          No holdings data available.
        </div>
      </div>
    );
  }

  // For the pie chart: top 20 + "Other"
  const pieData = (() => {
    if (items.length <= HOLDINGS_DEFAULT_VISIBLE) return items;
    const top = items.slice(0, HOLDINGS_DEFAULT_VISIBLE);
    const restWeight = items.slice(HOLDINGS_DEFAULT_VISIBLE).reduce((s, i) => s + i.weight, 0);
    return [...top, { name: "Other", weight: parseFloat(restWeight.toFixed(2)) }];
  })();
  const pieGrouped = groupSmallEntries(pieData, maxPieSlices ?? (HOLDINGS_DEFAULT_VISIBLE + 1));
  const palette = PIE_PALETTES.emerald;
  const canShowMore = items.length > holdingsVisible;
  const canShowLess = holdingsVisible > HOLDINGS_DEFAULT_VISIBLE;
  const visibleItems = items.slice(0, holdingsVisible);
  const maxWeight = items.length > 0 ? Math.max(...items.map((i) => i.weight)) : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/5 bg-gray-900/60 backdrop-blur-sm">
      <div className="flex items-center gap-3 border-b border-white/5 px-5 py-4">
        <LayersIcon className="h-5 w-5 text-emerald-400" />
        <h2 className="text-base font-bold text-white">{title}</h2>
        <span className="ml-auto rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium text-gray-400">
          {items.length} {items.length === 1 ? "item" : "items"}
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
              <Tooltip content={<PieTooltipContent />} />
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
                Show more ({items.length - holdingsVisible} remaining)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Stat card for key figures ─── */
function StatCard({
  label,
  value,
  isReturn = false,
}: {
  label: string;
  value: string;
  isReturn?: boolean;
}) {
  if (!value) return null;

  let valueColor = "text-white";
  let Icon: typeof TrendingUpIcon | null = null;

  if (isReturn && value) {
    const numeric = parseFloat(value.replace(",", ".").replace("%", "").trim());
    if (!isNaN(numeric)) {
      if (numeric > 0) {
        valueColor = "text-emerald-400";
        Icon = TrendingUpIcon;
      } else if (numeric < 0) {
        valueColor = "text-red-400";
        Icon = TrendingDownIcon;
      }
    }
  }

  return (
    <div className="rounded-xl border border-white/5 bg-gray-900/60 px-4 py-3 backdrop-blur-sm">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <div className="mt-1 flex items-center gap-1.5">
        {Icon && <Icon className={`h-3.5 w-3.5 ${valueColor}`} />}
        <span className={`text-sm font-bold tabular-nums ${valueColor}`}>
          {value}
        </span>
      </div>
    </div>
  );
}

/* ─── Copyable ISIN stat card ─── */
function IsinStatCard({ isin }: { isin: string }) {
  const [copied, setCopied] = useState(false);

  if (!isin) return null;

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(isin);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="group rounded-xl border border-white/5 bg-gray-900/60 px-4 py-3 text-left backdrop-blur-sm transition-colors hover:border-emerald-500/20 hover:bg-gray-900/80 cursor-pointer"
    >
      <p className="text-xs font-medium text-gray-500">ISIN</p>
      <div className="mt-1 flex items-center gap-1.5">
        {copied ? (
          <CheckIcon className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
        ) : (
          <CopyIcon className="h-3.5 w-3.5 shrink-0 text-gray-500 transition-colors group-hover:text-emerald-400" />
        )}
        <span className={`text-sm font-bold tabular-nums font-mono ${
          copied ? "text-emerald-400" : "text-white"
        }`}>
          {copied ? "Copied!" : isin}
        </span>
      </div>
    </button>
  );
}

/* ─── Key figures grid ─── */
function KeyFigures({
  data,
  isin,
}: {
  data: {
    assetClass?: string | null;
    fundSize: string;
    ter: string;
    replication: string;
    distributionPolicy: string;
    totalHoldings: string;
    returns: {
      oneMonth: string;
      threeMonths: string;
      sixMonths: string;
      ytd: string;
      oneYear: string;
      threeYears: string;
      fiveYears: string;
      max: string;
    };
  };
  isin: string;
}) {
  const hasReturns = data.returns.oneYear || data.returns.threeYears || data.returns.fiveYears;
  const hasBasics = data.fundSize || data.ter || data.totalHoldings || data.assetClass || isin;
  if (!hasReturns && !hasBasics) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4">
      <StatCard label="1Y Return" value={data.returns.oneYear} isReturn />
      <StatCard label="3Y Return" value={data.returns.threeYears} isReturn />
      <StatCard label="5Y Return" value={data.returns.fiveYears} isReturn />
      <StatCard label="Fund Size" value={data.fundSize} />
      <StatCard
        label="Holdings"
        value={
          data.totalHoldings
            ? data.totalHoldings.replace(/\s*holdings?\s*/i, "").trim()
            : ""
        }
      />
      <StatCard label="TER" value={data.ter} />
      <StatCard label="Asset Class" value={data.assetClass ?? ""} />
      <IsinStatCard isin={isin} />
    </div>
  );
}

/* ─── Header action buttons with dots menu ─── */
function HeaderActions({
  isin,
  cbondsId,
  router,
}: {
  isin: string;
  cbondsId?: string | null;
  router: ReturnType<typeof useRouter>;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="flex items-center shrink-0">
      {/* Button group */}
      <div className="inline-flex items-center rounded-lg border border-white/10 bg-gray-900 divide-x divide-white/10">
        <button
          onClick={() => router.push("/portfolio/overview")}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-300 transition hover:text-emerald-400 rounded-l-lg hover:bg-white/[0.04]"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Portfolio
        </button>

        {/* Dots menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen((prev) => !prev)}
            className="inline-flex items-center justify-center px-2.5 py-1.5 text-gray-400 transition hover:text-emerald-400 rounded-r-lg hover:bg-white/[0.04]"
            aria-label="More options"
          >
            <MoreHorizontalIcon className="h-4 w-4" />
          </button>

          {open && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-lg border border-white/10 bg-gray-900 shadow-xl shadow-black/40">
              <a
                href={`https://www.justetf.com/en/etf-profile.html?isin=${encodeURIComponent(isin)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-300 transition hover:bg-white/[0.06] hover:text-sky-400"
              >
                <ExternalLinkIcon className="h-4 w-4 shrink-0" />
                JustETF
              </a>
              {cbondsId && (
                <a
                  href={`https://cbonds.com/etf/${cbondsId}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 border-t border-white/5 px-3.5 py-2.5 text-sm text-gray-300 transition hover:bg-white/[0.06] hover:text-emerald-400"
                >
                  <ExternalLinkIcon className="h-4 w-4 shrink-0" />
                  cbonds
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ETF DETAIL PAGE
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function EtfDetailPage() {
  const params = useParams<{ isin: string }>();
  const router = useRouter();
  const isin = params.isin ?? "";

  const { data, isLoading, isError, error } =
    api.securities.getEtfFullComposition.useQuery(
      { isin },
      {
        enabled: isin.length > 0,
        staleTime: 24 * 60 * 60 * 1000,
        retry: 1,
      },
    );

  /* ─── Loading state ─── */
  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-950 text-gray-400">
        <Loader2Icon className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-sm">Loading ETF composition data…</p>
      </main>
    );
  }

  /* ─── Error state ─── */
  if (isError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-950 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">
          <AlertCircleIcon className="h-7 w-7 text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Failed to load ETF data</h1>
          <p className="mt-2 max-w-md text-sm text-gray-400">
            {error?.message ?? "An unexpected error occurred. Please try again later."}
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-gray-950 transition hover:bg-emerald-400"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Go Back
        </button>
      </main>
    );
  }

  /* ─── No data ─── */
  if (!data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-950 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10">
          <AlertCircleIcon className="h-7 w-7 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">No data found</h1>
          <p className="mt-2 text-sm text-gray-400">
            No composition data found for ISIN <span className="font-mono text-gray-300">{isin}</span>.
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-gray-950 transition hover:bg-emerald-400"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Go Back
        </button>
      </main>
    );
  }

  const displayName = data.etfName || `ETF ${isin}`;
  const hasAnyData =
    data.holdings.length > 0 || data.cbondsHoldings.length > 0 || data.countries.length > 0 || data.sectors.length > 0;

  // Prefer cbonds extended holdings when available, fall back to JustETF top 10
  const holdingsSource = data.cbondsHoldings.length > 0 ? "cbonds" : "justetf";
  const holdingsItems = data.cbondsHoldings.length > 0 ? data.cbondsHoldings : data.holdings;
  const holdingsTitle =
    holdingsSource === "cbonds"
      ? "Holdings"
      : "Top Holdings";

  return (
    <main className="min-h-screen bg-gray-950 font-sans text-gray-100 overflow-x-hidden">
      {/* ─── Header ─── */}
      <section className="border-b border-white/5 bg-gray-900/40">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-3">
                <Link href="/" className="text-xl font-bold tracking-tight text-white">
                  See<span className="text-emerald-400">TF</span>
                </Link>
                <div className="h-5 w-px bg-white/10" />
                <span className="text-sm text-gray-500">ETF Details</span>
              </div>
              <h1 className="truncate text-lg font-bold text-white sm:text-2xl">
                {displayName}
              </h1>
            </div>
            <HeaderActions isin={isin} cbondsId={data.cbondsId} router={router} />
          </div>
        </div>
      </section>

      {/* ─── Content ─── */}
      <section className="pb-24 pt-8">
        <div className="mx-auto max-w-5xl px-6">
          {/* Key figures */}
          <div className="mb-8">
            <KeyFigures data={data} isin={isin} />
          </div>

          {!hasAnyData && !data.hasHoldingsSection && (
            <div className="flex items-center gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/5 px-5 py-4">
              <AlertCircleIcon className="h-5 w-5 shrink-0 text-sky-400" />
              <p className="text-sm text-sky-300">
                This product{data.assetClass ? ` (${data.assetClass})` : ""} does not have equity holdings data.
                Composition breakdowns are only available for equity and multi-asset ETFs.
              </p>
            </div>
          )}

          {!hasAnyData && data.hasHoldingsSection && (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4">
              <AlertCircleIcon className="h-5 w-5 shrink-0 text-amber-400" />
              <p className="text-sm text-amber-300">
                No composition data could be parsed for ISIN{" "}
                <span className="font-mono">{isin}</span>. The ETF may not be listed on
                JustETF, or the page structure may have changed.
              </p>
            </div>
          )}

          <div className="grid gap-8">
            {/* Holdings */}
            {holdingsItems.length > 0 && (
              <HoldingsGridSection
                title={holdingsTitle}
                items={holdingsItems}
                showRemainder
                maxPieSlices={15}
              />
            )}

            {/* Countries & Sectors side by side on larger screens */}
            <div className="grid gap-8 lg:grid-cols-2">
              {data.countries.length > 0 && (() => {
                const sorted = [...data.countries].sort((a, b) => b.weight - a.weight);
                const pieData = groupSmallEntries(sorted, 10);
                const palette = PIE_PALETTES.sky;
                const maxWeight = Math.max(...sorted.map((i) => i.weight));
                return (
                  <div className="overflow-hidden rounded-2xl border border-white/5 bg-gray-900/60 backdrop-blur-sm">
                    <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
                      <GlobeIcon className="h-5 w-5 text-sky-400" />
                      <h3 className="text-sm font-bold text-white">Countries</h3>
                      <span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-gray-400">
                        {sorted.length} {sorted.length === 1 ? "item" : "items"}
                      </span>
                    </div>
                    <div className="border-b border-white/5">
                      <div className="flex items-center justify-center py-2">
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie
                              data={pieData}
                              dataKey="weight"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={80}
                              paddingAngle={2}
                              strokeWidth={0}
                            >
                              {pieData.map((entry, idx) => (
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
                            <Tooltip content={<PieTooltipContent />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="overflow-hidden p-3">
                      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-1.5">
                        {sorted.map((item, i) => {
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
                  </div>
                );
              })()}

              {data.sectors.length > 0 && (() => {
                const sorted = [...data.sectors].sort((a, b) => b.weight - a.weight);
                const pieData = groupSmallEntries(sorted, 10);
                const palette = PIE_PALETTES.violet;
                const maxWeight = Math.max(...sorted.map((i) => i.weight));
                return (
                  <div className="overflow-hidden rounded-2xl border border-white/5 bg-gray-900/60 backdrop-blur-sm">
                    <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
                      <PieChartIcon className="h-5 w-5 text-violet-400" />
                      <h3 className="text-sm font-bold text-white">Sectors</h3>
                      <span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-gray-400">
                        {sorted.length} {sorted.length === 1 ? "item" : "items"}
                      </span>
                    </div>
                    <div className="border-b border-white/5">
                      <div className="flex items-center justify-center py-2">
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie
                              data={pieData}
                              dataKey="weight"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={80}
                              paddingAngle={2}
                              strokeWidth={0}
                            >
                              {pieData.map((entry, idx) => (
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
                            <Tooltip content={<PieTooltipContent />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="overflow-hidden p-3">
                      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-1.5">
                        {sorted.map((item, i) => {
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
                  </div>
                );
              })()}
            </div>
          </div>


        </div>
      </section>
    </main>
  );
}
