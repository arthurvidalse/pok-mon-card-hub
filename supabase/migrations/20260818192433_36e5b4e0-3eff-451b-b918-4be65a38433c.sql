CREATE TABLE public.bulk_price_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rarity text NOT NULL,
  condition text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bulk_price_rules_rarity_condition_key UNIQUE (rarity, condition)
);

GRANT SELECT ON public.bulk_price_rules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bulk_price_rules TO authenticated;
GRANT ALL ON public.bulk_price_rules TO service_role;

ALTER TABLE public.bulk_price_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public bulk price rules readable"
  ON public.bulk_price_rules FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin full bulk price rules"
  ON public.bulk_price_rules FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER bulk_price_rules_set_updated_at
  BEFORE UPDATE ON public.bulk_price_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.bulk_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id text NOT NULL,
  set_name text,
  local_id text NOT NULL,
  card_name text,
  image_url text,
  rarity text,
  condition text NOT NULL DEFAULT 'NM',
  quantity integer NOT NULL DEFAULT 0,
  price_override numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bulk_cards_set_local_condition_key UNIQUE (set_id, local_id, condition)
);

GRANT SELECT ON public.bulk_cards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bulk_cards TO authenticated;
GRANT ALL ON public.bulk_cards TO service_role;

ALTER TABLE public.bulk_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public bulk cards readable"
  ON public.bulk_cards FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin full bulk cards"
  ON public.bulk_cards FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX bulk_cards_set_id_idx ON public.bulk_cards (set_id);

CREATE TRIGGER bulk_cards_set_updated_at
  BEFORE UPDATE ON public.bulk_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();