ALTER TABLE public.cards ALTER COLUMN pokemon_id DROP NOT NULL;
ALTER TABLE public.cards ADD COLUMN name text;
