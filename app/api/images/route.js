import { NextResponse } from 'next/server'

// 비공식/팬메이드 영상 제목 필터
const UNOFFICIAL_KEYWORDS = [
  'fan made', 'fanmade', 'fan edit', 'fanedit',
  'color coded', 'color-coded', 'colour coded',
  'karaoke', 'instrumental',
  'reaction', 'react',
  'cover', 'covered by',
  'remake', 'parody',
  'lyrics video by', 'lyric video by',
  'unofficial',
  'sub español', 'sub indo', 'sub thai',
  'engsub', 'eng sub', 'korsub',
  'audio only',
]

// 알려진 공식 K-pop 레이블 채널 ID 화이트리스트
const OFFICIAL_CHANNEL_IDS = new Set([
  'UC3IZKseVpdzPSBaWxBxundA', // SMTOWN
  'UCG2KclSAlLiNQMBgYXwDMSg', // HYBE LABELS
  'UCeUmeJenBkFfSj2E9WMEIbw', // YG Entertainment
  'UCJoyrPvBrMhUzHThScCn5Bg', // JYP Entertainment
  'UCjwmbv2rPANPyN2KNzQCmEQ', // Starship Entertainment
  'UCIZ_RuKEtDHWcVHlI9O4lhA', // Cube Entertainment
  'UCCzMWc2nSVB7FZTRBQ6wBFw', // P NATION
  'UCG9jVrIFGJX-hZmZBPSHB3g', // RBW
  'UCKDokDDMBLFkBHbJsVuvbqQ', // Woolim Entertainment
  'UCon1tF5wWFAZPYN-xFbdZng', // STONE MUSIC
  'UCp7IFBQJdW7OBcCRSqTXX9Q', // Fantagio
])

// 여러 아티스트를 한 채널에서 운영하는 멀티아티스트 채널
// → uploads 플레이리스트 방식 대신 채널 내 검색(search API) 사용
const MULTI_ARTIST_CHANNEL_IDS = new Set([
  'UC3IZKseVpdzPSBaWxBxundA', // SMTOWN (EXO, Red Velvet, aespa 등 혼재)
  'UCG2KclSAlLiNQMBgYXwDMSg', // HYBE LABELS (BTS, SEVENTEEN, NewJeans, LE SSERAFIM 등)
])

function isUnofficial(title) {
  const lower = title.toLowerCase()
  return UNOFFICIAL_KEYWORDS.some(k => lower.includes(k))
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const artist    = searchParams.get('artist')    || ''
  const count     = parseInt(searchParams.get('count') || '12')
  const videoId   = searchParams.get('videoId')   || ''
  const channelId = searchParams.get('channelId') || ''  // 공식 채널 기반 검색

  const YT_KEY = process.env.YOUTUBE_API_KEY
  if (!YT_KEY) return NextResponse.json({ error: 'API 키 없음' }, { status: 500 })

  // ── channelId 모드: 공식 채널에서 썸네일 수집 ──
  if (channelId) {
    try {
      const images = []
      const seenIds = new Set()
      const artistLower = artist.toLowerCase()

      if (MULTI_ARTIST_CHANNEL_IDS.has(channelId) && artist) {
        // 멀티아티스트 채널(HYBE, SMTOWN 등): search API로 아티스트명 지정 검색
        // uploads 플레이리스트는 전체 아티스트가 섞여 있어 필터 정확도 낮음
        const sRes = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${encodeURIComponent(channelId)}&q=${encodeURIComponent(artist)}&type=video&order=date&maxResults=30&key=${YT_KEY}`,
          { cache: 'no-store' }
        )
        const sData = await sRes.json()
        for (const item of sData.items || []) {
          if (images.length >= count) break
          const id    = item.id?.videoId
          const title = item.snippet?.title || ''
          if (!id || seenIds.has(id)) continue
          if (isUnofficial(title)) continue
          seenIds.add(id)
          const thumb = await bestThumb(id)
          if (thumb) images.push({ url: thumb, videoId: id, title })
        }
      } else {
        // 단일 아티스트 채널: UC→UU 변환으로 uploads 플레이리스트 직접 접근 (quota 절약)
        const uploadsId = channelId.replace(/^UC/, 'UU')
        const pRes = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${encodeURIComponent(uploadsId)}&maxResults=40&key=${YT_KEY}`,
          { cache: 'no-store' }
        )
        const pData = await pRes.json()
        for (const item of pData.items || []) {
          if (images.length >= count) break
          const id    = item.snippet?.resourceId?.videoId
          const title = item.snippet?.title || ''
          if (!id || seenIds.has(id)) continue
          if (isUnofficial(title)) continue
          // 아티스트명이 있으면 제목 필터 (멀티아티스트 채널 대응)
          if (artistLower && !title.toLowerCase().includes(artistLower)) continue
          seenIds.add(id)
          const thumb = await bestThumb(id)
          if (thumb) images.push({ url: thumb, videoId: id, title })
        }
      }

      return NextResponse.json({ images })
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
  }

  // ── artist 모드: 기존 공식 채널 기반 수집 ───────────────────
  try {
    const images = []
    const seenIds = new Set()
    let officialChannelId = null

    // 1. 기준 videoId → 채널 ID 확인
    if (videoId) {
      const vRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YT_KEY}`,
        { cache: 'no-store' }
      )
      const vData = await vRes.json()
      officialChannelId = vData.items?.[0]?.snippet?.channelId || null
    }

    // 2. 공식 채널 영상 우선 수집 (채널 ID 고정)
    // SMTOWN처럼 멀티아티스트 채널의 경우 제목에 아티스트명이 없으면 제외
    if (officialChannelId) {
      const artistLower = artist.toLowerCase()
      const cRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${officialChannelId}&q=${encodeURIComponent(artist)}&type=video&order=date&maxResults=30&key=${YT_KEY}`,
        { cache: 'no-store' }
      )
      const cData = await cRes.json()
      for (const item of cData.items || []) {
        if (images.length >= count) break
        const id = item.id?.videoId
        if (!id || seenIds.has(id)) continue
        if (isUnofficial(item.snippet.title)) continue
        // 제목에 아티스트명 포함 여부 확인 (멀티아티스트 채널 필터)
        if (!item.snippet.title.toLowerCase().includes(artistLower)) continue
        seenIds.add(id)
        const thumb = await bestThumb(id)
        if (thumb) images.push({ url: thumb, videoId: id, title: item.snippet.title })
      }
    }

    // 3. 부족하면 검색 보충 — 아티스트명이 제목에 반드시 포함 + 공식 채널만
    if (images.length < count) {
      const artistLower = artist.toLowerCase()
      const queries = [`${artist} official mv`, `${artist} official video`, `${artist} mv`]
      for (const q of queries) {
        if (images.length >= count) break
        const sRes = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&videoCategoryId=10&maxResults=15&key=${YT_KEY}`,
          { cache: 'no-store' }
        )
        const sData = await sRes.json()
        for (const item of sData.items || []) {
          if (images.length >= count) break
          const id = item.id?.videoId
          if (!id || seenIds.has(id)) continue

          const chId    = item.snippet.channelId || ''
          const chTitle = (item.snippet.channelTitle || '').toLowerCase()
          const title   = item.snippet.title || ''

          // ① 비공식 제목 제외
          if (isUnofficial(title)) continue

          // ② 제목에 아티스트명 포함 여부 — 필수 (다른 아티스트 이미지 차단)
          if (!title.toLowerCase().includes(artistLower)) continue

          // ③ 채널 검증: 화이트리스트 OR "official"/"entertainment"/"labels" 포함 OR 기준 채널
          //    "music" 단독은 제외 (너무 광범위 — YG Music, 1theK 등 타 아티스트 포함)
          const isOfficialCh =
            OFFICIAL_CHANNEL_IDS.has(chId) ||
            chTitle.includes('official') ||
            chTitle.includes('entertainment') ||
            chTitle.includes('labels') ||
            chId === officialChannelId

          if (!isOfficialCh) continue

          seenIds.add(id)
          const thumb = await bestThumb(id)
          if (thumb) images.push({ url: thumb, videoId: id, title })
        }
      }
    }

    return NextResponse.json({ images })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// maxresdefault → sddefault → hqdefault 순으로 유효한 썸네일 URL 반환
async function bestThumb(videoId) {
  const candidates = [
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  ]
  for (const url of candidates) {
    try {
      const r = await fetch(url, { method: 'HEAD', cache: 'no-store' })
      const cl = parseInt(r.headers.get('content-length') || '0')
      // maxresdefault 없을 때 120×90 플레이스홀더(~1-2KB)가 반환됨
      if (r.ok && cl > 5000) return url
    } catch {}
  }
  return null
}
