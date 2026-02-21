import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { Analytics } from "@vercel/analytics/next";
import Navbar from "./_components/navbar";
import Footer from "./_components/footer";

const siteUrl = "https://see-tf.nasaj.be";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SeeTF — Free ETF Portfolio Analyzer",
    template: "%s — SeeTF",
  },
  description:
    "Analyze your ETF portfolio for free. See holdings, country exposure, sector breakdown, TER comparison, and returns — all in one place.",
  icons: [{ rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }],
  openGraph: {
    title: "SeeTF — Free ETF Portfolio Analyzer",
    description:
      "Analyze your ETF portfolio for free. See holdings, country exposure, sector breakdown, TER comparison, and returns — all in one place.",
    url: siteUrl,
    siteName: "SeeTF",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SeeTF — ETF Portfolio Analyzer showing portfolio overview with holdings, countries, and sectors",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SeeTF — Free ETF Portfolio Analyzer",
    description:
      "Analyze your ETF portfolio for free. See holdings, country exposure, sector breakdown, TER comparison, and returns.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body className="bg-gray-950">
        <TRPCReactProvider>
          <Navbar />
          {children}
          <Footer />
        </TRPCReactProvider>
        <Analytics />
      </body>
    </html>
  );
}
