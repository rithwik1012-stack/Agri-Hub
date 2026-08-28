-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'farmer',
  location text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by signed-in users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, location)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'farmer'),
    NEW.raw_user_meta_data ->> 'location'
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CROPS
CREATE TABLE public.crops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  category text NOT NULL,
  unit text NOT NULL DEFAULT 'quintal',
  emoji text NOT NULL DEFAULT '🌾',
  current_price numeric(12,2) NOT NULL,
  previous_price numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.crops TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crops TO authenticated;
GRANT ALL ON public.crops TO service_role;
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Crops are public" ON public.crops FOR SELECT USING (true);

CREATE TABLE public.crop_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id uuid NOT NULL REFERENCES public.crops(id) ON DELETE CASCADE,
  price numeric(12,2) NOT NULL,
  recorded_on date NOT NULL DEFAULT current_date,
  UNIQUE (crop_id, recorded_on)
);
CREATE INDEX crop_prices_crop_date_idx ON public.crop_prices (crop_id, recorded_on);
GRANT SELECT ON public.crop_prices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crop_prices TO authenticated;
GRANT ALL ON public.crop_prices TO service_role;
ALTER TABLE public.crop_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Crop prices are public" ON public.crop_prices FOR SELECT USING (true);

INSERT INTO public.crops (name, slug, category, unit, emoji, current_price, previous_price) VALUES
  ('Wheat', 'wheat', 'Cereal', 'quintal', '🌾', 2420.00, 2310.00),
  ('Rice (Paddy)', 'rice', 'Cereal', 'quintal', '🍚', 2180.00, 2245.00),
  ('Maize', 'maize', 'Cereal', 'quintal', '🌽', 1985.00, 1890.00),
  ('Soybean', 'soybean', 'Oilseed', 'quintal', '🫘', 4620.00, 4480.00),
  ('Cotton', 'cotton', 'Fibre', 'quintal', '🧺', 7150.00, 7320.00),
  ('Sugarcane', 'sugarcane', 'Cash crop', 'tonne', '🎋', 3450.00, 3390.00),
  ('Tomato', 'tomato', 'Vegetable', 'quintal', '🍅', 1620.00, 1420.00),
  ('Onion', 'onion', 'Vegetable', 'quintal', '🧅', 2260.00, 2410.00);

INSERT INTO public.crop_prices (crop_id, price, recorded_on)
SELECT c.id,
       ROUND((c.current_price * (
         1
         - (0.11 * (d / 119.0))
         + 0.035 * sin((d / 6.0) + (('x' || substr(md5(c.slug), 1, 4))::bit(16)::int % 7))
         + 0.02 * sin((d / 2.0))
       ))::numeric, 2),
       current_date - d
FROM public.crops c
CROSS JOIN generate_series(0, 119) AS d;

UPDATE public.crops c SET current_price = p.price
FROM public.crop_prices p
WHERE p.crop_id = c.id AND p.recorded_on = current_date;

UPDATE public.crops c SET previous_price = p.price
FROM public.crop_prices p
WHERE p.crop_id = c.id AND p.recorded_on = current_date - 7;

-- LISTINGS
CREATE TABLE public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crop_id uuid NOT NULL REFERENCES public.crops(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  quantity numeric(12,2) NOT NULL,
  unit text NOT NULL DEFAULT 'quintal',
  base_price numeric(12,2) NOT NULL,
  mode text NOT NULL DEFAULT 'auction',
  ends_at timestamptz,
  location text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX listings_farmer_idx ON public.listings (farmer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT ALL ON public.listings TO service_role;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Listings viewable by signed-in users" ON public.listings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Farmers create own listings" ON public.listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = farmer_id);
CREATE POLICY "Farmers update own listings" ON public.listings FOR UPDATE TO authenticated USING (auth.uid() = farmer_id) WITH CHECK (auth.uid() = farmer_id);
CREATE POLICY "Farmers delete own listings" ON public.listings FOR DELETE TO authenticated USING (auth.uid() = farmer_id);
CREATE TRIGGER listings_updated_at BEFORE UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- BIDS
CREATE TABLE public.bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  bidder_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  note text,
  accepted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bids_listing_idx ON public.bids (listing_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bids TO authenticated;
GRANT ALL ON public.bids TO service_role;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bids viewable by signed-in users" ON public.bids FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users place own bids" ON public.bids FOR INSERT TO authenticated WITH CHECK (auth.uid() = bidder_id);
CREATE POLICY "Listing owner updates bids" ON public.bids FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.farmer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.farmer_id = auth.uid()));
CREATE POLICY "Bidders delete own bids" ON public.bids FOR DELETE TO authenticated USING (auth.uid() = bidder_id);

-- ASSISTANT CHAT
CREATE TABLE public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_threads_user_idx ON public.chat_threads (user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_threads TO authenticated;
GRANT ALL ON public.chat_threads TO service_role;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own threads" ON public.chat_threads FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER chat_threads_updated_at BEFORE UPDATE ON public.chat_threads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  client_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_thread_idx ON public.chat_messages (thread_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own messages" ON public.chat_messages FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);