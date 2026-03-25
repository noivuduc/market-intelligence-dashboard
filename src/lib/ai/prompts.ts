// ============================================================
// AI PROMPT TEMPLATES
// Used by /api/ai/explain and /api/ai/summary routes.
// Model: claude-sonnet-4-6 via direct API call.
// ============================================================

import type { FeaturePacket, RegimeSummaryPacket } from './packets'

// ---- Module explanation prompt ----

export function buildModuleExplainPrompt(packet: FeaturePacket): string {
  return `You are a senior macro analyst writing an intelligence briefing for an institutional trading desk.

You will analyze the following structured market data packet and produce a concise, professional intelligence assessment.

IMPORTANT RULES:
- Tone: intelligence briefing, not generic financial commentary.
- Be direct and specific. No filler phrases like "it's worth noting" or "it's important to consider."
- If the source type is "inferred" or confidence is "low", explicitly state uncertainty.
- Do NOT say things are bullish or bearish in a promotional way. Use precise language.
- The assessment must be consistent with the data. Do not contradict the metrics.
- Max 200 words total across all fields.

DATA PACKET:
Module: ${packet.module}
Source Type: ${packet.sourceType}
Confidence: ${packet.confidence}
As Of: ${packet.asOf}

Key Metrics:
${Object.entries(packet.keyMetrics).map(([k, v]) => `  ${k}: ${v.value} ${v.unit}${v.change ? ` (${v.change})` : ''}${v.trend ? ` [${v.trend}]` : ''}`).join('\n')}

Regime Labels:
${Object.entries(packet.regimeLabels).map(([k, v]) => `  ${k}: ${v}`).join('\n')}

Top Drivers:
${packet.topDrivers.map(d => `  - ${d}`).join('\n')}

Active Risks:
${packet.risks.length ? packet.risks.map(r => `  - ${r}`).join('\n') : '  None identified'}

Caveats:
${packet.caveats.length ? packet.caveats.map(c => `  - ${c}`).join('\n') : '  None'}

${packet.context ? `Context: ${packet.context}` : ''}

Respond in this exact JSON format:
{
  "oneLiner": "One crisp sentence capturing the key takeaway.",
  "explanation": [
    "Sentence 1: What the data shows.",
    "Sentence 2: Why this matters in context.",
    "Sentence 3: What the key risk or confirmation level is."
  ],
  "whyNow": "One sentence on why this is particularly relevant at this moment.",
  "confidence": "${packet.confidence}",
  "caveat": "${packet.caveats.length ? 'Include most important caveat as a single sentence.' : ''}",
  "watchNext": "One specific thing to watch that would confirm or invalidate the current read."
}

Return only the JSON object. No preamble.`
}

// ---- Top-level market summary prompt ----

export function buildSummaryPrompt(packet: RegimeSummaryPacket): string {
  const { regime, fed, treasury, macro, liquidity, breadth, options } = packet

  return `You are a chief market strategist writing the daily executive intelligence brief for a macro risk desk.

Synthesize all the following module data into ONE unified market intelligence briefing.

CRITICAL RULES:
- Sound like a professional intelligence briefing, not generic commentary.
- Use the regime label provided. Do NOT contradict it.
- Reference specific data points (yields, spreads, levels) — no vague language.
- If a module is inferred or low confidence, note the uncertainty.
- The six output fields must be logically consistent with each other.
- Max 500 words total across all fields.
- Tone: serious, disciplined, professional. Like a presidential daily briefing for financial markets.

CURRENT REGIME: ${regime.label.toUpperCase()} (confidence: ${regime.confidence}%)
Sub-scores: policy=${regime.subScores.policy} liquidity=${regime.subScores.liquidity} risk=${regime.subScores.risk} trend=${regime.subScores.trend} flow=${regime.subScores.flow} positioning=${regime.subScores.positioning}

TOP REGIME DRIVERS:
${regime.drivers.map(d => `- ${d}`).join('\n')}

TOP RISKS:
${regime.risks.map(r => `- ${r}`).join('\n')}

POLICY (${fed.sourceType}, ${fed.confidence} confidence):
${fed.topDrivers.map(d => `- ${d}`).join('\n')}
Stance: ${fed.regimeLabels['policy_stance']} | Drift: ${fed.regimeLabels['trend_drift']}

RATES (${treasury.sourceType}, ${treasury.confidence} confidence):
${treasury.topDrivers.map(d => `- ${d}`).join('\n')}
10Y: ${treasury.keyMetrics['y10']?.value} | 2s10s: ${treasury.keyMetrics['spread_2s10s']?.value} | Regime: ${treasury.regimeLabels['rates_regime']}

MACRO (${macro.sourceType}, ${macro.confidence} confidence):
Growth: ${macro.regimeLabels['growth_trend']} | Inflation: ${macro.regimeLabels['inflation_trend']} | Surprise: ${macro.regimeLabels['surprise_regime']}
${macro.topDrivers.map(d => `- ${d}`).join('\n')}

LIQUIDITY (${liquidity.sourceType}, ${liquidity.confidence} confidence):
Stance: ${liquidity.regimeLabels['liquidity_stance']} | Credit: ${liquidity.regimeLabels['credit_stress']} | Vol: ${liquidity.regimeLabels['vol_stress']}
${liquidity.topDrivers.map(d => `- ${d}`).join('\n')}

BREADTH (${breadth.sourceType}, ${breadth.confidence} confidence):
Tape: ${breadth.regimeLabels['tape_quality']} | Participation: ${breadth.regimeLabels['participation']} | Confirmed: ${breadth.regimeLabels['breadth_confirmed']}
${breadth.topDrivers.map(d => `- ${d}`).join('\n')}

OPTIONS (${options.sourceType}, ${options.confidence} confidence):
Dealer: ${options.regimeLabels['dealer_positioning']} | Air pocket: ${options.regimeLabels['air_pocket_risk']}
${options.topDrivers.map(d => `- ${d}`).join('\n')}

Respond in this EXACT JSON format:
{
  "regime": "One crisp phrase naming and characterizing the current regime.",
  "why": "2-3 sentences explaining the drivers behind the current regime.",
  "whatChanged": "What shifted most recently — be specific about which metrics moved.",
  "whatConfirms": "What data currently confirms the stated regime view.",
  "whatBreaks": "Specifically what would need to change to invalidate this regime. Name levels or conditions.",
  "watchNext": "Top 2-3 specific items to watch. Include names, levels, or dates.",
  "fullBrief": "3-4 sentences written in intelligence briefing prose. Must integrate at least one signal from: policy, rates, breadth, and options/flows."
}

Return only the JSON. No preamble or commentary.`
}

// ---- Contradiction validation ----
// Ensures AI output does not logically contradict module states.

export interface ContradictionCheck {
  valid:      boolean
  violations: string[]
}

export function validateSummaryConsistency(
  summary:  { regime: string; fullBrief: string; whatConfirms: string },
  regime:   { label: string; subScores: { trend: number; flow: number } },
  breadth:  { tapeQuality: string; breadthConfirmed: boolean },
): ContradictionCheck {
  const violations: string[] = []
  const brief = (summary.fullBrief + summary.whatConfirms + summary.regime).toLowerCase()

  // Rule: If regime is risk-off, brief should not contain unconditionally bullish language
  if (regime.label === 'risk-off') {
    if (brief.includes('strong rally') || brief.includes('broad advance')) {
      violations.push('Summary uses bullish framing while regime is risk-off.')
    }
  }

  // Rule: If breadth not confirmed, should not say "breadth confirmed"
  if (!breadth.breadthConfirmed && brief.includes('breadth confirmed')) {
    violations.push('Summary claims breadth confirmed but module shows divergence.')
  }

  // Rule: If tape quality is broad-selloff, should not describe it as positive
  if (breadth.tapeQuality === 'broad-selloff' && brief.includes('healthy')) {
    violations.push('Summary uses healthy framing while tape is broad-selloff.')
  }

  return { valid: violations.length === 0, violations }
}
