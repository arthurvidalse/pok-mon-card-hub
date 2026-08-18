ALTER TABLE public.binders ADD COLUMN IF NOT EXISTS pages integer NOT NULL DEFAULT 1;

DROP POLICY IF EXISTS "Admin full binders" ON public.binders;
DROP POLICY IF EXISTS "Public binders visible" ON public.binders;
DROP POLICY IF EXISTS "Admin full binder_cards" ON public.binder_cards;
DROP POLICY IF EXISTS "Public binder_cards readable" ON public.binder_cards;

CREATE POLICY "Admin full binders" ON public.binders
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Public binders visible" ON public.binders
  FOR SELECT TO anon, authenticated USING (is_visible = true);

CREATE POLICY "Admin full binder_cards" ON public.binder_cards
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Public binder_cards readable" ON public.binder_cards
  FOR SELECT TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.binders b WHERE b.id = binder_cards.binder_id AND b.is_visible = true)
  );

GRANT SELECT ON public.binders TO anon;
GRANT SELECT ON public.binder_cards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.binders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.binder_cards TO authenticated;
GRANT ALL ON public.binders TO service_role;
GRANT ALL ON public.binder_cards TO service_role;