import { db } from '@/lib/db'
import { decryptApiKey } from '@/lib/encryption'
import { NextResponse } from 'next/server'

async function callOpenAI(apiKey: string, prompt: string, maxTokens: number) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens }),
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error.message || 'OpenAI API error')
  return json.choices?.[0]?.message?.content
}

async function callAI(userId: string, prompt: string, task: 'draft' | 'edit' | 'suggest') {
  const maxTokens = task === 'draft' ? 8192 : 4096
  let fallbackKey = process.env.OPENAI_API_KEY
  if (!fallbackKey) {
    try {
      const allKeys = await db.apiKey.findMany({})
      const systemOpenAi = allKeys.find((k: any) => k.provider === 'openai' && k.isDefault) || allKeys.find((k: any) => k.provider === 'openai')
      if (systemOpenAi) {
        fallbackKey = decryptApiKey(systemOpenAi.encryptedKey)
      }
    } catch (e) {
      console.warn('Could not fetch system key from database:', e)
    }
  }

  let keys: any[] = []
  try {
    keys = await db.apiKey.findMany({ where: { userId } })
    if (keys.length === 0 && userId.includes('@')) {
      const user = await db.user.findByEmail(userId)
      if (user?.id) {
        keys = await db.apiKey.findMany({ where: { userId: user.id } })
      }
    }
  } catch (e) {
    console.warn('Could not fetch user API keys, falling back to system key:', e)
  }

  const defaultKey = keys.find(k => k.isDefault) || keys[0]

  if (defaultKey) {
    try {
      const decryptedKey = decryptApiKey(defaultKey.encryptedKey)
      const provider = defaultKey.provider

      if (provider === 'openai') {
        return await callOpenAI(decryptedKey, prompt, maxTokens)
      }

      if (provider === 'anthropic') {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': decryptedKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: maxTokens,
            messages: [{ role: 'user', content: prompt }],
          }),
        })
        const json = await res.json()
        if (json.error) throw new Error(json.error.message || json.error.type || 'Anthropic API error')
        return json.content[0].text
      }

      if (provider === 'google') {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${decryptedKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: maxTokens },
            }),
          }
        )
        const json = await res.json()
        if (json.error) throw new Error(json.error.message)
        if (!json.candidates || !json.candidates[0] || !json.candidates[0].content) {
          throw new Error('Gemini API returned an unexpected empty response')
        }
        return json.candidates[0].content.parts[0].text
      }

      if (provider === 'deepseek') {
        const res = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${decryptedKey}` },
          body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens }),
        })
        const json = await res.json()
        if (json.error) throw new Error(json.error.message)
        return json.choices[0].message.content
      }

      const endpoints: Record<string, string> = {
        xai: 'https://api.x.ai/v1/chat/completions',
        mistral: 'https://api.mistral.ai/v1/chat/completions',
        cohere: 'https://api.cohere.ai/v1/chat',
      }
      const models: Record<string, string> = {
        xai: 'grok-2',
        mistral: 'mistral-large-latest',
        cohere: 'command-r-plus',
      }

      const endpoint = endpoints[provider]
      if (endpoint) {
        if (provider === 'cohere') {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${decryptedKey}` },
            body: JSON.stringify({ model: models[provider], message: prompt, max_tokens: 4096 }),
          })
          const json = await res.json()
          if (json.message) return json.message
          throw new Error(json.message || 'Cohere API error')
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${decryptedKey}` },
          body: JSON.stringify({ model: models[provider], messages: [{ role: 'user', content: prompt }], max_tokens: 4096 }),
        })
        const json = await res.json()
        if (json.error) throw new Error(json.error.message || 'API error')
        return json.choices[0].message.content
      }
    } catch (userKeyError: any) {
      console.warn('User API key failed, trying system fallback key:', userKeyError.message)
      if (fallbackKey) {
        return await callOpenAI(fallbackKey, prompt, maxTokens)
      }
      throw userKeyError
    }
  }

  // Fallback to system key if user has no keys
  if (fallbackKey) {
    return await callOpenAI(fallbackKey, prompt, maxTokens)
  }

  throw new Error('No API key configured. Please add an API key in your Account Profile.')
}

export async function POST(request: Request) {
  try {
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    const { userId, prompt, task, title, genre, style, bookType } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    let finalPrompt = prompt
    if (!finalPrompt) {
      if (task === 'front_matter') {
        finalPrompt = `Write the front matter (e.g., dedication, preface) for a ${style || ''} ${genre || bookType || 'book'} titled "${title || 'Untitled'}".`
      } else if (task === 'back_matter') {
        finalPrompt = `Write the back matter (e.g., afterword, author note) for a ${style || ''} ${genre || bookType || 'book'} titled "${title || 'Untitled'}".`
      } else {
        return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
      }
    }

    const result = await callAI(userId, finalPrompt, task || 'draft')
    return NextResponse.json({ content: result })
  } catch (error: any) {
    console.error('AI API Error:', error)
    const msg = error.message || ''
    const lowerMsg = msg.toLowerCase()
    const isClientError =
      lowerMsg.includes('no api key') ||
      lowerMsg.includes('api key') ||
      lowerMsg.includes('incorrect') ||
      lowerMsg.includes('unauthorized') ||
      lowerMsg.includes('quota') ||
      lowerMsg.includes('rate limit') ||
      lowerMsg.includes('credits') ||
      lowerMsg.includes('unsupported provider')

    return NextResponse.json(
      { error: msg || 'AI generation service temporarily unavailable. Please verify your API key.' },
      { status: isClientError ? 400 : 500 }
    )
  }
}