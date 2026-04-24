import { useEffect, useState } from "react";
import { useReadContract, usePublicClient } from "wagmi";
import { ESCROW_ABI, ESCROW_ADDRESS, isEscrowDeployed, matchIdToBytes32 } from "@/lib/escrow";

export type EscrowState = {
  hostLocked: boolean;
  joinerLocked: boolean;
  totalStake: bigint;
  settled: boolean;
  loading: boolean;
  error: string | null;
  verifiedAt: number | null;
  refresh: () => void;
};

/**
 * Polls the on-chain escrow contract + reconciles with the off-chain match
 * record so the UI only enables betting/join actions once funds are confirmed
 * locked. Falls back to DB-only signal when the escrow contract is not
 * configured for the chain.
 */
export function useEscrowVerifier(opts: {
  matchId: string | null;
  chainId: number | undefined;
  hostWallet: string | null;
  joinerWallet: string | null;
  escrowTxHash: string | null;
  stakeAmount: number;
}): EscrowState {
  const { matchId, chainId, hostWallet, joinerWallet, escrowTxHash, stakeAmount } = opts;
  const isMonad = chainId === 10143;
  const escrowReady = isMonad && isEscrowDeployed();
  const publicClient = usePublicClient({ chainId });
  const [verifiedAt, setVerifiedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const matchIdBytes = matchId ? matchIdToBytes32(matchId) : undefined;

  const {
    data: onChainMatch,
    isLoading,
    refetch,
  } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "matches",
    args: matchIdBytes ? [matchIdBytes] : undefined,
    chainId,
    query: {
      enabled: escrowReady && !!matchIdBytes,
      refetchInterval: 8000,
    },
  });

  // Manual polling tick to verify the tx receipt was included
  useEffect(() => {
    if (!escrowReady || !escrowTxHash || escrowTxHash === "demo" || !publicClient) return;
    let cancelled = false;
    const verify = async () => {
      try {
        const receipt = await publicClient.getTransactionReceipt({
          hash: escrowTxHash as `0x${string}`,
        });
        if (!cancelled && receipt && receipt.status === "success") {
          setVerifiedAt(Date.now());
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.shortMessage ?? "Awaiting confirmation…");
      }
    };
    verify();
    const id = setInterval(verify, 6000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [escrowReady, escrowTxHash, publicClient, tick]);

  // Demo / non-Monad: rely on DB hash being present
  if (!escrowReady) {
    const hostLocked = !!escrowTxHash;
    return {
      hostLocked,
      joinerLocked: hostLocked && !!joinerWallet,
      totalStake: BigInt(0),
      settled: false,
      loading: false,
      error: null,
      verifiedAt: hostLocked ? Date.now() : null,
      refresh: () => setTick((t) => t + 1),
    };
  }

  const tuple = onChainMatch as
    | readonly [`0x${string}`, `0x${string}`, bigint, boolean]
    | undefined;
  const ZERO = "0x0000000000000000000000000000000000000000";
  const onChainHost = tuple?.[0] ?? ZERO;
  const onChainJoiner = tuple?.[1] ?? ZERO;
  const stake = tuple?.[2] ?? BigInt(0);
  const settled = tuple?.[3] ?? false;

  const hostMatches =
    !!hostWallet && onChainHost.toLowerCase() === hostWallet.toLowerCase() && stake > BigInt(0);
  const joinerMatches =
    !!joinerWallet &&
    onChainJoiner.toLowerCase() === joinerWallet.toLowerCase() &&
    onChainJoiner !== ZERO;

  return {
    hostLocked: hostMatches,
    joinerLocked: joinerMatches,
    totalStake: stake * BigInt(joinerMatches ? 2 : 1),
    settled,
    loading: isLoading,
    error,
    verifiedAt,
    refresh: () => {
      setTick((t) => t + 1);
      void refetch();
    },
  };
}
