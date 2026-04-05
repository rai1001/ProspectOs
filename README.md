# ProspectOS

Herramienta de prospección de negocios locales en A Coruña. Busca negocios via Google Maps (Apify), los evalúa con scoring personalizado, gestiona el pipeline de ventas en kanban, y genera propuestas comerciales con IA (Groq/llama-3.3).

**Live:** https://prospect-os-teal.vercel.app/

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS |
| Backend | Supabase (PostgreSQL + Auth magic link) |
| Búsqueda | Apify Google Maps Scraper |
| IA propuestas | Groq (llama-3.3-70b-versatile, free tier) |
| Drag & Drop | @dnd-kit |
| Deploy | Vercel (auto-deploy desde GitHub master) |

## Prerrequisitos

- Node.js 20+
- Cuenta en [Supabase](https://supabase.com) (proyecto `nbgpaylmrohdqzgaxxqh` ya configurado)
- Cuenta en [Apify](https://apify.com) (para búsqueda de negocios)
- API key de [Groq](https://console.groq.com) (free tier, para propuestas IA)

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
├── pages/          # Pantallas principales
│   ├── Radar.tsx       → Búsqueda Apify + entrada manual de negocios
│   ├── Pipeline.tsx    → Kanban drag-and-drop con 7 estados
│   ├── Propuestas.tsx  → Generación de propuestas con Groq
│   └── Settings.tsx    → API keys + reglas de scoring
├── components/     # UI compartida (Sidebar, CommandPalette, ScoreBadge, ...)
├── hooks/          # Estado y datos
│   ├── useLeads.ts         → CRUD de leads + scoring en tiempo real
│   ├── useAuth.ts          → Magic link auth con Supabase
│   └── useScoringRules.ts  → Reglas editables desde Settings
├── utils/          # Lógica de negocio
│   ├── scoring.ts          → Evaluación de condiciones (no_website, etc.)
│   └── apify.ts            → Transformación de resultados Apify
└── lib/
    └── supabase.ts     → Cliente Supabase + tipos exportados
```

**Flujo principal:**
```
Apify API → apify.ts → businesses table → leads table ← useLeads → scoring.ts
                                                                          ↓
                                                                   ScoreBadge / Pipeline
```

**Para añadir una nueva feature:**
- Nueva pantalla → `src/pages/` + route en `src/App.tsx`
- Nuevo hook → `src/hooks/` (sigue el patrón de `useLeads.ts`)
- Nuevo componente → `src/components/`

## Scripts

```bash
npm run dev      # Desarrollo con hot reload (localhost:5173)
npm run build    # Build de producción (TypeScript + Vite)
npm run preview  # Preview del build local
npm run lint     # ESLint
```

## Seguridad y limitaciones

- **Uso personal exclusivo.** La Groq API key y el Apify token se guardan en `localStorage` del navegador y se usan directamente desde el frontend. Son visibles en DevTools. No compartir la app con terceros sin primero mover las keys a Supabase Edge Functions.
- **RLS:** Las políticas de Supabase usan `auth.role() = 'authenticated'`. Cualquier usuario autenticado puede ver todos los datos. Solo dar acceso de magic link a tu propio email.

## Deploy

Push a `master` → Vercel auto-deploya en https://prospect-os-teal.vercel.app/

Variables en Vercel: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (Dashboard → Settings → Environment Variables).
