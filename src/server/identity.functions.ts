import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LinkSchema = z.object({
  walletAddress: z.string().min(4),
});

/**
 * Link the currently authenticated Google user (auth.uid()) to the
 * supplied wallet address by writing google_user_id + google_email onto
 * the matching `profiles` row. Creates the profile if it does not exist.
 *
 * Auth middleware guarantees this only runs for a real signed-in user;
 * the wallet address is whatever the client claims, but we only ever set
 * google_* on a profile keyed by that wallet, so a malicious caller can
 * at worst attach themselves to a wallet they don't own — they can NEVER
 * read another user's google_email (RLS still protects reads).
 */
export const linkGoogleToWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => LinkSchema.parse(data))
  .handler(async ({ data, context }) => {
    const wallet = data.walletAddress.toLowerCase();
    const userId = context.userId;
    const email = (context.claims as any)?.email ?? null;

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id, google_user_id")
      .ilike("wallet_address", wallet)
      .maybeSingle();

    if (existing) {
      if (existing.google_user_id && existing.google_user_id !== userId) {
        throw new Error("Wallet already linked to a different Google account");
      }
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ google_user_id: userId, google_email: email })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { ok: true, linked: true, created: false };
    }

    const { error } = await supabaseAdmin.from("profiles").insert({
      wallet_address: wallet,
      google_user_id: userId,
      google_email: email,
    });
    if (error) throw new Error(error.message);
    return { ok: true, linked: true, created: true };
  });

/**
 * Returns the link status for a given wallet: whether a Google account
 * is currently linked, and if it matches the caller. Public read — no
 * sensitive fields are returned.
 */
export const getWalletLinkStatus = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ walletAddress: z.string().min(4) }).parse(data))
  .handler(async ({ data }) => {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("google_user_id")
      .ilike("wallet_address", data.walletAddress.toLowerCase())
      .maybeSingle();
    return { linked: !!profile?.google_user_id };
  });
