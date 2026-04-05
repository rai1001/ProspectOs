export type AIProvider = 'groq' | 'openai' | 'claude' | 'gemini'

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  groq: 'Groq — llama-3.3-70b',
  openai: 'OpenAI — gpt-4o-mini',
  claude: 'Claude — haiku-3.5',
  gemini: 'Gemini — 2.0 flash',
}

export const PROVIDER_MODELS: Record<AIProvider, string> = {
  groq: 'llama-3.3-70b-versatile',
  openai: 'gpt-4o-mini',
  claude: 'claude-3-5-haiku-20241022',
  gemini: 'gemini-2.0-flash',
}

export async function generateText({
  provider,
  apiKey,
  systemPrompt,
  userPrompt,
  maxTokens = 1024,
}: {
  provider: AIProvider
  apiKey: string
  systemPrompt: string
  userPrompt: string
  maxTokens?: number
}): Promise<string> {
  // ── Groq + OpenAI (OpenAI-compatible) ─────────────────────────
  if (provider === 'groq' || provider === 'openai') {
    const endpoint =
      provider === 'groq'
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions'

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: PROVIDER_MODELS[provider],
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      if (res.status === 401) throw new Error(`API key de ${PROVIDER_LABELS[provider]} inválida`)
      if (res.status === 429) throw new Error(`Cuota de ${PROVIDER_LABELS[provider]} agotada`)
      throw new Error((err as { error?: { message?: string } }).error?.message ?? `Error ${res.status}`)
    }

    const data = await res.json() as { choices: { message: { content: string } }[] }
    return data.choices[0].message.content
  }

  // ── Claude (Anthropic) ─────────────────────────────────────────
  if (provider === 'claude') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: PROVIDER_MODELS.claude,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      if (res.status === 401) throw new Error('API key de Claude inválida')
      if (res.status === 429) throw new Error('Cuota de Claude agotada')
      throw new Error((err as { error?: { message?: string } }).error?.message ?? `Error ${res.status}`)
    }

    const data = await res.json() as { content: { text: string }[] }
    return data.content[0].text
  }

  // ── Gemini (Google) ────────────────────────────────────────────
  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      if (res.status === 400 || res.status === 403) throw new Error('API key de Gemini inválida')
      if (res.status === 429) throw new Error('Cuota de Gemini agotada')
      throw new Error((err as { error?: { message?: string } }).error?.message ?? `Error ${res.status}`)
    }

    const data = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] }
    return data.candidates[0].content.parts[0].text
  }

  throw new Error(`Provider desconocido: ${provider}`)
}
