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

// Arc Testnet (chainId 5042002) - USDC-native L1 from Circle
export const arcTestnet = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] },
    public: { http: ["https://rpc.testnet.arc.network"] },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: "https://testnet.arcscan.app" },
  },
  testnet: true,
} as const satisfies Chain;

export const wagmiConfig = getDefaultConfig({
  appName: "TaQtik",
  projectId: "e8c5b0234bd68d136688c3feac774014", // WalletConnect Cloud project id
  chains: [arcTestnet, monadTestnet, sepolia, baseSepolia, arbitrumSepolia, bscTestnet],
  ssr: false,
});

export const SUPPORTED_CHAINS = [
  { id: arcTestnet.id, name: "Arc Testnet", symbol: "USDC", color: "#2775CA", short: "ARC", primary: true },
  { id: monadTestnet.id, name: "Monad Testnet", symbol: "MON", color: "#836EF9", short: "MON" },
  { id: sepolia.id, name: "Ethereum Sepolia", symbol: "ETH", color: "#627EEA", short: "ETH" },
  { id: baseSepolia.id, name: "Base Sepolia", symbol: "ETH", color: "#0052FF", short: "BASE" },
  { id: arbitrumSepolia.id, name: "Arbitrum Sepolia", symbol: "ETH", color: "#28A0F0", short: "ARB" },
  { id: bscTestnet.id, name: "BSC Testnet", symbol: "tBNB", color: "#F0B90B", short: "BSC" },
];

