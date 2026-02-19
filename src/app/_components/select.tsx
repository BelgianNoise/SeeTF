"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from "react";
import { ChevronDownIcon, CheckIcon } from "lucide-react";

/* ─── Types ─── */
export interface SelectOption {
  value: string;
  label: string;
}

export interface CustomSelectProps {
  /** Array of selectable options */
  options: SelectOption[];
  /** Currently selected value */
  value: string;
  /** Callback fired when an option is selected */
  onChange: (value: string) => void;
  /** Placeholder shown when no value is selected */
  placeholder?: string;
  /** Optional additional className for the outer wrapper */
  className?: string;
  /** Accessible label */
  ariaLabel?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   CustomSelect — a polished, keyboard-navigable select for the dark theme
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  className = "",
  ariaLabel,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useRef(
    `select-listbox-${Math.random().toString(36).slice(2, 9)}`,
  ).current;

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

  /* ── Keep focused option scrolled into view ── */
  useEffect(() => {
    if (open && focusedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[focusedIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [focusedIndex, open]);

  /* ── Resolve selected label ── */
  const selectedOption = options.find((o) => o.value === value);

  /* ── Toggle ── */
  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        // Focus the currently selected option, or first
        const idx = options.findIndex((o) => o.value === value);
        setFocusedIndex(idx >= 0 ? idx : 0);
      }
      return next;
    });
  }, [options, value]);

  /* ── Select an option ── */
  const selectOption = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      setOpen(false);
    },
    [onChange],
  );

  /* ── Keyboard handling ── */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      switch (e.key) {
        case "Enter":
        case " ": {
          e.preventDefault();
          if (!open) {
            toggle();
          } else if (focusedIndex >= 0 && focusedIndex < options.length) {
            selectOption(options[focusedIndex]!.value);
          }
          break;
        }
        case "ArrowDown": {
          e.preventDefault();
          if (!open) {
            toggle();
          } else {
            setFocusedIndex((prev) =>
              prev < options.length - 1 ? prev + 1 : 0,
            );
          }
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          if (!open) {
            toggle();
          } else {
            setFocusedIndex((prev) =>
              prev > 0 ? prev - 1 : options.length - 1,
            );
          }
          break;
        }
        case "Escape": {
          e.preventDefault();
          setOpen(false);
          break;
        }
        case "Tab": {
          setOpen(false);
          break;
        }
        default:
          break;
      }
    },
    [open, focusedIndex, options, toggle, selectOption],
  );

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* ── Trigger Button ── */}
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-label={ariaLabel}
        onClick={toggle}
        className={`
          flex h-10 w-full items-center justify-between gap-2 rounded-lg border
          bg-gray-800 px-3 text-sm outline-none transition-all duration-200
          ${
            open
              ? "border-emerald-500/50 ring-1 ring-emerald-500/30 text-white"
              : "border-white/10 text-white hover:border-white/20"
          }
          focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30
        `}
      >
        <span className={selectedOption ? "text-white" : "text-gray-500"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${
            open ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {/* ── Dropdown ── */}
      <div
        className={`
          absolute left-0 z-50 mt-1.5 w-full origin-top rounded-xl border border-white/10
          bg-gray-800 shadow-xl shadow-black/40 backdrop-blur-sm
          transition-all duration-200
          ${
            open
              ? "scale-100 opacity-100 translate-y-0"
              : "pointer-events-none scale-95 opacity-0 -translate-y-1"
          }
        `}
      >
        <ul
          id={listboxId}
          ref={listRef}
          role="listbox"
          className="custom-scrollbar max-h-60 overflow-auto py-1.5"
        >
          {options.map((option, idx) => {
            const isSelected = option.value === value;
            const isFocused = idx === focusedIndex;

            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => selectOption(option.value)}
                onMouseEnter={() => setFocusedIndex(idx)}
                className={`
                  flex cursor-pointer items-center gap-2.5 px-3 py-2.5 text-sm
                  transition-colors duration-100
                  ${
                    isFocused
                      ? "bg-emerald-500/10 text-emerald-300"
                      : isSelected
                        ? "text-emerald-400"
                        : "text-gray-300 hover:text-white"
                  }
                `}
              >
                {/* ── Check icon for selected option ── */}
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {isSelected && (
                    <CheckIcon className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                </span>

                <span className="truncate font-medium">{option.label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
