// Circle CCTP (Cross-Chain Transfer Protocol) v2 testnet integration.
// Burns USDC on the source chain, fetches Circle's attestation, then mints on the destination chain.
// Docs: https://developers.circle.com/stablecoins/cctp-getting-started

import { sepolia, baseSepolia, arbitrumSepolia } from "wagmi/chains";
import { type Address, encodeFunctionData, pad, getAddress } from "viem";

// CCTP v2 (TestnetTransmitter) supported testnets and their domain ids + contract addresses.
// Source: https://developers.circle.com/stablecoins/evm-smart-contracts (testnet section)
export type CctpChain = {
  chainId: number;
  domain: number;
  name: string;
  usdc: Address;
  tokenMessenger: Address; // burn entry-point
  messageTransmitter: Address; // mint entry-point
};

export const CCTP_CHAINS: CctpChain[] = [
  {
    chainId: sepolia.id,
    domain: 0,
    name: "Ethereum Sepolia",
    usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    tokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
    messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
  },
  {
    chainId: baseSepolia.id,
    domain: 6,
    name: "Base Sepolia",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    tokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
    messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
  },
  {
    chainId: arbitrumSepolia.id,
    domain: 3,
    name: "Arbitrum Sepolia",
    usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    tokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
    messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
  },
];

export function findCctpChain(chainId: number | undefined): CctpChain | undefined {
  return CCTP_CHAINS.find((c) => c.chainId === chainId);
}

// ---- Calldata builders (CCTP v2) ----

// approve(spender, amount)
export function buildApproveCalldata(spender: Address, amount: bigint) {
  return encodeFunctionData({
    abi: [
      {
        type: "function",
        name: "approve",
        stateMutability: "nonpayable",
        inputs: [
          { name: "spender", type: "address" },
          { name: "amount", type: "uint256" },
        ],
        outputs: [{ type: "bool" }],
      },
    ],
    functionName: "approve",
    args: [spender, amount],
  });
}

// depositForBurn(amount, destinationDomain, mintRecipient, burnToken, destinationCaller, maxFee, minFinalityThreshold)
// CCTP v2 signature.
export function buildDepositForBurnCalldata(args: {
  amount: bigint;
  destinationDomain: number;
  mintRecipient: Address;
  burnToken: Address;
  maxFee: bigint;
}) {
  const recipient32 = pad(getAddress(args.mintRecipient), { size: 32 });
  const zero32 = pad("0x", { size: 32 });
  return encodeFunctionData({
    abi: [
      {
        type: "function",
        name: "depositForBurn",
        stateMutability: "nonpayable",
        inputs: [
          { name: "amount", type: "uint256" },
          { name: "destinationDomain", type: "uint32" },
          { name: "mintRecipient", type: "bytes32" },
          { name: "burnToken", type: "address" },
          { name: "destinationCaller", type: "bytes32" },
          { name: "maxFee", type: "uint256" },
          { name: "minFinalityThreshold", type: "uint32" },
        ],
        outputs: [],
      },
    ],
    functionName: "depositForBurn",
    args: [
      args.amount,
      args.destinationDomain,
      recipient32,
      args.burnToken,
      zero32,
      args.maxFee,
      1000, // standard finality on testnet
    ],
  });
}

// receiveMessage(message, attestation)
export function buildReceiveMessageCalldata(message: `0x${string}`, attestation: `0x${string}`) {
  return encodeFunctionData({
    abi: [
      {
        type: "function",
        name: "receiveMessage",
        stateMutability: "nonpayable",
        inputs: [
          { name: "message", type: "bytes" },
          { name: "attestation", type: "bytes" },
        ],
        outputs: [{ type: "bool" }],
      },
    ],
    functionName: "receiveMessage",
    args: [message, attestation],
  });
}

// Poll Circle's testnet attestation API by source domain + tx hash (CCTP v2)
export async function fetchAttestation(
  sourceDomain: number,
  txHash: string,
): Promise<{ message: `0x${string}`; attestation: `0x${string}` } | null> {
  const url = `https://iris-api-sandbox.circle.com/v2/messages/${sourceDomain}?transactionHash=${txHash}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      messages?: Array<{ status: string; message: string; attestation: string }>;
    };
    const msg = json.messages?.[0];
    if (!msg || msg.status !== "complete") return null;
    return {
      message: msg.message as `0x${string}`,
      attestation: msg.attestation as `0x${string}`,
    };
  } catch {
    return null;
  }
}
