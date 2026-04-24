import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type PresentUser = { wallet: string; online_at: string };

export function useChatPresence(matchId: string | null, wallet?: string) {
  const [present, setPresent] = useState<PresentUser[]>([]);
  const [typingWallets, setTypingWallets] = useState<string[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!matchId || !wallet) return;
    const channel = supabase.channel(`presence-match-${matchId}`, {
      config: { presence: { key: wallet.toLowerCase() } },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<string, PresentUser[]>;
        const flat: PresentUser[] = Object.values(state).flat();
        setPresent(flat);
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const w = String(payload?.wallet ?? "").toLowerCase();
        if (!w || w === wallet.toLowerCase()) return;
        setTypingWallets((prev) => (prev.includes(w) ? prev : [...prev, w]));
        const existing = typingTimeouts.current.get(w);
        if (existing) clearTimeout(existing);
        const t = setTimeout(() => {
          setTypingWallets((prev) => prev.filter((x) => x !== w));
          typingTimeouts.current.delete(w);
        }, 2500);
        typingTimeouts.current.set(w, t);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ wallet, online_at: new Date().toISOString() });
        }
      });

    return () => {
      typingTimeouts.current.forEach((t) => clearTimeout(t));
      typingTimeouts.current.clear();
      void channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [matchId, wallet]);

  const sendTyping = () => {
    if (!channelRef.current || !wallet) return;
    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { wallet: wallet.toLowerCase() },
    });
  };

  return { present, typingWallets, sendTyping };
}
