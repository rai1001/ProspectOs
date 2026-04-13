-- Add review response tracking fields to businesses
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS response_rate integer;
-- 0-100, percentage of reviews with owner reply (from last 10 analyzed)
-- null = not analyzed yet

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS unresponded_reviews integer;
-- count of reviews without owner reply (from last 10 analyzed)

-- New scoring rule: no review responses
INSERT INTO scoring_rules (id, condition, points, enabled, description) VALUES
  (gen_random_uuid(), 'no_review_responses', 25, true, 'No responde reseñas de Google (<20% respuestas)');
