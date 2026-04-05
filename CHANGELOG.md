# Changelog — ProspectOS

## [v1.3] — 2026-04-05 (Security Hardening & Reliability)

Siete fixes de seguridad y rendimiento detectados en el adversarial review. Ningún cambio visible en la UI — todo pasa debajo del capó.

### Seguridad
- **Share CTA funciona en el móvil del cliente**: el teléfono de la agencia ya no se lee del localStorage del visitante (que siempre estaba vacío). Ahora se guarda dentro del kit al generarlo y se recupera de la DB.
- **Kits ya no son enumerables por anon**: se eliminó la policy `USING (true)` en `implementation_kits`. El acceso anon pasa por un RPC `get_kit_by_id` (SECURITY DEFINER) que solo devuelve un kit por UUID — imposible listar todos los kits con la anon key.
- **Defensa contra prompt injection**: los campos del negocio (nombre, notas, dirección...) se sanean con `sanitizeForPrompt()` antes de entrar al prompt LLM. Los datos van envueltos en delimitadores XML para que el modelo los trate como datos, no como instrucciones.

### Rendimiento
- **Recalcular scores ya no congela la app**: era un loop `for await` que enviaba un UPDATE por lead. Ahora es un único `upsert` en batch. Con 50 leads: de ~5 segundos a ~100ms.
- **La auditoría web ya no falla en sites con cabeceras grandes**: en vez de cortar el HTML en el carácter 6000, se extrae el `<head>` completo más los primeros 2000 chars del `<body>`. Los analytics, el pixel de Meta y el viewport ya no quedan fuera del análisis.

### Fiabilidad
- **El botón "Generar kit" automático ya no falla**: se eliminó el hack `document.getElementById?.click()` con un `setTimeout(100)`. Ahora el tab se pasa directamente a `handleGenerate()` — sin race conditions ni dependencias del DOM.
- **El parser de kits ya no confunde JSON con texto posterior**: el regex greedy `/\{[\s\S]*\}/` se reemplazó por un bracket-counter que para en el primer `}` balanceado. Un LLM que añade una nota después del JSON ya no rompe el parse.

### Para contribuidores
- Nueva utilidad `src/utils/validation.ts` con `isValidPublicUrl` e `isValidSpanishPhone` exportadas (antes inline en el componente).
- `extractFirstJsonObject` exportada desde `Kit.tsx` para testabilidad.
- `audit.ts` usa `parseLLMJson<T>()` de `ai.ts` en vez de reimplementarlo.
- `recalculateScores()` devuelve `{ error }` — `Settings.tsx` lo muestra al usuario.
- 67 tests en 6 archivos (antes: 30 tests en 3 archivos).

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
