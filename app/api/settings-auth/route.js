import { NextResponse } from 'next/server'

export async function POST(req) {
  const { password } = await req.json()
  const correct = process.env.SETTINGS_PASSWORD

  // 환경변수 미설정 시 개방 (로컬 개발 편의)
  if (!correct) return NextResponse.json({ ok: true })

  if (password === correct) return NextResponse.json({ ok: true })
  return NextResponse.json({ error: '비밀번호가 틀렸습니다' }, { status: 401 })
}
