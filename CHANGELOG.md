# Changelog — ProspectOS

## [v1.2] — 2026-04-05 (Lead Intelligence & Inbound)

Implementación completa de captura inteligente de leads y "Radar de Dolor" multi-fuente.

### Funcionalidades Añadidas (Fases 1-5)
- **Soporte Multimodelo IA**: Infraestructura agnóstica para seleccionar entre Groq, Gemini, Claude u OpenAI (vía la configuración global de la app y `localStorage`).
- **Auditoría de IA en Pipeline (Fase 1)**: Opción "Auditar con IA" que analiza la página del negocio extrayendo su Stack Tecnológico, y detectando carencias de Chatbots u optimización.
- **Radar de Dolor (Fase 2 y 3)**: Búsqueda profunda en Google Maps que analiza vía IA (hasta 10) de las últimas reseñas negativas (<4.5). Añadidos distintivos visuales (borde rojo parpadeante "Lead de fuego") e incluye un botón combi "➕ + Kit" para meter al pipeline y auto-generar propuesta al mismo tiempo.
- **Scraping de Instagram por Hashtag (Fase 4)**: Busca negocios en local por un hashtag específico de IG. Identifica qué perfiles tienen Linktree o carecen de Web, etiquetándolas como grandes presas de alto valor para agencias de IA.
- **Portal Inbound lead-magnet (Fase 5)**: Nueva vista pública sin auth en `/auditoria-gratis` que evalúa la web del cliente a través de Gemini y silenciosamente mete su contacto en el Pipeline en estado de "nuevo" tras captar el número móvil en un CTA.

### Arreglos y Refactor
- **Fix 400 Insert**: Los campos de reseñas devueltos por la API de deep-scraping de Apify se saneaban localmente para evitar choque 400 Bad Request contra Supabase REST en `addBusinessAndLead()`.
- **Scoring en Tiempo Real**: Añadidas nuevas reglas que suben los puntos del lead tras ser analizados (`no_chatbot` +20, `has_pain_points` +30, `web_slow_or_old` +15).

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
