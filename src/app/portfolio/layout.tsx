import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio Builder",
  description:
    "Build your ETF and stock portfolio. Add positions, set allocations, and get a comprehensive analysis of your holdings.",
  openGraph: {
    title: "Portfolio Builder — SeeTF",
    description:
      "Build your ETF and stock portfolio and get a comprehensive analysis of your holdings.",
  },
};

export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
