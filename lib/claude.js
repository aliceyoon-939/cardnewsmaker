export async function callClaude(prompt) {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })
  const data = await res.json()
  return data.text || ''
}

export function parseJSON(raw) {
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim())
  } catch {
    return null
  }
}
