import { createFileRoute, Link } from "@tanstack/react-router";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  Swords,
  ShieldCheck,
  Trophy,
  Wallet,
  Users,
  Sparkles,
  ArrowRight,
  Crown,
} from "lucide-react";
import logo from "@/assets/taqtik-logo.jpg";
import { StatCard } from "@/components/StatCard";
import { useDappStats } from "@/hooks/useDappStats";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TaQtik - Play. Bet. Win. Crypto Board Game Arcade" },
      {
        name: "description",
        content:
          "Wallet-first crypto dApp built for Monad Testnet. Play Chess, Checkers and Backgammon for crypto on Monad, Arc and EVM testnets.",
      },
    ],
  }),
  component: HomePage,
});

const GAMES = [
  { slug: "chess", name: "Chess", tagline: "FIDE-rated rule set" },
  { slug: "checkers", name: "Checkers", tagline: "WCDF tournament rules" },
  { slug: "backgammon", name: "Backgammon", tagline: "WBF doubling cube" },
  { slug: "monopoly", name: "Monopoly", tagline: "Hasbro 1935 ruleset" },
  { slug: "scrabble", name: "Scrabble", tagline: "TWL / SOWPODS dictionaries" },
];

function HomePage() {
  const stats = useDappStats();
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl glass-strong holo-border shadow-elegant animate-fade-in">
        <div className="absolute inset-0 hud-grid opacity-30" />
        <div className="absolute -top-32 -right-20 h-96 w-96 rounded-full bg-iris/30 blur-3xl animate-float" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-cyan-glow/20 blur-3xl" />
        <div className="relative grid lg:grid-cols-2 gap-8 p-8 sm:p-12 lg:p-16 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-gold text-primary-foreground border border-gold/40 text-xs font-semibold animate-pulse-glow">
              <Sparkles className="h-3 w-3" /> Open beta · On Testnet live
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
              The crypto arcade for{" "}
              <span className="text-gradient-iris">serious board gamers</span>.
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              Connect your wallet. Deposit Tokens or your favorite testnet token. Out-think your
              opponent on real, regulated board games - Chess, Checkers, and Backgammon - and let
              the smart contract pay the winner.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <ConnectButton.Custom>
                {({ account, openConnectModal, openAccountModal, mounted }) => (
                  <button
                    onClick={account ? openAccountModal : openConnectModal}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-gold text-primary-foreground font-semibold shadow-gold hover:opacity-90 hover:scale-[1.02] transition-smooth"
                    suppressHydrationWarning
                  >
                    <Wallet className="h-4 w-4" />
                    <span suppressHydrationWarning>
                      {mounted && account ? "Wallet connected" : "Connect wallet to play"}
                    </span>
                  </button>
                )}
              </ConnectButton.Custom>
              <Link
                to="/lobby"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background hover:bg-foreground/90 transition-smooth font-semibold"
              >
                Browse lobby <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex items-center gap-6 pt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-success" /> Anti-cheat enforced
              </div>
              <div className="flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5 text-gold" /> Multi-chain testnets
              </div>
            </div>
          </div>
          <div className="relative grid place-items-center">
            <div className="absolute inset-0 bg-gradient-iris opacity-30 blur-3xl rounded-full" />
            <div className="relative holo-border rounded-3xl p-1.5 animate-float">
              <img
                src={logo}
                alt="TaQtik shield logo with chess and casino motifs"
                className="w-64 sm:w-80 rounded-2xl shadow-glow"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats - real numbers from DB */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Swords}
          label="Active matches"
          value={stats.loading ? "-" : String(stats.activeMatches)}
          hint={stats.loading ? "Loading…" : "Open + live rooms"}
        />
        <StatCard
          icon={Trophy}
          label="Active prize pool"
          value={stats.loading ? "-" : `${stats.totalPool.toFixed(2)}`}
          hint="Sum of staked tokens"
          accent="success"
        />
        <StatCard
          icon={Users}
          label="Unique players"
          value={stats.loading ? "-" : String(stats.uniquePlayers)}
          hint="Wallets that joined a match"
          accent="silver"
        />
        <StatCard
          icon={ShieldCheck}
          label="Matches settled"
          value={stats.loading ? "-" : String(stats.endedMatches)}
          hint="Completed games"
          accent="success"
        />
      </section>

      {/* Games */}
      <section>
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">Pick your board</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Every game follows its official world federation rules.
            </p>
          </div>
          <Link to="/lobby" className="text-sm text-gold hover:underline hidden sm:inline-flex">
            View all lobbies →
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {GAMES.map((g, i) => (
            <Link
              key={g.slug}
              to="/games/$slug"
              params={{ slug: g.slug }}
              className="group relative overflow-hidden rounded-2xl glass holo-border p-6 transition-smooth hover:-translate-y-1 hover:shadow-iris animate-fade-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-gradient-iris opacity-20 blur-2xl group-hover:opacity-40 transition-smooth" />
              <div className="relative">
                <div className="text-[10px] uppercase tracking-[0.3em] text-gold/80">{g.tagline}</div>
                <div className="mt-2 text-2xl font-bold text-gradient-silver">{g.name}</div>
                <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-silver group-hover:text-gold transition-smooth">
                  Enter lobby <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-5">
        {[
          {
            icon: Wallet,
            title: "Wallet-first identity",
            text: "No emails, no passwords. Your wallet is your account and primary identity across every match.",
          },
          {
            icon: ShieldCheck,
            title: "Real-time anti-cheat",
            text: "Engine-assistance detection, move-pattern fingerprinting, and on-chain proofs for every disputed result.",
          },
          {
            icon: Users,
            title: "Earn from referrals",
            text: "Share your code and earn a share of every wager your friends make - paid out automatically per match.",
          },
        ].map((f, i) => (
          <div
            key={f.title}
            className="rounded-2xl glass holo-border p-6 transition-smooth hover:-translate-y-0.5 animate-fade-in"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-iris/20 text-gold grid place-items-center ring-1 ring-gold/30">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-semibold text-lg">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
