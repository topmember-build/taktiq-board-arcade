import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DappStats = {
  activeMatches: number;
  endedMatches: number;
  totalPool: number;
  uniquePlayers: number;
  loading: boolean;
};

export function useDappStats(): DappStats {
  const [stats, setStats] = useState<DappStats>({
    activeMatches: 0,
    endedMatches: 0,
    totalPool: 0,
    uniquePlayers: 0,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: matches } = await supabase
        .from("matches")
        .select("status, stake_amount, host_wallet, joiner_wallet, joiner_wallet");
      if (!mounted) return;
      if (!matches) {
        setStats((s) => ({ ...s, loading: false }));
        return;
      }
      const wallets = new Set<string>();
      let active = 0,
        ended = 0,
        pool = 0;
      for (const m of matches as Array<{
        status: string;
        stake_amount: number;
        host_wallet: string | null;
        joiner_wallet: string | null;
      }>) {
        if (m.status === "open" || m.status === "live") {
          active += 1;
          pool += Number(m.stake_amount) * (m.joiner_wallet ? 2 : 1);
        }
        if (m.status === "ended") ended += 1;
        if (m.host_wallet) wallets.add(m.host_wallet.toLowerCase());
        if (m.joiner_wallet) wallets.add(m.joiner_wallet.toLowerCase());
      }
      setStats({
        activeMatches: active,
        endedMatches: ended,
        totalPool: pool,
        uniquePlayers: wallets.size,
        loading: false,
      });
    };
    load();
    const channel = supabase
      .channel("dapp-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => load())
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return stats;
}
