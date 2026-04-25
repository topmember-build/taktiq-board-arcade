import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Eye, Cpu, Network, Lock, Activity, Loader2 } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";

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

type AcEvent = {
  id: string;
  match_id: string | null;
  event_type: string;
  severity: string;
  details: any;
  created_at: string;
  resolved: boolean;
};

function AntiCheatPage() {
  const [events, setEvents] = useState<AcEvent[]>([]);
  const [stats, setStats] = useState({ scanned24h: 0, openInvestigations: 0, flagged24h: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [{ data: recent }, { count: scanned }, { count: openInv }, { count: flagged }] =
        await Promise.all([
          supabase
            .from("anticheat_events")
            .select("*")
            .in("severity", ["warn", "error"])
            .order("created_at", { ascending: false })
            .limit(15),
          supabase
            .from("anticheat_events")
            .select("*", { count: "exact", head: true })
            .gte("created_at", since),
          supabase
            .from("anticheat_events")
            .select("*", { count: "exact", head: true })
            .eq("resolved", false)
            .eq("severity", "error"),
          supabase
            .from("anticheat_events")
            .select("*", { count: "exact", head: true })
            .eq("event_type", "round_flagged")
            .gte("created_at", since),
        ]);

      if (!mounted) return;
      setEvents((recent as AcEvent[]) ?? []);
      setStats({
        scanned24h: scanned ?? 0,
        openInvestigations: openInv ?? 0,
        flagged24h: flagged ?? 0,
      });
      setLoading(false);
    };

    load();

    // Realtime: refresh on new events
    const channel = supabase
      .channel("anticheat-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "anticheat_events" },
        () => load(),
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const severityClass = (s: string) =>
    s === "error"
      ? "bg-destructive/15 text-destructive border-destructive/30"
      : s === "warn"
        ? "bg-gold/10 text-gold border-gold/30"
        : "bg-muted text-muted-foreground border-border/60";

  const labelFor = (t: string) =>
    ({
      fast_move: "Suspicious move timing",
      impossible_move: "Impossible action",
      disconnect: "Disconnect",
      reconnect: "Reconnect",
      reconnect_burst: "Repeated reconnects",
      round_flagged: "Round flagged",
      move_recorded: "Move recorded",
    })[t] ?? t;

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
        <StatCard
          icon={ShieldCheck}
          label="Events recorded (24h)"
          value={stats.scanned24h.toLocaleString()}
          accent="success"
        />
        <StatCard
          icon={ShieldAlert}
          label="Open investigations"
          value={String(stats.openInvestigations)}
        />
        <StatCard
          icon={Activity}
          label="Rounds flagged (24h)"
          value={String(stats.flagged24h)}
          accent="silver"
        />
        <StatCard icon={Lock} label="Funds frozen" value="0 MON" accent="silver" />
      </div>

      {/* Live audit feed */}
      <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 sm:p-6 shadow-elegant">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-gold" /> Live audit feed
          </h2>
          <span className="text-[11px] text-muted-foreground">
            Per-match events flagged for moderator review
          </span>
        </div>
        <div className="mt-4 divide-y divide-border/60">
          {loading ? (
            <div className="py-10 grid place-items-center">
              <Loader2 className="h-5 w-5 animate-spin text-gold" />
            </div>
          ) : events.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No suspicious events recorded yet. The audit log will populate as matches play out.
            </div>
          ) : (
            events.map((e) => (
              <div key={e.id} className="py-3 flex items-start gap-3">
                <span
                  className={`mt-0.5 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider ${severityClass(
                    e.severity,
                  )}`}
                >
                  {e.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{labelFor(e.event_type)}</div>
                  <div className="text-[11px] text-muted-foreground font-mono truncate">
                    Match {e.match_id?.slice(0, 8) ?? "-"}
                    {e.details?.elapsed_ms != null
                      ? ` · ${e.details.elapsed_ms}ms`
                      : e.details?.reason
                        ? ` · ${String(e.details.reason)}`
                        : ""}
                    {e.details?.wallet
                      ? ` · ${String(e.details.wallet).slice(0, 6)}…${String(e.details.wallet).slice(-4)}`
                      : ""}
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {new Date(e.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
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
