-- Parent-controlled data review preferences. Records are never removed
-- automatically; the application only identifies older items for review.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS data_review_months INTEGER NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS last_data_review_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_data_review_months_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_data_review_months_check CHECK (data_review_months BETWEEN 3 AND 36);
