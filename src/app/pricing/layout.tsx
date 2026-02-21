import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "SeeTF is 100% free. No hidden fees, no credit card required. Analyze your ETF portfolio with unlimited positions, real-time data, and advanced analytics.",
  openGraph: {
    title: "Pricing — SeeTF",
    description:
      "SeeTF is 100% free. No hidden fees, no credit card required. Unlimited positions, real-time data, and advanced analytics.",
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
    title: "Pricing — SeeTF",
    description:
      "SeeTF is 100% free. No hidden fees, no credit card required. Unlimited positions, real-time data, and advanced analytics.",
    images: ["/og-image.png"],
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
