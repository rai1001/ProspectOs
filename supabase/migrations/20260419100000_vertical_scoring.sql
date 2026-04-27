-- =============================================
-- Tarea 6: vertical en businesses + scoring rules por vertical
-- =============================================

-- 1. Añadir columna vertical a businesses
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS vertical TEXT;

ALTER TABLE businesses
  ADD CONSTRAINT businesses_vertical_check
  CHECK (vertical IS NULL OR vertical IN (
    'restaurantes','hoteles','dentistas','fisios',
    'peluquerias','estetica','autoescuelas','academias',
    'inmobiliarias','gestorias','talleres','comercios'
  ));

-- Auto-asignar vertical según sector existente (para registros ya existentes)
UPDATE businesses SET vertical = CASE sector
  WHEN 'Restauración'         THEN 'restaurantes'
  WHEN 'Hostelería'           THEN 'hoteles'
  WHEN 'Peluquería / Estética' THEN 'peluquerias'
  WHEN 'Clínica / Salud'      THEN 'dentistas'
  WHEN 'Taller / Automoción'  THEN 'talleres'
  WHEN 'Comercio retail'      THEN 'comercios'
  WHEN 'Academia / Formación' THEN 'academias'
  ELSE NULL
END
WHERE vertical IS NULL;

-- 2. Añadir columna vertical a scoring_rules (NULL = regla común a todos los verticales)
ALTER TABLE scoring_rules
  ADD COLUMN IF NOT EXISTS vertical TEXT;

ALTER TABLE scoring_rules
  ADD CONSTRAINT scoring_rules_vertical_check
  CHECK (vertical IS NULL OR vertical IN (
    'restaurantes','hoteles','dentistas','fisios',
    'peluquerias','estetica','autoescuelas','academias',
    'inmobiliarias','gestorias','talleres','comercios'
  ));

-- Hacer condition UNIQUE por (condition, vertical) en lugar de solo condition
-- Primero eliminamos el unique anterior si existe
ALTER TABLE scoring_rules DROP CONSTRAINT IF EXISTS scoring_rules_condition_key;
ALTER TABLE scoring_rules ADD CONSTRAINT scoring_rules_condition_vertical_unique UNIQUE (condition, vertical);

-- 3. Insertar reglas específicas por vertical
-- (las reglas genéricas existentes ya tienen vertical=NULL, están bien)

-- RESTAURANTES
INSERT INTO scoring_rules (condition, points, enabled, description, vertical) VALUES
  ('rating_bueno_con_margen',    15, true, 'Rating 4.0-4.5 con >100 reseñas: margen de mejora real',              'restaurantes'),
  ('rating_bajo_restaurante',    10, true, 'Rating <3.8: dolor por reseñas, entrada natural ReseaBot',            'restaurantes'),
  ('sin_respuestas_negativas',   10, true, 'Sin respuestas a reseñas negativas: abandono visible',                'restaurantes'),
  ('thefork_activo',              5, true, 'Activo en TheFork: ya valora tecnología de reservas',                 'restaurantes'),
  ('sin_web_o_solo_facebook',    15, true, 'Sin web o solo Facebook: oportunidad Landing Express',                'restaurantes'),
  ('franquicia_grande',         -30, true, 'Franquicia grande (McDonald''s etc): descartar',                     'restaurantes'),
-- HOTELES
  ('hotel_sin_respuestas',       12, true, 'Hotel sin respuestas a reseñas: oportunidad gestión reputación',      'hoteles'),
  ('hotel_booking_directo',      10, true, 'Sin motor de reservas directo: depende de OTAs',                     'hoteles'),
  ('hotel_rating_mejorable',     10, true, 'Rating 3.8-4.3: margen real de mejora en 90 días',                   'hoteles'),
  ('cadena_hotel_grande',       -30, true, 'Cadena hotel grande (NH, Meliá, etc): descartar',                    'hoteles'),
-- DENTISTAS
  ('dental_alta_estetica',       15, true, 'Web con implantes/Invisalign/estética dental: ticket alto',           'dentistas'),
  ('dental_web_responsive_fail', 10, true, 'Web no responsive: oportunidad Web Blueprint',                       'dentistas'),
  ('dental_multisede',           10, true, 'Múltiples sedes (>3): ticket medio-alto',                            'dentistas'),
  ('dental_cadena_grande',      -30, true, 'Cadena dental grande (Vitaldent, Sanitas): descartar',               'dentistas'),
  ('dental_blog_actualizado',     5, true, 'Blog actualizado: ya invierte en contenido',                         'dentistas'),
-- FISIOS
  ('fisio_mutuas_visibles',      10, true, 'Mutuas visibles en web: captación activa',                           'fisios'),
  ('fisio_solo_telefono',        15, true, 'Solo citas por teléfono: oportunidad WhatsApp bot',                  'fisios'),
  ('fisio_sin_online_booking',   10, true, 'Sin booking online: pérdida de citas fuera de horario',              'fisios'),
-- PELUQUERÍAS
  ('peluqueria_ig_2k',           10, true, 'Instagram >2k seguidores: ya invierte en redes',                     'peluquerias'),
  ('peluqueria_ig_bajo',         -5, true, 'Instagram <500 seguidores: poca inversión digital',                  'peluquerias'),
  ('peluqueria_solo_telefono',   15, true, 'Solo citas por teléfono: oportunidad WhatsApp Setup',                'peluquerias'),
  ('peluqueria_precios_visibles', 5, true, 'Precios visibles en web: más profesional',                           'peluquerias'),
-- ESTÉTICA
  ('estetica_laser_implantos',   12, true, 'Ofrece láser/mesoterapia: ticket alto, inversión en tecnología',     'estetica'),
  ('estetica_solo_instagram',    12, true, 'Presencia solo en Instagram, sin web: capta pero no retiene',        'estetica'),
  ('estetica_booking_online',    -5, true, 'Ya tiene Treatwell/Fresha: menor urgencia bot',                      'estetica'),
-- AUTOESCUELAS
  ('autoescuela_multiples_permisos', 10, true, 'Ofrece B+A+C: mayor ticket posible',                            'autoescuelas'),
  ('autoescuela_solo_teoria',     8, true, 'Solo clases teóricas online: oportunidad sistema prácticas',         'autoescuelas'),
  ('autoescuela_sin_financiacion',10, true, 'Sin financiación visible: barrera entrada alta',                    'autoescuelas'),
-- ACADEMIAS
  ('academia_oposiciones',       12, true, 'Ofrece preparación oposiciones: alta motivación, ticket recurrente', 'academias'),
  ('academia_sin_crm_alumnos',   15, true, 'Sin sistema gestión alumnos visible: caos operativo',                'academias'),
  ('academia_selectividad',       8, true, 'Enfocada en selectividad: pico estacional gestionable con bot',      'academias'),
-- INMOBILIARIAS
  ('inmobiliaria_propiedades_activas', 10, true, '>20 propiedades activas: actividad real',                      'inmobiliarias'),
  ('inmobiliaria_equipo_visible',  10, true, '>3 agentes en equipo: estructura que puede escalar',               'inmobiliarias'),
  ('inmobiliaria_fotos_amateur',   10, true, 'Fotos amateur en listados: dolor visual, entrada fácil',           'inmobiliarias'),
  ('inmobiliaria_sin_virtual_tour', 5, true, 'Sin tour virtual: por detrás del mercado',                        'inmobiliarias'),
  ('franquicia_inmobiliaria',    -20, true, 'Franquicia grande (Remax, C21): descartar salvo oficina pequeña',   'inmobiliarias'),
-- GESTORÍAS
  ('gestoria_autonomos_pymes',    10, true, 'Especializada en autónomos/pymes: ICP exacto de Nevoxio',           'gestorias'),
  ('gestoria_sin_portal_cliente', 15, true, 'Sin portal cliente online: todo por teléfono/email',                'gestorias'),
  ('gestoria_sin_cita_online',    10, true, 'Sin cita online: fricción alta para nuevos clientes',               'gestorias'),
-- TALLERES
  ('taller_multiservicios',       10, true, 'Mecánica+chapa+neumáticos: mayor ticket por visita',                'talleres'),
  ('taller_sin_web',              15, true, 'Sin web: oportunidad alta, poco competido digitalmente',            'talleres'),
  ('taller_presupuesto_visible',   5, true, 'Menciona "presupuesto sin compromiso": orientado cliente',          'talleres'),
  ('taller_oficial_marca',       -20, true, 'Taller oficial de marca: no es ICP independiente',                  'talleres'),
-- COMERCIOS
  ('comercio_sin_tienda_online',  12, true, 'Sin tienda online: pérdida ventas fuera de horario',                'comercios'),
  ('comercio_google_shopping',     8, true, 'No aparece en Google Shopping: visibilidad 0',                      'comercios'),
  ('comercio_rrss_activas',       -5, true, 'RRSS muy activas: menor urgencia, ya tiene canal digital',          'comercios')
ON CONFLICT (condition, vertical) DO NOTHING;
