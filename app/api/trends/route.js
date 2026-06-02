import { NextResponse } from 'next/server'

// ── K-pop 판별 ──────────────────────────────────────────
const KPOP_LABELS = [
  'hybe','bighit','pledis','belift','source music',
  'smtown','sm entertainment',
  'yg entertainment','yg official',
  'jyp entertainment','jyp',
  'starship entertainment','starship',
  'cube entertainment','cube',
  'p nation','p-nation',
  'kakao entertainment','kakao m',
  'woolim entertainment',
  'fcmc','fantagio',
  'rbw entertainment','rbw',
  'stone music','stone entertainment',
  'mnet','m2',
]

const KPOP_ARTISTS = [
  'bts','방탄소년단','blackpink','twice','aespa','newjeans','new jeans',
  'le sserafim','lesserafim','ive','stayc','itzy','nmixx','espa',
  'babymonster','baby monster','illit','mimiirose','tripleS','triples',
  'exo','shinee','super junior','superjunior','girls generation',
  'seventeen','세븐틴','got7','monsta x','monstax','stray kids','straykids',
  'txt','투모로우바이투게더','enhypen','엔하이픈',
  'nct','wayv','superm','red velvet','레드벨벳','f(x)',
  'bigbang','빅뱅','2ne1','wonder girls','2pm','2am','b1a4',
  'exid','sistar','4minute','apink','mamamoo','마마무',
  'oh my girl','오마이걸','gfriend','여자친구','loona','이달의소녀',
  'weki meki','fromis_9','fromis9','april','pristin','gugudan',
  'astro','nu\'est','nuest','sf9','the boyz','cix','ab6ix',
  'pentagon','pentagon','btob','비투비','beast','b2st','infinite',
  'vixx','highlight','block b','b.a.p','bap','shinee','샤이니',
  'ateez','에이티즈','oneus','onewe','cravity','verivery','drippin',
  'kingdom','tempest','zerobaseone','zb1','boynextdoor','bnd',
  'riize','n.flying','nflying','day6','데이식스',
  'tvxq','동방신기','super junior','슈퍼주니어',
  'iu','아이유','taeyeon','태연','baekhyun','백현','chanyeol','찬열',
  'kai','세훈','suho','수호','chen','chen',
  'taemin','태민','jonghyun','종현','key','민호',
  'jennie','jisoo','rosé','rose','lisa',
  'jimin','jin','suga','j-hope','jhope','rm','v','jungkook',
  'sana','momo','nayeon','jihyo','dahyun','chaeyoung','tzuyu','mina','jeongyeon',
  'karina','winter','giselle','ningning',
  'wonyoung','yujin','rei','leeseo','liz','gaeul',
  'minju','hanni','danielle','haerin','hyein',
  'chaewon','sakura','yunjin','kazuha','eunchae',
  'gayeon','hyewon','yena','chaeyeon','miho','nako','hitomi',
]

// 'official video' / 'music video' 제거 — 서양 아티스트도 동일하게 쓰므로 K-pop 판별에 부적합
const KPOP_TITLE_KEYWORDS = [
  ' mv',' m/v','official mv','official m/v',
  '뮤직비디오','k-pop','kpop','케이팝',
  'performance video','choreography video','dance practice',
  'comeback','컴백','debut','데뷔',
]

const EXCLUDE_ARTISTS = [
  // 베트남 로컬 아티스트
  'hieuthuhai','son tung','sontung','hoang thuy linh','den vau','jack j97',
  'duc phuc','bich phuong','only c','mono','tlinh','wxrdie',
  // 서양·글로벌 팝 (베트남 트렌딩에 자주 등장)
  'shakira','ariana grande','ariana','taylor swift','ed sheeran',
  'burna boy','burnaboy','tyga','post malone','billie eilish',
  'the weeknd','weeknd','drake','dua lipa','dualipa',
  'bruno mars','brunoMars','charlie puth','charlieputh',
  'justin bieber','justinbieber','selena gomez','selenagomez',
  'olivia rodrigo','oliviarodrigo','harry styles','harrystyles',
  'adele','beyonce','rihanna','lady gaga','ladygaga',
]

// ── 트로트 제외 키워드 ────────────────────────────────────
const TROT_KEYWORDS = [
  '트로트','trot','미스터트롯','미스터 트롯','미스트롯','미스 트롯',
  '임영웅','영탁','이찬원','정동원','장민호','김희재','황영웅',
  '찔레꽃','동백아가씨','사랑의배터리','나는트로트가수다',
]

function isKpop(item) {
  const rawTitle = item.snippet.title || ''
  const title    = rawTitle.toLowerCase()
  const channel  = (item.snippet.channelTitle || '').toLowerCase()
  const desc     = (item.snippet.description || '').toLowerCase()

  // 0-1. 제외 아티스트
  const rawLower = (item.snippet.title || '').toLowerCase()
  if (EXCLUDE_ARTISTS.some(a => rawLower.includes(a))) return false

  // 0-2. 트로트 키워드 제외 (제목·채널명 모두 체크)
  if (TROT_KEYWORDS.some(k => title.includes(k) || channel.includes(k))) return false

  // 0. 한글·영어(ASCII) 외 문자(베트남어 성조 등) 포함 시 즉시 제외
  //    허용: 기본ASCII(U+0000-U+007F) + 한글 음절(U+AC00-U+D7A3) + 한글 자모(U+3131-U+318F)
  if (/[^\x00-\x7F가-힣ㄱ-㆏]/.test(rawTitle)) return false

  // 1. 한글 포함
  if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(rawTitle)) return true

  // 2. 알려진 레이블 채널
  if (KPOP_LABELS.some(l => channel.includes(l))) return true

  // 3. 알려진 아티스트명
  if (KPOP_ARTISTS.some(a => title.includes(a))) return true

  // 4. K-pop 전용 키워드 ('mv', 'dance practice' 등) + 채널/설명에 korea/kpop
  //    'official video' / 'music video'는 제거됨 — 서양 팝에도 보편적으로 사용
  const hasMvKeyword = KPOP_TITLE_KEYWORDS.some(k => title.includes(k))
  const hasKpopSignal = desc.includes('korea') || desc.includes('kpop') || desc.includes('k-pop')
                     || channel.includes('korea') || channel.includes('kpop')
  if (hasMvKeyword && hasKpopSignal) return true

  return false
}

// ── 아티스트명 추출 ─────────────────────────────────────
function extractArtist(title) {
  // "ARTIST - Song Title" 패턴
  const dashMatch = title.match(/^(.+?)\s[-–—]\s/)
  if (dashMatch) return dashMatch[1].trim()

  // "ARTIST 'Song'" 패턴 — 괄호보다 먼저 체크
  const quoteMatch = title.match(/^([^'"]+?)\s+['"]/)
  if (quoteMatch) return quoteMatch[1].trim()

  // "ARTIST (Song)" 패턴
  const parenMatch = title.match(/^([^([\]]+?)\s*[\[(]/)
  if (parenMatch) return parenMatch[1].trim()

  return title.split(' ').slice(0, 3).join(' ')
}

// ── 아티스트명 정규화 (중복 방지) ──────────────────────
function normalizeArtist(name) {
  return name
    .toLowerCase()
    .replace(/[^\w가-힣\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── 트렌딩 점수 계산 ────────────────────────────────────
function trendScore(item, ytRank, ytTotal) {
  const views     = item.viewCount
  const daysSince = Math.max(0.5, (Date.now() - new Date(item.publishedAt)) / 86400000)

  // 일평균 조회수 (상승세)
  const velocity  = views / daysSince

  // YouTube 원래 트렌딩 순위 점수 (0~1, 높을수록 좋음)
  const ytScore   = (ytTotal - ytRank) / ytTotal

  // 가중 합산: 속도 60% + YouTube 순위 40%
  // 속도는 로그 스케일로 정규화 (단위 통일을 위해)
  return { velocity, ytScore, raw: views, daysSince }
}

// ── 인메모리 TTL 캐시 (서버 재시작 시 초기화) ──────────────────────
let _cache = null
let _cachedAt = 0
const TTL_MS = 5 * 60 * 1000  // 5분

export async function GET() {
  const API_KEY = process.env.YOUTUBE_API_KEY
  if (!API_KEY) {
    return NextResponse.json({ error: 'YouTube API 키가 없습니다.' }, { status: 500 })
  }

  // 캐시 유효하면 즉시 반환 (YouTube API 호출 없음)
  if (_cache && Date.now() - _cachedAt < TTL_MS) {
    return NextResponse.json(_cache)
  }

  try {
    // 베트남 트렌딩 음악 Top 100 (50씩 2페이지)
    const res1 = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=VN&videoCategoryId=10&maxResults=50&key=${API_KEY}`,
      { cache: 'no-store' }
    )
    const data1 = await res1.json()
    if (!data1.items) throw new Error(data1.error?.message || 'YouTube API 응답 오류')

    let allItems = [...data1.items]
    if (data1.nextPageToken) {
      const res2 = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=VN&videoCategoryId=10&maxResults=50&pageToken=${data1.nextPageToken}&key=${API_KEY}`,
        { cache: 'no-store' }
      )
      const data2 = await res2.json()
      if (data2.items) allItems = [...allItems, ...data2.items]
    }

    // 1. K-pop 필터링 (YouTube 원래 순서 인덱스 보존)
    const kpopItems = allItems
      .map((item, ytIdx) => ({
        videoId:      item.id,
        title:        item.snippet.title,
        artist:       extractArtist(item.snippet.title),
        channelTitle: item.snippet.channelTitle,
        thumbnail:    item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        viewCount:    parseInt(item.statistics.viewCount  || 0),
        likeCount:    parseInt(item.statistics.likeCount  || 0),
        publishedAt:  item.snippet.publishedAt,
        ytRank:       ytIdx, // YouTube 원래 순위 (0-based)
      }))
      .filter(item => isKpop(allItems[item.ytRank] || allItems.find(i => i.id === item.videoId)))

    // 2. 트렌딩 점수 계산
    const ytTotal = kpopItems.length || 1
    const scored = kpopItems.map(item => {
      const { velocity, ytScore } = trendScore(item, item.ytRank, 100)
      return { ...item, velocity, ytScore }
    })

    // 3. videoId 기준 중복 제거 (같은 영상이 2페이지에 걸쳐 중복 수집되는 경우 방지)
    const seenIds = new Set()
    const unique = scored.filter(item => {
      if (seenIds.has(item.videoId)) return false
      seenIds.add(item.videoId)
      return true
    })

    // 4. 최종 순위 정렬: velocity 60% + ytScore 40% (정규화)
    const maxVelocity = Math.max(...unique.map(i => i.velocity), 1)
    const finalRanked = unique
      .map(item => ({
        ...item,
        trendScore: (item.velocity / maxVelocity) * 0.6 + item.ytScore * 0.4,
      }))
      .sort((a, b) => b.trendScore - a.trendScore)
      .map((item, idx) => ({
        ...item,
        rank:       idx + 1,
        totalViews: item.viewCount,  // UI 호환
        dailyViews: Math.round(item.velocity),
      }))

    const result = { trends: finalRanked, updatedAt: new Date().toISOString() }
    _cache = result       // 캐시 저장
    _cachedAt = Date.now()
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
