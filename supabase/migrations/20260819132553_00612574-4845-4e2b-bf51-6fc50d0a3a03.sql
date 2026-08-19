ALTER TABLE public.bulk_cards ADD COLUMN IF NOT EXISTS variant text NOT NULL DEFAULT 'comum';
ALTER TABLE public.bulk_price_rules ADD COLUMN IF NOT EXISTS variant text NOT NULL DEFAULT 'comum';

ALTER TABLE public.bulk_cards DROP CONSTRAINT IF EXISTS bulk_cards_set_id_local_id_condition_key;
DROP INDEX IF EXISTS public.bulk_cards_set_id_local_id_condition_key;
DROP INDEX IF EXISTS public.bulk_cards_unique_idx;
CREATE UNIQUE INDEX IF NOT EXISTS bulk_cards_unique_idx ON public.bulk_cards (set_id, local_id, variant, condition);

ALTER TABLE public.bulk_price_rules DROP CONSTRAINT IF EXISTS bulk_price_rules_rarity_condition_key;
DROP INDEX IF EXISTS public.bulk_price_rules_rarity_condition_key;
DROP INDEX IF EXISTS public.bulk_price_rules_unique_idx;
CREATE UNIQUE INDEX IF NOT EXISTS bulk_price_rules_unique_idx ON public.bulk_price_rules (rarity, variant, condition);