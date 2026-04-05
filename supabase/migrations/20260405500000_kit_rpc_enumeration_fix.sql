-- Fix: Kit enumeration by anon role
-- Previously: anon had USING (true) SELECT on implementation_kits
-- → anyone with the anon key could list ALL kits via REST API
--
-- Fix: drop the table-level anon SELECT policy and expose a SECURITY DEFINER
-- RPC that only returns a single kit by ID. Anon cannot enumerate.

-- 1. Drop the enumerable anon policy
DROP POLICY IF EXISTS "Public can read kits by id" ON implementation_kits;

-- 2. RPC: fetch a single kit by UUID (used by /share/:kitId)
--    SECURITY DEFINER runs as the function owner (postgres), bypassing RLS.
--    Anon cannot list the table — they can only call this function with a
--    known UUID, which they get from the share link.
CREATE OR REPLACE FUNCTION get_kit_by_id(kit_id uuid)
RETURNS TABLE (
  id        uuid,
  kit_type  text,
  content   jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT k.id, k.kit_type, k.content
  FROM implementation_kits k
  WHERE k.id = kit_id;
END;
$$;

-- 3. Grant EXECUTE to both anon (share page) and authenticated (internal use)
GRANT EXECUTE ON FUNCTION get_kit_by_id(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_kit_by_id(uuid) TO authenticated;
