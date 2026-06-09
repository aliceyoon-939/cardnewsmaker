import { NextResponse } from 'next/server'

async function fetchVideoDetails(videoId, ytKey) {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${ytKey}`,
    { cache: 'no-store' }
  )
  const data = await res.json()
  const item = data.items?.[0]
  if (!item) return null
  return {
    title: item.snippet.title,
    description: (item.snippet.description || '').slice(0, 1200),
    tags: (item.snippet.tags || []).slice(0, 10),
    publishedAt: item.snippet.publishedAt,
    channelTitle: item.snippet.channelTitle,
    channelId: item.snippet.channelId,
    viewCount: parseInt(item.statistics.viewCount || 0),
    likeCount: parseInt(item.statistics.likeCount || 0),
    commentCount: parseInt(item.statistics.commentCount || 0),
  }
}

async function fetchCaptions(videoId) {
  for (const lang of ['ko', 'en', 'vi']) {
    try {
      const res = await fetch(
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`,
        { cache: 'no-store', headers: { 'User-Agent': 'Mozilla/5.0' } }
      )
      if (!res.ok) continue
      const data = await res.json()
      if (!data?.events?.length) continue
      const text = data.events
        .filter(e => e.segs)
        .map(e => e.segs.map(s => s.utf8 || '').join(''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 3000)
      if (text.length > 80) return { lang, text }
    } catch {}
  }
  return null
}

async function fetchNews(artist) {
  try {
    const q = encodeURIComponent(`"${artist}" kpop`)
    const res = await fetch(
      `https://news.google.com/rss/search?q=${q}&hl=vi&gl=VN&ceid=VN:vi`,
      { cache: 'no-store', next: { revalidate: 3600 } }
    )
    const xml = await res.text()
    const items = []
    for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const c = m[1]
      const title = (c.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] || c.match(/<title>(.*?)<\/title>/)?.[1] || '').trim()
      const pubDate = (c.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '').trim()
      const source = (c.match(/<source[^>]*>(.*?)<\/source>/)?.[1] || '').trim()
      if (title) items.push({ title, pubDate, source })
      if (items.length >= 6) break
    }
    return items
  } catch {
    return []
  }
}

function detectVi(text) {
  return /[àáâãèéêìíòóôõùúýăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(text)
}

async function fetchComments(videoId, ytKey) {
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=100&order=relevance&key=${ytKey}`,
      { cache: 'no-store' }
    )
    const data = await res.json()
    const parsed = (data.items || []).map(item => {
      const s = item.snippet.topLevelComment.snippet
      const text = (s.textDisplay || '').replace(/<[^>]+>/g, '').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').trim()
      return { text, likes: s.likeCount || 0, isVi: detectVi(text) }
    }).filter(c => c.text.length > 5)

    const viTop  = parsed.filter(c => c.isVi).sort((a, b) => b.likes - a.likes).slice(0, 10)
    const others = parsed.filter(c => !c.isVi).sort((a, b) => b.likes - a.likes).slice(0, 10)
    return [...viTop, ...others].slice(0, 20).map(c => c.text)
  } catch {
    return []
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const videoId = searchParams.get('videoId') || ''
  const artist  = searchParams.get('artist')

  if (!artist) {
    return NextResponse.json({ error: '필수 파라미터 누락 (artist)' }, { status: 400 })
  }

  const YT_KEY = process.env.YOUTUBE_API_KEY
  if (!YT_KEY) return NextResponse.json({ error: 'YouTube API 키 없음' }, { status: 500 })

  // videoId 없어도 뉴스는 항상 수집
  const [video, captions, news, mainThumb, comments] = await Promise.all([
    videoId ? fetchVideoDetails(videoId, YT_KEY) : Promise.resolve(null),
    videoId ? fetchCaptions(videoId)             : Promise.resolve(null),
    fetchNews(artist),
    videoId ? fetchThumbnail(videoId)            : Promise.resolve(null),
    videoId ? fetchComments(videoId, YT_KEY)     : Promise.resolve([]),
  ])

  const channelThumbs = video?.channelId
    ? await fetchChannelThumbnails(video.channelId, videoId, YT_KEY, artist, 4)
    : []

  const thumbnails = [mainThumb, ...channelThumbs].filter(Boolean).slice(0, 5)

  return NextResponse.json({ video, captions, news, thumbnail: mainThumb, thumbnails, comments })
}

async function fetchThumbnailFromUrl(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    if (buf.byteLength < 5000) return null
    return `data:image/jpeg;base64,${Buffer.from(buf).toString('base64')}`
  } catch {
    return null
  }
}

async function fetchThumbnail(videoId) {
  for (const q of ['maxresdefault', 'sddefault', 'hqdefault']) {
    const r = await fetchThumbnailFromUrl(`https://img.youtube.com/vi/${videoId}/${q}.jpg`)
    if (r) return r
  }
  return null
}

async function fetchChannelThumbnails(channelId, mainVideoId, ytKey, artist, count = 4) {
  try {
    // 채널 업로드 플레이리스트 ID (UC → UU)
    const uploadsId = channelId.replace(/^UC/, 'UU')
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=50&key=${ytKey}`,
      { cache: 'no-store' }
    )
    const data = await res.json()
    const artistLower = artist.toLowerCase()
    const items = (data.items || [])
      .filter(it => {
        const vid = it.snippet?.resourceId?.videoId
        const title = (it.snippet?.title || '').toLowerCase()
        return vid && vid !== mainVideoId && title.includes(artistLower)
      })
      .slice(0, count)

    const thumbs = await Promise.all(
      items.map(it => {
        const vid = it.snippet.resourceId.videoId
        return fetchThumbnail(vid)
      })
    )
    return thumbs.filter(Boolean)
  } catch {
    return []
  }
}
