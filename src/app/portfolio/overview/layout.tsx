import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio Overview",
  description:
    "See a detailed overview of your portfolio: combined holdings, country exposure, sector breakdown, and overlap analysis across all your ETFs and stocks.",
  openGraph: {
    title: "Portfolio Overview — SeeTF",
    description:
      "Combined holdings, country exposure, sector breakdown, and overlap analysis across all your ETFs and stocks.",
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
    title: "Portfolio Overview — SeeTF",
    description:
      "Combined holdings, country exposure, sector breakdown, and overlap analysis across all your ETFs and stocks.",
    images: ["/og-image.png"],
  },
};

export default function PortfolioOverviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
