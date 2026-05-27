/**
 * Upstage Solar API — chat completions helper
 * Docs: https://developers.upstage.ai/docs/apis/chat
 */
const SOLAR_BASE = 'https://api.upstage.ai/v1/chat/completions'
const SOLAR_MODEL = 'solar-pro'

/**
 * @param {string} prompt  User message
 * @param {number} maxTokens  Max output tokens (default 1024)
 * @returns {Promise<string>}  Model response text
 */
export async function callSolar(prompt, maxTokens = 1024) {
  const key = process.env.SOLAR_API_KEY
  if (!key) throw new Error('SOLAR_API_KEY가 설정되지 않았습니다 (설정 페이지에서 등록)')

  const res = await fetch(SOLAR_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: SOLAR_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      stream: false,
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error?.message || `Solar API 오류 (HTTP ${res.status})`)
  }
  return data.choices?.[0]?.message?.content || ''
}
