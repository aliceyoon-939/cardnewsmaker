import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

// ── 인메모리 캐시 (15분) ─────────────────────────────────
let _cache = null
let _cacheAt = 0
const CACHE_TTL = 15 * 60 * 1000

// ── HTML 엔티티 디코딩 ────────────────────────────────────
function decodeEntities(str) {
  return str
    .replace(/&#(\d+);/g,  (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
}

// ── K-pop 아이돌 뉴스 판별 키워드 ────────────────────────
const KPOP_NEWS_KEYWORDS = [
  'idol', 'k-pop', 'kpop', 'comeback', 'music video', ' mv', 'mv ',
  'concert', 'tour', 'album', 'mini album', 'ep ', 'single', 'debut',
  'fan meeting', 'fansign', 'lightstick', 'brand reputation', 'chart',
  'music show', 'award', 'inkigayo', 'music bank', 'show champion',
  'bts', 'blackpink', 'twice', 'aespa', 'newjeans', 'new jeans',
  'le sserafim', 'lesserafim', 'stray kids', 'seventeen', 'txt',
  'enhypen', 'nct', 'ateez', 'itzy', 'nmixx', 'riize', 'babymonster',
  'illit', 'zerobaseone', 'boynextdoor', 'got7', 'exo', 'bigbang',
  'shinee', 'monsta x', 'red velvet', 'mamamoo', 'super junior', 'tvxq',
  'super m', 'wayv', 'f(x)', 'apink', 'gfriend', 'loona', 'oh my girl',
  'sf9', 'the boyz', 'pentagon', 'btob', 'vixx', 'highlight', 'infinite',
  'day6', 'n.flying', 'cix', 'ab6ix', 'oneus', 'cravity', 'kingdom',
  'tempest', 'drippin', 'astro', 'verivery', 'fromis_9', 'weki meki',
  'ive ', ' ive,', '(ive)', 'stayc', 'woo!ah', 'brave girls',
  'taeyeon', 'baekhyun', 'taemin', 'taemin',
  'jennie', 'jisoo', 'lisa',
  'jimin', 'jungkook', 'j-hope',
  'chaeyeon', 'hyuna', 'sunmi', 'chungha', 'heize',
]

function isKpopIdolNews(title) {
  const t = title.toLowerCase()
  return KPOP_NEWS_KEYWORDS.some(k => t.includes(k))
}

// ── 제목 일괄 한국어 번역 ─────────────────────────────────
async function translateTitles(titles) {
  const key = process.env.GEMINI_API_KEY
  if (!key) return titles

  const numbered = titles.map((t, i) => `${i + 1}. ${t}`).join('\n')
  const prompt = `Translate these K-pop news headlines into Korean. Return ONLY JSON, no extra text.
- Keep artist/group names as-is (BLACKPINK, aespa, IVE, etc.)
- Natural Korean headline style
- Format: {"translations":["번역1","번역2",...]}

${numbered}`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1024 },
        }),
      }
    )
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)

    const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text || '')
      .replace(/```[\w]*\n?/g, '').trim()
    const start = raw.indexOf('{')
    const end   = raw.lastIndexOf('}')
    const jsonStr = start !== -1 && end !== -1 ? raw.slice(start, end + 1) : raw
    const parsed = JSON.parse(jsonStr)
    if (Array.isArray(parsed.translations) && parsed.translations.length > 0) {
      return parsed.translations.slice(0, titles.length)
    }
  } catch (e) {
    console.error('[news/translate] error:', e.message)
  }
  return titles
}

// ── RSS XML 파싱 ─────────────────────────────────────────
function parseRSSItems(xml) {
  const items = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]

    const titleRaw = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]?.trim() || ''
    const link     = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || ''
    const pubDate  = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || ''
    const descRaw  = block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1] || ''

    if (!titleRaw) continue

    const title   = decodeEntities(titleRaw)
    const summary = decodeEntities(descRaw.replace(/<[^>]+>/g, '').trim()).slice(0, 120)

    items.push({ title, link, pubDate, summary })
  }
  return items
}

function timeLabel(pubDate) {
  if (!pubDate) return ''
  const diff = Date.now() - new Date(pubDate).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return '방금'
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}일 전`
  return new Date(pubDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)

  // 캐시 클리어 (새로고침 버튼용)
  if (searchParams.get('clearCache') === 'true') {
    _cache = null
    _cacheAt = 0
    return NextResponse.json({ ok: true })
  }

  // 캐시 히트: 15분 이내면 바로 반환 (API 중복 호출 방지)
  if (_cache && Date.now() - _cacheAt < CACHE_TTL) {
    return NextResponse.json(_cache)
  }

  try {
    const res = await fetch('https://www.soompi.com/feed', {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KpopCMS/1.0)' },
    })
    if (!res.ok) throw new Error(`Soompi RSS 오류: ${res.status}`)

    const xml      = await res.text()
    const filtered = parseRSSItems(xml).filter(item => isKpopIdolNews(item.title)).slice(0, 5)

    // Gemini로 제목 일괄 번역
    let titles = filtered.map(i => i.title)
    if (filtered.length > 0) {
      titles = await translateTitles(titles)
    }

    const news = filtered.map((item, i) => ({
      ...item,
      titleKo:   titles[i] || item.title,
      timeLabel: timeLabel(item.pubDate),
    }))

    const payload = { news, updatedAt: new Date().toISOString() }
    // 번역 성공 시에만 캐시 저장 (영어 그대로면 캐시 안 함)
    const translated = news.some(n => n.titleKo !== n.title)
    if (translated) { _cache = payload; _cacheAt = Date.now() }

    return NextResponse.json(payload)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
