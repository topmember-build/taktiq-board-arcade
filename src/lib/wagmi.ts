import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia, baseSepolia, arbitrumSepolia, bscTestnet } from "wagmi/chains";
import type { Chain } from "viem";

// Monad Testnet (chainId 10143)
export const monadTestnet = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
    public: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "MonadExplorer", url: "https://testnet.monadexplorer.com" },
  },
  testnet: true,
} as const satisfies Chain;

export const wagmiConfig = getDefaultConfig({
  appName: "TaQtik",
  projectId: "taqtik-arcade", // public WalletConnect project id placeholder
  chains: [monadTestnet, sepolia, baseSepolia, arbitrumSepolia, bscTestnet],
  ssr: false,
});

export const SUPPORTED_CHAINS = [
  { id: monadTestnet.id, name: "Monad Testnet", symbol: "MON", color: "#836EF9" },
  { id: sepolia.id, name: "Ethereum Sepolia", symbol: "ETH", color: "#627EEA" },
  { id: baseSepolia.id, name: "Base Sepolia", symbol: "ETH", color: "#0052FF" },
  { id: arbitrumSepolia.id, name: "Arbitrum Sepolia", symbol: "ETH", color: "#28A0F0" },
  { id: bscTestnet.id, name: "BSC Testnet", symbol: "tBNB", color: "#F0B90B" },
];
