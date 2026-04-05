-- ProspectOS Initial Schema
-- Generated from design doc approved 2026-04-05

-- Negocios encontrados (pre-pipeline)
CREATE TABLE businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sector text NOT NULL CHECK (sector IN (
    'Restauración', 'Hostelería', 'Peluquería / Estética',
    'Clínica / Salud', 'Taller / Automoción', 'Comercio retail',
    'Fontanería / Reformas', 'Academia / Formación', 'Otro'
  )),
  address text,
  phone text,
  mobile_phone text,
  website text,
  website_outdated boolean DEFAULT false,
  google_rating numeric(2,1),
  review_count integer,
  has_google_business boolean DEFAULT false,
  place_id text UNIQUE,
  source text NOT NULL CHECK (source IN ('apify', 'manual')),
  created_at timestamptz DEFAULT now()
);

-- Leads (negocios en el pipeline)
CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'nuevo' CHECK (status IN (
    'nuevo',
    'contactado',
    'interesado',
    'propuesta',
    'negociacion',
    'cerrado_ganado',
    'cerrado_perdido'
  )),
  score integer NOT NULL DEFAULT 0,
  estimated_value numeric(10,2),
  notes text,
  next_follow_up date,
  last_contact_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Propuestas generadas
CREATE TABLE proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  service_type text NOT NULL CHECK (service_type IN (
    'agente_ia', 'web', 'pack_completo'
  )),
  tone text NOT NULL CHECK (tone IN ('formal', 'cercano', 'whatsapp')),
  model_used text NOT NULL DEFAULT 'claude',
  prompt_used text,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Reglas de scoring configurables
CREATE TABLE scoring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condition text NOT NULL UNIQUE,
  points integer NOT NULL,
  enabled boolean DEFAULT true,
  description text
);

-- Indexes for common JOINs
CREATE INDEX idx_leads_business ON leads(business_id);
CREATE INDEX idx_proposals_lead ON proposals(lead_id);
CREATE INDEX idx_leads_status ON leads(status);

-- Seed data: reglas de scoring por defecto
INSERT INTO scoring_rules (condition, points, description) VALUES
  ('no_website',         35, 'No tiene página web'),
  ('high_call_sector',   20, 'Sector de alta rotación de llamadas (Restauración, Hostelería, Clínica/Salud, Taller/Automoción)'),
  ('low_rating',         15, 'Rating Google < 4.0'),
  ('low_reviews',        10, 'Menos de 30 reseñas en Google'),
  ('no_mobile_phone',    10, 'No tiene teléfono móvil de contacto'),
  ('website_outdated',   10, 'Web visiblemente desactualizada (marcado manual)');

-- RLS: solo el usuario autenticado puede leer/escribir
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON businesses FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON leads FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON proposals FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON scoring_rules FOR ALL USING (auth.role() = 'authenticated');

-- Function to auto-update updated_at on leads
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
