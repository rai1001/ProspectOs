export const LEAD_STATUSES = [
  'nuevo',
  'contactado',
  'interesado',
  'propuesta',
  'negociacion',
  'cerrado_ganado',
  'cerrado_perdido',
] as const

export type LeadStatus = typeof LEAD_STATUSES[number]

export const STATUS_LABELS: Record<LeadStatus, string> = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  interesado: 'Interesado',
  propuesta: 'Propuesta',
  negociacion: 'Negociación',
  cerrado_ganado: 'Ganado',
  cerrado_perdido: 'Perdido',
}

export const STATUS_COLORS: Record<LeadStatus, string> = {
  nuevo: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
  contactado: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  interesado: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  propuesta: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  negociacion: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  cerrado_ganado: 'bg-green-500/20 text-green-300 border-green-500/30',
  cerrado_perdido: 'bg-red-500/20 text-red-300 border-red-500/30',
}

export const STATUS_BORDER_COLORS: Record<LeadStatus, string> = {
  nuevo: 'border-l-zinc-500',
  contactado: 'border-l-blue-500',
  interesado: 'border-l-yellow-500',
  propuesta: 'border-l-purple-500',
  negociacion: 'border-l-orange-500',
  cerrado_ganado: 'border-l-green-400',
  cerrado_perdido: 'border-l-red-400',
}
