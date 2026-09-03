import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  injectedWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { avalanche } from "wagmi/chains";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [metaMaskWallet, rainbowWallet, coinbaseWallet, walletConnectWallet, injectedWallet],
    },
  ],
  {
    appName: "Will RWA let me in?",
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "REPLACE_WITH_WALLETCONNECT_PROJECT_ID",
  },
);

export const wagmiConfig = createConfig({
  connectors,
  chains: [avalanche],
  transports: { [avalanche.id]: http() },
  ssr: true,
});
