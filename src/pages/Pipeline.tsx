import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Trash2, FileText, Eye, Download, Loader2, GripVertical,
  Users, X, Save,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { ScoreBadge } from '../components/ScoreBadge'
import { StatusBadge } from '../components/StatusBadge'
import { SectorBadge } from '../components/SectorBadge'
import { toast } from '../components/Toast'
import { useLeads, type LeadWithBusiness } from '../hooks/useLeads'
import { LEAD_STATUSES, STATUS_LABELS, type LeadStatus } from '../constants/statuses'

// ─── Metric cards ───────────────────────────────────────────────
function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
      <p className="text-xs text-[#9ca3af] mb-1">{label}</p>
      <p className="text-xl font-mono font-semibold text-white">{value}</p>
      {sub && <p className="text-xs text-[#9ca3af] mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Lead card (sortable) ────────────────────────────────────────
function LeadCard({
  lead,
  onView,
  onDelete,
  onProposal,
}: {
  lead: LeadWithBusiness
  onView: () => void
  onDelete: () => void
  onProposal: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 border-l-4 select-none',
        lead.score >= 70 ? 'border-l-green-400' : lead.score >= 40 ? 'border-l-amber-400' : 'border-l-zinc-600',
        isDragging && 'opacity-40',
      )}
    >
      <div className="flex items-start gap-2">
        <button {...listeners} {...attributes} className="mt-0.5 text-[#9ca3af] hover:text-white cursor-grab active:cursor-grabbing">
          <GripVertical size={14} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p className="text-sm font-medium text-white truncate">{lead.business.name}</p>
            <ScoreBadge score={lead.score} size="sm" />
          </div>
          <SectorBadge sector={lead.business.sector} className="mt-1" />
          {lead.business.phone && (
            <p className="text-xs text-[#9ca3af] mt-1 truncate">{lead.business.phone}</p>
          )}
        </div>
      </div>

      <div className="flex gap-1 mt-2 pt-2 border-t border-[#2a2a2a]">
        <button onClick={onView} className="flex-1 flex items-center justify-center gap-1 text-xs text-[#9ca3af] hover:text-white py-1 rounded hover:bg-[#2a2a2a] transition-colors">
          <Eye size={11} /> Ver
        </button>
        <button onClick={onProposal} className="flex-1 flex items-center justify-center gap-1 text-xs text-[#9ca3af] hover:text-amber-400 py-1 rounded hover:bg-[#2a2a2a] transition-colors">
          <FileText size={11} /> Propuesta
        </button>
        <button onClick={onDelete} className="flex items-center justify-center gap-1 text-xs text-[#9ca3af] hover:text-red-400 py-1 px-2 rounded hover:bg-[#2a2a2a] transition-colors">
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}

// ─── Lead detail panel ───────────────────────────────────────────
function LeadPanel({ lead, onClose, onUpdate }: {
  lead: LeadWithBusiness
  onClose: () => void
  onUpdate: (id: string, updates: any) => Promise<any>
}) {
  const navigate = useNavigate()
  const [notes, setNotes] = useState(lead.notes ?? '')
  const [status, setStatus] = useState<LeadStatus>(lead.status as LeadStatus)
  const [followUp, setFollowUp] = useState(lead.next_follow_up ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const { error } = await onUpdate(lead.id, {
      notes,
      status,
      next_follow_up: followUp || null,
      last_contact_date: new Date().toISOString(),
    })
    if (error) toast.error('Error al guardar')
    else toast.success('Guardado')
    setSaving(false)
  }

  const b = lead.business

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-[#1a1a1a] border-l border-[#2a2a2a] z-50 flex flex-col shadow-2xl">
      <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
        <h2 className="font-mono font-semibold text-sm text-white truncate">{b.name}</h2>
        <button onClick={onClose} className="text-[#9ca3af] hover:text-white">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Score + sector */}
        <div className="flex items-center gap-3">
          <ScoreBadge score={lead.score} size="lg" />
          <div>
            <SectorBadge sector={b.sector} />
            <StatusBadge status={status} className="ml-1" />
          </div>
        </div>

        {/* Business info */}
        <div className="space-y-1.5 text-sm">
          {b.address && <p className="text-[#9ca3af]">{b.address}</p>}
          {b.phone && <p className="text-[#9ca3af]">Tel: {b.phone}</p>}
          {b.mobile_phone && <p className="text-[#9ca3af]">Móvil: {b.mobile_phone}</p>}
          {b.website && <a href={b.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate block">{b.website}</a>}
          {b.google_rating && (
            <p className="text-[#9ca3af]">Rating: {b.google_rating} ({b.review_count ?? '?'} reseñas)</p>
          )}
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs text-[#9ca3af] mb-1.5 font-medium">Estado</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value as LeadStatus)}
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
          >
            {LEAD_STATUSES.map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {/* Follow up */}
        <div>
          <label className="block text-xs text-[#9ca3af] mb-1.5 font-medium">Próximo seguimiento</label>
          <input
            type="date"
            value={followUp}
            onChange={e => setFollowUp(e.target.value)}
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs text-[#9ca3af] mb-1.5 font-medium">Notas</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={5}
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white placeholder-[#4a4a4a] focus:outline-none focus:border-amber-500 resize-none"
            placeholder="Notas sobre el contacto..."
          />
        </div>
      </div>

      <div className="p-4 border-t border-[#2a2a2a] space-y-2">
        <button
          onClick={() => navigate(`/propuestas?lead=${lead.id}`)}
          className="w-full flex items-center justify-center gap-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/25 text-sm font-medium rounded px-4 py-2 transition-colors"
        >
          <FileText size={14} /> Generar propuesta
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-black text-sm font-medium rounded px-4 py-2 transition-colors"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Guardar cambios
        </button>
      </div>
    </div>
  )
}

// ─── Main Pipeline page ──────────────────────────────────────────
export default function Pipeline() {
  const { leads, loading, updateLead, deleteLead } = useLeads()
  const navigate = useNavigate()
  const [selectedLead, setSelectedLead] = useState<LeadWithBusiness | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))
  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over || active.id === over.id) return
    // over.id is the column status string when dropped on a column droppable
    const newStatus = over.id as LeadStatus
    if (LEAD_STATUSES.includes(newStatus)) {
      await updateLead(String(active.id), {
        status: newStatus,
        last_contact_date: new Date().toISOString(),
      })
    }
  }

  // Metrics
  const totalPipelineValue = leads
    .filter(l => l.estimated_value)
    .reduce((sum, l) => sum + Number(l.estimated_value), 0)

  const ganados = leads.filter(l => l.status === 'cerrado_ganado').length
  const total = leads.length
  const conversionRate = total > 0 ? Math.round((ganados / total) * 100) : 0

  const stale = leads.filter(l => {
    if (!l.last_contact_date) return true
    const diff = (Date.now() - new Date(l.last_contact_date).getTime()) / (1000 * 60 * 60 * 24)
    return diff > 7
  }).length

  const exportCSV = () => {
    const header = ['Nombre', 'Sector', 'Score', 'Estado', 'Teléfono', 'Móvil', 'Web', 'Notas', 'Creado']
    const rows = leads.map(l => [
      l.business.name,
      l.business.sector,
      l.score,
      l.status,
      l.business.phone ?? '',
      l.business.mobile_phone ?? '',
      l.business.website ?? '',
      (l.notes ?? '').replace(/,/g, ';'),
      l.created_at ? new Date(l.created_at).toLocaleDateString('es-ES') : '',
    ])
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'pipeline-prospectos.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const activeLead = leads.find(l => l.id === activeId)

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 size={24} className="animate-spin text-amber-500" />
    </div>
  )

  return (
    <div className="flex-1 p-6 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-lg font-mono font-semibold text-white mb-0.5">Pipeline</h1>
          <p className="text-sm text-[#9ca3af]">{total} leads</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#3a3a3a] text-[#9ca3af] hover:text-white text-xs font-medium rounded-lg px-3 py-2 transition-colors"
        >
          <Download size={13} /> Exportar CSV
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
        <MetricCard label="Total leads" value={total} />
        <MetricCard label="Tasa de conversión" value={`${conversionRate}%`} sub={`${ganados} ganados`} />
        <MetricCard label="Pipeline value" value={totalPipelineValue > 0 ? `€${totalPipelineValue.toLocaleString('es-ES')}` : '—'} />
        <MetricCard label="Sin contacto (7d+)" value={stale} sub="leads inactivos" />
      </div>

      {total === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <Users size={40} className="text-[#3a3a3a] mb-3" />
          <p className="text-sm font-medium text-white mb-1">Pipeline vacío</p>
          <p className="text-xs text-[#9ca3af] mb-4">Usa el Radar para encontrar negocios y añadirlos aquí</p>
          <button
            onClick={() => navigate('/radar')}
            className="bg-amber-500 hover:bg-amber-600 text-black text-sm font-medium rounded-lg px-4 py-2"
          >
            Ir al Radar
          </button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-x-auto pb-4">
            <div className="flex gap-3 h-full" style={{ minWidth: `${LEAD_STATUSES.length * 220}px` }}>
              {LEAD_STATUSES.map(status => {
                const columnLeads = leads.filter(l => l.status === status)
                return (
                  <KanbanColumn
                    key={status}
                    status={status}
                    leads={columnLeads}
                    onView={lead => setSelectedLead(lead)}
                    onDelete={async (id) => {
                      await deleteLead(id)
                      toast.success('Lead eliminado')
                    }}
                    onProposal={lead => navigate(`/propuestas?lead=${lead.id}`)}
                  />
                )
              })}
            </div>
          </div>

          <DragOverlay>
            {activeLead && (
              <div className="bg-[#1a1a1a] border border-amber-500/40 rounded-lg p-3 w-52 shadow-2xl opacity-90">
                <p className="text-sm font-medium text-white truncate">{activeLead.business.name}</p>
                <ScoreBadge score={activeLead.score} size="sm" />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {selectedLead && (
        <LeadPanel
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={updateLead}
        />
      )}
    </div>
  )
}

function KanbanColumn({
  status,
  leads,
  onView,
  onDelete,
  onProposal,
}: {
  status: LeadStatus
  leads: LeadWithBusiness[]
  onView: (l: LeadWithBusiness) => void
  onDelete: (id: string) => void
  onProposal: (l: LeadWithBusiness) => void
}) {
  const { setNodeRef } = useSortable({ id: status })

  return (
    <div ref={setNodeRef} className="w-52 flex-shrink-0 flex flex-col bg-[#111] rounded-lg border border-[#2a2a2a]">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#2a2a2a]">
        <StatusBadge status={status} />
        <span className="text-xs text-[#9ca3af] font-mono">{leads.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px]">
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onView={() => onView(lead)}
              onDelete={() => onDelete(lead.id)}
              onProposal={() => onProposal(lead)}
            />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <div className="h-16 flex items-center justify-center">
            <p className="text-xs text-[#3a3a3a]">Sin leads</p>
          </div>
        )}
      </div>
    </div>
  )
}
