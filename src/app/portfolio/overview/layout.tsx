import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio Overview",
  description:
    "See a detailed overview of your portfolio: combined holdings, country exposure, sector breakdown, and overlap analysis across all your ETFs and stocks.",
  openGraph: {
    title: "Portfolio Overview — SeeTF",
    description:
      "Combined holdings, country exposure, sector breakdown, and overlap analysis across all your ETFs and stocks.",
  },
};

export default function PortfolioOverviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
