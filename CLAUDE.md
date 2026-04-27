# ProspectOS — Herramienta de Prospeccion

## Que es
CRM de prospeccion de negocios locales en A Coruna/Galicia. Detecta leads para ReseaBot (negocios que no responden resenas).

## URLs
- **Produccion:** https://prospect-os-teal.vercel.app/
- **Repo:** https://github.com/rai1001/ProspectOs (master)
- **Supabase:** nbgpaylmrohdqzgaxxqh (cuenta raisada1001@gmail.com)

## Stack
- React 19 + Vite + TypeScript strict + Tailwind CSS v3
- Supabase (PostgreSQL + RLS + magic link auth)
- Apify (compass~crawler-google-places) para Google Maps
- Multi-LLM: Groq, Gemini, Claude, OpenAI (seleccionable en Settings)
- Vercel auto-deploy desde GitHub push

## Features principales
- Radar: busqueda Google Maps + Instagram + manual + deep search
- Pipeline: kanban 7 columnas drag & drop
- Propuestas: genera con IA, 3 servicios x 3 tonos
- Kit Generator: kits IA + web, pagina publica /share/:kitId
- Auditoria Gratis: portal publico inbound leads
- **Response Rate**: detecta negocios que no responden resenas (leads ReseaBot)

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action.

- Bugs, errors → invoke investigate
- Ship, deploy, push → invoke ship
- QA, test the site → invoke qa
- Code review → invoke review

## Testing
- Run: `npx vitest run` (test dir: `test/`)
- 100% test coverage goal
- Write tests for new functions and bug fixes

## Reglas
- Responder en espanol
- No anadir dependencias sin preguntar
- Supabase client singleton en lib/supabase.ts
- Variables de entorno en .env.local
- API keys LLM en localStorage

## Relacion con otros proyectos
- Alimenta leads para ReseaBot (C:\APLICACIONES\resenabot\)
- Genera kits para Nevoxio (C:\APLICACIONES\agencia\constructor\)
