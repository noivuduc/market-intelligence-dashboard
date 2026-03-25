// ============================================================
// AI MODULE EXPLANATION ROUTE
// Calls Claude API with a structured feature packet.
// Caches response for 15 minutes per module.
//
// POST /api/ai/explain
// Body: { packet: FeaturePacket }
// ============================================================

import { NextResponse } from 'next/server'
import { serverCache, TTL } from '@/lib/cache/server'
import { parseModelJson } from '@/lib/ai/parseModelJson'
import { buildModuleExplainPrompt } from '@/lib/ai/prompts'
import type { FeaturePacket } from '@/lib/ai/packets'
import type { ModuleAIExplanation } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Simple hash for cache keying
function hashPacket(packet: FeaturePacket): string {
  const key = `${packet.module}:${JSON.stringify(packet.regimeLabels)}`
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(16).slice(0, 8)
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured. AI explanations unavailable.' },
      { status: 503 }
    )
  }

  let packet: FeaturePacket
  try {
    const body = await request.json()
    packet = body.packet
    if (!packet?.module) throw new Error('Missing packet.module')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const cacheKey   = `ai:explain:${packet.module}:${hashPacket(packet)}`
  const cachedHit  = serverCache.get<ModuleAIExplanation>(cacheKey)
  if (cachedHit && !cachedHit.isStale) {
    return NextResponse.json(cachedHit.data, {
      headers: { 'X-From-Cache': 'true', 'X-Cache-Age': String(Math.round(cachedHit.ageMs / 1000)) + 's' },
    })
  }

  const prompt = buildModuleExplainPrompt(packet)

  try {
    const raw = await callClaude(prompt)
    const parsed = parseModelJson<Omit<ModuleAIExplanation, 'cachedAt' | 'expiresAt'>>(raw)

    const now       = new Date()
    const expiresAt = new Date(now.getTime() + TTL.AI_MODULE_EXPLAIN)
    const result: ModuleAIExplanation = {
      ...parsed,
      confidence: packet.confidence,
      cachedAt:   now.toISOString(),
      expiresAt:  expiresAt.toISOString(),
    }

    serverCache.set(cacheKey, result, TTL.AI_MODULE_EXPLAIN)

    return NextResponse.json(result, {
      headers: {
        'X-From-Cache': 'false',
        'Cache-Control': `private, max-age=${TTL.AI_MODULE_EXPLAIN / 1000}`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/ai/explain] Error:', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

// ---- Claude API call (direct fetch, no SDK dependency) ----

async function callClaude(prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{
        role:    'user',
        content: prompt,
      }],
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Claude API error ${res.status}: ${body}`)
  }

  const data = await res.json()
  const content = data.content?.[0]?.text
  if (!content) throw new Error('Empty response from Claude API')
  return content.trim()
}
