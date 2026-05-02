import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Search, Plus, Users, Coins, Clock, X, Loader2 } from "lucide-react";
import { SUPPORTED_CHAINS, monadTestnet } from "@/lib/wagmi";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ConfirmModal, type ConfirmModalState } from "@/components/ConfirmModal";
import { NetworkGuard } from "@/components/NetworkGuard";
import { NetworkDropdown } from "@/components/NetworkDropdown";
import { usePreferredChain } from "@/hooks/usePreferredChain";

export const Route = createFileRoute("/lobby")({
  head: () => ({
    meta: [
      { title: "Game Lobby - TaQtik" },
      {
        name: "description",
        content:
          "Browse open board game matches and stake crypto on Chess, Checkers, Backgammon, Monopoly, and Scrabble.",
      },
    ],
  }),
  component: LobbyPage,
});

const GAMES = ["chess", "checkers", "backgammon", "monopoly", "scrabble"] as const;
type GameSlug = (typeof GAMES)[number];

type Match = {
  id: string;
  game: string;
  host_wallet: string | null;
  joiner_wallet: string | null;
  stake_amount: number;
  token_symbol: string;
  chain_id: number;
  status: string;
  time_control: string | null;
  created_at: string;
};

function LobbyPage() {
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>("all");
  const [matches, setMatches] = useState<Match[]>([]);
  const [hostOpen, setHostOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState<ConfirmModalState | null>(null);

  // Form state
  const [game, setGame] = useState<GameSlug>("chess");
  const { chainId, setChainId } = usePreferredChain();
  const [stake, setStake] = useState("1");
  const [timeCtrl, setTimeCtrl] = useState("5+0");

  useEffect(() => {
    let mounted = true;
    supabase
      .from("matches")
      .select("*")
      .in("status", ["open", "live"])
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (mounted && data) setMatches(data as Match[]);
      });

    const channel = supabase
      .channel("lobby-matches")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        (payload) => {
          setMatches((prev) => {
            const m = payload.new as Match;
            if (payload.eventType === "DELETE") {
              return prev.filter((p) => p.id !== (payload.old as Match).id);
            }
            const idx = prev.findIndex((p) => p.id === m.id);
            if (idx === -1) return [m, ...prev];
            const next = prev.slice();
            next[idx] = m;
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const createMatch = async () => {
    if (!address) {
      setConfirm({
        status: "error",
        title: "Wallet required",
        message: "Connect your wallet to host a match.",
      });
      return;
    }
    const amount = parseFloat(stake);
    if (!Number.isFinite(amount) || amount <= 0) {
      setConfirm({
        status: "error",
        title: "Invalid stake",
        message: "Enter a valid stake amount greater than zero.",
      });
      return;
    }
    setCreating(true);
    setConfirm({
      status: "pending",
      title: "Creating match…",
      message: "Saving the room. You'll be moved to the table next.",
    });
    try {
      const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId)!;
      const { data, error } = await supabase
        .from("matches")
        .insert({
          game,
          chain_id: chainId,
          stake_amount: amount,
          token_symbol: chain.symbol,
          status: "open",
          host_wallet: address,
          time_control: timeCtrl,
        })
        .select("id")
        .single();
      if (error || !data) throw error ?? new Error("No match id returned");
      toast.success(`${game[0].toUpperCase()}${game.slice(1)} match created`);
      setConfirm({
        status: "success",
        title: "Match created ✓",
        message: `Your ${game} room is open. Lock your stake on the next screen to allow joiners.`,
      });
      setHostOpen(false);
      // brief pause so the user sees the confirmation before navigating
      setTimeout(() => navigate({ to: "/match/$id", params: { id: data.id } }), 400);
    } catch (error: any) {
      setConfirm({
        status: "error",
        title: "Could not create match",
        message: "The room failed to save.",
        detail: error?.message ?? "Unknown error",
        onRetry: () => createMatch(),
      });
    } finally {
      setCreating(false);
    }
  };

  const cancelMatch = async (id: string) => {
    if (!address) return;
    const ok = window.confirm("Cancel this hosted match? Joiners will no longer be able to join.");
    if (!ok) return;
    const { error } = await supabase
      .from("matches")
      .update({ status: "cancelled", ended_at: new Date().toISOString() })
      .eq("id", id)
      .ilike("host_wallet", address.toLowerCase())
      .eq("status", "open");
    if (error) {
      toast.error(`Could not cancel: ${error.message}`);
    } else {
      toast.success("Match cancelled");
      setMatches((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const myHosted = address
    ? matches.filter(
        (m) =>
          m.host_wallet?.toLowerCase() === address.toLowerCase() &&
          (m.status === "open" || m.status === "live"),
      )
    : [];

  const filtered = matches
    .filter((m) => m.status === "open" || m.status === "live")
    .filter((m) => (filter === "all" ? true : m.game === filter))
    .filter((m) =>
      search
        ? m.host_wallet?.toLowerCase().includes(search.toLowerCase()) ||
          String(m.stake_amount).includes(search)
        : true,
    );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold">Lobby</h1>
          <p className="text-muted-foreground mt-1">
            Join an open match or host your own. Stakes are escrowed by the contract.
          </p>
        </div>
        <button
          onClick={() => setHostOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-gold text-primary-foreground font-semibold shadow-gold hover:opacity-90 transition-smooth self-start"
        >
          <Plus className="h-4 w-4" /> Host a match
        </button>
      </div>

      <NetworkGuard preferredChainId={chainId} />

      {/* My hosted matches */}
      {address && myHosted.length > 0 && (
        <div className="rounded-2xl glass holo-border p-5 shadow-iris space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gradient-gold uppercase tracking-widest">
              Your hosted matches
            </h2>
            <span className="text-[11px] text-muted-foreground">{myHosted.length} active</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {myHosted.map((m) => {
              const ch = SUPPORTED_CHAINS.find((c) => c.id === m.chain_id);
              const canCancel = m.status === "open" && !m.joiner_wallet;
              return (
                <div key={m.id} className="rounded-xl glass border-white/10 p-4 text-sm transition-smooth hover:ring-1 hover:ring-gold/40">
                  <div className="flex items-center justify-between">
                    <span className="capitalize font-semibold">{m.game}</span>
                    <span
                      className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        m.status === "live" ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                    <Coins className="h-3 w-3 text-gold" /> {m.stake_amount} {m.token_symbol}
                    <span className="mx-1">·</span>
                    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ch?.color }} />
                    {ch?.symbol}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Link
                      to="/match/$id"
                      params={{ id: m.id }}
                      className="flex-1 text-center px-3 py-1.5 rounded-md border border-gold/40 text-gold hover:bg-gold/10 text-xs font-medium"
                    >
                      Open
                    </Link>
                    {canCancel && (
                      <button
                        onClick={() => cancelMatch(m.id)}
                        className="px-3 py-1.5 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10 text-xs font-medium"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {(["all", ...GAMES] as const).map((g) => (
          <button
            key={g}
            onClick={() => setFilter(g)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-smooth ${
              filter === g
                ? "bg-gradient-gold text-primary-foreground"
                : "border border-border text-muted-foreground hover:text-foreground hover:border-gold/40"
            }`}
          >
            {g}
          </button>
        ))}
        <div className="ml-auto relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by wallet or stake…"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-input border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-gold/60"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 rounded-2xl glass holo-border">
          <p className="text-muted-foreground">No matches yet - be the first to host one.</p>
          <button
            onClick={() => setHostOpen(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gold/40 text-gold hover:bg-gold/10"
          >
            <Plus className="h-4 w-4" /> Host a match
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => {
            const chain = SUPPORTED_CHAINS.find((c) => c.id === m.chain_id);
            const host = m.host_wallet ?? "0x0000…0000";
            return (
              <div
                key={m.id}
                className="group rounded-2xl glass holo-border p-5 shadow-elegant hover:shadow-iris transition-smooth"
              >
                <div className="flex items-center justify-between">
                  <span className="capitalize text-sm font-semibold text-gradient-gold">
                    {m.game}
                  </span>
                  <span
                    className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-full ${
                      m.status === "live"
                        ? "bg-success/15 text-success"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {m.status}
                  </span>
                </div>
                <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3 w-3" /> Host {host.slice(0, 6)}…{host.slice(-4)}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Coins className="h-4 w-4 text-gold" />
                    <span className="font-bold">{m.stake_amount}</span>
                    <span className="text-muted-foreground">{m.token_symbol}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {m.time_control ?? "Standard"}
                  </div>
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full glass border-white/10 text-[10px] uppercase tracking-widest font-semibold">
                  <span
                    className="inline-flex h-4 min-w-[1.5rem] px-1 items-center justify-center rounded-full text-[8px] text-white"
                    style={{
                      backgroundColor: chain?.color ?? "#9ca3af",
                      boxShadow: `0 0 10px ${chain?.color ?? "#9ca3af"}55`,
                    }}
                  >
                    {chain?.symbol ?? "?"}
                  </span>
                  <span className="text-muted-foreground">{chain?.name ?? `Chain ${m.chain_id}`}</span>
                </div>
                <Link
                  to="/match/$id"
                  params={{ id: m.id }}
                  className="mt-4 block text-center w-full px-4 py-2.5 rounded-lg border border-gold/40 text-gold hover:bg-gold/10 font-medium text-sm transition-smooth"
                >
                  {m.status === "live" ? "Spectate" : "Join match"}
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Host modal */}
      {hostOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4"
          onClick={() => setHostOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-2xl border border-gold/30 bg-card p-6 shadow-gold space-y-5"
          >
            <button
              onClick={() => setHostOpen(false)}
              className="absolute top-3 right-3 p-2 rounded-md hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
            <div>
              <h2 className="text-xl font-bold">Host a match</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Pick a game, network, and stake. Your match will appear in the lobby instantly.
              </p>
            </div>
            {!isConnected && (
              <div className="text-xs text-destructive border border-destructive/40 rounded-lg p-3 bg-destructive/10">
                Connect your wallet first to host a match.
              </div>
            )}
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Game
              </label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {GAMES.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGame(g)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium capitalize ${
                      game === g
                        ? "border-gold bg-gold/10 text-gold"
                        : "border-border text-muted-foreground hover:border-gold/40"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Network
              </label>
              <p className="text-[10px] text-muted-foreground mt-1">
                Built for <span className="text-gold font-semibold">Monad Testnet</span> · Arc and other testnets are optional.
              </p>
              <div className="mt-2">
                <NetworkDropdown value={chainId} onChange={setChainId} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Time control
                </label>
                <input
                  value={timeCtrl}
                  onChange={(e) => setTimeCtrl(e.target.value)}
                  className="mt-2 w-full px-3 py-2 rounded-lg bg-input border border-border focus:outline-none focus:border-gold/60"
                />
              </div>
            </div>
            <button
              onClick={createMatch}
              disabled={!isConnected || creating}
              className="w-full px-5 py-3 rounded-lg bg-gradient-gold text-primary-foreground font-semibold shadow-gold disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              {creating ? "Creating…" : `Create ${game} match`}
            </button>
          </div>
        </div>
      )}

      <ConfirmModal state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
