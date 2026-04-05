# TODOS

## Kit Generator — Post-launch

### P3: Kit generation history per lead
**What:** In /kit page, show the last 3 kits generated for the selected lead (date + type).
**Why:** Enables comparison between kit versions when iterating with a client.
**Pros:** data already stored in implementation_kits — pure UI work.
**Cons:** adds query + UI complexity, not needed at launch.
**Effort:** S (human: ~4h / CC: ~15min)
**Context:** implementation_kits.lead_id is indexed. Query: SELECT * FROM implementation_kits WHERE lead_id = ? ORDER BY created_at DESC LIMIT 3.
**Depends on:** Kit Generator v1 shipped.

### P1: Validar JSON de n8n con import real
**What:** Tras generar el primer kit real de agente IA, exportar el `workflow_json` e importarlo en n8n manualmente (n8n > Import from File).
**Why:** El JSON lo genera un LLM con templates de referencia. Los schemas de n8n son versionados y puede fallar el import si los node types no coinciden con la versión instalada.
**Pros:** Detecta problemas en el seed antes de presentar a clientes.
**Cons:** Requiere acceso a una instancia n8n.
**Effort:** XS (human: ~30min / CC: N/A — validación manual)
**Context:** Si el import falla, el feedback va al seed template de esa categoría. Ajustar el system prompt de generación para que los node types sean más genéricos.
**Depends on:** Kit Generator v1 shipped. Primer kit generado.

### ~~P3: Soporte multimodelo (Claude + OpenAI como alternativa a Groq)~~
**Completed:** v1.2 (2026-04-05)
Groq, Gemini, Claude y OpenAI disponibles en Settings. Capa `utils/ai.ts` agnóstica de proveedor. `useAIProvider` hook con validación de provider.

## ProspectOS — Pending

### P2: Apply pending migration (scoring_mobile_phone)
**What:** Apply supabase/migrations/20260405200000_scoring_mobile_phone.sql
**Why:** Enables no_mobile_phone scoring rule and WhatsApp deep links.
**Must apply BEFORE:** kit_generator migration.

