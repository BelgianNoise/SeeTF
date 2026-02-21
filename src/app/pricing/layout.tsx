import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "SeeTF is 100% free. No hidden fees, no credit card required. Analyze your ETF portfolio with unlimited positions, real-time data, and advanced analytics.",
  openGraph: {
    title: "Pricing — SeeTF",
    description:
      "SeeTF is 100% free. No hidden fees, no credit card required. Unlimited positions, real-time data, and advanced analytics.",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
