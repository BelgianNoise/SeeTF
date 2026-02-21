import { type Metadata } from "next";
import { api } from "~/trpc/server";

type Props = {
  params: Promise<{ isin: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { isin } = await params;
  try {
    const data = await api.securities.getEtfFullComposition({ isin });
    const name = data.etfName || `ETF ${isin}`;
    const title = `${name} (${isin})`;

    const parts = [`Detailed composition breakdown of ${name} (${isin}).`];
    if (data.ter) parts.push(`TER: ${data.ter}.`);
    if (data.totalHoldings) parts.push(`${data.totalHoldings}.`);
    parts.push("View holdings, countries, sectors, and returns on SeeTF.");
    const description = parts.join(" ");

    return {
      title,
      description,
      openGraph: {
        title: `${title} — SeeTF`,
        description,
        type: "article",
      },
      twitter: {
        card: "summary",
        title: `${title} — SeeTF`,
        description,
      },
    };
  } catch {
    return {
      title: `ETF ${isin}`,
      description: `View detailed composition and analysis for ETF ${isin} on SeeTF.`,
    };
  }
}

export default function EtfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
