
-- 1. system_prompts: admin-only SELECT
DROP POLICY IF EXISTS "Anyone can view active prompts" ON public.system_prompts;
CREATE POLICY "Admins can view prompts"
  ON public.system_prompts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. messages: add UPDATE and DELETE policies scoped to session owner
CREATE POLICY "Users can update messages from their sessions"
  ON public.messages FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = messages.session_id AND sessions.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = messages.session_id AND sessions.user_id = auth.uid()));

CREATE POLICY "Users can delete messages from their sessions"
  ON public.messages FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = messages.session_id AND sessions.user_id = auth.uid()));

-- 3. profiles: add DELETE policy
CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- 4. Admin analytics RPC (SECURITY DEFINER with has_role check)
CREATE OR REPLACE FUNCTION public.get_admin_analytics()
RETURNS TABLE(total_users bigint, total_sessions bigint, avg_rating numeric, rated_sessions bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(DISTINCT s.user_id)::bigint AS total_users,
    COUNT(*)::bigint AS total_sessions,
    COALESCE(ROUND(AVG(s.rating)::numeric, 1), 0) AS avg_rating,
    COUNT(s.rating)::bigint AS rated_sessions
  FROM public.sessions s;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_analytics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics() TO authenticated;
