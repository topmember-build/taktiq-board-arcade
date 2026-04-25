import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAccount } from "wagmi";
import { ArrowLeft, Trophy, Sparkles, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SUPPORTED_CHAINS } from "@/lib/wagmi";
import { toast } from "sonner";
import { ConfirmModal, type ConfirmModalState } from "@/components/ConfirmModal";

export const Route = createFileRoute("/games/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${capitalize(params.slug)} - TaQtik` },
      { name: "description", content: `Play ${params.slug} for crypto on TaQtik.` },
    ],
  }),
  component: GamePage,
});

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const META: Record<string, { name: string; rules: string; tagline: string; ready: boolean }> = {
  chess: {
    name: "Chess",
    rules: "FIDE Laws of Chess",
    tagline: "Outsmart your opponent on the 64-square battlefield.",
    ready: true,
  },
  checkers: {
    name: "Checkers",
    rules: "WCDF tournament rules",
    tagline: "Quick, sharp, decisive - capture every piece to win.",
    ready: true,
  },
  backgammon: {
    name: "Backgammon",
    rules: "WBF rules with doubling cube",
    tagline: "Roll, race, and double the stakes.",
    ready: true,
  },
  monopoly: {
    name: "Monopoly",
    rules: "Hasbro standard 1935 ruleset",
    tagline: "Buy, build, bankrupt - the classic property battle.",
    ready: true,
  },
  scrabble: {
    name: "Scrabble",
    rules: "TWL/SOWPODS official dictionaries",
    tagline: "Score the highest with letter tiles on a 15×15 board.",
    ready: true,
  },
};

function GamePage() {
  const { slug } = Route.useParams();
  const meta = META[slug] ?? {
    name: slug,
    rules: "Standard rules",
    tagline: "Coming soon.",
    ready: false,
  };
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [stake, setStake] = useState("1");
  const [chainId, setChainId] = useState(SUPPORTED_CHAINS[0].id);
  const [confirm, setConfirm] = useState<ConfirmModalState | null>(null);

  const host = async () => {
    if (!address) {
      setConfirm({
        status: "error",
        title: "Wallet required",
        message: "Connect your wallet to host a match.",
      });
      return;
    }
    setCreating(true);
    setConfirm({
      status: "pending",
      title: "Creating match…",
      message: `Spinning up your ${meta.name} room.`,
    });
    try {
      const amount = parseFloat(stake) || 1;
      const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId)!;
      const { data, error } = await supabase
        .from("matches")
        .insert({
          game: slug,
          chain_id: chainId,
          stake_amount: amount,
          token_symbol: chain.symbol,
          status: "open",
          host_wallet: address,
          time_control: "5+0",
        })
        .select("id")
        .single();
      if (error || !data) throw error ?? new Error("No match id returned");
      toast.success(`${meta.name} match created`);
      setConfirm({
        status: "success",
        title: "Match created ✓",
        message: `Heading to your ${meta.name} room.`,
      });
      setTimeout(() => navigate({ to: "/match/$id", params: { id: data.id } }), 400);
    } catch (error: any) {
      setConfirm({
        status: "error",
        title: "Could not create match",
        message: "The room failed to save.",
        detail: error?.message ?? "Unknown error",
        onRetry: () => host(),
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      <Link
        to="/lobby"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" /> Back to lobby
      </Link>

      <div>
        <div className="text-xs uppercase tracking-widest text-gold">{meta.rules}</div>
        <h1 className="mt-1 text-4xl sm:text-5xl font-bold capitalize">{meta.name}</h1>
        <p className="text-muted-foreground mt-2">{meta.tagline}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-gradient-card p-6 sm:p-8 shadow-elegant space-y-4">
          <div className="flex items-center gap-2 text-sm">
            {meta.ready ? (
              <span className="inline-flex items-center gap-1 text-success">
                <Sparkles className="h-3 w-3" /> Engine ready - host or join a match
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Sparkles className="h-3 w-3" /> Engine in development - chat + escrow live
              </span>
            )}
          </div>
          <h2 className="text-xl font-semibold">How {meta.name} works on TaQtik</h2>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
            <li>Host a match with your stake. The opponent matches your stake to start.</li>
            <li>Both stakes are locked by the TaQtik escrow contract on Monad testnet.</li>
            <li>Every move is logged to a public, append-only history for fair-play review.</li>
            <li>Winner is paid 2× stake minus 2.5% rake automatically.</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-gold/30 bg-gradient-card p-5 shadow-gold space-y-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Quick host
            </div>
            <h3 className="text-lg font-bold mt-1">Start a {meta.name} match</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {SUPPORTED_CHAINS.slice(0, 4).map((c) => (
              <button
                key={c.id}
                onClick={() => setChainId(c.id)}
                className={`px-3 py-2 rounded-lg border text-xs font-medium ${
                  chainId === c.id
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-border text-muted-foreground hover:border-gold/40"
                }`}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full mr-1"
                  style={{ backgroundColor: c.color }}
                />
                {c.symbol}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Stake
            </label>
            <input
              type="number"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              className="mt-2 w-full px-3 py-2 rounded-lg bg-input border border-border focus:outline-none focus:border-gold/60"
            />
          </div>
          <button
            onClick={host}
            disabled={!isConnected || creating}
            className="w-full px-4 py-3 rounded-lg bg-gradient-gold text-primary-foreground font-semibold shadow-gold inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {creating ? "Creating…" : "Host match"}
          </button>
          <Link
            to="/lobby"
            className="block text-center w-full px-4 py-2 rounded-lg border border-silver/40 text-silver hover:bg-silver/10 text-sm"
          >
            Browse open {meta.name} matches
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border/60 pt-3">
            <Trophy className="h-3.5 w-3.5 text-gold" /> Winner-takes-pot · 2.5% rake
          </div>
        </div>
      </div>

      <ConfirmModal state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
