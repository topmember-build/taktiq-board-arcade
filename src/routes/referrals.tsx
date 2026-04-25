import { createFileRoute } from "@tanstack/react-router";
import { useAccount } from "wagmi";
import { Copy, Users, TrendingUp, Gift, Trophy } from "lucide-react";
import { useState } from "react";
import { StatCard } from "@/components/StatCard";

export const Route = createFileRoute("/referrals")({
  head: () => ({
    meta: [
      { title: "Referrals - Earn with friends - TaQtik" },
      {
        name: "description",
        content: "Earn a share of every wager when friends play TaQtik through your referral link.",
      },
    ],
  }),
  component: ReferralsPage,
});

function ReferralsPage() {
  const { address } = useAccount();
  const [copied, setCopied] = useState(false);
  const code = address ? address.slice(2, 10).toUpperCase() : "CONNECT-WALLET";
  const link = typeof window !== "undefined" ? `${window.location.origin}?ref=${code}` : "";

  const copy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold">Referrals</h1>
        <p className="text-muted-foreground mt-1">
          Invite friends and earn <span className="text-gold font-semibold">2%</span> of every
          wager they place - automatically and forever.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Referred players" value="0" />
        <StatCard icon={TrendingUp} label="Lifetime volume" value="0 MON" accent="silver" />
        <StatCard icon={Gift} label="Earned rewards" value="0 MON" accent="success" />
        <StatCard icon={Trophy} label="Tier" value="Bronze" />
      </div>

      <div className="rounded-2xl border border-gold/30 bg-gradient-card p-6 sm:p-8 shadow-gold">
        <h2 className="text-xl font-semibold">Your referral link</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Anyone who connects a wallet through this link is permanently tied to your account.
        </p>
        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <code className="flex-1 px-4 py-3 rounded-lg bg-background/60 border border-border font-mono text-sm break-all">
            {link || "Connect your wallet to generate your link"}
          </code>
          <button
            onClick={copy}
            disabled={!address}
            className="px-5 py-3 rounded-lg bg-gradient-gold text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Copy className="h-4 w-4" /> {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
        <div className="mt-4 text-xs text-muted-foreground">
          Code: <span className="font-mono text-gold">{code}</span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {[
          { tier: "Bronze", req: "0+ refs", reward: "2%" },
          { tier: "Silver", req: "10+ refs", reward: "3%" },
          { tier: "Gold", req: "50+ refs", reward: "5%" },
        ].map((t) => (
          <div
            key={t.tier}
            className="rounded-2xl border border-border/60 bg-gradient-card p-6 shadow-elegant text-center"
          >
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{t.tier}</div>
            <div className="mt-3 text-4xl font-bold text-gradient-gold">{t.reward}</div>
            <div className="mt-1 text-sm text-muted-foreground">of every wager</div>
            <div className="mt-4 text-xs text-silver">{t.req}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
