-- ProspectOs v1.2 — Lead Intelligence
-- Adds enrichment fields to businesses + new scoring rules

-- 1. New columns on businesses
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS technologies jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pain_points jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS has_chatbot boolean DEFAULT null;

-- 2. New scoring rules for lead intelligence
INSERT INTO scoring_rules (condition, description, points, enabled)
VALUES
  ('no_chatbot', 'Sin chatbot / widget de WhatsApp detectado', 20, true),
  ('has_pain_points', 'Quejas recientes de atención al cliente en reseñas', 30, true),
  ('web_slow_or_old', 'Web lenta, anticuada o sin optimizar', 15, true)
ON CONFLICT DO NOTHING;
