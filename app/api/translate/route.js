import { NextResponse } from 'next/server'

async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY 없음')
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 400 },
      }),
    }
  )
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

export async function POST(req) {
  const { ko, text, target, artist } = await req.json()
  const input = text || ko
  if (!input) return NextResponse.json({ error: '텍스트 없음' }, { status: 400 })

  // target: 'vi' (→ 베트남어), 'ko' (→ 한국어), default 'vi' (기존 호환)
  const toVi = !target || target === 'vi'
  const toLang = toVi ? '베트남어' : '한국어'
  const outKey = toVi ? 'vi' : 'ko'

  const isComment = !!text // 댓글 번역 모드
  const prompt = isComment
    ? `케이팝 팬 댓글 번역가로서 아래 댓글을 ${toLang}로 번역하세요.

[번역 규칙]
- 팬들의 감정과 뉘앙스를 자연스럽게 살려서 번역
- 슬랭·유행어는 비슷한 현지 표현으로 의역 허용
- 이모지나 특수문자는 그대로 유지
- 짧고 구어체로
${artist ? `- 아티스트: ${artist}` : ''}

원문: ${input}

JSON만 반환 (코드블록 없이): {"${outKey}":"번역 결과"}`
    : `케이팝 전문 번역가로서 아래 한국어 숏폼 나레이션을 베트남어로 번역하세요.

[번역 규칙]
- 팬 친화적이고 생동감 있는 문체 (딱딱한 보도체 금지)
- "các bạn", "chúng mình" 등 2인칭 호칭 활용
- 숫자·수치가 있으면 감탄과 의미를 담아 표현
- 원문의 길이와 임팩트를 유지
- 이모지 사용 금지
${artist ? `- 아티스트: ${artist}` : ''}

한국어: ${input}

JSON만 반환 (코드블록 없이): {"vi":"번역 결과"}`

  try {
    const raw = await callGemini(prompt)
    const result = JSON.parse(raw.replace(/```json|```/g, '').trim())
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
