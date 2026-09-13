import { db } from '@/lib/db'
import { decryptApiKey } from '@/lib/encryption'
import { NextResponse } from 'next/server'

async function callAI(userId: string, prompt: string, task: 'draft' | 'edit' | 'suggest') {
  const keys = await db.apiKey.findMany({ where: { userId } })
  if (keys.length === 0) throw new Error('No API keys configured')

  const defaultKey = keys.find(k => k.isDefault) || keys[0]
  const decryptedKey = decryptApiKey(defaultKey.encryptedKey)
  const provider = defaultKey.provider
  const maxTokens = task === 'draft' ? 8192 : 4096

  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${decryptedKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens }),
    })
    const json = await res.json()
    if (json.error) throw new Error(json.error.message)
    return json.choices[0].message.content
  }

  if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': decryptedKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
    })
    const json = await res.json()
    if (json.error) throw new Error(json.error.message)
    return json.content[0].text
  }

  if (provider === 'google') {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${decryptedKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens }
      }),
    })
    const json = await res.json()
    if (json.error) throw new Error(json.error.message)
    if (!json.candidates || !json.candidates[0] || !json.candidates[0].content) {
      console.error('Gemini API unexpected response:', json)
      throw new Error('Gemini API returned unexpected response')
    }
    return json.candidates[0].content.parts[0].text
  }

  if (provider === 'deepseek') {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${decryptedKey}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens }),
    })
    const json = await res.json()
    if (json.error) throw new Error(json.error.message)
    return json.choices[0].message.content
  }

  // Generic OpenAI-compatible for xai, mistral, cohere
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
  if (!endpoint) throw new Error(`Unsupported provider: ${provider}`)

  if (provider === 'cohere') {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${decryptedKey}` },
      body: JSON.stringify({ model: models[provider], message: prompt, max_tokens: 4096 }),
    })
    const json = await res.json()
    if (json.message) return json.message
    throw new Error(json.message || 'Cohere API error')
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${decryptedKey}` },
    body: JSON.stringify({ model: models[provider], messages: [{ role: 'user', content: prompt }], max_tokens: 4096 }),
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error.message || 'API error')
  return json.choices[0].message.content
}

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json()
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    const { userId, prompt, task, title, genre, style, bookType } = body
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    let finalPrompt = prompt
    if (!finalPrompt) {
      // Fallback defaults if prompt is missing but other params are provided
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
    const msg = error.message || '';
    const isClientError = msg === 'No API keys configured' || 
                          msg.includes('Unsupported provider') || 
                          msg.includes('API key not valid') ||
                          msg.includes('Quota exceeded') ||
                          msg.includes('rate limit') ||
                          msg.includes('Gemini API returned unexpected');
                          
    return NextResponse.json({ error: msg || 'Internal Server Error' }, { status: isClientError ? 400 : 500 })
  }
}