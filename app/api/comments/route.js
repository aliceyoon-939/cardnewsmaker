import { NextResponse } from 'next/server'

function detectVi(text) {
  return /[àáâãèéêìíòóôõùúýăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(text)
}

function decodeHtml(str) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

function parseComments(items) {
  return items.map(item => {
    const s = item.snippet.topLevelComment.snippet
    const raw = s.textDisplay.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
    return {
      author:      s.authorDisplayName,
      text:        decodeHtml(raw),
      likes:       s.likeCount || 0,
      publishedAt: s.publishedAt,
    }
  })
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const videoId = searchParams.get('videoId')
  const lang    = searchParams.get('lang') || 'all'   // 'all' | 'vi'
  if (!videoId) return NextResponse.json({ error: 'videoId 필요' }, { status: 400 })

  const YT_KEY = process.env.YOUTUBE_API_KEY
  if (!YT_KEY) return NextResponse.json({ error: 'YouTube API 키 없음' }, { status: 500 })

  if (lang === 'vi') {
    // 베트남어 댓글: 최대 3페이지(300개)를 가져와 필터링 후 상위 20개 반환
    let allComments = []
    let pageToken   = ''
    let total       = 0

    for (let page = 0; page < 3; page++) {
      const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=100&order=relevance${pageToken ? `&pageToken=${pageToken}` : ''}&key=${YT_KEY}`
      const res  = await fetch(url, { cache: 'no-store' })
      const data = await res.json()
      if (data.error) return NextResponse.json({ error: data.error.message }, { status: 500 })
      if (page === 0) total = data.pageInfo?.totalResults || 0

      allComments.push(...parseComments(data.items || []))
      pageToken = data.nextPageToken || ''
      if (!pageToken) break
    }

    const viComments = allComments
      .filter(c => detectVi(c.text))
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 20)

    return NextResponse.json({ comments: viComments, total, scanned: allComments.length })
  }

  // 기본: 전체 인기 댓글 상위 20개
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=20&order=relevance&key=${YT_KEY}`,
    { cache: 'no-store' }
  )
  const data = await res.json()
  if (data.error) return NextResponse.json({ error: data.error.message }, { status: 500 })

  const comments = parseComments(data.items || []).sort((a, b) => b.likes - a.likes)
  return NextResponse.json({ comments, total: data.pageInfo?.totalResults || 0 })
}
