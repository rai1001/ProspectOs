import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

export type Tables = Database['public']['Tables']
export type Business = Tables['businesses']['Row']
export type BusinessInsert = Tables['businesses']['Insert']
export type Lead = Tables['leads']['Row']
export type LeadInsert = Tables['leads']['Insert']
export type LeadUpdate = Tables['leads']['Update']
export type Proposal = Tables['proposals']['Row']
export type ProposalInsert = Tables['proposals']['Insert']
export type ScoringRule = Tables['scoring_rules']['Row']
