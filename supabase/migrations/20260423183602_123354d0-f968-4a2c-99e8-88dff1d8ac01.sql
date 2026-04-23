
-- Wallet-first profiles (one row per wallet address; auth.users link is optional, populated when Google is bound)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL UNIQUE,
  display_name text,
  avatar_url text,
  google_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  google_email text,
  referral_code text NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  total_wagered numeric NOT NULL DEFAULT 0,
  total_won numeric NOT NULL DEFAULT 0,
  trust_score integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can insert a profile (wallet auth)" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Linked google user can update own profile" ON public.profiles FOR UPDATE
  USING (google_user_id = auth.uid()) WITH CHECK (google_user_id = auth.uid());

-- Wallet transactions (deposits / withdrawals)
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  chain_id integer NOT NULL,
  tx_type text NOT NULL CHECK (tx_type IN ('deposit', 'withdrawal')),
  amount numeric NOT NULL,
  token_symbol text NOT NULL,
  tx_hash text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Transactions visible to everyone (public history)" ON public.wallet_transactions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tx (signed by wallet client side)" ON public.wallet_transactions FOR INSERT WITH CHECK (true);

-- Matches
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game text NOT NULL CHECK (game IN ('chess','checkers','backgammon')),
  chain_id integer NOT NULL,
  stake_amount numeric NOT NULL,
  token_symbol text NOT NULL,
  player_a uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  player_b uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  winner uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','live','completed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Matches viewable by everyone" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Anyone can insert matches" ON public.matches FOR INSERT WITH CHECK (true);

-- Referrals (earnings ledger)
CREATE TABLE public.referral_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  token_symbol text NOT NULL,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Referral earnings public read" ON public.referral_earnings FOR SELECT USING (true);

-- Anti-cheat events
CREATE TABLE public.anticheat_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  details jsonb,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.anticheat_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anti-cheat events public read" ON public.anticheat_events FOR SELECT USING (true);

CREATE INDEX idx_profiles_wallet ON public.profiles(wallet_address);
CREATE INDEX idx_profiles_referral ON public.profiles(referral_code);
CREATE INDEX idx_tx_profile ON public.wallet_transactions(profile_id);
CREATE INDEX idx_matches_status ON public.matches(status);
