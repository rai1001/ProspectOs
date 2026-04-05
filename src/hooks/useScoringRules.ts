import { useEffect, useState, useCallback } from 'react'
import { supabase, type ScoringRule } from '../lib/supabase'

export function useScoringRules() {
  const [rules, setRules] = useState<ScoringRule[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRules = useCallback(async () => {
    const { data, error } = await supabase
      .from('scoring_rules')
      .select('*')
      .order('points', { ascending: false })

    if (!error && data) setRules(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchRules() }, [fetchRules])

  const toggleRule = async (id: string, enabled: boolean) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled } : r))
    await supabase.from('scoring_rules').update({ enabled }).eq('id', id)
  }

  const updatePoints = async (id: string, points: number) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, points } : r))
    await supabase.from('scoring_rules').update({ points }).eq('id', id)
  }

  return { rules, loading, toggleRule, updatePoints, refetch: fetchRules }
}
