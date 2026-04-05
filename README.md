# ProspectOS

Herramienta de prospección de negocios locales en A Coruña. Busca negocios via Google Maps (Apify), los evalúa con scoring personalizado, gestiona el pipeline de ventas en kanban, y genera propuestas comerciales con IA (Groq/llama-3.3).

**Live:** https://prospect-os-teal.vercel.app/

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS |
| Backend | Supabase (PostgreSQL + Auth magic link) |
| Búsqueda | Apify Google Maps Scraper |
| IA (multi-LLM) | Groq · Gemini · Claude · OpenAI (seleccionable en Settings) |
| Drag & Drop | @dnd-kit |
| Tests | Vitest 4.x + jsdom |
| Deploy | Vercel (auto-deploy desde GitHub master) |

## Prerrequisitos

- Node.js 20+
- Cuenta en [Supabase](https://supabase.com) (proyecto `nbgpaylmrohdqzgaxxqh` ya configurado)
- Cuenta en [Apify](https://apify.com) (para búsqueda de negocios)
- API key de al menos uno: [Groq](https://console.groq.com) · [Gemini](https://aistudio.google.com) · [Claude](https://console.anthropic.com) · [OpenAI](https://platform.openai.com) (seleccionable en Settings)

## Quick Start

```bash
# 1. Clonar
git clone https://github.com/rai1001/ProspectOs.git
cd ProspectOs

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con los valores reales (ver sección Configuración abajo)

# 4. Arrancar en desarrollo
npm run dev
# → http://localhost:5173

# 5. Login con magic link
# Introduce tu email en la pantalla de login → revisa tu bandeja de entrada
```

## Configuración

### Variables de entorno (.env.local)

```
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
```

**Dónde encontrar estos valores:**
- Ve a https://supabase.com/dashboard/project/nbgpaylmrohdqzgaxxqh/settings/api
- `VITE_SUPABASE_URL` → "Project URL"
- `VITE_SUPABASE_ANON_KEY` → "Project API Keys" → "anon public"

### API Keys en Settings de la app

Groq y Apify van en **Settings dentro de la app** (no en .env), porque pueden cambiar sin redeploy:

- **Apify token**: https://my.apify.com/account/integrations
- **Groq API key**: https://console.groq.com/keys

Tras el primer login, ve a `/settings` para guardarlas.

### Base de datos (Supabase)

El proyecto `nbgpaylmrohdqzgaxxqh` ya tiene el schema aplicado. Para recrearlo desde cero:

```bash
# Opción A: Supabase CLI
npm install -g supabase
supabase login
supabase link --project-ref nbgpaylmrohdqzgaxxqh
supabase db push

# Opción B: Manual
# Copia supabase/migrations/20260405100000_initial_schema.sql
# → SQL Editor en https://supabase.com/dashboard/project/nbgpaylmrohdqzgaxxqh/sql
```

## Arquitectura

```
src/
├── pages/              # Pantallas principales
│   ├── Radar.tsx           → Búsqueda Apify + entrada manual de negocios
│   ├── Pipeline.tsx        → Kanban drag-and-drop con 7 estados
│   ├── Kit.tsx             → Generación de kits IA (agente n8n + web) con multi-LLM
│   ├── Settings.tsx        → API keys + reglas de scoring
│   ├── AuditoriaGratis.tsx → Portal público /auditoria-gratis (sin auth, inbound leads)
│   └── Share.tsx           → Vista pública del kit compartido por link (/share/:id)
├── components/         # UI compartida (Sidebar, CommandPalette, ScoreBadge, ...)
├── hooks/              # Estado y datos
│   ├── useLeads.ts         → CRUD de leads + recalculación de scores en batch
│   ├── useAuth.ts          → Magic link auth con Supabase
│   ├── useAIProvider.ts    → Selección segura de proveedor LLM
│   └── useScoringRules.ts  → Reglas editables desde Settings
├── utils/              # Lógica de negocio
│   ├── scoring.ts          → Evaluación de condiciones (no_website, etc.)
│   ├── apify.ts            → Transformación de resultados Apify
│   ├── ai.ts               → Capa multi-LLM (Groq/Gemini/Claude/OpenAI) + sanitizeForPrompt
│   ├── audit.ts            → Auditoría web con IA + extractAuditableHTML
│   └── validation.ts       → Validaciones compartidas (URL pública, teléfono español)
└── lib/
    └── supabase.ts     → Cliente Supabase + tipos exportados
```

**Flujo principal:**
```
Apify API → apify.ts → businesses table → leads table ← useLeads → scoring.ts
                                                                          ↓
                                                                   ScoreBadge / Pipeline

/auditoria-gratis → audit.ts (Gemini) → businesses + leads (anon INSERT via RLS)
Kit.tsx → ai.ts (multi-LLM) → implementation_kits → /share/:id (RPC get_kit_by_id)
```

**Para añadir una nueva feature:**
- Nueva pantalla → `src/pages/` + route en `src/App.tsx`
- Nuevo hook → `src/hooks/` (sigue el patrón de `useLeads.ts`)
- Nuevo componente → `src/components/`

## Scripts

```bash
npm run dev          # Desarrollo con hot reload (localhost:5173)
npm run build        # Build de producción (TypeScript + Vite)
npm run preview      # Preview del build local
npm run lint         # ESLint
npx vitest run       # Tests (67 tests en 6 archivos)
npx vitest           # Tests en modo watch
```

## Seguridad y limitaciones

- **Uso personal exclusivo.** Las API keys (Groq, Gemini, Claude, OpenAI, Apify) se guardan en `localStorage` y se usan directamente desde el frontend. Son visibles en DevTools. No compartir la app con terceros sin mover las keys a Supabase Edge Functions.
- **RLS:** Las políticas autenticadas usan `auth.role() = 'authenticated'`. Solo dar acceso de magic link a tu propio email.
- **Ruta pública `/auditoria-gratis`:** no requiere auth. Incluye rate limiting (30s cooldown), validación de URL (bloquea SSRF a rangos privados y localhost), y validación de teléfono español. Los leads inbound se insertan via política RLS anon restringida a `source = 'inbound'`.
- **Kits compartidos (`/share/:id`):** el acceso anon va por RPC `get_kit_by_id` (SECURITY DEFINER), no por SELECT directo. Impide la enumeración de todos los kits con la anon key.

## Deploy

Push a `master` → Vercel auto-deploya en https://prospect-os-teal.vercel.app/

Variables en Vercel: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (Dashboard → Settings → Environment Variables).

## Tests

Ver [TESTING.md](./TESTING.md) para convenciones completas.

```bash
npx vitest run   # 67 tests en 6 archivos
```
