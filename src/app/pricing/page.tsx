"use client";

import { useState } from "react";
import { ArrowRightIcon, CheckIcon, XIcon } from "lucide-react";
import Link from "next/link";

/* ───────────────────────────── pricing tiers ───────────────────────────────── */
const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description:
      "Everything. Unlimited. No catch. Seriously, why are you still reading the other tiers?",
    highlight: true,
    paid: false,
    cta: "Get Started — It's Free!",
    badge: "Best Value 🏆",
    features: [
      "Unlimited positions",
      "Real-time price updates",
      "Advanced analytics & charts",
      "Unlimited portfolios",
      "Team collaboration",
      "Priority email support",
      "CSV & PDF export",
      "Dividend tracking",
      "Performance benchmarks",
      "Custom watchlists",
      "API access",
      "SSO & advanced security",
      "Custom integrations",
      "White-label reports",
      "Onboarding & training",
      "SLA & uptime guarantee",
      "Literally everything else too",
    ],
  },
  {
    name: "Pro",
    price: "$12",
    period: "/month",
    description:
      "For people who enjoy burning money. All the same stuff as Free, but you get to feel fancy.",
    highlight: false,
    paid: true,
    cta: "Waste Your Money",
    badge: null,
    features: [
      "A warm fuzzy feeling",
      "Premium loading spinners",
      "Your name whispered to our servers",
      "Artisanal, hand-crafted 404 pages",
      "Early access to typos in our changelog",
      "A digital high-five once a month",
      "Priority placement in our thoughts & prayers",
    ],
  },
  {
    name: "Enterprise",
    price: "$49",
    period: "/month",
    description:
      "For when you want to financially support our snack budget. Thank you for your service.",
    highlight: false,
    paid: true,
    cta: "Fund Our Snacks",
    badge: null,
    features: [
      "A personal thank-you email (eventually)",
      "We'll name a bug after you",
      "Priority access to our meme collection",
      "A framed screenshot of your payment",
      "Exclusive access to our Spotify playlist",
      "Your logo on our fridge (in the break room)",
      "Dedicated account manager (it's just Dave)",
      "We'll follow you back on Twitter",
    ],
  },
];

/* ───────────────────────── mocking messages ────────────────────────────────── */
const mockingMessages = [
  "Why would you pay for this? Everything is already free! 😂",
  "Your money is better spent on snacks. Trust us, we know.",
  "We admire your generosity, but please — keep your money!",
  "Error 402: Payment unnecessary. Go enjoy the free tier!",
  "Our accountant said we legally cannot take your money for this.",
  "Plot twist: the Free tier has EVERYTHING. You've been bamboozled!",
];

function getRandomMock(): string {
  return mockingMessages[Math.floor(Math.random() * mockingMessages.length)]!;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function PricingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [mockMsg, setMockMsg] = useState("");

  function handlePaidClick() {
    setMockMsg(getRandomMock());
    setModalOpen(true);
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* ─── Hero ─── */}
      <section className="relative isolate overflow-hidden">
        {/* gradient blobs */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -top-60 right-0 -z-10 h-[400px] w-[400px] rounded-full bg-sky-500/10 blur-3xl" />

        <div className="mx-auto flex max-w-4xl flex-col items-center px-6 pb-16 pt-24 text-center md:pt-32">
          <span className="mb-5 inline-block rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1 text-xs font-medium tracking-wide text-emerald-400">
            Honest pricing — it&apos;s all free
          </span>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
            Why pay when it&apos;s
            <br className="hidden sm:block" />{" "}
            <span className="text-emerald-400">completely free?</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-400">
            Everything is free. Every feature, every tool, every pixel.
            The paid tiers exist purely for your entertainment. You&apos;re
            welcome.
          </p>
        </div>
      </section>

      {/* ─── Pricing Cards ─── */}
      <section className="pb-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl border p-8 transition ${
                tier.highlight
                  ? "border-emerald-500/50 bg-gray-900 shadow-2xl shadow-emerald-500/10 ring-2 ring-emerald-500/30"
                  : "border-white/5 bg-gray-900/60 hover:border-white/10 opacity-80"
              }`}
            >
              {tier.badge && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-1 text-xs font-bold uppercase tracking-wider text-gray-950">
                  {tier.badge}
                </span>
              )}

              <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
              <p className="mt-2 text-sm text-gray-400">{tier.description}</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold tracking-tight text-white">
                  {tier.price}
                </span>
                <span className="text-sm text-gray-500">{tier.period}</span>
              </div>

              {tier.paid ? (
                <button
                  onClick={handlePaidClick}
                  className="mt-8 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 cursor-pointer"
                >
                  {tier.cta}
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
              ) : (
                <Link
                  href="/portfolio"
                  className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-gray-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400"
                >
                  {tier.cta}
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              )}

              <ul className="mt-8 flex flex-col gap-3">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className={`flex items-start gap-3 text-sm ${
                      tier.paid ? "text-gray-500 italic" : "text-gray-300"
                    }`}
                  >
                    <CheckIcon
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        tier.paid ? "text-gray-600" : "text-emerald-400"
                      }`}
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FAQ / Bottom CTA ─── */}
      <section className="border-t border-white/5 py-24">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Still thinking about paying?
          </h2>
          <p className="mt-4 max-w-xl text-gray-400">
            Don&apos;t. It&apos;s free. All of it. Go start building your
            portfolio right now — no credit card, no tricks, no &quot;freemium&quot;
            bait-and-switch.
          </p>
          <Link
            href="/portfolio"
            className="mt-10 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-3.5 text-sm font-semibold text-gray-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400"
          >
            Get Started — It&apos;s Free
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </section>



      {/* ─── Mocking Modal ─── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 p-8 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-gray-500 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <XIcon className="h-5 w-5" />
            </button>

            <span className="text-6xl">🤨</span>
            <h3 className="mt-4 text-xl font-bold text-white">
              Hold up there, big spender!
            </h3>
            <p className="mt-3 text-gray-400">{mockMsg}</p>

            <Link
              href="/portfolio"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-gray-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400"
              onClick={() => setModalOpen(false)}
            >
              Fine, I&apos;ll take it for free
              <ArrowRightIcon className="h-4 w-4" />
            </Link>

            <p className="mt-4 text-xs text-gray-600">
              Seriously though, everything is free. Go enjoy it.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
