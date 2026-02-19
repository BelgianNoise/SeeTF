"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type KeyboardEvent,
} from "react";
import { Loader2, SearchIcon, XIcon } from "lucide-react";
import {
  type SecurityResult,
  securityDisplayValue,
} from "~/types/portfolio";
import { api } from "~/trpc/react";

/* Re-export for consumers that import SecurityResult from here */
export type { SecurityResult };

export interface AutocompleteInputProps {
  /** Full list of securities to filter client-side */
  securities: SecurityResult[];
  /** The currently selected security (null when cleared) */
  selected: SecurityResult | null;
  /** Called when a security is selected or cleared */
  onSelect: (security: SecurityResult | null) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to show error styling */
  hasError?: boolean;
  /** Accessible label */
  ariaLabel?: string;
  /** Additional className for the outer wrapper */
  className?: string;
}

const MAX_RESULTS = 20;

/* ═══════════════════════════════════════════════════════════════════════════════
   AutocompleteInput — client-side security search over a pre-fetched list
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function AutocompleteInput({
  securities,
  selected,
  onSelect,
  placeholder = "Search by name, ticker, or ISIN…",
  hasError = false,
  ariaLabel = "Search securities",
  className = "",
}: AutocompleteInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  /* ── Debounced query for server-side search ── */
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const trimmed = inputValue.trim();
    if (trimmed.length === 0) {
      setDebouncedQuery("");
      return;
    }
    const timer = setTimeout(() => setDebouncedQuery(trimmed), 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  /* ── Server-side search via tRPC ── */
  const { data: searchResults, isFetching } = api.securities.search.useQuery(
    { query: debouncedQuery },
    {
      enabled: debouncedQuery.length >= 1,
      staleTime: 24 * 60 * 60 * 1000, // cache for 24h
      refetchOnWindowFocus: false,
    },
  );

  /* ── Loading state: true when user has typed but server results haven't arrived ── */
  const isSearching =
    isFetching || (inputValue.trim().length >= 1 && inputValue.trim() !== debouncedQuery);

  /* ── Merged filtering: client-side first, then server results ── */
  const displayItems = useMemo(() => {
    const q = inputValue.trim().toLowerCase();

    // Client-side filtering of the pre-fetched list
    let clientFiltered: SecurityResult[];
    if (!q) {
      clientFiltered = securities.slice(0, MAX_RESULTS);
    } else {
      clientFiltered = securities.filter(
        (s) =>
          s.ticker.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.isin?.toLowerCase().includes(q),
      );
    }

    // Merge server search results (deduplicated by ticker)
    const serverResults = (searchResults ?? []) as SecurityResult[];
    const seen = new Set(clientFiltered.map((s) => s.ticker));
    const merged = [...clientFiltered];
    for (const s of serverResults) {
      if (!seen.has(s.ticker)) {
        merged.push(s);
        seen.add(s.ticker);
      }
    }

    return merged.slice(0, MAX_RESULTS);
  }, [securities, inputValue, searchResults]);

  /* ── Close on outside click ── */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ── Keep focused item scrolled into view ── */
  useEffect(() => {
    if (open && focusedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[focusedIndex] as
        | HTMLElement
        | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [focusedIndex, open]);

  /* ── Sync display value when selected changes externally ── */
  useEffect(() => {
    if (selected) {
      setInputValue(securityDisplayValue(selected));
    }
  }, [selected]);

  /* ── Handlers ── */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (selected) onSelect(null); // clear selection when user types again
    setOpen(true);
    setFocusedIndex(-1);
  };

  const selectItem = useCallback(
    (item: SecurityResult) => {
      onSelect(item);
      setInputValue(securityDisplayValue(item));
      setOpen(false);
      setFocusedIndex(-1);
    },
    [onSelect],
  );

  const clearSelection = () => {
    onSelect(null);
    setInputValue("");
    setOpen(false);
    setFocusedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || displayItems.length === 0) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % displayItems.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => (prev <= 0 ? displayItems.length - 1 : prev - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < displayItems.length) {
          selectItem(displayItems[focusedIndex]!);
        }
        break;
      case "Escape":
        setOpen(false);
        setFocusedIndex(-1);
        break;
    }
  };

  const handleFocus = () => {
    if (!selected) setOpen(true);
  };

  /* ── Highlight matched text helper ── */
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.trim().toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="text-emerald-400 font-semibold">
          {text.slice(idx, idx + query.length)}
        </span>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* ── Input ── */}
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
          <SearchIcon className="h-4 w-4" />
        </span>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls="autocomplete-listbox"
          aria-activedescendant={
            focusedIndex >= 0 ? `autocomplete-option-${focusedIndex}` : undefined
          }
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`h-10 w-full rounded-lg border ${
            hasError
              ? "border-red-500/50 focus:border-red-500/70 focus:ring-red-500/30"
              : "border-white/10 focus:border-emerald-500/50 focus:ring-emerald-500/30"
          } bg-gray-800 pl-9 pr-9 text-sm text-white placeholder-gray-600 outline-none transition focus:ring-1`}
        />
        {isSearching && !selected && (
          <span className="pointer-events-none absolute right-9 top-1/2 -translate-y-1/2 text-emerald-400">
            <Loader2 className="h-4 w-4 animate-spin" />
          </span>
        )}
        {(selected ?? inputValue) && (
          <button
            type="button"
            onClick={clearSelection}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-500 transition hover:text-white"
            title="Clear selection"
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Dropdown ── */}
      {open && !selected && (
        <ul
          ref={listRef}
          id="autocomplete-listbox"
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-white/10 bg-gray-900 py-1 shadow-xl shadow-black/40"
        >
          {isSearching && displayItems.length === 0 && (
            <li className="flex items-center gap-2 px-4 py-3 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
              Searching…
            </li>
          )}
          {!isSearching && displayItems.length === 0 && inputValue.trim().length > 0 && (
            <li className="px-4 py-3 text-sm text-gray-500">
              No results found
            </li>
          )}
          {displayItems.map((item, idx) => (
            <li
              key={`${item.ticker}-${item.isin || idx}`}
              id={`autocomplete-option-${idx}`}
              role="option"
              aria-selected={focusedIndex === idx}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent blur before click fires
                selectItem(item);
              }}
              onMouseEnter={() => setFocusedIndex(idx)}
              className={`cursor-pointer px-4 py-2.5 text-sm transition ${
                focusedIndex === idx
                  ? "bg-emerald-500/10 text-white"
                  : "text-gray-300 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="block truncate">
                    {highlightMatch(item.name, inputValue)}
                  </span>
                  <span className="block truncate text-xs text-gray-500">
                    {highlightMatch(item.ticker, inputValue)}
                    {item.isin && (
                      <> · {highlightMatch(item.isin, inputValue)}</>
                    )}
                  </span>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    item.type === "etf"
                      ? "bg-sky-500/10 text-sky-400"
                      : "bg-violet-500/10 text-violet-400"
                  }`}
                >
                  {item.type}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
