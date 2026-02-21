import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio Builder",
  description:
    "Build your ETF and stock portfolio. Add positions, set allocations, and get a comprehensive analysis of your holdings.",
  openGraph: {
    title: "Portfolio Builder — SeeTF",
    description:
      "Build your ETF and stock portfolio and get a comprehensive analysis of your holdings.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SeeTF — ETF Portfolio Analyzer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Portfolio Builder — SeeTF",
    description:
      "Build your ETF and stock portfolio and get a comprehensive analysis of your holdings.",
    images: ["/og-image.png"],
  },
};

export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
