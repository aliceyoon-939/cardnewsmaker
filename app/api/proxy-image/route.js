import { NextResponse } from 'next/server'

const MAX_SIZE = 20 * 1024 * 1024 // 20 MB

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  // 보안: http/https만 허용, 로컬/사설 주소 차단
  let parsed
  try { parsed = new URL(url) } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 })
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return NextResponse.json({ error: 'only http/https allowed' }, { status: 400 })
  }
  if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(parsed.hostname)) {
    return NextResponse.json({ error: 'private address not allowed' }, { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KpopCMS/1.0)',
        Accept: 'image/*,*/*',
      },
    })
    if (!res.ok) throw new Error(`upstream HTTP ${res.status}`)

    const ct = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim()
    const buf = await res.arrayBuffer()
    if (buf.byteLength > MAX_SIZE) throw new Error('image too large')

    return new NextResponse(buf, {
      headers: {
        'Content-Type': ct,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
