BEGIN;

ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  existing_policy record;
BEGIN
  FOR existing_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'drafts'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.drafts', existing_policy.policyname);
  END LOOP;
END
$$;

CREATE POLICY "Users can read only their own drafts"
  ON public.drafts
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert only their own drafts"
  ON public.drafts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update only their own drafts"
  ON public.drafts
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete only their own drafts"
  ON public.drafts
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count > 0),
  PRIMARY KEY (user_id, endpoint)
);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.api_rate_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_api_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_max_requests integer,
  p_window_seconds integer
)
RETURNS TABLE (allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  current_window_started_at timestamptz;
  current_request_count integer;
BEGIN
  IF p_max_requests < 1 OR p_window_seconds < 1 OR p_endpoint = '' THEN
    RAISE EXCEPTION 'Invalid rate limit parameters.';
  END IF;

  INSERT INTO public.api_rate_limits AS limits (
    user_id,
    endpoint,
    window_started_at,
    request_count
  )
  VALUES (p_user_id, p_endpoint, now(), 1)
  ON CONFLICT (user_id, endpoint) DO UPDATE
  SET
    window_started_at = CASE
      WHEN limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
        THEN now()
      ELSE limits.window_started_at
    END,
    request_count = CASE
      WHEN limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
        THEN 1
      ELSE limits.request_count + 1
    END
  RETURNING limits.window_started_at, limits.request_count
  INTO current_window_started_at, current_request_count;

  RETURN QUERY
  SELECT
    current_request_count <= p_max_requests,
    CASE
      WHEN current_request_count <= p_max_requests THEN 0
      ELSE greatest(
        1,
        ceil(extract(epoch FROM (
          current_window_started_at + make_interval(secs => p_window_seconds) - now()
        )))::integer
      )
    END;
END
$function$;

REVOKE ALL ON FUNCTION public.consume_api_rate_limit(uuid, text, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_api_rate_limit(uuid, text, integer, integer)
  TO service_role;

COMMIT;
