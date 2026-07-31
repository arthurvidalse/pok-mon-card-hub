CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.card_status AS ENUM ('tenho_full_art', 'tenho_comum', 'nao_tenho');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin')
    OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'arthurvidalmaia@gmail.com'
  );
$$;

CREATE POLICY "Users can read their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.pokemons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dex_number integer NOT NULL UNIQUE,
  name text NOT NULL,
  sprite_url text,
  generation integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pokemons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pokemons TO authenticated;
GRANT ALL ON public.pokemons TO service_role;
ALTER TABLE public.pokemons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pokemons are public" ON public.pokemons FOR SELECT USING (true);
CREATE POLICY "Admins manage pokemons" ON public.pokemons FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  release_year integer,
  language text NOT NULL DEFAULT 'ingles',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.collections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT ALL ON public.collections TO service_role;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Collections are public" ON public.collections FOR SELECT USING (true);
CREATE POLICY "Admins manage collections" ON public.collections FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pokemon_id uuid NOT NULL REFERENCES public.pokemons(id) ON DELETE CASCADE,
  collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  card_number text,
  card_type text,
  image_url text,
  status public.card_status NOT NULL DEFAULT 'nao_tenho',
  is_target boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cards_pokemon_id_idx ON public.cards (pokemon_id);
CREATE INDEX cards_status_idx ON public.cards (status);
GRANT SELECT ON public.cards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO authenticated;
GRANT ALL ON public.cards TO service_role;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cards are public" ON public.cards FOR SELECT USING (true);
CREATE POLICY "Admins manage cards" ON public.cards FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid REFERENCES public.cards(id) ON DELETE SET NULL,
  pokemon_id uuid REFERENCES public.pokemons(id) ON DELETE SET NULL,
  reference_label text,
  visitor_name text,
  intent text,
  sent_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.contact_messages TO anon;
GRANT SELECT, INSERT ON public.contact_messages TO authenticated;
GRANT ALL ON public.contact_messages TO service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log a contact" ON public.contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins read contacts" ON public.contact_messages FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings are public" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage settings" ON public.site_settings FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER cards_set_updated_at BEFORE UPDATE ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER settings_set_updated_at BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.site_settings (key, value) VALUES
  ('whatsapp_number', '5584999693459'),
  ('site_owner_name', 'Arthur');