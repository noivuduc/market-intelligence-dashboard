/**
 * Models often wrap JSON in ```json ... ``` despite "JSON only" instructions.
 * Strip fences and isolate the outer `{ ... }` before JSON.parse.
 */
export function extractJsonObjectString(text: string): string {
  let s = text.trim()
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '')
    s = s.replace(/```\s*$/i, '')
    s = s.trim()
  }
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start === -1 || end <= start) {
    throw new Error('No JSON object found in model output')
  }
  return s.slice(start, end + 1).trim()
}

export function parseModelJson<T>(text: string): T {
  return JSON.parse(extractJsonObjectString(text)) as T
}
