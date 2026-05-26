import { NextResponse } from 'next/server'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const q      = searchParams.get('q')
  const artist = searchParams.get('artist') || ''

  if (!q) return NextResponse.json({ error: 'q 파라미터 필요' }, { status: 400 })

  const API_KEY = process.env.YOUTUBE_API_KEY
  if (!API_KEY) return NextResponse.json({ error: 'YouTube API 키 없음' }, { status: 500 })

  try {
    // 관련성 순 검색 (음악 카테고리)
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&videoCategoryId=10&maxResults=10&order=relevance&key=${API_KEY}`,
      { cache: 'no-store' }
    )
    const data = await res.json()
    if (!data.items) throw new Error(data.error?.message || 'YouTube API 오류')

    // 공식 채널 또는 아티스트명 포함 영상 우선 선택
    const artistLower = artist.toLowerCase()
    const items = data.items
      .filter(it => it.id?.videoId)
      .map(it => ({
        videoId:      it.id.videoId,
        title:        it.snippet.title,
        channelTitle: it.snippet.channelTitle,
        // 아티스트명이 제목/채널에 포함되면 우선순위 ↑
        score: (it.snippet.title.toLowerCase().includes(artistLower) ? 2 : 0)
             + (it.snippet.channelTitle.toLowerCase().includes(artistLower) ? 1 : 0),
      }))
      .sort((a, b) => b.score - a.score)

    return NextResponse.json({ items, query: q })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
