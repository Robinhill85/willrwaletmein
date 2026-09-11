import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Will RWA let me in? — an agent for real-world-asset yield",
  description:
    "Yield that doesn't need a bull market. Ask the agent which RWA vaults will actually let you in — powered by CoinMarketCap RWA data and the VaultTerms registry — and draft an IXS vault deposit of $100 USDC or more for you to sign in your wallet.",
  metadataBase: new URL("https://willrwaletmein.com"),
  openGraph: {
    title: "Will RWA let me in?",
    description: "Research RWA vaults with live market data and verified terms. Draft IXS deposits from $100 USDC for your wallet to sign.",
    images: ["/hero.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
