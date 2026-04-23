// TaQtik Escrow contract integration
// Deploy the Solidity contract in `contracts/TaQtikEscrow.sol` to Monad testnet,
// then set VITE_TAQTIK_ESCROW_ADDRESS in your env (or paste the address below).
// While the address is unset the UI runs in "demo" mode (no on-chain tx).

export const ESCROW_ADDRESS =
  (import.meta.env.VITE_TAQTIK_ESCROW_ADDRESS as `0x${string}` | undefined) ??
  ("0x0000000000000000000000000000000000000000" as const);

export const ESCROW_ABI = [
  {
    type: "function",
    name: "createMatch",
    stateMutability: "payable",
    inputs: [{ name: "matchId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "joinMatch",
    stateMutability: "payable",
    inputs: [{ name: "matchId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "settleMatch",
    stateMutability: "nonpayable",
    inputs: [
      { name: "matchId", type: "bytes32" },
      { name: "winner", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "cancelMatch",
    stateMutability: "nonpayable",
    inputs: [{ name: "matchId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "matches",
    stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [
      { name: "host", type: "address" },
      { name: "joiner", type: "address" },
      { name: "stake", type: "uint256" },
      { name: "settled", type: "bool" },
    ],
  },
  {
    type: "event",
    name: "MatchCreated",
    inputs: [
      { name: "matchId", type: "bytes32", indexed: true },
      { name: "host", type: "address", indexed: true },
      { name: "stake", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MatchJoined",
    inputs: [
      { name: "matchId", type: "bytes32", indexed: true },
      { name: "joiner", type: "address", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MatchSettled",
    inputs: [
      { name: "matchId", type: "bytes32", indexed: true },
      { name: "winner", type: "address", indexed: true },
      { name: "payout", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;

export const isEscrowDeployed = () =>
  ESCROW_ADDRESS !== "0x0000000000000000000000000000000000000000";

// Convert a UUID match id into a bytes32 (right-padded keccak-friendly form)
export function matchIdToBytes32(uuid: string): `0x${string}` {
  const hex = uuid.replace(/-/g, "").padEnd(64, "0").slice(0, 64);
  return `0x${hex}` as `0x${string}`;
}
