-- Allow admin and accounts to add funds without RLS insert failures.
-- The helper reads role with SECURITY DEFINER so users-table RLS cannot block the check.

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.add_fund(p_amount numeric)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_role text;
  v_day_id text;
  v_total numeric;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Fund amount must be greater than 0';
  END IF;

  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_role FROM public.users WHERE id = v_user_id;
  IF v_role IS NULL OR v_role NOT IN ('admin', 'accounts') THEN
    RAISE EXCEPTION 'Only admin and accounts users can add funds';
  END IF;

  v_day_id := public.get_current_day_id();

  INSERT INTO public.funds (amount, added_by, day_id)
  VALUES (p_amount, v_user_id, v_day_id);

  SELECT COALESCE(SUM(amount), 0)
  INTO v_total
  FROM public.funds
  WHERE day_id = v_day_id;

  RETURN json_build_object(
    'day_id', v_day_id,
    'total_fund_available', v_total
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_fund(numeric) TO authenticated;

DROP POLICY IF EXISTS "Allow accounts users to insert funds" ON public.funds;
DROP POLICY IF EXISTS "Allow accounts users to update funds" ON public.funds;
DROP POLICY IF EXISTS "Allow accounts users to delete funds" ON public.funds;
DROP POLICY IF EXISTS "Allow admin and accounts users to insert funds" ON public.funds;
DROP POLICY IF EXISTS "Allow admin and accounts users to update funds" ON public.funds;
DROP POLICY IF EXISTS "Allow admin and accounts users to delete funds" ON public.funds;

CREATE POLICY "Allow admin and accounts users to insert funds" ON public.funds
    FOR INSERT
    TO authenticated
    WITH CHECK (public.current_app_role() IN ('admin', 'accounts'));

CREATE POLICY "Allow admin and accounts users to update funds" ON public.funds
    FOR UPDATE
    TO authenticated
    USING (public.current_app_role() IN ('admin', 'accounts'))
    WITH CHECK (public.current_app_role() IN ('admin', 'accounts'));

CREATE POLICY "Allow admin and accounts users to delete funds" ON public.funds
    FOR DELETE
    TO authenticated
    USING (public.current_app_role() IN ('admin', 'accounts'));
