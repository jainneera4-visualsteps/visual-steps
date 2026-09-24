-- Run after 2026-09-23_activity_change_reasons.sql. Atomically move one
-- already-assigned future activity to today and explain the changed plan.
CREATE OR REPLACE FUNCTION public.replace_with_upcoming_activity(
  parent_id_param uuid,
  original_id_param uuid,
  replacement_id_param uuid,
  reason_param text,
  today_param date
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  original_row public.activities%ROWTYPE;
  replacement_row public.activities%ROWTYPE;
BEGIN
  IF original_id_param = replacement_id_param OR length(trim(coalesce(reason_param, ''))) NOT BETWEEN 1 AND 180 THEN
    RAISE EXCEPTION 'Choose a different activity and write a short reason' USING ERRCODE = '22023';
  END IF;

  -- Lock both assignments together so another request cannot change either
  -- one between validation and the two updates.
  PERFORM id FROM public.activities
    WHERE id IN (original_id_param, replacement_id_param)
    ORDER BY id FOR UPDATE;
  SELECT * INTO original_row FROM public.activities WHERE id = original_id_param;
  SELECT * INTO replacement_row FROM public.activities WHERE id = replacement_id_param;
  IF original_row.id IS NULL OR replacement_row.id IS NULL
    OR original_row.kid_id <> replacement_row.kid_id
    OR NOT EXISTS (SELECT 1 FROM public.kids WHERE id = original_row.kid_id AND user_id = parent_id_param)
    OR original_row.status <> 'pending' OR original_row.due_date <> today_param
    OR replacement_row.status <> 'pending' OR replacement_row.unavailable_for_now
    OR replacement_row.due_date <= today_param THEN
    RAISE EXCEPTION 'Choose a pending activity assigned for a future date to this learner' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.activities WHERE replacement_activity_id = original_id_param AND unavailable_for_now) THEN
    RAISE EXCEPTION 'This activity is already offered as a replacement' USING ERRCODE = '22023';
  END IF;

  UPDATE public.activities SET due_date = today_param WHERE id = replacement_id_param;
  UPDATE public.activities SET unavailable_for_now = true,
    unavailability_kind = 'replaced', unavailability_reason = trim(reason_param),
    replacement_activity_id = replacement_id_param
    WHERE id = original_id_param;
  RETURN jsonb_build_object('originalId', original_id_param, 'replacementId', replacement_id_param, 'replacementDate', today_param);
END;
$$;

REVOKE ALL ON FUNCTION public.replace_with_upcoming_activity(uuid, uuid, uuid, text, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_with_upcoming_activity(uuid, uuid, uuid, text, date) TO service_role;
