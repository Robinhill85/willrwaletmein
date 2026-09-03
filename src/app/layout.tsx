import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Will RWA let me in? — an agent for real-world-asset yield",
  description:
    "Yield that doesn't need a bull market. Ask the agent which RWA vaults will actually let you in — powered by CoinMarketCap RWA data and the VaultTerms registry — and deposit into the IXS agent-first vault from your own wallet.",
  metadataBase: new URL("https://willrwaletmein.com"),
  openGraph: {
    title: "Will RWA let me in?",
    description: "Yield that doesn't need a bull market. The agent that answers — and can deposit for you.",
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
