CREATE TABLE public.bulk_price_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rarity text NOT NULL,
  condition text NOT NULL,
  price numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rarity, condition)
);

GRANT SELECT ON public.bulk_price_rules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bulk_price_rules TO authenticated;
GRANT ALL ON public.bulk_price_rules TO service_role;

ALTER TABLE public.bulk_price_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bulk_price_rules is public for reading" ON public.bulk_price_rules FOR SELECT USING (true);
CREATE POLICY "Admins manage bulk_price_rules" ON public.bulk_price_rules FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER bulk_price_rules_set_updated_at BEFORE UPDATE ON public.bulk_price_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.bulk_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id text NOT NULL,
  set_name text NOT NULL,
  local_id text NOT NULL,
  card_name text NOT NULL,
  image_url text,
  rarity text,
  condition text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  price_override numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (set_id, local_id, condition)
);

CREATE INDEX bulk_cards_set_id_idx ON public.bulk_cards (set_id);

GRANT SELECT ON public.bulk_cards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bulk_cards TO authenticated;
GRANT ALL ON public.bulk_cards TO service_role;

ALTER TABLE public.bulk_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bulk_cards is public for reading" ON public.bulk_cards FOR SELECT USING (true);
CREATE POLICY "Admins manage bulk_cards" ON public.bulk_cards FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER bulk_cards_set_updated_at BEFORE UPDATE ON public.bulk_cards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
