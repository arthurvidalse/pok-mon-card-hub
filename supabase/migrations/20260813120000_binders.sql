-- Tabela principal dos binders (álbuns de cartas)
CREATE TABLE public.binders (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text NOT NULL,
  slug        text NOT NULL UNIQUE,
  description text,
  rows        integer NOT NULL DEFAULT 3,
  cols        integer NOT NULL DEFAULT 4,
  is_visible  boolean NOT NULL DEFAULT false,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Tabela dos slots de cada binder
CREATE TABLE public.binder_cards (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  binder_id   uuid NOT NULL REFERENCES public.binders(id) ON DELETE CASCADE,
  position    integer NOT NULL,
  card_name   text,
  image_url   text,
  set_name    text,
  condition   text,
  price       numeric(10,2),
  status      text NOT NULL DEFAULT 'available'
                CHECK (status IN ('available','reserved','sold')),
  notes       text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (binder_id, position)
);

-- RLS binders
ALTER TABLE public.binders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read visible binders" ON public.binders
  FOR SELECT USING (is_visible = true);

CREATE POLICY "Admin manage binders" ON public.binders
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- RLS binder_cards
ALTER TABLE public.binder_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read binder_cards" ON public.binder_cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.binders b
      WHERE b.id = binder_id AND b.is_visible = true
    )
  );

CREATE POLICY "Admin manage binder_cards" ON public.binder_cards
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
