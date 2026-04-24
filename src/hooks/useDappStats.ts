import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DappStats = {
  activeMatches: number;
  endedMatches: number;
  totalPool: number;
  uniquePlayers: number;
  totalMessages: number;
  loading: boolean;
};

export function useDappStats(): DappStats {
  const [stats, setStats] = useState<DappStats>({
    activeMatches: 0,
    endedMatches: 0,
    totalPool: 0,
    uniquePlayers: 0,
    totalMessages: 0,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [{ data: matches }, { count: msgCount }] = await Promise.all([
        supabase
          .from("matches")
          .select("status, stake_amount, host_wallet, joiner_wallet, escrow_tx_hash"),
        supabase.from("match_messages").select("*", { count: "exact", head: true }),
      ]);
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
        escrow_tx_hash: string | null;
      }>) {
        // Only count pool when funds are actually locked (escrow_tx_hash present)
        if (m.status === "open" || m.status === "live") {
          active += 1;
          if (m.escrow_tx_hash) {
            pool += Number(m.stake_amount) * (m.joiner_wallet ? 2 : 1);
          }
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
        totalMessages: msgCount ?? 0,
        loading: false,
      });
    };
    load();
    const channel = supabase
      .channel("dapp-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "match_messages" }, () =>
        load(),
      )
      .subscribe();
    // Polling fallback in case realtime is delayed
    const poll = setInterval(load, 30_000);
    return () => {
      mounted = false;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, []);

  return stats;
}
