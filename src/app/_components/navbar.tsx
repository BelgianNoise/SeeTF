"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  // Hide the regular navbar on portfolio builder, overview, and ETF detail pages
  const hidden =
    pathname.startsWith("/portfolio") || pathname.startsWith("/etf");

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (hidden) return null;

  return (
    <nav
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "border-b border-white/5 bg-gray-950/80 backdrop-blur-lg"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-white"
        >
          See<span className="text-emerald-400">TF</span>
        </Link>

        <div className="hidden items-center gap-8 text-sm text-gray-400 md:flex">
          {navLinks.map(({ href, label }) => {
            const isActive =
              href === "/pricing"
                ? pathname === "/pricing"
                : false;

            return (
              <Link
                key={href}
                href={href}
                className={
                  isActive
                    ? "text-white"
                    : "transition hover:text-white"
                }
              >
                {label}
              </Link>
            );
          })}
        </div>

        <Link
          href="/portfolio"
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-gray-950 transition hover:bg-emerald-400"
        >
          Launch App
        </Link>
      </div>
    </nav>
  );
}
