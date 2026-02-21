"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
  Trash2Icon,
} from "lucide-react";
import CustomSelect from "~/app/_components/select";
import AutocompleteInput from "~/app/_components/autocomplete";
import {
  type InputMode,
  type Position,
  type SecurityResult,
  CURRENCIES,
  CURRENCY_OPTIONS,
} from "~/types/portfolio";
import { loadPortfolio, savePortfolio, clearPortfolio, highestPositionId, loadSecuritiesCache, saveSecuritiesCache } from "~/lib/storage";
import { api } from "~/trpc/react";

interface FieldErrors {
  identifier?: string;
  value?: string;
}

let nextId = 1;

function createEmptyPosition(): Position {
  return {
    id: nextId++,
    name: "",
    isin: "",
    ticker: "",
    security: null,
    value: "",
  };
}

/* ─── Validation helpers ─── */
function validateIdentifier(
  security: SecurityResult | null,
): string | undefined {
  if (!security) {
    return "Please select a holding from the suggestions";
  }
  return undefined;
}

function validateValue(
  raw: string,
  mode: InputMode,
): string | undefined {
  if (raw.trim() === "") {
    return mode === "amount"
      ? "Amount is required"
      : "Percentage is required";
  }
  const num = parseFloat(raw);
  if (isNaN(num)) {
    return "Must be a valid number";
  }
  if (num < 0) {
    return "Negative numbers are not allowed";
  }
  if (num === 0) {
    return "Value must be greater than zero";
  }
  if (mode === "percentage" && num > 100) {
    return "Percentage cannot exceed 100%";
  }
  return undefined;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function PortfolioPage() {
  return (
    <Suspense>
      <PortfolioPageInner />
    </Suspense>
  );
}

function PortfolioPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inputMode, setInputMode] = useState<InputMode>("amount");
  const [currency, setCurrency] = useState("USD");
  const [totalPortfolioValue, setTotalPortfolioValue] = useState("");

  const [positions, setPositions] = useState<Position[]>([
    createEmptyPosition(),
  ]);
  const [submitted, setSubmitted] = useState(false); // tracks whether user tried to submit
  const [hydrated, setHydrated] = useState(false);
  const [redirecting, setRedirecting] = useState(true); // true until we know whether to redirect
  const [showClearModal, setShowClearModal] = useState(false);

  /* ── Securities list (cached in localStorage, fetched via getAll) ── */
  const [securities, setSecurities] = useState<SecurityResult[]>([]);

  const { data: serverSecurities } = api.securities.getAll.useQuery(undefined, {
    staleTime: 24 * 60 * 60 * 1000, // 24 hours — matches localStorage TTL
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // On mount: try localStorage cache first
  useEffect(() => {
    const cached = loadSecuritiesCache();
    if (cached) setSecurities(cached);
  }, []);

  // When server data arrives, update state + localStorage cache
  useEffect(() => {
    if (serverSecurities && serverSecurities.length > 0) {
      setSecurities(serverSecurities);
      saveSecuritiesCache(serverSecurities);
    }
  }, [serverSecurities]);

  /* ─── Load from localStorage on mount & redirect if valid portfolio exists ─── */
  useEffect(() => {
    const data = loadPortfolio();
    const editMode = searchParams.get("edit") === "true";
    if (data) {
      // A "valid portfolio" = at least one position with a selected security
      const hasValidPortfolio = data.positions.length > 0 &&
        data.positions.some((p) => p.security !== null);
      if (hasValidPortfolio && !editMode) {
        router.push("/portfolio/overview");
        return; // don't hydrate builder — we're navigating away
      }
      setInputMode(data.inputMode);
      setCurrency(data.currency);
      setTotalPortfolioValue(data.totalPortfolioValue);
      setPositions(data.positions);
      nextId = highestPositionId(data.positions) + 1;
    }
    setRedirecting(false);
    setHydrated(true);
  }, [router, searchParams]);

  /* ─── Save to localStorage whenever state changes ─── */
  useEffect(() => {
    if (!hydrated) return;
    savePortfolio({ inputMode, currency, totalPortfolioValue, positions });
  }, [inputMode, currency, totalPortfolioValue, positions, hydrated]);

  const currencySymbol = CURRENCIES.find((c) => c.value === currency)?.symbol ?? "$";

  /* ─── Helpers ─── */
  const updatePosition = (id: number, patch: Partial<Position>) => {
    setPositions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  };

  const addPosition = () => {
    setPositions((prev) => [...prev, createEmptyPosition()]);
  };

  const removePosition = (id: number) => {
    setPositions((prev) => {
      if (prev.length === 1) return prev; // keep at least one row
      return prev.filter((p) => p.id !== id);
    });
  };

  const totalPercentage = positions.reduce(
    (sum, p) => sum + (parseFloat(p.value) || 0),
    0,
  );

  /* ─── Per-row validation (memoised) ─── */
  const rowErrors: Map<number, FieldErrors> = useMemo(() => {
    const map = new Map<number, FieldErrors>();
    for (const pos of positions) {
      const errors: FieldErrors = {};
      const idErr = validateIdentifier(pos.security);
      if (idErr) errors.identifier = idErr;
      const valErr = validateValue(pos.value, inputMode);
      if (valErr) errors.value = valErr;
      if (idErr || valErr) map.set(pos.id, errors);
    }
    return map;
  }, [positions, inputMode]);

  /* ─── Global validation errors ─── */
  const globalErrors: string[] = useMemo(() => {
    const errs: string[] = [];
    if (positions.length === 0) {
      errs.push("At least one position is required.");
    }
    if (
      inputMode === "percentage" &&
      positions.length > 0 &&
      Math.abs(totalPercentage - 100) >= 0.01
    ) {
      errs.push(
        `Percentages must add up to exactly 100%. Current total: ${totalPercentage.toFixed(1)}%.`,
      );
    }
    return errs;
  }, [positions, inputMode, totalPercentage]);

  const hasErrors = rowErrors.size > 0 || globalErrors.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (hasErrors) return; // block submission
    // Navigate to the overview page (data is already in localStorage)
    router.push("/portfolio/overview");
  };

  const handleClearPortfolio = () => {
    clearPortfolio();
    nextId = 1;
    setPositions([createEmptyPosition()]);
    setInputMode("amount");
    setCurrency("USD");
    setTotalPortfolioValue("");
    setSubmitted(false);
    setShowClearModal(false);
  };

  /** Show field-level errors only after the user has tried to submit */
  const showErrors = submitted;

  /* ─── Loading state while checking for existing portfolio ─── */
  if (redirecting) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 font-sans text-gray-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-emerald-400" />
          <p className="text-sm text-gray-400">Loading portfolio…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 font-sans text-gray-100 overflow-x-hidden">
      {/* ─── Compact Header ─── */}
      <section className="border-b border-white/5 bg-gray-900/40">
<div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <Link href="/" className="text-xl font-bold tracking-tight text-white">
                See<span className="text-emerald-400">TF</span>
              </Link>
              <div className="h-5 w-px bg-white/10" />
              <h1 className="text-base font-bold text-white sm:text-xl">
                Build Your Portfolio
              </h1>
              <span className="hidden text-sm text-gray-500 sm:inline">
                {positions.length} position{positions.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* ── Input Mode Toggle ── */}
            <div className="inline-flex overflow-hidden rounded-lg border border-white/10 bg-gray-900">
              <button
                type="button"
                onClick={() => setInputMode("amount")}
                className={`px-3 py-1.5 text-xs font-semibold transition ${
                  inputMode === "amount"
                    ? "bg-emerald-500 text-gray-950"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Amount
              </button>
              <button
                type="button"
                onClick={() => setInputMode("percentage")}
                className={`px-3 py-1.5 text-xs font-semibold transition ${
                  inputMode === "percentage"
                    ? "bg-emerald-500 text-gray-950"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Percentage
              </button>
            </div>

            {/* ── Currency Selector ── */}
            <CustomSelect
              options={CURRENCY_OPTIONS}
              value={currency}
              onChange={setCurrency}
              ariaLabel="Portfolio currency"
              className="w-28"
            />

            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                inputMode === "percentage"
                  ? "max-w-[80px] opacity-100"
                  : "max-w-0 opacity-0"
              }`}
            >
              <span
                className={`whitespace-nowrap text-xs font-medium ${
                  Math.abs(totalPercentage - 100) < 0.01
                    ? "text-emerald-400"
                    : totalPercentage > 100
                      ? "text-red-400"
                      : "text-yellow-400"
                }`}
              >
                {totalPercentage.toFixed(1)}%
              </span>
            </div>

            {/* ── Clear Portfolio ── */}
            <button
              type="button"
              onClick={() => setShowClearModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:border-red-500/40 hover:bg-red-500/20 hover:text-red-300"
            >
              <Trash2Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
          </div>
        </div>
      </section>

      {/* ─── Form ─── */}
      <section className="pb-24 pt-6">
        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-6xl px-4 sm:px-6"
        >

          {/* ── Total Portfolio Value (optional, percentage mode only) ── */}
          <div
            className={`grid transition-all duration-300 ease-in-out ${
              inputMode === "percentage"
                ? "grid-rows-[1fr] opacity-100 mb-6"
                : "grid-rows-[0fr] opacity-0 mb-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="flex flex-wrap items-end gap-3 rounded-xl border border-white/5 bg-gray-900/60 p-4 sm:gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Total Portfolio Value (optional)
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={totalPortfolioValue}
                      onChange={(e) => setTotalPortfolioValue(e.target.value)}
                      placeholder="e.g. 10000"
                      className="h-10 w-48 rounded-lg border border-white/10 bg-gray-800 pl-8 pr-3 text-sm text-white placeholder-gray-600 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                    />
                  </div>
                  <p className="text-xs text-gray-600">
                    Enter your total portfolio value to see actual amounts on the overview page.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Validation Summary ── */}
          {showErrors && (globalErrors.length > 0 || rowErrors.size > 0) && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/5 px-5 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-red-400">
                <AlertCircleIcon className="h-4 w-4" />
                Please fix the following errors before submitting:
              </div>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-300/90">
                {globalErrors.map((err, i) => (
                  <li key={`g-${i}`}>{err}</li>
                ))}
                {rowErrors.size > 0 && (
                  <li>
                    {rowErrors.size} position{rowErrors.size > 1 ? "s have" : " has"}{" "}
                    field-level errors (see below).
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* ── Position Rows ── */}
          <div className="space-y-4">
            {positions.map((pos, idx) => {
              const errs = rowErrors.get(pos.id);
              return (
              <div
                key={pos.id}
                className={`group flex flex-col gap-3 rounded-2xl border sm:flex-row sm:items-center sm:gap-4 ${
                  showErrors && errs
                    ? "border-red-500/30 bg-gray-900/80"
                    : "border-white/5 bg-gray-900"
                } p-4 transition hover:border-emerald-500/20`}
              >
                {/* Row number & delete (mobile: inline header) */}
                <div className="flex items-center justify-between sm:contents">
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <span className="hidden text-xs font-medium sm:block">&nbsp;</span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-sm font-bold text-gray-400">
                      {idx + 1}
                    </div>
                  </div>
                  {/* Mobile-only delete button */}
                  <button
                    type="button"
                    onClick={() => removePosition(pos.id)}
                    disabled={positions.length === 1}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-500 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30 sm:hidden"
                    title="Remove position"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>

                {/* Security autocomplete */}
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Holding
                  </label>
                  <AutocompleteInput
                    securities={securities}
                    selected={pos.security}
                    onSelect={(sec) =>
                      updatePosition(pos.id, {
                        security: sec,
                        name: sec?.name ?? "",
                        isin: sec?.isin ?? "",
                        ticker: sec?.ticker ?? "",
                      })
                    }
                    hasError={showErrors && !!errs?.identifier}
                    ariaLabel={`Holding for position ${idx + 1}`}
                    className="w-full"
                  />
                  {showErrors && errs?.identifier && (
                    <p className="text-xs text-red-400">{errs.identifier}</p>
                  )}
                </div>

                {/* Value input */}
                <div className="flex w-full flex-col gap-1.5 sm:w-44">
                  <label className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    {inputMode === "amount"
                      ? `Amount (${currency})`
                      : "Allocation (%)"}
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                      {inputMode === "amount" ? currencySymbol : "%"}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step={inputMode === "amount" ? "0.01" : "0.1"}
                      max={inputMode === "percentage" ? "100" : undefined}
                      value={pos.value}
                      onChange={(e) =>
                        updatePosition(pos.id, { value: e.target.value })
                      }
                      placeholder={inputMode === "amount" ? "10000" : "25.0"}
                      className={`h-10 w-full rounded-lg border ${
                        showErrors && errs?.value
                          ? "border-red-500/50 focus:border-red-500/70 focus:ring-red-500/30"
                          : "border-white/10 focus:border-emerald-500/50 focus:ring-emerald-500/30"
                      } bg-gray-800 pl-8 pr-3 text-sm text-white placeholder-gray-600 outline-none transition focus:ring-1`}
                    />
                  </div>
                  {showErrors && errs?.value && (
                    <p className="text-xs text-red-400">{errs.value}</p>
                  )}
                </div>

                {/* Remove button (desktop only - mobile version is in the header) */}
                <div className="hidden shrink-0 flex-col gap-1.5 sm:flex">
                  <span className="hidden text-xs font-medium sm:block">&nbsp;</span>
                  <button
                    type="button"
                    onClick={() => removePosition(pos.id)}
                    disabled={positions.length === 1}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-500 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
                    title="Remove position"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              );
            })}
          </div>

          {/* ── Add Position ── */}
          <button
            type="button"
            onClick={addPosition}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-transparent py-3 text-sm font-semibold text-gray-400 transition hover:border-emerald-500/30 hover:text-emerald-400"
          >
            <PlusIcon className="h-4 w-4" />
            Add Position
          </button>

          {/* ── Submit ── */}
          <div className="mt-6 flex flex-col items-center gap-4">
            {/* ─── Privacy Disclaimer ─── */}
            <div className="flex max-w-xl items-start gap-2.5 rounded-lg border border-white/5 bg-gray-900/40 px-3.5 py-2.5">
              <ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500/70" />
              <p className="text-xs leading-relaxed text-gray-500">
                <span className="font-medium text-gray-400">Your data never leaves your browser.</span>{" "}
                Stored locally via localStorage — no accounts, no servers, no tracking.
              </p>
            </div>

            {showErrors && hasErrors && (
              <p className="text-xs font-medium text-red-400">
                Resolve all errors above before submitting.
              </p>
            )}
            <button
              type="submit"
              className={`inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-semibold transition ${
                showErrors && hasErrors
                  ? "cursor-not-allowed bg-gray-700 text-gray-400"
                  : "bg-emerald-500 text-gray-950 shadow-lg shadow-emerald-500/25 hover:bg-emerald-400"
              }`}
            >
              Analyze Portfolio
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </form>
      </section>

      {/* ─── Clear Portfolio Confirmation Modal ─── */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowClearModal(false)}
          />
          {/* Dialog */}
          <div className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl shadow-black/50">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15">
                <Trash2Icon className="h-5 w-5 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Clear Portfolio</h2>
            </div>
            <p className="mb-6 text-sm leading-relaxed text-gray-400">
              Are you sure you want to clear your portfolio? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-white/10 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearPortfolio}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                Clear Portfolio
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
