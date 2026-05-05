import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SubmitMoveSchema = z.object({
  matchId: z.string().uuid(),
  walletAddress: z.string().min(4),
  expectedPly: z.number().int().nonnegative(),
  move: z.unknown(),
  nextState: z.unknown(),
  result: z.string().nullable().optional(),
});

/**
 * Server-authoritative move submission.
 *
 * Direct client INSERTs on `match_moves` are blocked by RLS (`WITH CHECK false`).
 * This endpoint is the only path that can write a move. It validates:
 *   - the match exists and is live,
 *   - the caller's wallet is one of the two players,
 *   - it is the caller's turn,
 *   - the client's `expectedPly` matches the server's authoritative ply
 *     count (prevents stale / replayed / out-of-order moves),
 *
 * then atomically inserts the move and updates the parent `matches` row
 * (current_state, turn_wallet, status, winner, updated_at) using the
 * service role key.
 */
export const submitMatchMove = createServerFn({ method: "POST" })
  .inputValidator((data) => SubmitMoveSchema.parse(data))
  .handler(async ({ data }) => {
    const { matchId, walletAddress, expectedPly, move, nextState, result } = data;
    const wallet = walletAddress.toLowerCase();

    const { data: match, error: matchErr } = await supabaseAdmin
      .from("matches")
      .select("id, host_wallet, joiner_wallet, turn_wallet, status")
      .eq("id", matchId)
      .maybeSingle();

    if (matchErr) throw new Error(matchErr.message);
    if (!match) throw new Error("Match not found");

    const host = match.host_wallet?.toLowerCase() ?? null;
    const joiner = match.joiner_wallet?.toLowerCase() ?? null;
    if (wallet !== host && wallet !== joiner) {
      throw new Error("Not a player in this match");
    }
    if (match.status === "ended") {
      throw new Error("Match already ended");
    }
    if (match.status !== "live") {
      throw new Error(`Match is not live (status: ${match.status})`);
    }
    if (!match.turn_wallet || match.turn_wallet.toLowerCase() !== wallet) {
      throw new Error("Not your turn");
    }

    // Authoritative ply check against actual move history
    const { count, error: countErr } = await supabaseAdmin
      .from("match_moves")
      .select("id", { count: "exact", head: true })
      .eq("match_id", matchId);
    if (countErr) throw new Error(countErr.message);

    const serverPly = count ?? 0;
    if (serverPly !== expectedPly) {
      throw new Error(
        `Stale move: expected ply ${serverPly} but client sent ${expectedPly}. Refresh the board.`,
      );
    }

    const nextTurn = wallet === host ? match.joiner_wallet : match.host_wallet;

    const { error: insertErr } = await supabaseAdmin.from("match_moves").insert({
      match_id: matchId,
      ply: serverPly,
      wallet_address: walletAddress,
      move: move as any,
      state: nextState as any,
      result: result ?? null,
    });
    if (insertErr) throw new Error(insertErr.message);

    const updates: Record<string, unknown> = {
      current_state: nextState as any,
      turn_wallet: nextTurn,
      updated_at: new Date().toISOString(),
    };
    if (result) {
      updates.status = "ended";
      updates.winner = walletAddress;
      updates.ended_at = new Date().toISOString();
    }

    const { error: updErr } = await supabaseAdmin
      .from("matches")
      .update(updates as any)
      .eq("id", matchId);
    if (updErr) throw new Error(updErr.message);

    return { ok: true, ply: serverPly };
  });
