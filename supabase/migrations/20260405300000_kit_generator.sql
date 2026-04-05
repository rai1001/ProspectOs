-- Kit Generator Migration
-- knowledge_base (RAG pgvector) + implementation_kits + match_knowledge_base RPC
-- Requires: 20260405200000_scoring_mobile_phone.sql applied first

CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Knowledge base (RAG templates) ───────────────��──────────────────────────
CREATE TABLE knowledge_base (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL CHECK (category IN ('agent_template', 'web_template')),
  sector text NOT NULL,
  platform text, -- 'n8n', 'make', 'antigravity', null for generic
  title text NOT NULL,
  content jsonb NOT NULL,
  embedding vector(768), -- Groq nomic-embed-text (768 dims, NOT 1536)
  created_at timestamptz DEFAULT now()
);

-- HNSW index (better than ivfflat for < 1000 rows)
CREATE INDEX ON knowledge_base USING hnsw (embedding vector_cosine_ops);

-- ─── Generated kits ─────────────────────────────────────────────────────────��─
CREATE TABLE implementation_kits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  kit_type text NOT NULL CHECK (kit_type IN ('agent', 'web')),
  platform text,
  content jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX ON implementation_kits(lead_id);

-- ─── RLS ────────────────────────────────────────────────────────────��─────────
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can read knowledge_base" ON knowledge_base
  FOR SELECT TO authenticated USING (true);

ALTER TABLE implementation_kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can read/write implementation_kits" ON implementation_kits
  FOR ALL TO authenticated USING (true);

-- Public read for /share/:kitId page
-- ACCEPTED TRADEOFF: table enumerable with anon key — single-user internal tool
CREATE POLICY "Public can read kits by id" ON implementation_kits
  FOR SELECT TO anon USING (true);

-- ─── RPC: vector similarity search ───────────────────────────────────────────
-- Required — pgvector table alone does not expose similarity search via JS client
CREATE OR REPLACE FUNCTION match_knowledge_base(
  query_embedding vector(768),
  match_sector text,
  match_category text,
  match_count int DEFAULT 3
)
RETURNS TABLE (id uuid, title text, content jsonb, similarity float)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT kb.id, kb.title, kb.content,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM knowledge_base kb
  WHERE kb.sector = match_sector
    AND kb.category = match_category
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
