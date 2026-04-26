import { SUPPORTED_CHAINS, monadTestnet, arcTestnet } from "./wagmi";
import { sepolia, baseSepolia, arbitrumSepolia, bscTestnet } from "wagmi/chains";

const EXPLORERS: Record<number, string> = {
  [monadTestnet.id]: "https://testnet.monadexplorer.com",
  [arcTestnet.id]: "https://testnet.arcscan.app",
  [sepolia.id]: "https://sepolia.etherscan.io",
  [baseSepolia.id]: "https://sepolia.basescan.org",
  [arbitrumSepolia.id]: "https://sepolia.arbiscan.io",
  [bscTestnet.id]: "https://testnet.bscscan.com",
};

export function explorerTxUrl(chainId: number | undefined, hash: string) {
  const base = EXPLORERS[chainId ?? 0] ?? "https://etherscan.io";
  return `${base}/tx/${hash}`;
}

export function explorerAddressUrl(chainId: number | undefined, address: string) {
  const base = EXPLORERS[chainId ?? 0] ?? "https://etherscan.io";
  return `${base}/address/${address}`;
}

export function chainName(chainId: number | undefined) {
  return SUPPORTED_CHAINS.find((c) => c.id === chainId)?.name ?? `Chain ${chainId}`;
}
