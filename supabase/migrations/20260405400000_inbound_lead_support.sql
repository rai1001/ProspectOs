-- Migration: Enable inbound lead capture from /auditoria-gratis
-- The public audit page needs to INSERT into businesses + leads without auth.

-- 1. Expand source CHECK constraint to include 'inbound'
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_source_check;
ALTER TABLE businesses ADD CONSTRAINT businesses_source_check
  CHECK (source IN ('apify', 'manual', 'inbound'));

-- 2. Allow anon INSERT into businesses (for lead-magnet form)
-- Only INSERT, not SELECT/UPDATE/DELETE — anon can create but not read back
CREATE POLICY "anon_insert_inbound" ON businesses
  FOR INSERT TO anon
  WITH CHECK (source = 'inbound');

-- 3. Allow anon INSERT into leads (for lead-magnet form)
-- Only INSERT, not SELECT/UPDATE/DELETE
CREATE POLICY "anon_insert_leads" ON leads
  FOR INSERT TO anon
  WITH CHECK (true);
