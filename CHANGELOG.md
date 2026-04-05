# Changelog — ProspectOS

## [v1.1] — 2026-04-05 (en progreso)

Según el CEO plan del 2026-04-05:

- [ ] Exportar leads a CSV desde Pipeline
- [ ] Empty states con CTAs en las 3 pantallas
- [ ] Botón wa.me deep link en Propuestas
- [ ] Mini-dashboard métricas (conversión, pipeline value, leads stale)
- [ ] Responsive en las 3 pantallas (kanban → lista vertical en móvil)
- [ ] Scoring: reemplazar `no_google_business` por `no_mobile_phone`
- [ ] Campo `mobile_phone` separado en businesses (dependencia de wa.me button — migrar datos existentes con SQL UPDATE)
- [ ] CSV export: incluir BOM UTF-8 para compatibilidad con Excel en Windows (caracteres españoles)

## [v1.0] — 2026-04-05

Primera versión funcional de ProspectOS. Implementación completa del flujo Radar → Pipeline → Propuestas.

### Features implementadas
- **Radar**: Búsqueda via Apify Google Maps Scraper + entrada manual de negocios
- **Pipeline**: Kanban drag-and-drop con 7 estados (@dnd-kit), panel lateral de detalle, notas, follow-up date
- **Propuestas**: Generación con Groq (llama-3.3-70b-versatile), selector de servicio/tono, guardar en notas del lead
- **Settings**: API keys (Apify, Groq), reglas de scoring editables (activar/desactivar, ajustar puntos)
- **Cmd+K**: Command palette global (búsqueda de leads + navegación)
- **Auth**: Magic link con Supabase
- **Scoring**: Engine con 6 condiciones configurables (no_website, high_call_sector, low_rating, low_reviews, no_google_business, website_outdated)
- **Deploy**: Vercel auto-deploy desde GitHub master → https://prospect-os-teal.vercel.app/

### Stack
React 19 + Vite + Tailwind CSS + Supabase + Groq + Apify + Vercel
