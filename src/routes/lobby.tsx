import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Plus, Users, Coins, Clock } from "lucide-react";
import { SUPPORTED_CHAINS } from "@/lib/wagmi";

export const Route = createFileRoute("/lobby")({
  head: () => ({
    meta: [
      { title: "Game Lobby — TaQtik" },
      {
        name: "description",
        content: "Browse open board game matches and stake crypto on Chess, Checkers, Backgammon.",
      },
    ],
  }),
  component: LobbyPage,
});

const MATCHES = [
  { id: "1", game: "chess", host: "0x4f...A21", stake: 5, token: "MON", chainId: 10143, time: "5+0", status: "open" },
  { id: "2", game: "backgammon", host: "0x91...37B", stake: 12, token: "MON", chainId: 10143, time: "Standard", status: "open" },
  { id: "3", game: "checkers", host: "0x12...90C", stake: 2.5, token: "ETH", chainId: 11155111, time: "3+2", status: "live" },
  { id: "4", game: "chess", host: "0xab...e10", stake: 0.5, token: "ETH", chainId: 84532, time: "10+5", status: "open" },
  { id: "5", game: "backgammon", host: "0x77...f01", stake: 8, token: "MON", chainId: 10143, time: "Match to 5", status: "open" },
  { id: "6", game: "checkers", host: "0xee...2a3", stake: 0.1, token: "tBNB", chainId: 97, time: "Blitz", status: "live" },
];

function LobbyPage() {
  const [filter, setFilter] = useState<string>("all");
  const filtered = filter === "all" ? MATCHES : MATCHES.filter((m) => m.game === filter);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold">Lobby</h1>
          <p className="text-muted-foreground mt-1">
            Join an open match or host your own. Stakes are escrowed by the contract.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-gold text-primary-foreground font-semibold shadow-gold hover:opacity-90 transition-smooth self-start">
          <Plus className="h-4 w-4" /> Host a match
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {["all", "chess", "checkers", "backgammon"].map((g) => (
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
            placeholder="Search by player or stake…"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-input border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-gold/60"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((m) => {
          const chain = SUPPORTED_CHAINS.find((c) => c.id === m.chainId);
          return (
            <div
              key={m.id}
              className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-elegant hover:border-gold/40 transition-smooth"
            >
              <div className="flex items-center justify-between">
                <span className="capitalize text-sm font-semibold text-gradient-gold">{m.game}</span>
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
                <Users className="h-3 w-3" /> Host {m.host}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm">
                  <Coins className="h-4 w-4 text-gold" />
                  <span className="font-bold">{m.stake}</span>
                  <span className="text-muted-foreground">{m.token}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> {m.time}
                </div>
              </div>
              <div className="mt-3 text-[10px] text-muted-foreground">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full mr-1.5"
                  style={{ backgroundColor: chain?.color }}
                />
                {chain?.name}
              </div>
              <Link
                to="/games/$slug"
                params={{ slug: m.game }}
                className="mt-4 block text-center w-full px-4 py-2.5 rounded-lg border border-gold/40 text-gold hover:bg-gold/10 font-medium text-sm transition-smooth"
              >
                {m.status === "live" ? "Spectate" : "Join match"}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
