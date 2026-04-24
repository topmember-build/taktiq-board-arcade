import { createFileRoute } from "@tanstack/react-router";
import { useAccount } from "wagmi";
import { supabase } from "@/integrations/supabase/client";
import { Mail, ShieldCheck, Trophy, Wallet, Link2, Unlink } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — TaQtik" },
      { name: "description", content: "Your TaQtik wallet identity, Google binding, and stats." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { address, isConnected } = useAccount();
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState({ matches: 0, won: 0, trust: 100 });

  useEffect(() => {
    setMounted(true);
    supabase.auth.getSession().then(({ data }) => {
      setGoogleEmail(data.session?.user.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setGoogleEmail(s?.user.email ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  // Real stats from DB once wallet is known
  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    const load = async () => {
      const lower = address.toLowerCase();
      const [{ data: played }, { data: won }] = await Promise.all([
        supabase
          .from("matches")
          .select("id, host_wallet, joiner_wallet")
          .or(`host_wallet.ilike.${lower},joiner_wallet.ilike.${lower}`),
        supabase.from("matches").select("id, winner").eq("status", "ended"),
      ]);
      if (cancelled) return;
      const wonCount = (won ?? []).filter(
        (m: any) => (m.winner ?? "").toLowerCase() === lower,
      ).length;
      const { data: profile } = await supabase
        .from("profiles")
        .select("trust_score")
        .ilike("wallet_address", lower)
        .maybeSingle();
      if (cancelled) return;
      setStats({
        matches: played?.length ?? 0,
        won: wonCount,
        trust: (profile?.trust_score as number) ?? 100,
      });
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [address]);

  const bindGoogle = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/profile` },
    });
    setLoading(false);
  };

  const unbindGoogle = async () => {
    await supabase.auth.signOut();
    setGoogleEmail(null);
  };

  // Avoid SSR/CSR mismatch — wagmi `isConnected` is only known on the client
  if (!mounted || !isConnected) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <Wallet className="h-12 w-12 mx-auto text-gold" />
        <h1 className="text-2xl font-bold">Connect your wallet</h1>
        <p className="text-sm text-muted-foreground">
          Your wallet address is your TaQtik identity.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-1">
          Your wallet is your primary identity. Google binding is optional — for recovery and
          notifications only.
        </p>
      </div>

      <div className="rounded-2xl border border-gold/30 bg-gradient-card p-6 shadow-gold">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gradient-gold grid place-items-center text-primary-foreground font-bold text-xl">
            {address?.slice(2, 4).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Wallet (primary identity)
            </div>
            <div className="font-mono text-sm sm:text-base text-silver break-all">{address}</div>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xs text-muted-foreground">Matches</div>
            <div className="text-xl font-bold">0</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Won</div>
            <div className="text-xl font-bold text-success">0</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Trust</div>
            <div className="text-xl font-bold text-gold">100</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-gradient-card p-6 shadow-elegant">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="h-4 w-4 text-gold" />
          <h2 className="text-lg font-semibold">Google binding (optional)</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Bind a Google account for email notifications and account recovery hints. Your wallet
          remains the only login method.
        </p>
        <div className="mt-5">
          {googleEmail ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border border-success/40 bg-success/5">
              <div>
                <div className="text-xs text-success uppercase tracking-widest">Bound</div>
                <div className="text-sm font-medium">{googleEmail}</div>
              </div>
              <button
                onClick={unbindGoogle}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40"
              >
                <Unlink className="h-4 w-4" /> Unbind
              </button>
            </div>
          ) : (
            <button
              onClick={bindGoogle}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-gradient-gold text-primary-foreground font-semibold shadow-gold disabled:opacity-50"
            >
              <Link2 className="h-4 w-4" /> Bind Google account
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-gradient-card p-6 shadow-elegant">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="h-4 w-4 text-gold" />
          <h2 className="text-lg font-semibold">Security & fair play</h2>
        </div>
        <ul className="text-sm text-muted-foreground space-y-2 mt-3">
          <li className="flex items-start gap-2">
            <Trophy className="h-4 w-4 text-gold mt-0.5 shrink-0" />
            <span>Your trust score reflects clean play and dispute history.</span>
          </li>
          <li className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-success mt-0.5 shrink-0" />
            <span>You'll be notified instantly if any match flags your account for review.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
