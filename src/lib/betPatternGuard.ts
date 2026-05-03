import { supabase } from "@/integrations/supabase/client";

/**
 * Anti-cheat ruleset for betting/match-creation patterns.
 *
 * Inspects a wallet's recent match history before it creates or joins a
 * wagered match. Returns one of:
 *   - allow: nothing suspicious
 *   - flag : log a warning event but let the action proceed
 *   - block: log an error event and stop the action
 *
 * Rules
 *  1. Burst hosting   - >5 matches created in the last 10 minutes  -> block
 *  2. Wash-trade pair - same opponent in >=3 of last 10 matches    -> flag
 *  3. Stake spike     - stake >10x the median of last 10 stakes    -> flag
 *  4. Low trust score - profile.trust_score < 30                   -> block
 *  5. Stake floor/ceiling sanity                                  -> block
 */

export type GuardAction = "allow" | "flag" | "block";

export type GuardResult = {
  action: GuardAction;
  severity: "info" | "warn" | "error";
  reasons: string[];
};

const BURST_WINDOW_MS = 10 * 60 * 1000;
const BURST_LIMIT = 5;
const WASH_REPEAT_LIMIT = 3;
const TRUST_FLOOR = 30;
const STAKE_MAX = 1_000_000; // sanity ceiling
const STAKE_MIN = 0;

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function evaluateBetPattern(
  wallet: string,
  stake: number,
  opponentWallet?: string | null,
): Promise<GuardResult> {
  const reasons: string[] = [];
  let action: GuardAction = "allow";
  const w = wallet.toLowerCase();

  // Rule 5: stake sanity
  if (!Number.isFinite(stake) || stake <= STAKE_MIN || stake > STAKE_MAX) {
    return {
      action: "block",
      severity: "error",
      reasons: [`Stake ${stake} out of allowed range`],
    };
  }

  // Pull recent activity (last 24h) for this wallet
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from("matches")
    .select("id, host_wallet, joiner_wallet, stake_amount, created_at")
    .or(`host_wallet.ilike.${w},joiner_wallet.ilike.${w}`)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = recent ?? [];

  // Rule 1: burst hosting
  const burstCutoff = Date.now() - BURST_WINDOW_MS;
  const burst = rows.filter(
    (r) =>
      r.host_wallet?.toLowerCase() === w && new Date(r.created_at).getTime() > burstCutoff,
  );
  if (burst.length >= BURST_LIMIT) {
    action = "block";
    reasons.push(`Hosted ${burst.length} matches in 10 minutes`);
  }

  // Rule 2: wash-trade pair
  if (opponentWallet) {
    const opp = opponentWallet.toLowerCase();
    const last10 = rows.slice(0, 10);
    const repeats = last10.filter(
      (r) =>
        r.host_wallet?.toLowerCase() === opp || r.joiner_wallet?.toLowerCase() === opp,
    ).length;
    if (repeats >= WASH_REPEAT_LIMIT) {
      if (action === "allow") action = "flag";
      reasons.push(`Repeated opponent (${repeats}x in last 10 matches)`);
    }
  }

  // Rule 3: stake spike vs median of last 10 stakes
  const stakes = rows.slice(0, 10).map((r) => Number(r.stake_amount)).filter((n) => n > 0);
  if (stakes.length >= 3) {
    const med = median(stakes);
    if (med > 0 && stake > med * 10) {
      if (action === "allow") action = "flag";
      reasons.push(`Stake ${stake} is >10x median (${med})`);
    }
  }

  // Rule 4: low trust score
  const { data: profile } = await supabase
    .from("profiles")
    .select("trust_score")
    .ilike("wallet_address", w)
    .maybeSingle();
  if (profile && (profile.trust_score ?? 100) < TRUST_FLOOR) {
    action = "block";
    reasons.push(`Trust score ${profile.trust_score} below floor ${TRUST_FLOOR}`);
  }

  const severity = action === "block" ? "error" : action === "flag" ? "warn" : "info";

  // Persist the audit event (fire-and-forget)
  if (action !== "allow") {
    void supabase.from("anticheat_events").insert({
      event_type: action === "block" ? "bet_pattern_blocked" : "bet_pattern_flagged",
      severity,
      details: {
        wallet: w,
        opponent: opponentWallet?.toLowerCase() ?? null,
        stake,
        reasons,
      },
    });
  }

  return { action, severity, reasons };
}
