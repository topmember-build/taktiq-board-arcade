import { useEffect, useState } from "react";
import { LogIn, LogOut, Link2, Link2Off, Loader2, CheckCircle2 } from "lucide-react";
import { useAccount } from "wagmi";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { linkGoogleToWallet, getWalletLinkStatus } from "@/lib/identity.server";
import { toast } from "sonner";

/**
 * Wallet-first identity widget.
 *
 * - Shows the connected wallet (primary identity) status.
 * - Lets the user sign in with Google as a secondary identity.
 * - Once both are present, the user can LINK them — server verifies the
 *   Google session via the auth middleware and writes google_user_id +
 *   google_email onto the profile keyed by wallet_address.
 * - Surfaces clear "linked / not linked" status so the user always knows
 *   which identity is active and whether they're tied together.
 */
export function GoogleAuthButton() {
  const { address } = useAccount();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linked, setLinked] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setEmail(s?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Refresh link status whenever wallet or email changes
  useEffect(() => {
    if (!address) {
      setLinked(null);
      return;
    }
    let cancelled = false;
    getWalletLinkStatus({ data: { walletAddress: address } })
      .then((r) => !cancelled && setLinked(r.linked))
      .catch(() => !cancelled && setLinked(null));
    return () => {
      cancelled = true;
    };
  }, [address, email]);

  const signIn = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Google sign-in failed", { description: String(result.error) });
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out of Google");
  };

  const link = async () => {
    if (!address) {
      toast.error("Connect a wallet first");
      return;
    }
    setLinking(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token;
      if (!accessToken) throw new Error("No active Google session");
      await linkGoogleToWallet({
        data: { walletAddress: address, accessToken },
      });
      setLinked(true);
      toast.success("Wallet linked to Google ✓");
    } catch (e: any) {
      toast.error("Could not link", { description: e?.message ?? String(e) });
    } finally {
      setLinking(false);
    }
  };

  // Not signed into Google yet
  if (!email) {
    return (
      <button
        onClick={signIn}
        disabled={loading}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-white text-black hover:bg-white/90 disabled:opacity-50"
        title={address ? "Sign in with Google to link to your wallet" : "Sign in with Google"}
      >
        <LogIn className="h-3.5 w-3.5" />
        {loading ? "…" : "Sign in with Google"}
      </button>
    );
  }

  // Signed in — show email + link status + actions
  return (
    <div className="hidden sm:flex items-center gap-1.5">
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium glass ring-1 ring-white/10 text-foreground"
        title={email}
      >
        {linked ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
        ) : (
          <Link2Off className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="max-w-[120px] truncate">{email}</span>
        <span
          className={`text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
            linked
              ? "bg-success/15 text-success"
              : address
                ? "bg-gold/15 text-gold"
                : "bg-secondary text-muted-foreground"
          }`}
        >
          {linked ? "linked" : address ? "unlinked" : "no wallet"}
        </span>
      </div>
      {address && !linked && (
        <button
          onClick={link}
          disabled={linking}
          className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-semibold bg-gold/15 text-gold hover:bg-gold/25 disabled:opacity-50"
          title="Link this Google account to your connected wallet"
        >
          {linking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
          Link
        </button>
      )}
      <button
        onClick={signOut}
        className="p-1.5 rounded-md hover:bg-white/5 text-muted-foreground hover:text-foreground"
        title="Sign out of Google"
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
