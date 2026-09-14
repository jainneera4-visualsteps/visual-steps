-- Stores the two feature guides selected for each weekly newsletter so a
-- published issue remains unchanged as the product documentation evolves.
-- Safe to run repeatedly.
ALTER TABLE public.newsletters
  ADD COLUMN IF NOT EXISTS how_to_series JSONB NOT NULL DEFAULT '[]'::jsonb;
