-- Migration: scoring mobile_phone + businesses.mobile_phone field
-- Aplica antes del deploy de features #6 y #7 del CEO plan 2026-04-05

-- 1. Añadir campo mobile_phone a businesses
--    Necesario para wa.me deep link (feature #3) y scoring no_mobile_phone (feature #6)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS mobile_phone text;

-- 2. Intentar migrar datos existentes: copiar phone → mobile_phone si parece móvil
--    Los móviles españoles empiezan por 6xx o 7xx
UPDATE businesses
SET mobile_phone = phone
WHERE phone IS NOT NULL
  AND mobile_phone IS NULL
  AND (phone LIKE '6%' OR phone LIKE '7%' OR phone LIKE '+346%' OR phone LIKE '+347%');

-- 3. Actualizar la condición de scoring: no_google_business → no_mobile_phone
UPDATE scoring_rules
SET
  condition   = 'no_mobile_phone',
  description = 'No tiene teléfono móvil (necesario para WhatsApp)'
WHERE condition = 'no_google_business';

-- Verificación (para ejecutar manualmente si se quiere confirmar):
-- SELECT condition, description, points, enabled FROM scoring_rules ORDER BY points DESC;
-- SELECT id, name, phone, mobile_phone FROM businesses LIMIT 10;
