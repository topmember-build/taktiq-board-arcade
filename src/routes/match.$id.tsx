import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useSendTransaction, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, encodeFunctionData } from "viem";
import { ArrowLeft, Coins, Trophy, Users, Loader2, ShieldCheck, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SUPPORTED_CHAINS } from "@/lib/wagmi";
import { ESCROW_ABI, ESCROW_ADDRESS, isEscrowDeployed, matchIdToBytes32 } from "@/lib/escrow";
import { ChessBoard } from "@/components/games/ChessBoard";
import { CheckersBoard } from "@/components/games/CheckersBoard";
import { BackgammonBoard } from "@/components/games/BackgammonBoard";
import { MatchChat } from "@/components/games/MatchChat";
import { initialBoard as initCheckers } from "@/lib/games/checkers";
import { initialBoard as initBackgammon } from "@/lib/games/backgammon";
import { Chess } from "chess.js";
import { toast } from "sonner";

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
};

function MatchRoomPage() {
  const { id } = Route.useParams();
  const { address } = useAccount();
  const navigate = useNavigate();
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [staking, setStaking] = useState(false);

  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();

  // Load + subscribe
  useEffect(() => {
    let mounted = true;
    supabase
      .from("matches")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (mounted) {
          setMatch(data as MatchRow | null);
          setLoading(false);
        }
      });

    const channel = supabase
      .channel(`match-${id}-state`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `id=eq.${id}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            navigate({ to: "/lobby" });
          } else {
            setMatch(payload.new as MatchRow);
          }
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [id, navigate]);

  const isHost = !!match?.host_wallet && address?.toLowerCase() === match.host_wallet.toLowerCase();
  const isJoiner =
    !!match?.joiner_wallet && address?.toLowerCase() === match.joiner_wallet.toLowerCase();
  const isPlayer = isHost || isJoiner;
  const myWalletKey = isHost ? "host" : "joiner";
  const opponent = isHost ? match?.joiner_wallet : match?.host_wallet;

  const chain = SUPPORTED_CHAINS.find((c) => c.id === match?.chain_id);
  const isMonad = match?.chain_id === 10143;

  // Determine my color/turn per game
  const myColor = useMemo(() => {
    if (!match) return null;
    if (match.game === "chess") return isHost ? "w" : "b";
    if (match.game === "checkers") return isHost ? "red" : "black";
    if (match.game === "backgammon") return isHost ? "white" : "black";
    return null;
  }, [match, isHost]);

  const isMyTurn =
    !!address && !!match?.turn_wallet && match.turn_wallet.toLowerCase() === address.toLowerCase();

  // Join match
  const joinMatch = async () => {
    if (!address || !match) return;
    setStaking(true);
    try {
      // Initial state for the chosen game
      const initialState =
        match.game === "chess"
          ? new Chess().fen()
          : match.game === "checkers"
            ? initCheckers()
            : match.game === "backgammon"
              ? initBackgammon()
              : null;

      // Optional on-chain stake
      let txHash: string | undefined;
      if (isMonad && isEscrowDeployed()) {
        const hash = await writeContractAsync({
          address: ESCROW_ADDRESS,
          abi: ESCROW_ABI,
          functionName: "joinMatch",
          args: [matchIdToBytes32(match.id)],
          value: parseEther(String(match.stake_amount)),
        });
        txHash = hash;
        toast.success("Stake locked on Monad escrow");
      } else if (isMonad) {
        toast.message("Escrow address not configured — joining in demo mode (no on-chain lock).");
      }

      const { error } = await supabase
        .from("matches")
        .update({
          joiner_wallet: address,
          status: "live",
          current_state: initialState as any,
          turn_wallet: match.host_wallet,
          escrow_tx_hash: txHash ?? match.escrow_tx_hash,
        })
        .eq("id", match.id);
      if (error) throw error;
      toast.success("Joined match!");
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Could not join");
    } finally {
      setStaking(false);
    }
  };

  // Host stake (lock funds on-chain after joiner exists, or up-front)
  const hostStake = async () => {
    if (!address || !match) return;
    setStaking(true);
    try {
      if (isMonad && isEscrowDeployed()) {
        const hash = await writeContractAsync({
          address: ESCROW_ADDRESS,
          abi: ESCROW_ABI,
          functionName: "createMatch",
          args: [matchIdToBytes32(match.id)],
          value: parseEther(String(match.stake_amount)),
        });
        await supabase
          .from("matches")
          .update({ escrow_tx_hash: hash, escrow_address: ESCROW_ADDRESS })
          .eq("id", match.id);
        toast.success("Stake locked");
      } else {
        // Generic transfer to host self as placeholder demo
        toast.message("Escrow address not configured — running in demo mode.");
      }
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Stake failed");
    } finally {
      setStaking(false);
    }
  };

  // Submit move
  const submitMove = async (move: unknown, nextState: unknown, result: string | null) => {
    if (!match || !address) return;
    const nextTurn = match.turn_wallet === match.host_wallet ? match.joiner_wallet : match.host_wallet;
    const updates: Partial<MatchRow> = {
      current_state: nextState as any,
      turn_wallet: nextTurn,
    };
    if (result) {
      updates.status = "ended";
      updates.winner = address;
    }
    await supabase.from("matches").update(updates as any).eq("id", match.id);
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
    if (!isPlayer && match.status !== "live") {
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
    // Monopoly / Scrabble — coming soon notice
    return (
      <div className="aspect-square sm:aspect-video grid place-items-center rounded-2xl border border-border/60 bg-gradient-card">
        <div className="text-center px-6">
          <p className="text-sm text-muted-foreground">
            {match.game} multiplayer engine ships next — chat & escrow are live for this room.
          </p>
        </div>
      </div>
    );
  };

  const pot = Number(match.stake_amount) * (match.joiner_wallet ? 2 : 1);
  const payout = pot * 0.975;

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

            {match.status === "open" && !isHost && address && (
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

            {match.status === "open" && isHost && (
              <button
                onClick={hostStake}
                disabled={staking || !!match.escrow_tx_hash}
                className="mt-5 w-full px-4 py-3 rounded-lg border border-gold/40 text-gold hover:bg-gold/10 inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Lock className="h-4 w-4" />
                {match.escrow_tx_hash
                  ? "Stake locked ✓"
                  : staking
                    ? "Locking…"
                    : `Lock my ${match.stake_amount} ${match.token_symbol}`}
              </button>
            )}

            {match.escrow_tx_hash && chain?.id === 10143 && (
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
