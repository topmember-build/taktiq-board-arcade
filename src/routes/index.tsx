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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TaQtik — Play. Bet. Win. Crypto Board Game Arcade" },
      {
        name: "description",
        content:
          "Wallet-first crypto dApp for Chess, Checkers, and Backgammon. Deposit MON or other testnet tokens and play for crypto on Monad and EVM testnets.",
      },
    ],
  }),
  component: HomePage,
});

const GAMES = [
  {
    slug: "chess",
    name: "Chess",
    tagline: "FIDE-rated rule set",
    pool: "12,480 MON",
    players: "2,140 online",
  },
  {
    slug: "checkers",
    name: "Checkers",
    tagline: "WCDF tournament rules",
    pool: "5,920 MON",
    players: "1,030 online",
  },
  {
    slug: "backgammon",
    name: "Backgammon",
    tagline: "WBF doubling cube",
    pool: "8,310 MON",
    players: "844 online",
  },
];

function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-card shadow-elegant">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(0.82_0.16_88/0.18),transparent_60%)]" />
        <div className="relative grid lg:grid-cols-2 gap-8 p-8 sm:p-12 lg:p-16 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/30 bg-gold/5 text-xs text-gold">
              <Sparkles className="h-3 w-3" /> Open beta · Monad Testnet live
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
              The crypto arcade for{" "}
              <span className="text-gradient-gold">serious board gamers</span>.
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              Connect your wallet. Deposit MON or your favorite testnet token. Out-think your
              opponent on real, regulated board games — Chess, Checkers, and Backgammon — and let
              the smart contract pay the winner.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <ConnectButton.Custom>
                {({ account, openConnectModal, openAccountModal }) => (
                  <button
                    onClick={account ? openAccountModal : openConnectModal}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-gold text-primary-foreground font-semibold shadow-gold hover:opacity-90 transition-smooth"
                  >
                    <Wallet className="h-4 w-4" />
                    {account ? "Wallet connected" : "Connect wallet to play"}
                  </button>
                )}
              </ConnectButton.Custom>
              <Link
                to="/lobby"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-silver/40 text-silver hover:bg-silver/10 transition-smooth font-medium"
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
            <div className="absolute inset-0 bg-gradient-gold opacity-20 blur-3xl rounded-full" />
            <img
              src={logo}
              alt="TaQtik shield logo with chess and casino motifs"
              className="relative w-64 sm:w-80 rounded-2xl shadow-glow animate-float"
            />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Swords} label="Active matches" value="312" hint="Across 3 games" />
        <StatCard
          icon={Trophy}
          label="Total prize pool"
          value="26,710 MON"
          hint="Live testnet stakes"
          accent="success"
        />
        <StatCard icon={Users} label="Players online" value="4,014" accent="silver" />
        <StatCard icon={ShieldCheck} label="Fair play score" value="99.7%" accent="success" />
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
          {GAMES.map((g) => (
            <Link
              key={g.slug}
              to="/games/$slug"
              params={{ slug: g.slug }}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-card p-6 shadow-elegant hover:shadow-gold hover:border-gold/40 transition-smooth"
            >
              <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-gold/10 blur-2xl group-hover:bg-gold/20 transition-smooth" />
              <div className="relative">
                <div className="text-xs uppercase tracking-widest text-gold/80">{g.tagline}</div>
                <div className="mt-2 text-2xl font-bold">{g.name}</div>
                <div className="mt-6 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{g.players}</span>
                  <span className="text-gradient-gold font-semibold">{g.pool}</span>
                </div>
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
            text: "No emails, no passwords. Your wallet is your account. Optionally bind Google for recovery and notifications.",
          },
          {
            icon: ShieldCheck,
            title: "Real-time anti-cheat",
            text: "Engine-assistance detection, move-pattern fingerprinting, and on-chain proofs for every disputed result.",
          },
          {
            icon: Users,
            title: "Earn from referrals",
            text: "Share your code and earn a share of every wager your friends make — paid out automatically per match.",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-border/60 bg-gradient-card p-6 shadow-elegant"
          >
            <div className="h-10 w-10 rounded-lg bg-gold/10 text-gold grid place-items-center">
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
