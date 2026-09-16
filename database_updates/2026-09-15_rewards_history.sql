-- Rewards History now reads directly from reward_purchases and
-- behavior_bonus_awards. Remove the obsolete copied-history infrastructure.
-- Safe to rerun.
DROP TRIGGER IF EXISTS record_reward_purchase_history_trigger ON public.reward_purchases;
DROP TRIGGER IF EXISTS record_behavior_bonus_history_trigger ON public.behavior_bonus_awards;
DROP FUNCTION IF EXISTS public.record_reward_purchase_history();
DROP FUNCTION IF EXISTS public.record_behavior_bonus_history();
DROP TABLE IF EXISTS public.rewards_history;
