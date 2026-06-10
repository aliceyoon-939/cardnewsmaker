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

// 아이돌과 무관한 콘텐츠 제외 키워드
const EXCLUDE_KEYWORDS = [
  'dating show', 'dating reality', 'reality dating', 'love show',
  'bisexual', 'lgbtq', 'cooking show', 'game show',
]

function isKpopIdolNews(title) {
  const t = title.toLowerCase()
  if (EXCLUDE_KEYWORDS.some(k => t.includes(k))) return false
  return KPOP_NEWS_KEYWORDS.some(k => t.includes(k))
}

// ── 제목 일괄 한국어 번역 (Claude Haiku) ─────────────────
async function translateTitles(titles) {
  const API_KEY = process.env.ANTHROPIC_API_KEY
  if (!API_KEY) return titles

  const numbered = titles.map((t, i) => `${i + 1}. ${t}`).join('\n')
  const prompt = `You are a professional K-pop news editor at a major Korean entertainment outlet (like Naver Entertainment or Dispatch). Translate these Soompi English headlines into natural Korean headlines.

## Critical rules

### Artist & group names — NEVER transliterate, use ONLY these official Korean names:
BTS→방탄소년단, BLACKPINK→블랙핑크, TWICE→트와이스, aespa→에스파, NewJeans→뉴진스, LE SSERAFIM→르세라핌, IVE→아이브, ILLIT→아일릿, RIIZE→라이즈, BOYNEXTDOOR→보이넥스트도어, BABYMONSTER→베이비몬스터, SEVENTEEN→세븐틴, STRAY KIDS→스트레이 키즈, TXT→투모로우바이투게더, ENHYPEN→엔하이픈, ATEEZ→에이티즈, ZEROBASEONE→제로베이스원, NMIXX→엔믹스, ITZY→있지, RED VELVET→레드벨벳, NCT→엔시티, EXO→엑소, SHINee→샤이니, GOT7→갓세븐, MONSTA X→몬스타엑스, THE BOYZ→더보이즈, ASTRO→아스트로, MAMAMOO→마마무, APINK→에이핑크, (G)I-DLE→(여자)아이들, KARD→카드, DAY6→데이식스, BTOB→비투비, VIXX→빅스, INFINITE→인피니트, RESCENE→리센느, fromis_9→프로미스나인, KISS OF LIFE→키스오브라이프, tripleS→트리플에스, ARTMS→아르트마스, TWS→투어스

### Solo artists — use their stage name as-is if Korean, or well-known Korean name:
Jimin→지민, Jungkook→정국, V→뷔, Jin→진, Suga→슈가, RM→RM, J-Hope→제이홉, Jennie→제니, Lisa→리사, Jisoo→지수, Rosé→로제, Taeyeon→태연, Baekhyun→백현, Taemin→태민, Kai→카이, Chanyeol→찬열, Sunmi→선미, HyunA→현아, Chungha→청하, Wonei→원이

### Translation style:
- Concise and punchy — 20~35 characters preferred
- NO literal word-for-word translation — convey the MEANING naturally
- Use active declarative endings (확정, 공개, 발표, 출연, 열연, 컴백 등)
- BANNED endings: "-하고 있어", "-열어두고 있어", "-되고 있어", "-밝혀" (use -밝혀졌다 instead)
- Song/album/show titles: keep in original English inside single quotes '...'
- IMPORTANT: If you don't recognize an artist/group name from the list above, keep it in the original English — NEVER guess or make up a Korean name
- For drama casting news: "[아티스트], 드라마 '[제목]'서 [역할] 맡아" style
- For comeback/release: "[아티스트], [앨범/곡명] [날짜] 컴백" or "MV 공개" style
- Return ONLY valid JSON, no markdown: {"translations":["번역1","번역2",...]}

## Examples
❌ "권소현, 새 드라마 'Love In Sync'에서 전 그룹 멤버를 무시하는 아이돌 출신 배우 역할"
✅ "권소현, 'Love In Sync'서 아이돌 출신 배우 열연"

❌ "참가자들 사랑의 모든 가능성 열어두고 있어"
✅ "'StandBIMe' 바이섹슈얼 데이팅쇼 티저 공개"

❌ "BOYNEXTDOOR, 새로운 미니 앨범 발매 계획 발표"
✅ "보이넥스트도어, 새 미니앨범 발매 예고"

Headlines:
${numbered}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json()
    const raw = data.content?.[0]?.text || ''
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
