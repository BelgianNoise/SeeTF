import { type Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  BarChartIcon,
  LayersIcon,
  TrendingUpIcon,
  PieChartIcon,
  BadgeDollarSignIcon,
  GlobeIcon,
  SearchIcon,
} from "lucide-react";

export const metadata: Metadata = {
  title: "SeeTF — Free ETF Portfolio Analyzer",
  description:
    "Enter your stock and ETF positions and get a detailed, real-time overview of your entire portfolio. Analyze holdings, country exposure, sectors, TER, and returns — 100% free.",
  openGraph: {
    title: "SeeTF — Free ETF Portfolio Analyzer",
    description:
      "Enter your stock and ETF positions and get a detailed, real-time overview of your entire portfolio. 100% free, no catch.",
  },
};

/* ───────────────────────── mock portfolio positions ───────────────────────── */
const mockPositions = [
  { name: "Vanguard FTSE All-World", ticker: "VWRL", isin: "IE00B3RBWM25", type: "etf" as const, value: 25000 },
  { name: "iShares Core S&P 500", ticker: "CSPX", isin: "IE00B5BMR087", type: "etf" as const, value: 15000 },
  { name: "iShares Core MSCI EM", ticker: "EIMI", isin: "IE00BKM4GZ66", type: "etf" as const, value: 8000 },
  { name: "Xtrackers MSCI Europe", ticker: "XMEU", isin: "LU0274209237", type: "etf" as const, value: 6500 },
  { name: "Apple Inc.", ticker: "AAPL", isin: "US0378331005", type: "stock" as const, value: 5500 },
];
const mockTotal = mockPositions.reduce((sum, p) => sum + p.value, 0);

/* ────────────────────────────── feature cards ──────────────────────────────── */
const features = [
  {
    icon: <LayersIcon className="h-6 w-6" />,
    title: "ETF Composition Breakdown",
    description:
      "See exactly what\'s inside your ETFs. We break down every fund into its underlying holdings so you know what you actually own.",
  },
  {
    icon: <TrendingUpIcon className="h-6 w-6" />,
    title: "Returns Overview",
    description:
      "Compare 1-year, 3-year, and 5-year returns for each ETF at a glance. Spot the winners and the laggards instantly.",
  },
  {
    icon: <BarChartIcon className="h-6 w-6" />,
    title: "TER Comparison",
    description:
      "Total Expense Ratios side by side. Instantly see which funds are eating into your returns and find cheaper alternatives.",
  },
  {
    icon: <GlobeIcon className="h-6 w-6" />,
    title: "Country Exposure",
    description:
      "Visualize your geographic diversification by country. See how much of your portfolio is in the US, Japan, UK, China, and 40+ other countries.",
  },
  {
    icon: <SearchIcon className="h-6 w-6" />,
    title: "Indirect Stock Holdings",
    description:
      "Discover every stock you indirectly own through your ETFs. Find overlaps, hidden concentrations, and surprise positions.",
  },
  {
    icon: <PieChartIcon className="h-6 w-6" />,
    title: "Sector & Industry Breakdown",
    description:
      "Understand your true sector allocation across all ETFs combined. Tech-heavy? Finance-light? We\'ll show you the full picture.",
  },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* ─── Hero ─── */}
      <section className="relative isolate overflow-hidden">
        {/* gradient blobs */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -top-60 right-0 -z-10 h-[400px] w-[400px] rounded-full bg-sky-500/10 blur-3xl" />

        <div className="mx-auto flex max-w-4xl flex-col items-center px-6 pb-24 pt-28 text-center md:pt-40">
          <span className="mb-5 inline-block rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1 text-xs font-medium tracking-wide text-emerald-400">
            100% Free — No catch, no credit card, no kidding
          </span>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
            Your ETFs, fully
            <br className="hidden sm:block" />{" "}
            <span className="text-emerald-400">analyzed &amp; decoded.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-400">
            Enter your ETFs and instantly see returns, TER, composition,
            regional exposure, and every stock you indirectly own.
            Completely free. Forever. We&apos;re not even joking.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-gray-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400"
            >
              Analyze Your ETFs — It&apos;s Free
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              See Features
            </a>
          </div>
          <p className="mt-4 text-xs text-gray-600">
            No sign-up required. No hidden fees. No soul-selling.
          </p>
        </div>
      </section>

      {/* ─── Free Banner ─── */}
      <section className="border-t border-white/5 bg-emerald-500/5 py-10">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-6 text-center sm:flex-row sm:justify-center sm:gap-8">
          <div className="flex items-center gap-3">
            <BadgeDollarSignIcon className="h-8 w-8 text-emerald-400" />
            <div className="text-left">
              <p className="text-lg font-bold text-white">Free. Forever. Seriously.</p>
              <p className="text-sm text-gray-400">
                Every feature, every tool, every pixel — $0. Check our{" "}
                <Link href="/pricing" className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300">
                  pricing page
                </Link>{" "}
                if you don&apos;t believe us (the paid tiers will roast you).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="border-t border-white/5 bg-gray-900/50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Everything you need to understand your ETFs
            </h2>
            <p className="mt-4 text-gray-400">
              Powerful analysis wrapped in a dead-simple interface. No finance
              degree required — just your ETF tickers and vibes.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-white/5 bg-gray-900 p-6 transition hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5"
              >
                <div className="mb-4 inline-flex rounded-lg bg-emerald-500/10 p-3 text-emerald-400 transition group-hover:bg-emerald-500/20">
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Bento Feature Showcase ─── */}
      <section id="showcase" className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              See it in action
            </h2>
            <p className="mt-4 text-gray-400">
              Powerful visualizations, instant insights. Here&apos;s a taste of
              what you get — for the low, low price of absolutely nothing.
            </p>
          </div>

          {/* Bento grid */}
          <div className="mt-16 grid auto-rows-[280px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* ── Card 1: Portfolio Analysis (tall, spans 2 rows) ── */}
            <div className="group relative row-span-2 overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-b from-gray-900/80 to-gray-950/80 p-6 backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/20 hover:shadow-2xl hover:shadow-emerald-500/5">
              <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-emerald-500/[0.07] blur-3xl transition-all duration-500 group-hover:bg-emerald-500/[0.12]" />
              <div className="relative z-10">
                <div className="mb-1 inline-flex rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400">
                  <PieChartIcon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white">
                  Portfolio Analysis
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                  See your true allocation across holdings, countries, and
                  sectors — aggregated across all your ETFs.
                </p>

                {/* ── Holdings / Countries / Sectors previews ── */}
                <div className="mt-4 space-y-3">
                  {[
                    {
                      label: "Holdings",
                      labelColor: "text-emerald-400/70",
                      segments: [
                        { stroke: "#34d399", dash: "11.46 238.76", offset: "0", op: 0.9 },
                        { stroke: "#10b981", dash: "10.03 238.76", offset: "-11.46", op: 0.82 },
                        { stroke: "#059669", dash: "8.60 238.76", offset: "-21.49", op: 0.74 },
                        { stroke: "#047857", dash: "5.73 238.76", offset: "-30.09", op: 0.66 },
                        { stroke: "#6ee7b7", dash: "202.95 238.76", offset: "-35.82", op: 0.55 },
                      ],
                      items: [
                        { name: "Apple Inc.", pct: "4.8%", color: "#34d399", barW: 20 },
                        { name: "Microsoft Corp.", pct: "4.2%", color: "#10b981", barW: 17 },
                        { name: "NVIDIA Corp.", pct: "3.6%", color: "#059669", barW: 15 },
                        { name: "Amazon.com", pct: "2.4%", color: "#047857", barW: 10 },
                        { name: "Others", pct: "85.0%", color: "#6ee7b7", barW: 100 },
                      ],
                    },
                    {
                      label: "Countries",
                      labelColor: "text-sky-400/70",
                      segments: [
                        { stroke: "#38bdf8", dash: "148.03 238.76", offset: "0", op: 0.9 },
                        { stroke: "#0ea5e9", dash: "19.10 238.76", offset: "-148.03", op: 0.82 },
                        { stroke: "#0284c7", dash: "16.71 238.76", offset: "-167.13", op: 0.74 },
                        { stroke: "#0369a1", dash: "11.94 238.76", offset: "-183.84", op: 0.66 },
                        { stroke: "#7dd3fc", dash: "42.98 238.76", offset: "-195.78", op: 0.55 },
                      ],
                      items: [
                        { name: "United States", pct: "62%", color: "#38bdf8", barW: 100 },
                        { name: "Germany", pct: "8%", color: "#0ea5e9", barW: 13 },
                        { name: "Japan", pct: "7%", color: "#0284c7", barW: 11 },
                        { name: "United Kingdom", pct: "5%", color: "#0369a1", barW: 8 },
                        { name: "Others", pct: "18%", color: "#7dd3fc", barW: 29 },
                      ],
                    },
                    {
                      label: "Sectors",
                      labelColor: "text-violet-400/70",
                      segments: [
                        { stroke: "#a78bfa", dash: "66.85 238.76", offset: "0", op: 0.9 },
                        { stroke: "#8b5cf6", dash: "35.81 238.76", offset: "-66.85", op: 0.82 },
                        { stroke: "#7c3aed", dash: "33.43 238.76", offset: "-102.66", op: 0.74 },
                        { stroke: "#6d28d9", dash: "28.65 238.76", offset: "-136.09", op: 0.66 },
                        { stroke: "#c4b5fd", dash: "74.02 238.76", offset: "-164.74", op: 0.55 },
                      ],
                      items: [
                        { name: "Technology", pct: "28%", color: "#a78bfa", barW: 100 },
                        { name: "Healthcare", pct: "15%", color: "#8b5cf6", barW: 54 },
                        { name: "Financials", pct: "14%", color: "#7c3aed", barW: 50 },
                        { name: "Consumer Discr.", pct: "12%", color: "#6d28d9", barW: 43 },
                        { name: "Others", pct: "31%", color: "#c4b5fd", barW: 100 },
                      ],
                    },
                  ].map((section) => (
                    <div key={section.label}>
                      <p className={`mb-1 text-[10px] font-semibold uppercase tracking-widest ${section.labelColor}`}>
                        {section.label}
                      </p>
                      <div className="flex items-center gap-2.5">
                        <div className="relative h-14 w-14 shrink-0">
                          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                            {section.segments.map((seg, i) => (
                              <circle
                                key={i}
                                cx="50"
                                cy="50"
                                r="38"
                                fill="none"
                                stroke={seg.stroke}
                                strokeWidth="14"
                                strokeDasharray={seg.dash}
                                strokeDashoffset={seg.offset}
                                style={{ opacity: seg.op }}
                              />
                            ))}
                          </svg>
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-1">
                          {section.items.map((h) => (
                            <div
                              key={h.name}
                              className="relative overflow-hidden rounded-md bg-white/[0.03] px-1.5 py-1"
                            >
                              <div
                                className="pointer-events-none absolute inset-y-0 left-0 rounded-md opacity-[0.07]"
                                style={{ width: `${h.barW}%`, backgroundColor: h.color }}
                              />
                              <div className="relative flex items-center gap-1">
                                <span
                                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: h.color }}
                                />
                                <span className="min-w-0 flex-1 truncate text-[10px] text-gray-300">
                                  {h.name}
                                </span>
                                <span className="shrink-0 text-[10px] font-medium tabular-nums text-gray-400">
                                  {h.pct}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Card 2: ETF Overlap Detection ── */}
            <div className="group relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br from-gray-900/80 to-gray-950/80 p-6 backdrop-blur-xl transition-all duration-300 hover:border-sky-500/20 hover:shadow-2xl hover:shadow-sky-500/5">
              <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-sky-500/[0.06] blur-3xl transition-all duration-500 group-hover:bg-sky-500/[0.12]" />
              <div className="relative z-10">
                <div className="mb-1 inline-flex rounded-xl bg-sky-500/10 p-2.5 text-sky-400">
                  <LayersIcon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white">
                  ETF Overlap Detection
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                  Spot duplicate holdings across your ETFs instantly.
                </p>

                {/* Venn diagram mockup */}
                <div className="mt-5 flex items-center justify-center">
                  <div className="relative h-28 w-48">
                    <div className="absolute left-2 top-2 flex h-24 w-24 items-center justify-center rounded-full border border-sky-400/30 bg-sky-400/[0.08] text-[10px] font-bold text-sky-300 transition-all duration-500 group-hover:left-0 group-hover:bg-sky-400/[0.14]">
                      VWRL
                    </div>
                    <div className="absolute right-2 top-2 flex h-24 w-24 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/[0.08] text-[10px] font-bold text-emerald-300 transition-all duration-500 group-hover:right-0 group-hover:bg-emerald-400/[0.14]">
                      CSPX
                    </div>
                    <div className="absolute left-1/2 top-8 -translate-x-1/2 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur-sm">
                      62%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Card 3: Smart Search ── */}
            <div className="group relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-bl from-gray-900/80 to-gray-950/80 p-6 backdrop-blur-xl transition-all duration-300 hover:border-violet-500/20 hover:shadow-2xl hover:shadow-violet-500/5">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/[0.06] blur-3xl transition-all duration-500 group-hover:bg-violet-500/[0.12]" />
              <div className="relative z-10">
                <div className="mb-1 inline-flex rounded-xl bg-violet-500/10 p-2.5 text-violet-400">
                  <SearchIcon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white">
                  Smart Search
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                  Find any ETF or stock by name, ticker, or ISIN.
                </p>

                {/* Search bar mockup */}
                <div className="mt-5 space-y-1.5">
                  <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
                    <SearchIcon className="h-3.5 w-3.5 text-gray-600" />
                    <span className="text-sm text-gray-400">vanguard ftse</span>
                    <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  </div>
                  {[
                    { name: "Vanguard FTSE All-World", ticker: "VWRL", type: "ETF" },
                    { name: "Vanguard FTSE 100", ticker: "VUKE", type: "ETF" },
                    { name: "Vanguard FTSE 250", ticker: "VMID", type: "ETF" },
                  ].map((r, i) => (
                    <div
                      key={r.ticker}
                      className={`flex items-center justify-between rounded-lg px-3.5 py-2 text-xs transition-colors ${
                        i === 0
                          ? "bg-emerald-500/10 text-white"
                          : "text-gray-400 hover:bg-white/[0.03]"
                      }`}
                    >
                      <span className="truncate font-medium">{r.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-emerald-400">
                          {r.ticker}
                        </span>
                        <span className="text-[10px] text-gray-600">{r.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Card 4: Deep ETF Insights (wide, spans 2 cols) ── */}
            <div className="group relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-r from-gray-900/80 to-gray-950/80 p-6 backdrop-blur-xl transition-all duration-300 hover:border-amber-500/20 hover:shadow-2xl hover:shadow-amber-500/5 sm:col-span-2">
              <div className="absolute -bottom-20 right-0 h-60 w-60 rounded-full bg-amber-500/[0.05] blur-3xl transition-all duration-500 group-hover:bg-amber-500/[0.10]" />
              <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="sm:w-1/3">
                  <div className="mb-1 inline-flex rounded-xl bg-amber-500/10 p-2.5 text-amber-400">
                    <BarChartIcon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-white">
                    Deep ETF Insights
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                    Drill into any ETF — key figures like 1Y/3Y/5Y returns,
                    TER, fund size, asset class, plus full holdings,
                    country &amp; sector breakdowns.
                  </p>
                </div>

                {/* Mini ETF detail page preview — mirrors actual etf/[isin] layout */}
                <div className="flex-1 overflow-hidden rounded-2xl border border-white/[0.06] bg-gray-950/60 backdrop-blur-sm">
                  {/* ── Mini header (matches detail page header) ── */}
                  <div className="border-b border-white/5 bg-gray-900/40 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-xs font-bold tracking-tight text-white">
                            See<span className="text-emerald-400">TF</span>
                          </span>
                          <div className="h-3 w-px bg-white/10" />
                          <span className="text-[10px] text-gray-500">ETF Details</span>
                        </div>
                        <p className="truncate text-sm font-bold text-white">
                          iShares Core MSCI World UCITS ETF
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center rounded-md border border-white/10 bg-gray-900 divide-x divide-white/10">
                        <span className="px-2 py-1 text-[10px] text-gray-400">← Back</span>
                        <span className="px-1.5 py-1 text-[10px] text-gray-500">•••</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    {/* ── Mini key figures grid (matches StatCard style) ── */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: "1Y Return", value: "+12.4%", isReturn: true, positive: true },
                        { label: "3Y Return", value: "+31.6%", isReturn: true, positive: true },
                        { label: "5Y Return", value: "+68.2%", isReturn: true, positive: true },
                        { label: "Fund Size", value: "€68.2B", isReturn: false, positive: false },
                        { label: "Holdings", value: "1,517", isReturn: false, positive: false },
                        { label: "TER", value: "0.20%", isReturn: false, positive: false },
                        { label: "Asset Class", value: "Equity", isReturn: false, positive: false },
                        { label: "ISIN", value: "IE00B4L5Y983", isReturn: false, positive: false },
                      ].map((m) => (
                        <div
                          key={m.label}
                          className="rounded-lg border border-white/5 bg-gray-900/60 px-2 py-1.5"
                        >
                          <p className="text-[9px] font-medium text-gray-500">{m.label}</p>
                          <div className="mt-0.5 flex items-center gap-1">
                            {m.isReturn && (
                              <TrendingUpIcon className={`h-2.5 w-2.5 ${m.positive ? "text-emerald-400" : "text-red-400"}`} />
                            )}
                            <span
                              className={`text-[11px] font-bold tabular-nums ${
                                m.isReturn && m.positive
                                  ? "text-emerald-400"
                                  : m.label === "ISIN"
                                    ? "font-mono text-white"
                                    : "text-white"
                              }`}
                            >
                              {m.value}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ── Mini holdings section (matches HoldingsGridSection) ── */}
                    <div className="mt-3 overflow-hidden rounded-xl border border-white/5 bg-gray-900/60">
                      <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
                        <LayersIcon className="h-3 w-3 text-emerald-400" />
                        <span className="text-[10px] font-bold text-white">Holdings</span>
                        <span className="ml-auto rounded-full bg-white/5 px-1.5 py-0.5 text-[8px] font-medium text-gray-400">
                          1,517 items
                        </span>
                      </div>
                      {/* Mini donut */}
                      <div className="flex justify-center border-b border-white/5 py-2">
                        <svg viewBox="0 0 80 80" className="h-12 w-12 -rotate-90">
                          {[
                            { stroke: "#34d399", dash: "10.05 201.06", offset: "0", op: 0.9 },
                            { stroke: "#10b981", dash: "8.04 201.06", offset: "-10.05", op: 0.82 },
                            { stroke: "#059669", dash: "7.04 201.06", offset: "-18.09", op: 0.74 },
                            { stroke: "#047857", dash: "6.03 201.06", offset: "-25.13", op: 0.66 },
                            { stroke: "#065f46", dash: "5.03 201.06", offset: "-31.16", op: 0.58 },
                            { stroke: "#6ee7b7", dash: "164.88 201.06", offset: "-36.19", op: 0.45 },
                          ].map((seg, i) => (
                            <circle
                              key={i}
                              cx="40"
                              cy="40"
                              r="32"
                              fill="none"
                              stroke={seg.stroke}
                              strokeWidth="10"
                              strokeDasharray={seg.dash}
                              strokeDashoffset={seg.offset}
                              style={{ opacity: seg.op }}
                            />
                          ))}
                        </svg>
                      </div>
                      {/* Compact holding cards grid */}
                      <div className="grid grid-cols-2 gap-1 p-2">
                        {[
                          { name: "Apple Inc.", pct: "5.00%", color: "#34d399", barW: 100 },
                          { name: "Microsoft Corp.", pct: "4.00%", color: "#10b981", barW: 80 },
                          { name: "NVIDIA Corp.", pct: "3.50%", color: "#059669", barW: 70 },
                          { name: "Amazon.com", pct: "3.00%", color: "#047857", barW: 60 },
                          { name: "Meta Platforms", pct: "2.50%", color: "#065f46", barW: 50 },
                          { name: "Other", pct: "82.00%", color: "#6ee7b7", barW: 100 },
                        ].map((h) => (
                          <div
                            key={h.name}
                            className="relative overflow-hidden rounded-md bg-white/[0.03] px-1.5 py-1"
                          >
                            <div
                              className="pointer-events-none absolute inset-y-0 left-0 rounded-md opacity-[0.07]"
                              style={{ width: `${h.barW}%`, backgroundColor: h.color }}
                            />
                            <div className="relative flex items-center gap-1">
                              <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{ backgroundColor: h.color }}
                              />
                              <span className="min-w-0 flex-1 truncate text-[9px] text-gray-300">
                                {h.name}
                              </span>
                              <span className="shrink-0 text-[9px] font-medium tabular-nums text-gray-400">
                                {h.pct}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Mini countries & sectors row (matches side-by-side layout) ── */}
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      {/* Countries mini */}
                      <div className="overflow-hidden rounded-xl border border-white/5 bg-gray-900/60">
                        <div className="flex items-center gap-1.5 border-b border-white/5 px-2.5 py-1.5">
                          <GlobeIcon className="h-2.5 w-2.5 text-sky-400" />
                          <span className="text-[9px] font-bold text-white">Countries</span>
                        </div>
                        <div className="space-y-0.5 p-1.5">
                          {[
                            { name: "United States", pct: "70%", color: "#38bdf8" },
                            { name: "Japan", pct: "6%", color: "#0ea5e9" },
                            { name: "United Kingdom", pct: "4%", color: "#0284c7" },
                          ].map((c) => (
                            <div key={c.name} className="flex items-center gap-1 text-[8px]">
                              <span className="h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                              <span className="min-w-0 flex-1 truncate text-gray-400">{c.name}</span>
                              <span className="tabular-nums text-sky-400/70">{c.pct}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Sectors mini */}
                      <div className="overflow-hidden rounded-xl border border-white/5 bg-gray-900/60">
                        <div className="flex items-center gap-1.5 border-b border-white/5 px-2.5 py-1.5">
                          <PieChartIcon className="h-2.5 w-2.5 text-violet-400" />
                          <span className="text-[9px] font-bold text-white">Sectors</span>
                        </div>
                        <div className="space-y-0.5 p-1.5">
                          {[
                            { name: "Technology", pct: "24%", color: "#a78bfa" },
                            { name: "Financials", pct: "16%", color: "#8b5cf6" },
                            { name: "Healthcare", pct: "12%", color: "#7c3aed" },
                          ].map((s) => (
                            <div key={s.name} className="flex items-center gap-1 text-[8px]">
                              <span className="h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                              <span className="min-w-0 flex-1 truncate text-gray-400">{s.name}</span>
                              <span className="tabular-nums text-violet-400/70">{s.pct}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Three steps. Zero hassle.
            </h2>
            <p className="mt-4 text-gray-400">
              Getting started takes less time than ordering a coffee.
            </p>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Add Your ETFs",
                desc: "Enter your ETFs by ticker symbol or ISIN. Add as many as you like — we\'ll do the heavy lifting.",
              },
              {
                step: "2",
                title: "Get the Full Picture",
                desc: "Instantly see returns, TER, composition, regional exposure, sector breakdown, and every indirect holding.",
              },
              {
                step: "3",
                title: "Optimize & Compare",
                desc: "Spot overlaps, compare costs, and understand your true diversification — all without paying a cent.",
              },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-xl font-bold text-emerald-400">
                  {s.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Dashboard Preview ─── */}
      <section id="preview" className="border-t border-white/5 py-24 bg-gray-900/50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              A dashboard that speaks for itself
            </h2>
            <p className="mt-4 text-gray-400">
              Here&apos;s a sneak peek at what your ETF analysis will look
              like. Spoiler: it looks great and costs nothing.
            </p>
          </div>

          {/* faux dashboard card */}
          <div className="mx-auto mt-14 max-w-5xl overflow-hidden rounded-2xl border border-white/5 bg-gray-900/60 shadow-2xl backdrop-blur-sm">
            {/* top bar */}
            <div className="flex items-center gap-3 border-b border-white/5 px-6 py-4">
              <span className="h-3 w-3 rounded-full bg-red-500/80" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
              <span className="h-3 w-3 rounded-full bg-green-500/80" />
              <span className="ml-4 text-xs text-gray-500">
                seetf.app/portfolio/overview
              </span>
            </div>

            {/* summary stats */}
            <div className="grid grid-cols-2 gap-4 px-6 py-5 sm:grid-cols-4">
              {[
                { label: "Positions", value: "5" },
                { label: "Total Value", value: "€60,000.00", positive: true },
                { label: "ETFs", value: "4" },
                { label: "Stocks", value: "1" },
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

            {/* Portfolio overview table */}
            <div className="overflow-x-auto">
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
                      Value (EUR)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {mockPositions.map((pos, idx) => (
                    <tr
                      key={pos.ticker}
                      className="transition-colors hover:bg-white/[0.02]"
                    >
                      {/* Row number */}
                      <td className="whitespace-nowrap px-5 py-4 text-gray-500 font-medium">
                        {idx + 1}
                      </td>

                      {/* Name */}
                      <td className="px-5 py-4 font-medium text-white">
                        <span className="line-clamp-1">{pos.name}</span>
                      </td>

                      {/* Ticker */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="inline-flex items-center rounded-md bg-white/5 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                          {pos.ticker}
                        </span>
                      </td>

                      {/* ISIN */}
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-gray-400">
                        {pos.isin}
                      </td>

                      {/* Type */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            pos.type === "etf"
                              ? "bg-sky-500/10 text-sky-400"
                              : "bg-violet-500/10 text-violet-400"
                          }`}
                        >
                          {pos.type === "etf" ? "ETF" : "Stock"}
                        </span>
                      </td>

                      {/* Value */}
                      <td className="whitespace-nowrap px-5 py-4 text-right font-semibold tabular-nums text-white">
                        <span className="mr-1 text-gray-500">€</span>
                        {pos.value.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                    </tr>
                  ))}
                </tbody>

                {/* Footer / Total */}
                <tfoot>
                  <tr className="border-t border-white/10 bg-gray-900/80">
                    <td
                      colSpan={5}
                      className="px-5 py-4 text-sm font-semibold text-gray-400"
                    >
                      Total
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-bold tabular-nums text-emerald-400">
                      <span className="mr-1 text-emerald-400/60">€</span>
                      {mockTotal.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section
        id="cta"
        className="relative isolate border-t border-white/5 py-24"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-emerald-500/5 to-transparent" />
        <div className="mx-auto flex max-w-3xl flex-col items-center px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to decode your ETFs?
          </h2>
          <p className="mt-4 max-w-xl text-gray-400">
            Jump in and analyze your ETFs right now.
            No sign-up, no credit card, no strings attached — just a
            beautiful ETF analysis tool that happens to be free.
          </p>
          <Link
            href="/portfolio"
            className="mt-10 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-3.5 text-sm font-semibold text-gray-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400"
          >
            Analyze Your ETFs — It&apos;s Free
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
          <p className="mt-3 text-xs text-gray-600">
            We&apos;ll never charge you. Our business model is vibes.
          </p>
        </div>
      </section>
    </main>
  );
}
