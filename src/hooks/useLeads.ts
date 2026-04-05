import { useEffect, useState, useCallback } from 'react'
import { supabase, type Lead, type LeadUpdate, type Business, type BusinessInsert } from '../lib/supabase'
import { calculateScore } from '../utils/scoring'
import { useScoringRules } from './useScoringRules'

export interface LeadWithBusiness extends Lead {
  business: Business
}

export function useLeads() {
  const [leads, setLeads] = useState<LeadWithBusiness[]>([])
  const [loading, setLoading] = useState(true)
  const { rules } = useScoringRules()

  const fetchLeads = useCallback(async () => {
    const { data, error } = await supabase
      .from('leads')
      .select('*, business:businesses(*)')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setLeads(data as LeadWithBusiness[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const addBusinessAndLead = async (business: BusinessInsert): Promise<LeadWithBusiness | null> => {
    // Upsert business (dedup by place_id if present)
    let bizData: Business | null = null

    if (business.place_id) {
      const { data: existing } = await supabase
        .from('businesses')
        .select('*')
        .eq('place_id', business.place_id)
        .maybeSingle()
      if (existing) bizData = existing
    }

    if (!bizData) {
      // Strip fields not in the DB schema (e.g. reviews from Apify)
      const { reviews, ...cleanBiz } = business as BusinessInsert & { reviews?: unknown }
      const { data, error } = await supabase
        .from('businesses')
        .insert(cleanBiz)
        .select()
        .single()
      if (error || !data) return null
      bizData = data
    }

    const score = rules.length > 0 ? calculateScore(bizData, rules) : 0

    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .insert({ business_id: bizData.id, score })
      .select()
      .single()

    if (leadError || !leadData) return null

    const newLead: LeadWithBusiness = { ...leadData, business: bizData }
    setLeads(prev => [newLead, ...prev])
    return newLead
  }

  const updateLead = async (id: string, updates: LeadUpdate) => {
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (!error && data) {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...data } : l))
    }
    return { error }
  }

  const deleteLead = async (id: string) => {
    await supabase.from('leads').delete().eq('id', id)
    setLeads(prev => prev.filter(l => l.id !== id))
  }

  const recalculateScores = async (): Promise<{ error: string | null }> => {
    if (!rules.length || !leads.length) return { error: null }
    const updates = leads.map(l => ({
      id: l.id,
      score: calculateScore(l.business, rules),
    }))
    // Batch upsert: single SQL statement instead of N sequential round-trips.
    // Supabase translates this to INSERT ... ON CONFLICT (id) DO UPDATE SET score = EXCLUDED.score
    const { error } = await supabase.from('leads').upsert(updates, { onConflict: 'id' })
    if (error) return { error: error.message }
    // Update local state without re-fetching all rows from the DB
    const scoreMap = new Map(updates.map(u => [u.id, u.score]))
    setLeads(prev => prev.map(l => ({ ...l, score: scoreMap.get(l.id) ?? l.score })))
    return { error: null }
  }

  return { leads, loading, addBusinessAndLead, updateLead, deleteLead, recalculateScores, refetch: fetchLeads }
}
