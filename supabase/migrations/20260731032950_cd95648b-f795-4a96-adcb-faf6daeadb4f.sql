CREATE TABLE public.collection_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  cover_url text,
  total_expected integer NOT NULL DEFAULT 0,
  owned_count integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.collection_groups TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_groups TO authenticated;
GRANT ALL ON public.collection_groups TO service_role;

ALTER TABLE public.collection_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collection groups are public" ON public.collection_groups FOR SELECT USING (true);
CREATE POLICY "Admins manage collection groups" ON public.collection_groups FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER set_collection_groups_updated_at BEFORE UPDATE ON public.collection_groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.cards ADD COLUMN collection_group_id uuid REFERENCES public.collection_groups(id) ON DELETE SET NULL;
CREATE INDEX cards_collection_group_id_idx ON public.cards(collection_group_id);

INSERT INTO public.collection_groups (slug, name, total_expected, sort_order) VALUES
  ('lucario', 'Lucario', 0, 1),
  ('riolu', 'Riolu', 0, 2),
  ('glaceon', 'Glaceon', 80, 3),
  ('zekrom', 'Zekrom', 10, 4),
  ('groudon', 'Groudon', 10, 5),
  ('breloom', 'Breloom', 10, 6),
  ('swampert', 'Swampert', 10, 7);