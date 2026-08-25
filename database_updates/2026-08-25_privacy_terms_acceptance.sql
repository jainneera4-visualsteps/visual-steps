-- Record the legal notices accepted during new parent account registration.
-- Existing accounts are not backfilled because acceptance must not be assumed.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS legal_version TEXT;

-- Supabase Auth is the sole password authority. The application never reads
-- this legacy duplicate, so remove it rather than retaining another credential.
ALTER TABLE public.users
  DROP COLUMN IF EXISTS password_hash;
