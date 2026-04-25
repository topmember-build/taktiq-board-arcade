import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to a match row's realtime updates and falls back to polling
 * every `pollMs` (default 5s) so turns/timers/results stay in sync even when
 * realtime events are dropped or delayed.
 */
export function useMatchSync<T extends { id: string; updated_at?: string }>(
  matchId: string | null,
  opts: { pollMs?: number } = {},
) {
  const { pollMs = 5000 } = opts;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastEventAt, setLastEventAt] = useState<number>(Date.now());
  const dataRef = useRef<T | null>(null);

  useEffect(() => {
    if (!matchId) return;
    let mounted = true;

    const fetchOnce = async () => {
      const { data: row } = await supabase
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .maybeSingle();
      if (!mounted) return;
      if (row) {
        const next = row as unknown as T;
        const existing = dataRef.current;
        if (
          !existing ||
          !existing.updated_at ||
          new Date(next.updated_at ?? 0).getTime() >=
            new Date(existing.updated_at).getTime()
        ) {
          dataRef.current = next;
          setData(next);
        }
      }
      setLoading(false);
    };

    fetchOnce();

    const channel = supabase
      .channel(`match-sync-${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
        (payload) => {
          if (!mounted) return;
          setLastEventAt(Date.now());
          if (payload.eventType !== "DELETE") {
            const next = payload.new as unknown as T;
            dataRef.current = next;
            setData(next);
          } else {
            setData(null);
          }
        },
      )
      .subscribe();

    // Polling fallback - runs every pollMs but only refetches if the realtime
    // channel hasn't pushed an update recently.
    const poll = setInterval(() => {
      if (Date.now() - lastEventAt > pollMs) {
        fetchOnce();
      }
    }, pollMs);

    return () => {
      mounted = false;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, pollMs]);

  return { data, loading, refresh: () => setLastEventAt(0) };
}
