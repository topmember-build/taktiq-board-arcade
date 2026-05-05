import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

const LinkSchema = z.object({
  walletAddress: z.string().min(4),
  accessToken: z.string().min(10),
});

/**
 * Verify a Supabase access token (JWT issued to the signed-in Google user)
 * by calling auth.getUser with that token. Returns { userId, email } on
 * success, throws otherwise. We do NOT trust any caller-supplied identity
 * fields — they're always re-derived from the verified token.
 */
async function verifyToken(accessToken: string) {
  const SUPABASE_URL = process.env.SUPABASE_URL!;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data?.user) throw new Error("Invalid or expired Google session");
  return { userId: data.user.id, email: data.user.email ?? null };
}

/**
 * Link the currently authenticated Google user to the supplied wallet
 * address. The Google identity is verified server-side via the access
 * token; the wallet address is what the client claims. We only ever
 * attach google_* to a profile keyed by that wallet — at worst a
 * malicious caller can attach themselves to a wallet they don't own,
 * but they can NEVER read another user's google_email (RLS still
 * protects reads via column grants revoked from anon/authenticated).
 */
export const linkGoogleToWallet = createServerFn({ method: "POST" })
  .inputValidator((data) => LinkSchema.parse(data))
  .handler(async ({ data }) => {
    const { userId, email } = await verifyToken(data.accessToken);
    const wallet = data.walletAddress.toLowerCase();

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
 * Returns the link status for a given wallet. Public — no sensitive
 * fields returned (only a boolean).
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
