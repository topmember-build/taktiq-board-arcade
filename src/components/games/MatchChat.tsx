import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, MessageCircle } from "lucide-react";

type Msg = {
  id: string;
  match_id: string;
  wallet_address: string;
  display_name: string | null;
  body: string;
  created_at: string;
};

export function MatchChat({ matchId, wallet }: { matchId: string; wallet?: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!matchId) return;
    let mounted = true;
    supabase
      .from("match_messages")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true })
      .limit(200)
      .then(({ data }) => {
        if (mounted && data) setMessages(data as Msg[]);
      });

    const channel = supabase
      .channel(`match-${matchId}-chat`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "match_messages",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => setMessages((prev) => [...prev, payload.new as Msg]),
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || !wallet) return;
    setText("");
    await supabase.from("match_messages").insert({
      match_id: matchId,
      wallet_address: wallet,
      display_name: `${wallet.slice(0, 6)}…${wallet.slice(-4)}`,
      body,
    });
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-elegant flex flex-col h-[28rem]">
      <div className="flex items-center gap-2 pb-3 border-b border-border/60">
        <MessageCircle className="h-4 w-4 text-gold" />
        <h3 className="text-sm font-semibold">Match chat</h3>
        <span className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground">
          Live
        </span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-3 space-y-2 text-sm">
        {messages.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-8">
            Say hi to your opponent. Be respectful — chat is logged for fair-play review.
          </div>
        )}
        {messages.map((m) => {
          const mine = wallet && m.wallet_address.toLowerCase() === wallet.toLowerCase();
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  mine
                    ? "bg-gold/15 text-foreground border border-gold/30"
                    : "bg-secondary/60 text-foreground"
                }`}
              >
                <div className="text-[10px] text-muted-foreground font-mono">
                  {m.display_name ?? `${m.wallet_address.slice(0, 6)}…`}
                </div>
                <div className="break-words">{m.body}</div>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={send} className="flex gap-2 pt-3 border-t border-border/60">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!wallet}
          placeholder={wallet ? "Type a message…" : "Connect wallet to chat"}
          className="flex-1 px-3 py-2 rounded-lg bg-input border border-border text-sm focus:outline-none focus:border-gold/60"
        />
        <button
          type="submit"
          disabled={!wallet || !text.trim()}
          className="px-3 py-2 rounded-lg bg-gradient-gold text-primary-foreground disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
