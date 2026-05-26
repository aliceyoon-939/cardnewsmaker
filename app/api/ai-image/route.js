import { NextResponse } from 'next/server'

export async function POST(req) {
  const { prompt } = await req.json()
  if (!prompt) return NextResponse.json({ error: '프롬프트를 입력해주세요' }, { status: 400 })

  const key = process.env.GEMINI_API_KEY
  if (!key) return NextResponse.json({ error: 'Gemini API 키가 설정되지 않았습니다 (설정 페이지에서 등록)' }, { status: 500 })

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      }),
    }
  )

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    return NextResponse.json(
      { error: err?.error?.message || `Gemini API 오류 (HTTP ${resp.status})` },
      { status: resp.status }
    )
  }

  const data = await resp.json()
  return NextResponse.json(data)
}
