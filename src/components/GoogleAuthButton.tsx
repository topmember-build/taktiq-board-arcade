import { useEffect, useState } from "react";
import { LogIn, LogOut } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function GoogleAuthButton() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setEmail(s?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

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
    toast.success("Signed out");
  };

  if (email) {
    return (
      <button
        onClick={signOut}
        className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium glass ring-1 ring-white/10 hover:ring-gold/40 text-foreground"
        title={email}
      >
        <LogOut className="h-3.5 w-3.5" />
        <span className="max-w-[120px] truncate">{email}</span>
      </button>
    );
  }

  return (
    <button
      onClick={signIn}
      disabled={loading}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-white text-black hover:bg-white/90 disabled:opacity-50"
    >
      <LogIn className="h-3.5 w-3.5" />
      {loading ? "…" : "Sign in with Google"}
    </button>
  );
}
