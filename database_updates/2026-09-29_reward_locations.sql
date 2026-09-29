-- Safe to rerun in the Supabase SQL Editor. It includes the current-location
-- column so the earlier 2026-09-28 migration does not have to be run separately.
ALTER TABLE public.kids ADD COLUMN IF NOT EXISTS current_reward_location TEXT;

CREATE TABLE IF NOT EXISTS public.reward_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_id UUID NOT NULL REFERENCES public.kids(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS reward_locations_kid_name_unique
  ON public.reward_locations (kid_id, lower(btrim(name)));
ALTER TABLE public.reward_locations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reward_locations TO authenticated;
DROP POLICY IF EXISTS "Parents manage reward locations" ON public.reward_locations;
CREATE POLICY "Parents manage reward locations" ON public.reward_locations
  FOR ALL TO authenticated
  USING (kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid()))
  WITH CHECK (kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid()));

-- Fold old names for a universal place into the single No location choice.
UPDATE public.reward_items SET location = NULL
WHERE lower(btrim(location)) IN ('general', 'anywhere', 'any place');
UPDATE public.kids SET current_reward_location = NULL
WHERE lower(btrim(current_reward_location)) IN ('general', 'anywhere', 'any place');
DELETE FROM public.reward_locations
WHERE lower(btrim(name)) IN ('general', 'anywhere', 'any place');

-- Keep previously entered named reward places.
INSERT INTO public.reward_locations (kid_id, name)
SELECT DISTINCT ON (kid_id, lower(btrim(location))) kid_id, btrim(location)
FROM public.reward_items
WHERE location IS NOT NULL AND btrim(location) <> ''
  AND lower(btrim(location)) NOT IN ('general', 'anywhere', 'any place')
  AND length(btrim(location)) <= 80
ORDER BY kid_id, lower(btrim(location)), btrim(location)
ON CONFLICT DO NOTHING;

INSERT INTO public.reward_locations (kid_id, name)
SELECT id, btrim(current_reward_location)
FROM public.kids
WHERE current_reward_location IS NOT NULL AND btrim(current_reward_location) <> ''
  AND lower(btrim(current_reward_location)) NOT IN ('general', 'anywhere', 'any place')
  AND length(btrim(current_reward_location)) <= 80
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.rename_reward_location(p_location_id UUID, p_name TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_kid_id UUID; v_old_name TEXT; v_new_name TEXT := btrim(p_name);
BEGIN
  IF v_new_name IS NULL OR length(v_new_name) NOT BETWEEN 1 AND 80
     OR lower(v_new_name) IN ('general', 'anywhere', 'any place') THEN
    RAISE EXCEPTION 'Choose a specific place name of 1–80 characters';
  END IF;
  SELECT rl.kid_id, rl.name INTO v_kid_id, v_old_name
  FROM public.reward_locations rl JOIN public.kids k ON k.id = rl.kid_id
  WHERE rl.id = p_location_id AND k.user_id = auth.uid() FOR UPDATE OF rl;
  IF NOT FOUND THEN RAISE EXCEPTION 'Location not found'; END IF;
  UPDATE public.reward_locations SET name = v_new_name WHERE id = p_location_id;
  UPDATE public.reward_items SET location = v_new_name
    WHERE kid_id = v_kid_id AND lower(btrim(location)) = lower(btrim(v_old_name));
  UPDATE public.kids SET current_reward_location = v_new_name
    WHERE id = v_kid_id AND lower(btrim(current_reward_location)) = lower(btrim(v_old_name));
  RETURN v_new_name;
END; $$;

CREATE OR REPLACE FUNCTION public.delete_reward_location(p_location_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_kid_id UUID; v_name TEXT;
BEGIN
  SELECT rl.kid_id, rl.name INTO v_kid_id, v_name
  FROM public.reward_locations rl JOIN public.kids k ON k.id = rl.kid_id
  WHERE rl.id = p_location_id AND k.user_id = auth.uid() FOR UPDATE OF rl;
  IF NOT FOUND THEN RAISE EXCEPTION 'Location not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.kids
             WHERE id = v_kid_id AND lower(btrim(current_reward_location)) = lower(btrim(v_name))) THEN
    RAISE EXCEPTION 'Choose another current location before deleting this one';
  END IF;
  IF EXISTS (SELECT 1 FROM public.reward_items
             WHERE kid_id = v_kid_id AND lower(btrim(location)) = lower(btrim(v_name))) THEN
    RAISE EXCEPTION 'Move or edit rewards at this location before deleting it';
  END IF;
  DELETE FROM public.reward_locations WHERE id = p_location_id;
END; $$;

REVOKE ALL ON FUNCTION public.rename_reward_location(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_reward_location(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rename_reward_location(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_reward_location(UUID) TO authenticated;
