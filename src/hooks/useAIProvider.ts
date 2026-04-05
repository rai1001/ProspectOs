import { useState } from 'react'
import type { AIProvider } from '../utils/ai'

const LS_PROVIDER = 'prospectOS_ai_provider'
const LS_KEYS: Record<AIProvider, string> = {
  groq: 'prospectOS_groq_key',
  openai: 'prospectOS_openai_key',
  claude: 'prospectOS_claude_key',
  gemini: 'prospectOS_gemini_key',
}

export function useAIProvider() {
  const [provider, setProviderState] = useState<AIProvider>(
    () => (localStorage.getItem(LS_PROVIDER) as AIProvider) ?? 'groq',
  )
  const [apiKey, setApiKeyState] = useState<string>(
    () => localStorage.getItem(LS_KEYS[(localStorage.getItem(LS_PROVIDER) as AIProvider) ?? 'groq']) ?? '',
  )

  const setProvider = (p: AIProvider) => {
    localStorage.setItem(LS_PROVIDER, p)
    setProviderState(p)
    setApiKeyState(localStorage.getItem(LS_KEYS[p]) ?? '')
  }

  const setApiKey = (key: string) => {
    localStorage.setItem(LS_KEYS[provider], key)
    setApiKeyState(key)
  }

  return { provider, setProvider, apiKey, setApiKey }
}
