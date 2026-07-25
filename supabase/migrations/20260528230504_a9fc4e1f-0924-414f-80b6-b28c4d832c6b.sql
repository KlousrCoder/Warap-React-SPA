-- Reviews table: clients rate providers they've contacted
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, provider_id)
);

GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews public read" ON public.reviews FOR SELECT USING (true);

CREATE POLICY "Client can review contacted providers" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = client_id
    AND client_id <> provider_id
    AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.sender_id = auth.uid() AND m.receiver_id = provider_id
    )
  );

CREATE POLICY "Client updates own review" ON public.reviews
  FOR UPDATE TO authenticated USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Client deletes own review" ON public.reviews
  FOR DELETE TO authenticated USING (auth.uid() = client_id);

CREATE POLICY "Admins manage reviews" ON public.reviews
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_reviews_provider ON public.reviews(provider_id);
