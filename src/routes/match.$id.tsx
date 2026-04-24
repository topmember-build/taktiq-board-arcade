import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import {
  ArrowLeft,
  Coins,
  Trophy,
  Users,
  Loader2,
  ShieldCheck,
  Lock,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SUPPORTED_CHAINS } from "@/lib/wagmi";
import { ESCROW_ABI, ESCROW_ADDRESS, isEscrowDeployed, matchIdToBytes32 } from "@/lib/escrow";
import { ChessBoard } from "@/components/games/ChessBoard";
import { CheckersBoard } from "@/components/games/CheckersBoard";
import { BackgammonBoard } from "@/components/games/BackgammonBoard";
import { MonopolyBoard } from "@/components/games/MonopolyBoard";
import { ScrabbleBoard } from "@/components/games/ScrabbleBoard";
import { MatchChat } from "@/components/games/MatchChat";
import { initialBoard as initCheckers } from "@/lib/games/checkers";
import { initialBoard as initBackgammon } from "@/lib/games/backgammon";
import { initialMonopoly } from "@/lib/games/monopoly";
import { initialScrabble } from "@/lib/games/scrabble";
import { Chess } from "chess.js";
import { toast } from "sonner";
import { useMatchSync } from "@/hooks/useMatchSync";
import { useEscrowVerifier } from "@/hooks/useEscrowVerifier";

export const Route = createFileRoute("/match/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Match ${params.id.slice(0, 8)} — TaQtik` },
      { name: "description", content: "Live on-chain board game match on TaQtik." },
    ],
  }),
  component: MatchRoomPage,
});

type MatchRow = {
  id: string;
  game: string;
  chain_id: number;
  stake_amount: number;
  token_symbol: string;
  status: string;
  host_wallet: string | null;
  joiner_wallet: string | null;
  current_state: any;
  turn_wallet: string | null;
  escrow_address: string | null;
  escrow_tx_hash: string | null;
  winner: string | null;
  time_control: string | null;
  created_at: string;
  updated_at: string;
};

type PendingMove = {
  id: string;
  move: unknown;
  nextState: unknown;
  result: string | null;
  attempts: number;
  error: string | null;
};

function MatchRoomPage() {
  const { id } = Route.useParams();
  const { address } = useAccount();
  const navigate = useNavigate();
  const [staking, setStaking] = useState(false);
  const [pendingTx, setPendingTx] = useState<`0x${string}` | undefined>();
  const [now, setNow] = useState(Date.now());
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Realtime + polling fallback for match state
  const { data: match, loading } = useMatchSync<MatchRow>(id);

  // Navigate away if match is deleted
  useEffect(() => {
    if (!loading && !match) {
      // give realtime a moment before redirecting
      const t = setTimeout(() => {
        if (!match) navigate({ to: "/lobby" });
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [loading, match, navigate]);

  const { writeContractAsync } = useWriteContract();
  const { data: txReceipt, isLoading: waitingTx } = useWaitForTransactionReceipt({
    hash: pendingTx,
  });

  // Tick once a second for the move clock
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // When the host's createMatch tx confirms, persist the hash + escrow address
  useEffect(() => {
    if (txReceipt && pendingTx && match && !match.escrow_tx_hash) {
      supabase
        .from("matches")
        .update({ escrow_tx_hash: pendingTx, escrow_address: ESCROW_ADDRESS })
        .eq("id", match.id)
        .then(() => {
          toast.success("Stake locked on-chain ✓");
          setPendingTx(undefined);
        });
    }
  }, [txReceipt, pendingTx, match]);

  const isHost = !!match?.host_wallet && address?.toLowerCase() === match.host_wallet.toLowerCase();
  const isJoiner =
    !!match?.joiner_wallet && address?.toLowerCase() === match.joiner_wallet.toLowerCase();
  const isPlayer = isHost || isJoiner;

  const chain = SUPPORTED_CHAINS.find((c) => c.id === match?.chain_id);
  const isMonad = match?.chain_id === 10143;
  const escrowReady = isMonad && isEscrowDeployed();

  // Verifier: polls on-chain + reconciles with DB to confirm locked funds
  const escrow = useEscrowVerifier({
    matchId: match?.id ?? null,
    chainId: match?.chain_id,
    hostWallet: match?.host_wallet ?? null,
    joinerWallet: match?.joiner_wallet ?? null,
    escrowTxHash: match?.escrow_tx_hash ?? null,
    stakeAmount: match?.stake_amount ?? 0,
  });
  const hostLocked = escrow.hostLocked;

  // Determine my color/turn per game
  const myColor = useMemo(() => {
    if (!match) return null;
    if (match.game === "chess") return isHost ? "w" : "b";
    if (match.game === "checkers") return isHost ? "red" : "black";
    if (match.game === "backgammon") return isHost ? "white" : "black";
    if (match.game === "monopoly" || match.game === "scrabble") return isHost ? "host" : "joiner";
    return null;
  }, [match, isHost]);

  const isMyTurn =
    !!address && !!match?.turn_wallet && match.turn_wallet.toLowerCase() === address.toLowerCase();

  // Move clock: seconds since the last update
  const moveSecs = match ? Math.floor((now - new Date(match.updated_at).getTime()) / 1000) : 0;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // Initial state factory
  const initialFor = (game: string) => {
    if (game === "chess") return new Chess().fen();
    if (game === "checkers") return initCheckers();
    if (game === "backgammon") return initBackgammon();
    if (game === "monopoly") return initialMonopoly();
    if (game === "scrabble") return initialScrabble();
    return null;
  };

  // Join match — locks stake on-chain (when escrow live) before flipping status
  const joinMatch = async () => {
    if (!address || !match) return;
    if (!hostLocked) {
      toast.error("Host hasn't locked their stake yet — wait a moment.");
      return;
    }
    setStaking(true);
    try {
      let txHash: string | undefined;
      if (escrowReady) {
        const hash = await writeContractAsync({
          address: ESCROW_ADDRESS,
          abi: ESCROW_ABI,
          functionName: "joinMatch",
          args: [matchIdToBytes32(match.id)],
          value: parseEther(String(match.stake_amount)),
        });
        txHash = hash;
        toast.message("Stake submitted — waiting for confirmation…");
      } else if (isMonad) {
        toast.message("Escrow address not configured — joining in demo mode.");
      }

      const { error } = await supabase
        .from("matches")
        .update({
          joiner_wallet: address,
          status: "live",
          current_state: initialFor(match.game) as any,
          turn_wallet: match.host_wallet,
          escrow_tx_hash: txHash ?? match.escrow_tx_hash,
        })
        .eq("id", match.id);
      if (error) throw error;
      toast.success("Joined match — good luck!");
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Could not join");
    } finally {
      setStaking(false);
    }
  };

  // Host locks funds; only after confirmation can opponents join.
  const hostStake = async () => {
    if (!address || !match) return;
    setStaking(true);
    try {
      if (escrowReady) {
        const hash = await writeContractAsync({
          address: ESCROW_ADDRESS,
          abi: ESCROW_ABI,
          functionName: "createMatch",
          args: [matchIdToBytes32(match.id)],
          value: parseEther(String(match.stake_amount)),
        });
        setPendingTx(hash);
        toast.message("Stake submitted — waiting for confirmation…");
      } else if (isMonad) {
        toast.message("Escrow not deployed yet — running in demo mode.");
        await supabase
          .from("matches")
          .update({ escrow_tx_hash: "demo" })
          .eq("id", match.id);
      } else {
        // Non-Monad chain — mark as demo lock
        await supabase
          .from("matches")
          .update({ escrow_tx_hash: "demo" })
          .eq("id", match.id);
        toast.success("Stake locked (demo mode for this chain)");
      }
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Stake failed");
    } finally {
      setStaking(false);
    }
  };

  // Submit move — works for all engines
  const submitMove = async (move: unknown, nextState: unknown, result: string | null) => {
    if (!match || !address) return;
    const nextTurn =
      match.turn_wallet === match.host_wallet ? match.joiner_wallet : match.host_wallet;
    const updates: Partial<MatchRow> = {
      current_state: nextState as any,
      turn_wallet: nextTurn,
      updated_at: new Date().toISOString(),
    };
    if (result) {
      updates.status = "ended";
      updates.winner = address;
    }
    const { error } = await supabase.from("matches").update(updates as any).eq("id", match.id);
    if (error) {
      toast.error("Failed to save move — try again");
      return;
    }
    await supabase.from("match_moves").insert({
      match_id: match.id,
      ply: 0,
      wallet_address: address,
      move: move as any,
      state: nextState as any,
      result,
    });
    if (result) toast.success(`Game over — ${result}`);
  };

  if (loading) {
    return (
      <div className="grid place-items-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="text-center py-20 space-y-4">
        <h1 className="text-2xl font-bold">Match not found</h1>
        <Link to="/lobby" className="text-gold hover:underline">
          Back to lobby
        </Link>
      </div>
    );
  }

  const renderBoard = () => {
    if (!isPlayer && match.status !== "live" && match.status !== "ended") {
      return (
        <div className="aspect-square sm:aspect-video grid place-items-center rounded-2xl border border-border/60 bg-gradient-card">
          <div className="text-center px-6">
            <Trophy className="h-10 w-10 mx-auto text-gold mb-3" />
            <p className="text-sm text-muted-foreground">
              Waiting for an opponent. Spectate this match or join below.
            </p>
          </div>
        </div>
      );
    }

    if (match.game === "chess") {
      const fen = (match.current_state as string) ?? new Chess().fen();
      return (
        <ChessBoard
          fen={fen}
          myColor={(myColor as "w" | "b") ?? "w"}
          disabled={!isPlayer || !isMyTurn || match.status !== "live"}
          onMove={(san, nextFen, result) => submitMove({ san }, nextFen, result)}
        />
      );
    }
    if (match.game === "checkers") {
      const state = (match.current_state as any) ?? initCheckers();
      return (
        <CheckersBoard
          state={state}
          myColor={(myColor as "red" | "black") ?? "red"}
          disabled={!isPlayer || !isMyTurn || match.status !== "live"}
          onMove={(mv, next, result) => submitMove(mv, next, result)}
        />
      );
    }
    if (match.game === "backgammon") {
      const state = (match.current_state as any) ?? initBackgammon();
      return (
        <BackgammonBoard
          state={state}
          myColor={(myColor as "white" | "black") ?? "white"}
          disabled={!isPlayer || !isMyTurn || match.status !== "live"}
          onMove={(mv, next, result) => submitMove(mv, next, result)}
        />
      );
    }
    if (match.game === "monopoly") {
      const state = (match.current_state as any) ?? initialMonopoly();
      return (
        <MonopolyBoard
          state={state}
          myColor={(myColor as "host" | "joiner") ?? "host"}
          disabled={!isPlayer || match.status !== "live"}
          onAction={(next, result) => submitMove({ kind: "monopoly" }, next, result)}
        />
      );
    }
    if (match.game === "scrabble") {
      const state = (match.current_state as any) ?? initialScrabble();
      return (
        <ScrabbleBoard
          state={state}
          myColor={(myColor as "host" | "joiner") ?? "host"}
          disabled={!isPlayer || match.status !== "live"}
          onAction={(next, result) => submitMove({ kind: "scrabble" }, next, result)}
        />
      );
    }
    return null;
  };

  const pot = Number(match.stake_amount) * (match.joiner_wallet ? 2 : 1);
  const payout = pot * 0.975;

  // Stake button states
  const canHostLock = match.status === "open" && isHost && !match.escrow_tx_hash;
  const canJoin = match.status === "open" && !isHost && !!address && hostLocked;

  return (
    <div className="space-y-6">
      <Link
        to="/lobby"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" /> Back to lobby
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-gold capitalize">
            {match.game} · {match.time_control ?? "Standard"}
          </div>
          <h1 className="mt-1 text-3xl sm:text-4xl font-bold capitalize">{match.game} Match</h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
            #{match.id.slice(0, 8)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {match.status === "live" && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-gold" /> Move clock {fmt(moveSecs)}
            </span>
          )}
          <span
            className={`text-[10px] uppercase tracking-widest px-3 py-1 rounded-full ${
              match.status === "live"
                ? "bg-success/15 text-success"
                : match.status === "ended"
                  ? "bg-secondary text-muted-foreground"
                  : "bg-gold/15 text-gold"
            }`}
          >
            {match.status}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border/60 bg-gradient-card p-4 sm:p-6 shadow-elegant">
            {renderBoard()}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-gold/30 bg-gradient-card p-5 shadow-gold">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Current pot
            </div>
            <div className="mt-2 text-3xl font-bold text-gradient-gold">
              {pot} {match.token_symbol}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Winner takes {payout.toFixed(2)} {match.token_symbol} (2.5% rake)
            </div>

            {/* Host locks first */}
            {canHostLock && (
              <button
                onClick={hostStake}
                disabled={staking || waitingTx}
                className="mt-5 w-full px-4 py-3 rounded-lg border border-gold/40 text-gold hover:bg-gold/10 inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {staking || waitingTx ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {waitingTx
                  ? "Confirming on-chain…"
                  : staking
                    ? "Submitting…"
                    : `Lock my ${match.stake_amount} ${match.token_symbol}`}
              </button>
            )}

            {/* Join (requires host lock) */}
            {canJoin && (
              <button
                onClick={joinMatch}
                disabled={staking}
                className="mt-5 w-full px-4 py-3 rounded-lg bg-gradient-gold text-primary-foreground font-semibold shadow-gold inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {staking && <Loader2 className="h-4 w-4 animate-spin" />}
                {staking
                  ? "Locking stake…"
                  : `Match stake — ${match.stake_amount} ${match.token_symbol}`}
              </button>
            )}

            {/* Waiting for host to lock */}
            {match.status === "open" && !isHost && address && !hostLocked && (
              <div className="mt-5 p-3 rounded-lg border border-border/60 text-xs text-muted-foreground text-center">
                Waiting for host to lock their stake before you can join.
              </div>
            )}

            {match.status === "open" && isHost && match.escrow_tx_hash && (
              <div className="mt-5 p-3 rounded-lg border border-success/30 bg-success/5 text-xs text-success text-center">
                ✓ Stake locked. Waiting for an opponent to join.
              </div>
            )}

            {match.escrow_tx_hash && match.escrow_tx_hash !== "demo" && chain?.id === 10143 && (
              <a
                href={`https://testnet.monadexplorer.com/tx/${match.escrow_tx_hash}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block text-[11px] text-silver hover:text-gold underline truncate"
              >
                View escrow tx
              </a>
            )}

            {!isEscrowDeployed() && isMonad && (
              <p className="mt-3 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3 inline mr-1" />
                Set <code className="text-gold">VITE_TAQTIK_ESCROW_ADDRESS</code> after deploying{" "}
                <code className="text-gold">contracts/TaQtikEscrow.sol</code> to enable real escrow.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Users className="h-4 w-4" /> Host
              </span>
              <span className="font-mono text-xs">
                {match.host_wallet
                  ? `${match.host_wallet.slice(0, 6)}…${match.host_wallet.slice(-4)}`
                  : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Users className="h-4 w-4" /> Joiner
              </span>
              <span className="font-mono text-xs">
                {match.joiner_wallet
                  ? `${match.joiner_wallet.slice(0, 6)}…${match.joiner_wallet.slice(-4)}`
                  : "Waiting…"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Coins className="h-4 w-4" /> Network
              </span>
              <span className="font-semibold">{chain?.name ?? `Chain ${match.chain_id}`}</span>
            </div>
            {match.status === "ended" && match.winner && (
              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Trophy className="h-4 w-4 text-gold" /> Winner
                </span>
                <span className="font-mono text-xs text-gold">
                  {match.winner.slice(0, 6)}…{match.winner.slice(-4)}
                </span>
              </div>
            )}
          </div>

          <MatchChat matchId={match.id} wallet={address} />
        </div>
      </div>
    </div>
  );
}
