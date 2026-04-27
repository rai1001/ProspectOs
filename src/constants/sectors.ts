export const SECTORS = [
  'Restauración',
  'Hostelería',
  'Peluquería / Estética',
  'Clínica / Salud',
  'Taller / Automoción',
  'Comercio retail',
  'Fontanería / Reformas',
  'Academia / Formación',
  'Otro',
] as const

export type Sector = typeof SECTORS[number]

export const HIGH_CALL_SECTORS: Sector[] = [
  'Restauración',
  'Hostelería',
  'Clínica / Salud',
  'Taller / Automoción',
]

export const SECTOR_COLORS: Record<Sector, string> = {
  'Restauración': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'Hostelería': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'Peluquería / Estética': 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  'Clínica / Salud': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'Taller / Automoción': 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  'Comercio retail': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'Fontanería / Reformas': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'Academia / Formación': 'bg-green-500/20 text-green-300 border-green-500/30',
  'Otro': 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
}

// Mapping sector → vertical Nevoxio por defecto
export const SECTOR_TO_VERTICAL: Partial<Record<Sector, string>> = {
  'Restauración':          'restaurantes',
  'Hostelería':            'hoteles',
  'Peluquería / Estética': 'peluquerias',
  'Clínica / Salud':       'dentistas',
  'Taller / Automoción':   'talleres',
  'Comercio retail':       'comercios',
  'Academia / Formación':  'academias',
  // Inmobiliarias, Gestorías, Fisios, Estética, Autoescuelas: asignación manual
}

export const VERTICAL_SLUGS = [
  'restaurantes', 'hoteles', 'dentistas', 'fisios',
  'peluquerias', 'estetica', 'autoescuelas', 'academias',
  'inmobiliarias', 'gestorias', 'talleres', 'comercios',
] as const

export type VerticalSlug = typeof VERTICAL_SLUGS[number]

export const VERTICAL_LABELS: Record<VerticalSlug, string> = {
  restaurantes:  'Restaurantes',
  hoteles:       'Hoteles',
  dentistas:     'Dentistas',
  fisios:        'Fisios',
  peluquerias:   'Peluquerías',
  estetica:      'Estética',
  autoescuelas:  'Autoescuelas',
  academias:     'Academias',
  inmobiliarias: 'Inmobiliarias',
  gestorias:     'Gestorías',
  talleres:      'Talleres',
  comercios:     'Comercios',
}

export const VERTICAL_ICONS: Record<VerticalSlug, string> = {
  restaurantes:  '🍽️',
  hoteles:       '🏨',
  dentistas:     '🦷',
  fisios:        '💪',
  peluquerias:   '✂️',
  estetica:      '✨',
  autoescuelas:  '🚗',
  academias:     '🎓',
  inmobiliarias: '🏠',
  gestorias:     '📊',
  talleres:      '🔧',
  comercios:     '🛍️',
}

export const VERTICAL_SCORE_THRESHOLD = {
  priority: 75,
  approved: 50,
  nurture: 25,
} as const
