import { NextResponse } from 'next/server'

// ── 서버 사이드 캐시 (30분) ───────────────────────────────
const _cache = {}
const CACHE_TTL = 24 * 60 * 60 * 1000

function getCached(videoId, artist) {
  const key = videoId || artist
  const hit = _cache[key]
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.data
  return null
}

function setCache(videoId, artist, data) {
  const key = videoId || artist
  _cache[key] = { data, at: Date.now() }
}

function fv(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K'
  return String(n)
}

function detectVi(text) {
  return /[àáâãèéêìíòóôõùúýăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(text)
}

function cleanComment(text) {
  return text.replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim()
}

function daysAgoISO(days) {
  return new Date(Date.now() - days * 24 * 3600 * 1000).toISOString()
}

async function ytSearch(query, afterISO, maxResults, ytKey) {
  const after = afterISO ? `&publishedAfter=${afterISO}` : ''
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&order=viewCount${after}&maxResults=${maxResults}&key=${ytKey}`,
    { cache: 'no-store' }
  )
  return res.json()
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)

  // 캐시 전체 클리어 (새로고침 버튼용)
  if (searchParams.get('clearCache') === 'true') {
    Object.keys(_cache).forEach(k => delete _cache[k])
    return NextResponse.json({ ok: true })
  }

  const artist   = searchParams.get('artist')
  const vidTitle = searchParams.get('title') || ''   // 트렌딩 영상 제목 (곡명 포함)
  const videoId  = searchParams.get('videoId') || ''

  if (!artist) return NextResponse.json({ error: '아티스트 이름이 필요합니다.' }, { status: 400 })

  const YT_KEY = process.env.YOUTUBE_API_KEY
  const AI_KEY = process.env.ANTHROPIC_API_KEY

  if (!YT_KEY) return NextResponse.json({ error: 'YouTube API 키가 없습니다.' }, { status: 500 })
  if (!AI_KEY) return NextResponse.json({ error: 'Claude API 키가 없습니다. .env.local을 확인하세요.' }, { status: 500 })

  // 캐시 히트 → 즉시 반환
  const cached = getCached(videoId, artist)
  if (cached) {
    console.log(`[analyze] cache HIT — ${videoId || artist}`)
    return NextResponse.json({ ...cached, _cached: true })
  }
  console.log(`[analyze] cache MISS — ${videoId || artist}`)

  try {
    const songQuery = vidTitle
      ? `${artist} ${vidTitle.replace(/[[\]()]/g, ' ').split(/[-–—]/)[0].trim()}`
      : `${artist} kpop`

    // 1+2. 트렌딩 영상 통계 & 관련 영상 검색 — 병렬 실행
    const [tvRes, recentData30] = await Promise.all([
      videoId
        ? fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${YT_KEY}`, { cache: 'no-store' }).then(r => r.json())
        : Promise.resolve(null),
      ytSearch(songQuery, daysAgoISO(30), 12, YT_KEY),
    ])

    // 트렌딩 영상 파싱
    let trendingVideo = null
    const tv = tvRes?.items?.[0]
    if (tv) {
      trendingVideo = {
        title: tv.snippet.title,
        views: parseInt(tv.statistics.viewCount || 0),
        likes: parseInt(tv.statistics.likeCount || 0),
        publishedAt: tv.snippet.publishedAt,
      }
    }

    // 30일 결과 부족하면 60일로 확장 (폴백)
    let recentData = recentData30
    if ((recentData.items?.length || 0) < 5) {
      recentData = await ytSearch(songQuery, daysAgoISO(60), 12, YT_KEY)
    }

    // 3. 비디오 통계 조회
    const ids = (recentData.items || []).map(i => i.id?.videoId).filter(Boolean)
    let statsMap = {}
    if (ids.length) {
      const statsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids.join(',')}&key=${YT_KEY}`,
        { cache: 'no-store' }
      )
      const statsData = await statsRes.json()
      statsData.items?.forEach(v => { statsMap[v.id] = v.statistics })
    }

    const recentVideos = (recentData.items || [])
      .filter(i => i.id?.videoId)
      .map(i => ({
        videoId: i.id.videoId,
        title: i.snippet.title,
        channel: i.snippet.channelTitle,
        views: parseInt(statsMap[i.id.videoId]?.viewCount || 0),
        publishedAt: i.snippet.publishedAt,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)

    // 4. 팬 댓글 수집 — 베트남어 우선, 전체 상위 댓글 혼합 (quota 1 unit)
    let fanComments = []
    if (videoId) {
      try {
        const commRes = await fetch(
          `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=30&order=relevance&key=${YT_KEY}`,
          { cache: 'no-store' }
        )
        const commData = await commRes.json()
        const parsed = (commData.items || []).map(item => {
          const s = item.snippet.topLevelComment.snippet
          const text = cleanComment(s.textDisplay)
          return { text, likes: s.likeCount || 0, isVi: detectVi(text) }
        }).filter(c => c.text.length > 5)

        // 베트남어 댓글 우선 (최대 5개) + 전체 상위 (최대 4개, 중복 제외)
        const viTop  = parsed.filter(c => c.isVi).sort((a, b) => b.likes - a.likes).slice(0, 5)
        const others = parsed.filter(c => !c.isVi).sort((a, b) => b.likes - a.likes).slice(0, 4)
        fanComments  = [...viTop, ...others].slice(0, 8)
      } catch {
        // 댓글 비활성화 등 실패 시 조용히 무시 — 분석은 계속
      }
    }

    // 5. Claude 프롬프트 — 트렌딩 영상을 "현재 이슈"로 명시
    const trendingBlock = trendingVideo
      ? `🔥 지금 베트남 트렌딩 중인 영상:
"${trendingVideo.title}" — ${fv(trendingVideo.views)}회 조회 · ${fv(trendingVideo.likes)}좋아요
→ 이 영상/곡이 지금 화제의 중심이야. 주제는 반드시 이 콘텐츠와 관련돼야 해.`
      : `🔥 현재 베트남 트렌딩: ${vidTitle || artist}`

    const videoList = recentVideos.length
      ? recentVideos.map((v, i) => `${i + 1}. [${fv(v.views)}회] "${v.title}" (${v.channel})`).join('\n')
      : '(최근 관련 영상 없음)'

    const commentBlock = fanComments.length > 0
      ? `\n💬 실제 팬 댓글 반응 (좋아요 많은 순):
${fanComments.map(c => `- "${c.text.slice(0, 90)}"${c.isVi ? ' 🇻🇳' : ''} (♥${c.likes})`).join('\n')}
→ 위 댓글에서 반복되는 키워드, 궁금증, 감정을 주제 추천에 적극 반영해줘.`
      : ''

    const prompt = `너는 베트남 케이팝 숏폼 미디어 PD야.

${trendingBlock}

최근 관련 YouTube 영상 (최신순):
${videoList}
${commentBlock}

위 정보를 바탕으로:
1. 지금 현재 이슈(트렌딩 영상/곡)에 집중한 숏폼 주제 4개를 추천해
2. 팬 댓글이 있다면 팬들이 실제로 궁금해하거나 열광하는 포인트를 주제에 녹여줘
3. 과거 히트곡이나 관련 없는 주제는 제외하고, 지금 이 순간 팬들이 반응할 내용만 뽑아
4. 베트남 팬을 사로잡을 베트남어 후킹 문장도 작성해

JSON만 반환 (코드블록 없이):
{"topics":[{"title":"한국어 주제명","type":"비하인드|차트|컴백|반응|리뷰|비교","hook":"베트남어 후킹 문장","reason":"왜 지금 이 주제인지 한 문장","keywords":["#태그1","#태그2","#태그3"]}]}`

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': AI_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const aiData = await aiRes.json()
    if (aiData.error) throw new Error(aiData.error.message)

    const raw = aiData.content?.[0]?.text || ''
    let parsed = { topics: [] }
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
    } catch {}

    const result = {
      artist,
      trendingVideo,
      refVideos: recentVideos.slice(0, 5),
      topics: parsed.topics || [],
      fanComments: fanComments.filter(c => c.isVi).slice(0, 3),
      analyzedAt: new Date().toISOString(),
    }
    setCache(videoId, artist, result)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
