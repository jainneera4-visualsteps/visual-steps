-- Security-question recovery has been replaced by Supabase email recovery.
-- Safe to run repeatedly after deploying the updated application code.

ALTER TABLE public.users
  DROP COLUMN IF EXISTS secret_question,
  DROP COLUMN IF EXISTS secret_answer_hash;
