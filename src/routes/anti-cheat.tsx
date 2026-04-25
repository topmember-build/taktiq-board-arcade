import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, ShieldAlert, Eye, Cpu, Network, Lock } from "lucide-react";
import { StatCard } from "@/components/StatCard";

export const Route = createFileRoute("/anti-cheat")({
  head: () => ({
    meta: [
      { title: "Fair Play & Anti-Cheat - TaQtik" },
      {
        name: "description",
        content: "How TaQtik enforces fair play across Chess, Checkers, and Backgammon matches.",
      },
    ],
  }),
  component: AntiCheatPage,
});

const PILLARS = [
  {
    icon: Cpu,
    title: "Engine-assistance detection",
    text: "Every chess and checkers move is scored against top engines. Sustained matches with engine-perfect play trigger automated review.",
  },
  {
    icon: Eye,
    title: "Behavior fingerprinting",
    text: "Move timing, mouse trajectories, and tab-focus events are hashed per match - collusion patterns surface immediately.",
  },
  {
    icon: Network,
    title: "Multi-account graph",
    text: "Wallet graph analysis identifies clusters of related wallets that try to farm referrals or feed wins.",
  },
  {
    icon: Lock,
    title: "On-chain proofs",
    text: "Disputed game state can be replayed deterministically and verified against the contract's match commitment.",
  },
];

function AntiCheatPage() {
  return (
    <div className="space-y-10">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-success/30 bg-success/5 text-xs text-success">
          <ShieldCheck className="h-3 w-3" /> Active monitoring
        </div>
        <h1 className="mt-4 text-3xl sm:text-4xl font-bold">Fair Play, enforced.</h1>
        <p className="mt-3 text-muted-foreground">
          TaQtik's anti-cheat layer combines engine analysis, behavior heuristics, and on-chain
          proofs to keep wagered games clean.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShieldCheck} label="Matches scanned (24h)" value="3,842" accent="success" />
        <StatCard icon={ShieldAlert} label="Open investigations" value="7" />
        <StatCard icon={Lock} label="Funds frozen" value="0 MON" accent="silver" />
        <StatCard icon={Eye} label="Trust score (avg)" value="98.2" accent="success" />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {PILLARS.map((p) => (
          <div
            key={p.title}
            className="rounded-2xl border border-border/60 bg-gradient-card p-6 shadow-elegant"
          >
            <div className="h-10 w-10 rounded-lg bg-gold/10 text-gold grid place-items-center">
              <p.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-semibold text-lg">{p.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.text}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gold/30 bg-gradient-card p-6 sm:p-8 shadow-gold">
        <h2 className="text-xl font-semibold">Compliance & rule sets</h2>
        <p className="text-sm text-muted-foreground mt-2">
          All games on TaQtik strictly follow their official world federation rules:
        </p>
        <ul className="mt-4 grid sm:grid-cols-3 gap-3 text-sm">
          <li className="rounded-lg border border-border/60 p-4">
            <div className="font-semibold text-gold">Chess</div>
            <div className="text-muted-foreground mt-1">FIDE Laws of Chess (current edition)</div>
          </li>
          <li className="rounded-lg border border-border/60 p-4">
            <div className="font-semibold text-gold">Checkers</div>
            <div className="text-muted-foreground mt-1">WCDF tournament rules</div>
          </li>
          <li className="rounded-lg border border-border/60 p-4">
            <div className="font-semibold text-gold">Backgammon</div>
            <div className="text-muted-foreground mt-1">WBF rules with doubling cube</div>
          </li>
        </ul>
      </div>
    </div>
  );
}
