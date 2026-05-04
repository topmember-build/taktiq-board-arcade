import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SubmitMoveSchema = z.object({
  matchId: z.string().uuid(),
  walletAddress: z.string().min(4),
  ply: z.number().int().nonnegative(),
  move: z.unknown(),
  state: z.unknown().optional(),
  result: z.string().nullable().optional(),
});

/**
 * Server-authoritative move insert. Direct client inserts on match_moves
 * are blocked by RLS (WITH CHECK false); this endpoint uses the service role
 * after verifying the caller is a player in the match and it's their turn.
 */
export const submitMatchMove = createServerFn({ method: "POST" })
  .inputValidator((data) => SubmitMoveSchema.parse(data))
  .handler(async ({ data }) => {
    const { matchId, walletAddress, ply, move, state, result } = data;

    const { data: match, error: matchErr } = await supabaseAdmin
      .from("matches")
      .select("id, host_wallet, joiner_wallet, turn_wallet, status")
      .eq("id", matchId)
      .maybeSingle();

    if (matchErr) throw new Error(matchErr.message);
    if (!match) throw new Error("Match not found");

    const wallet = walletAddress.toLowerCase();
    const host = match.host_wallet?.toLowerCase();
    const joiner = match.joiner_wallet?.toLowerCase();
    if (wallet !== host && wallet !== joiner) {
      throw new Error("Not a player in this match");
    }
    if (match.status === "ended") {
      throw new Error("Match already ended");
    }
    if (match.turn_wallet && match.turn_wallet.toLowerCase() !== wallet) {
      throw new Error("Not your turn");
    }

    const { error: insertErr } = await supabaseAdmin.from("match_moves").insert({
      match_id: matchId,
      ply,
      wallet_address: walletAddress,
      move: move as any,
      state: (state ?? null) as any,
      result: result ?? null,
    });
    if (insertErr) throw new Error(insertErr.message);

    return { ok: true };
  });
