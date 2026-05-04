REVOKE SELECT (google_email, google_user_id) ON public.profiles FROM authenticated;
REVOKE SELECT (google_email, google_user_id) ON public.profiles FROM anon;