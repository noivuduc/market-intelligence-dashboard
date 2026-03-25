// ============================================================
// AI MARKET SUMMARY ROUTE
// Generates the top-level executive intelligence brief.
// Includes contradiction validation before returning.
//
// POST /api/ai/summary
// Body: { packet: RegimeSummaryPacket }
// ============================================================

import { NextResponse } from 'next/server'
import { serverCache, TTL } from '@/lib/cache/server'
import { parseModelJson } from '@/lib/ai/parseModelJson'
import { buildSummaryPrompt, validateSummaryConsistency } from '@/lib/ai/prompts'
import type { RegimeSummaryPacket } from '@/lib/ai/packets'
import type { TopLevelBriefing } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function hashPacket(packet: RegimeSummaryPacket): string {
  const key = `${packet.regime.label}:${packet.regime.confidence}:${JSON.stringify(packet.regime.subScores)}`
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(16).slice(0, 8)
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured. AI summary unavailable.' },
      { status: 503 }
    )
  }

  let packet: RegimeSummaryPacket
  try {
    packet = (await request.json()).packet
    if (!packet?.regime) throw new Error('Missing packet.regime')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const cacheKey = `ai:summary:${hashPacket(packet)}`
  const cached   = serverCache.get<TopLevelBriefing>(cacheKey)
  if (cached && !cached.isStale) {
    return NextResponse.json(cached.data, {
      headers: { 'X-From-Cache': 'true', 'X-Cache-Age': String(Math.round(cached.ageMs / 1000)) + 's' },
    })
  }

  const prompt = buildSummaryPrompt(packet)

  try {
    const raw    = await callClaude(prompt, apiKey)
    const parsed = parseModelJson<Omit<TopLevelBriefing, 'cachedAt' | 'expiresAt'>>(raw)

    // ---- Contradiction validation ----
    const check = validateSummaryConsistency(
      { regime: parsed.regime, fullBrief: parsed.fullBrief, whatConfirms: parsed.whatConfirms },
      { label: packet.regime.label, subScores: packet.regime.subScores },
      {
        tapeQuality:      packet.breadth.regimeLabels['tape_quality'] ?? 'mixed',
        breadthConfirmed: packet.breadth.regimeLabels['breadth_confirmed'] === 'true',
      },
    )

    if (!check.valid) {
      console.warn('[/api/ai/summary] Contradiction violations detected:', check.violations)
      // Append violation note to brief for transparency
      parsed.fullBrief += ` [Note: AI output flagged for ${check.violations.length} consistency issue(s). Review with caution.]`
    }

    const now       = new Date()
    const expiresAt = new Date(now.getTime() + TTL.AI_SUMMARY)
    const result: TopLevelBriefing = {
      ...parsed,
      cachedAt:   now.toISOString(),
      expiresAt:  expiresAt.toISOString(),
    }

    serverCache.set(cacheKey, result, TTL.AI_SUMMARY)

    return NextResponse.json(result, {
      headers: {
        'X-From-Cache':         'false',
        'X-Contradiction-Valid': String(check.valid),
        'Cache-Control':         `private, max-age=${TTL.AI_SUMMARY / 1000}`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/ai/summary] Error:', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

async function callClaude(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: 1024,
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
