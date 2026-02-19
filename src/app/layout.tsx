import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import Navbar from "./_components/navbar";
import Footer from "./_components/footer";

export const metadata: Metadata = {
  title: "SeeTF — Stock & ETF Portfolio Tracker",
  description:
    "Enter your stock and ETF positions, then see a detailed, real-time overview of your entire portfolio.",
  icons: [{ rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }],
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
      </body>
    </html>
  );
}
