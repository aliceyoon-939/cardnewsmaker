import { NextResponse } from 'next/server'

// 공식 레이블·아티스트 채널명 키워드
const OFFICIAL_CHANNELS = [
  // ── 대형 레이블 ──────────────────────────────────
  'hybe','bighit','pledis','belift','source music',
  'smtown','sm entertainment',
  'yg entertainment','yg official','theblacklabel',
  'jyp entertainment',
  'starship entertainment','starship',
  'cube entertainment',
  'p nation','p-nation',
  'kakao entertainment','kakao m',
  'woolim entertainment','fantagio','rbw entertainment','rbw',
  'stone music','stone entertainment',
  'antenna','aomg','higherground',
  'c9 entertainment','c9ent',
  'fnc entertainment','fnc',
  'cj enm','mnet',
  'wakeone','n.ch entertainment',
  'jellyfish entertainment','jellyfish',
  'mystic story',
  'interpark music plus',

  // ── 4세대 그룹 ──────────────────────────────────
  'aespa','newjeans','new jeans',
  'le sserafim','lesserafim',
  'ive official','ive_official',
  'illit','riize',
  'zerobaseone','zb1',
  'boynextdoor','boy next door',
  'babymonster','baby monster',
  'stayc','nmixx','itzy',
  'kep1er','tripleS','triples',
  'unis official','unis_official',
  'katseye',
  'meovv','kiss of life',
  'TWS official','TWS_official','tws',
  'temptation','young posse',

  // ── 3세대 그룹 ──────────────────────────────────
  'stray kids','straykids',
  'seventeen','세븐틴',
  'txt','투모로우바이투게더',
  'enhypen','엔하이픈',
  'ateez','에이티즈',
  'monsta x','monstax',
  'got7','갓세븐',
  'mamamoo','마마무',
  'oh my girl','오마이걸',
  'loona','이달의소녀',
  'fromis_9','fromis9',
  'sf9','the boyz','cix','ab6ix',
  'pentagon','btob','비투비',
  'day6','데이식스',
  'astro','nu\'est','nuest',
  'oneus','onewe','cravity',
  'verivery','drippin','kingdom',
  'tempest','victon',

  // ── 2세대 그룹 ──────────────────────────────────
  'exo','shinee','샤이니','f(x)','super junior','슈퍼주니어',
  'tvxq','동방신기','girls generation','소녀시대',
  'red velvet','레드벨벳',
  'bigbang','빅뱅','2ne1','2pm','2am',
  'infinite','b2st','beast','highlight',
  'block b','b.a.p','bap','vixx','b1a4',
  'sistar','4minute','apink','exid','pristin',
  'weki meki','april','gugudan',
  'nct','wayv','nct dream','nct 127',

  // ── 솔로 아티스트 ──────────────────────────────
  'bts','방탄소년단',
  'blackpink','블랙핑크',
  'twice','트와이스',
  'iu official','아이유',
  'taeyeon','태연',
  'baekhyun','백현',
  'taemin','태민',
  'g-dragon','gdragon','지드래곤',
  'jennie','jisoo','rosé official','lisa',
  'jimin official','jungkook','j-hope','jhope','rm official',
  'zico','식케이','dean','crush','heize',
  'sunmi','청하','chungha','hyuna',
  'wonho','kang daniel','kangdaniel',
  'moonbyul','hwasa','solar','wheein',
  'kai official','suho','chen official',
  'ten official','lucas official',
]

// MV 판별 키워드
const MV_PATTERNS = [' mv', ' m/v', 'official mv', 'official m/v', 'music video', '뮤직비디오']

// 비케이팝 채널 제외
const EXCLUDE_CHANNELS = [
  'official', // 일반 "Official" 채널은 이 아래 별도 검증
]

function isRecentOfficialMV(item, maxDays = 30) {
  const title   = (item.snippet.title || '').toLowerCase()
  const channel = (item.snippet.channelTitle || '').toLowerCase()
  const daysSince = (Date.now() - new Date(item.snippet.publishedAt)) / 86400000

  // 1. 최근 업로드 필터
  if (daysSince > maxDays) return false

  // 2. 제목에 MV 패턴 필수
  if (!MV_PATTERNS.some(p => title.includes(p))) return false

  // 3. 공식 레이블/아티스트 채널만 허용
  return OFFICIAL_CHANNELS.some(k => channel.includes(k))
}

function extractArtist(title) {
  const dashMatch  = title.match(/^(.+?)\s[-–—]\s/)
  if (dashMatch) return dashMatch[1].trim()
  const quoteMatch = title.match(/^([^'"]+?)\s+['"]/)
  if (quoteMatch) return quoteMatch[1].trim()
  const parenMatch = title.match(/^([^([\]]+?)\s*[\[(]/)
  if (parenMatch) return parenMatch[1].trim()
  return title.split(' ').slice(0, 3).join(' ')
}

export async function GET() {
  const API_KEY = process.env.YOUTUBE_API_KEY
  if (!API_KEY) return NextResponse.json({ error: 'YouTube API 키가 없습니다.' }, { status: 500 })

  try {
    // 베트남 트렌딩 음악 Top 100 (검색 API 대신 안정적인 트렌딩 API 사용)
    const [res1, res2] = await Promise.all([
      fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=VN&videoCategoryId=10&maxResults=50&key=${API_KEY}`, { cache: 'no-store' }),
      fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=KR&videoCategoryId=10&maxResults=50&key=${API_KEY}`, { cache: 'no-store' }),
    ])
    const [data1, data2] = await Promise.all([res1.json(), res2.json()])

    const allItems = [
      ...(data1.items || []),
      ...(data2.items || []),
    ]

    // 중복 제거 (videoId 기준)
    const seen = new Set()
    const unique = allItems.filter(i => {
      if (seen.has(i.id)) return false
      seen.add(i.id)
      return true
    })

    // 최신 공식 MV 필터 → 날짜순 정렬 → 상위 2개
    const releases = unique
      .filter(item => isRecentOfficialMV(item, 30))
      .sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt))
      .slice(0, 6)
      .map(item => ({
        videoId:      item.id,
        title:        item.snippet.title,
        artist:       extractArtist(item.snippet.title),
        channelTitle: item.snippet.channelTitle,
        thumbnail:    item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        viewCount:    parseInt(item.statistics.viewCount || 0),
        publishedAt:  item.snippet.publishedAt,
      }))

    return NextResponse.json({ releases, updatedAt: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
