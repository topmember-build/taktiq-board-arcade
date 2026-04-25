import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Search, Plus, Users, Coins, Clock, X, Loader2 } from "lucide-react";
import { SUPPORTED_CHAINS } from "@/lib/wagmi";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ConfirmModal, type ConfirmModalState } from "@/components/ConfirmModal";

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

  // Form state
  const [game, setGame] = useState<GameSlug>("chess");
  const [chainId, setChainId] = useState(SUPPORTED_CHAINS[0].id);
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
      toast.error("Connect your wallet to host a match");
      return;
    }
    const amount = parseFloat(stake);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid stake");
      return;
    }
    setCreating(true);
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
      setHostOpen(false);
      navigate({ to: "/match/$id", params: { id: data.id } });
    } catch (error: any) {
      toast.error(error?.message ?? "Could not create match");
    } finally {
      setCreating(false);
    }
  };

  const filtered = matches
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
        <div className="text-center py-20 rounded-2xl border border-border/60 bg-gradient-card">
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
                className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-elegant hover:border-gold/40 transition-smooth"
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
                <div className="mt-3 text-[10px] text-muted-foreground">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full mr-1.5"
                    style={{ backgroundColor: chain?.color }}
                  />
                  {chain?.name ?? `Chain ${m.chain_id}`}
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
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-2">
                {SUPPORTED_CHAINS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setChainId(c.id)}
                    className={`px-2 py-2 rounded-lg border text-xs font-medium ${
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
    </div>
  );
}
