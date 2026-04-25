import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Per-match anti-cheat audit logger.
 *
 * Records:
 *  - Move timing (ms since previous move + flags impossibly fast moves)
 *  - Impossible / illegal actions (when a board engine rejects the move)
 *  - Repeated disconnect / reconnect events (visibility + presence churn)
 *  - Round-level flags when too many warnings stack up
 *
 * All events are persisted to the `anticheat_events` table. Severity ladder:
 *   info  - normal observation (e.g. move recorded)
 *   warn  - notable signal (e.g. very fast move, brief disconnect)
 *   error - hard violation (impossible move, repeated disconnects)
 *
 * Flags surface on the /anti-cheat dashboard for moderator review.
 */

export type AntiCheatSeverity = "info" | "warn" | "error";
export type AntiCheatType =
  | "move_recorded"
  | "fast_move"
  | "impossible_move"
  | "disconnect"
  | "reconnect"
  | "reconnect_burst"
  | "round_flagged";

const FAST_MOVE_MS = 400; // Sub-400ms moves are suspicious for human play
const DISCONNECT_BURST = 3; // 3+ reconnects within window = burst
const DISCONNECT_WINDOW_MS = 60_000;

export function useAntiCheat(matchId: string | null, wallet?: string) {
  const lastMoveAt = useRef<number | null>(null);
  const reconnectTimes = useRef<number[]>([]);
  const warningCount = useRef(0);
  const sessionStart = useRef<number>(Date.now());

  const log = useCallback(
    async (
      eventType: AntiCheatType,
      severity: AntiCheatSeverity,
      details: Record<string, unknown> = {},
    ) => {
      if (!matchId) return;
      try {
        await supabase.from("anticheat_events").insert({
          match_id: matchId,
          event_type: eventType,
          severity,
          details: { ...details, wallet: wallet?.toLowerCase() ?? null },
        });
      } catch {
        // Logging is best-effort; never break gameplay
      }
    },
    [matchId, wallet],
  );

  // Record a move: returns the elapsed ms and whether it was flagged
  const recordMove = useCallback(
    (move: unknown) => {
      const now = Date.now();
      const elapsed = lastMoveAt.current ? now - lastMoveAt.current : null;
      lastMoveAt.current = now;

      if (elapsed !== null && elapsed < FAST_MOVE_MS) {
        warningCount.current += 1;
        void log("fast_move", "warn", { elapsed_ms: elapsed, move });
      } else {
        void log("move_recorded", "info", { elapsed_ms: elapsed, move });
      }

      if (warningCount.current >= 4) {
        void log("round_flagged", "error", {
          reason: "Multiple suspicious-timing moves",
          warnings: warningCount.current,
        });
        warningCount.current = 0;
      }

      return { elapsed, flagged: elapsed !== null && elapsed < FAST_MOVE_MS };
    },
    [log],
  );

  // Engine rejected a move (illegal/impossible state)
  const recordImpossibleMove = useCallback(
    (move: unknown, reason: string) => {
      warningCount.current += 2;
      void log("impossible_move", "error", { move, reason });
    },
    [log],
  );

  // Connectivity events: tab hidden = soft disconnect, returned = reconnect
  useEffect(() => {
    if (!matchId || !wallet) return;
    let hiddenAt: number | null = null;

    const onVisibility = () => {
      if (typeof document === "undefined") return;
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        void log("disconnect", "warn", { kind: "tab_hidden" });
      } else if (document.visibilityState === "visible" && hiddenAt) {
        const downMs = Date.now() - hiddenAt;
        hiddenAt = null;
        const now = Date.now();
        reconnectTimes.current = reconnectTimes.current.filter(
          (t) => now - t < DISCONNECT_WINDOW_MS,
        );
        reconnectTimes.current.push(now);

        if (reconnectTimes.current.length >= DISCONNECT_BURST) {
          void log("reconnect_burst", "error", {
            count: reconnectTimes.current.length,
            window_ms: DISCONNECT_WINDOW_MS,
            last_down_ms: downMs,
          });
          void log("round_flagged", "error", {
            reason: "Repeated disconnect/reconnect within 60s",
            count: reconnectTimes.current.length,
          });
          reconnectTimes.current = [];
        } else {
          void log("reconnect", "info", { down_ms: downMs });
        }
      }
    };

    const onOffline = () => void log("disconnect", "warn", { kind: "offline" });
    const onOnline = () => void log("reconnect", "info", { kind: "online" });

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [matchId, wallet, log]);

  return { recordMove, recordImpossibleMove, log, sessionStart: sessionStart.current };
}
