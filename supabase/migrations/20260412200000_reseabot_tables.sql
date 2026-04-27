-- ============================================
-- ReseaBot MVP tables (prefix: rb_)
-- Shares Supabase project with ProspectOS
-- ============================================

-- Negocios conectados a ReseaBot
CREATE TABLE rb_businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  sector text DEFAULT 'Restauración',
  google_account_id text,
  google_location_id text,
  google_place_id text,
  oauth_access_token text,
  oauth_refresh_token text,
  oauth_expires_at timestamptz,
  tone text NOT NULL DEFAULT 'cercano',
  signature_style text NOT NULL DEFAULT 'equipo',
  favorite_phrases text[] DEFAULT '{}',
  forbidden_phrases text[] DEFAULT '{}',
  context_notes text,
  website text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION rb_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rb_businesses_updated
  BEFORE UPDATE ON rb_businesses
  FOR EACH ROW EXECUTE FUNCTION rb_update_timestamp();

-- Reseñas detectadas
CREATE TABLE rb_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES rb_businesses(id) ON DELETE CASCADE,
  google_review_id text UNIQUE,
  author_name text,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text text,
  published_at timestamptz,
  -- positive_simple | positive_detailed | neutral | negative_reasonable | negative_sensitive | spam
  severity text NOT NULL DEFAULT 'positive_simple',
  -- pending | draft_sent | approved | published | escalated | dismissed
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_rb_reviews_business_status ON rb_reviews(business_id, status);
CREATE INDEX idx_rb_reviews_google_id ON rb_reviews(google_review_id);

-- Borradores generados por IA
CREATE TABLE rb_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES rb_reviews(id) ON DELETE CASCADE,
  content text NOT NULL,
  -- default | warmer | shorter | formal | firmer
  tone_variant text NOT NULL DEFAULT 'default',
  is_selected boolean DEFAULT false,
  model_used text DEFAULT 'claude-sonnet',
  prompt_tokens integer,
  completion_tokens integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_rb_drafts_review ON rb_drafts(review_id);

-- Log de publicaciones
CREATE TABLE rb_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES rb_reviews(id),
  draft_id uuid REFERENCES rb_drafts(id),
  published_text text NOT NULL,
  published_at timestamptz DEFAULT now(),
  -- api | manual
  published_via text NOT NULL DEFAULT 'manual'
);

-- ============================================
-- RLS: cada usuario solo ve sus negocios y datos
-- ============================================

ALTER TABLE rb_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE rb_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE rb_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rb_publications ENABLE ROW LEVEL SECURITY;

-- rb_businesses: usuario ve solo los suyos
CREATE POLICY "rb_businesses_select" ON rb_businesses
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rb_businesses_insert" ON rb_businesses
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rb_businesses_update" ON rb_businesses
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "rb_businesses_delete" ON rb_businesses
  FOR DELETE USING (auth.uid() = user_id);

-- rb_reviews: acceso via business ownership
CREATE POLICY "rb_reviews_select" ON rb_reviews
  FOR SELECT USING (
    business_id IN (SELECT id FROM rb_businesses WHERE user_id = auth.uid())
  );
CREATE POLICY "rb_reviews_insert" ON rb_reviews
  FOR INSERT WITH CHECK (
    business_id IN (SELECT id FROM rb_businesses WHERE user_id = auth.uid())
  );
CREATE POLICY "rb_reviews_update" ON rb_reviews
  FOR UPDATE USING (
    business_id IN (SELECT id FROM rb_businesses WHERE user_id = auth.uid())
  );

-- rb_drafts: acceso via review -> business ownership
CREATE POLICY "rb_drafts_select" ON rb_drafts
  FOR SELECT USING (
    review_id IN (
      SELECT r.id FROM rb_reviews r
      JOIN rb_businesses b ON r.business_id = b.id
      WHERE b.user_id = auth.uid()
    )
  );
CREATE POLICY "rb_drafts_insert" ON rb_drafts
  FOR INSERT WITH CHECK (
    review_id IN (
      SELECT r.id FROM rb_reviews r
      JOIN rb_businesses b ON r.business_id = b.id
      WHERE b.user_id = auth.uid()
    )
  );

-- rb_publications: acceso via review -> business ownership
CREATE POLICY "rb_publications_select" ON rb_publications
  FOR SELECT USING (
    review_id IN (
      SELECT r.id FROM rb_reviews r
      JOIN rb_businesses b ON r.business_id = b.id
      WHERE b.user_id = auth.uid()
    )
  );
CREATE POLICY "rb_publications_insert" ON rb_publications
  FOR INSERT WITH CHECK (
    review_id IN (
      SELECT r.id FROM rb_reviews r
      JOIN rb_businesses b ON r.business_id = b.id
      WHERE b.user_id = auth.uid()
    )
  );
