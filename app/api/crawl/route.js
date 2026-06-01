import { NextResponse } from 'next/server'

// 불필요한 태그 통째로 제거
function stripTags(html, ...tags) {
  let s = html
  for (const tag of tags) {
    s = s.replace(new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'), '')
  }
  return s
}

// HTML 태그 제거 후 텍스트만 추출
function htmlToText(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function getMeta(html, property) {
  const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'))
           || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'))
  return m?.[1]?.trim() || ''
}

// CDN 프록시를 통과해 실제 이미지 URL을 정규화 (중복 방지)
// Kakao/Daum CDN: /thumb/R1280x0/?fname=실제URL 처럼 파라미터에 원본 URL이 담겨있음
function urlKey(u, depth = 0) {
  try {
    const x = new URL(u)
    if (depth < 3) {
      // fname / url / src 파라미터에 원본 이미지 URL이 인코딩되어 있는 경우
      const inner = x.searchParams.get('fname') || x.searchParams.get('url') || x.searchParams.get('src')
      if (inner) return urlKey(inner, depth + 1)
    }
    return x.origin + x.pathname
  } catch { return u }
}

// 본문 영역 HTML에서 이미지 URL 추출
// 우선순위: 본문 <img> 태그 → og:image(폴백)
// og:image는 SNS 공유용 썸네일이라 기사 대표 사진과 다를 수 있으므로 후순위로 처리
function extractImages(contentHtml, baseUrl, ogImage) {
  const images = []
  const seen = new Set()

  // og:image 키를 중복 체크용으로만 예약 (아직 삽입 안 함)
  const ogKey = ogImage ? urlKey(ogImage) : null

  // <img src="..." /> 태그 전체 추출 (본문 이미지 우선)
  const imgTagRe = /<img[^>]+>/gi
  let match
  while ((match = imgTagRe.exec(contentHtml)) !== null) {
    const tag = match[0]

    // src 또는 data-src (lazy load 대응)
    const srcMatch = tag.match(/\bdata-src=["']([^"']+)["']/)
                  || tag.match(/\bsrc=["']([^"']+)["']/)
    if (!srcMatch) continue
    let src = srcMatch[1].trim()

    // base64, 1px 트래킹 픽셀, SVG 인라인 제외
    if (src.startsWith('data:')) continue
    if (/\.(svg|gif)(\?|$)/i.test(src)) continue

    // 소형 이미지 (width/height 속성이 작으면 제외)
    const wMatch = tag.match(/\bwidth=["']?(\d+)["']?/)
    const hMatch = tag.match(/\bheight=["']?(\d+)["']?/)
    if (wMatch && Number(wMatch[1]) < 200) continue
    if (hMatch && Number(hMatch[1]) < 200) continue

    // 노이즈 패턴 제외 (아이콘, 로고, 광고 등)
    if (/icon|logo|avatar|banner|ad[_-]|advertis|pixel|sprite|button|badge|blank|placeholder/i.test(src)) continue

    // 상대 경로 → 절대 경로
    if (src.startsWith('//')) {
      src = 'https:' + src
    } else if (src.startsWith('/')) {
      try {
        const u = new URL(baseUrl)
        src = u.origin + src
      } catch {}
    } else if (!src.startsWith('http')) {
      try {
        src = new URL(src, baseUrl).href
      } catch {}
    }

    // 정규화 키 기준으로 중복 검사 (쿼리스트링 달라도 같은 이미지면 제외)
    const key = urlKey(src)
    if (!seen.has(key)) {
      seen.add(key)
      images.push(src)
    }

    if (images.length >= 5) break
  }

  // og:image 폴백: 본문에 없는 이미지일 때만 마지막에 추가.
  // 본문 이미지가 0장이면 og:image가 유일한 이미지가 됨.
  if (ogImage && images.length < 5 && (!ogKey || !seen.has(ogKey))) {
    images.push(ogImage)
  }

  return images
}

function parseCredit(text) {
  const patterns = [
    /(?:사진|이미지)\s*[=|]\s*([^\n,]{2,40}?)\s*제공/,
    /(?:사진|이미지)제공\s*[=:]\s*([^\n,]{2,40})/,
    /\[사진\]\s*([^\n,]{2,40}?)\s*제공/,
    /사진\s+([^\n,가-힣]{2,40}?)\s+제공/,
    /©\s*([^\n,]{2,40})/,
    /제공\s*[=:]\s*([^\n,]{2,40})/,
    /출처\s*[=:]\s*([^\n,]{2,40})/,
  ]
  // 저작권 상투어 제거 패턴
  const stripNoise = v => v
    .replace(/\s*무단\s*전재.*$/i, '')
    .replace(/\s*All\s*rights?\s*reserved.*/i, '')
    .replace(/\s*저작권.*$/i, '')
    .replace(/\s*\(c\)\s*/i, '')
    .replace(/[.·|]\s*$/, '')
    .replace(/^\s*[=|:\s]+/, '')
    .trim()

  for (const p of patterns) {
    const m = text.match(p)
    if (m) {
      const cleaned = stripNoise(m[1].replace(/\s*제공.*$/, ''))
      if (cleaned.length >= 2) return cleaned
    }
  }
  return ''
}

function extractImageCredit(rawHtml, plainText) {
  // figcaption 내 패턴 (가장 정확)
  for (const m of rawHtml.matchAll(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/gi)) {
    const t = htmlToText(m[1])
    const c = parseCredit(t)
    if (c) return c
  }
  return parseCredit(plainText)
}

export async function POST(req) {
  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'URL이 필요합니다.' }, { status: 400 })

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KpopCMS/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko,en;q=0.9',
      },
      redirect: 'follow',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()

    // ── 메타 정보 추출 ─────────────────────────────
    const ogTitle   = getMeta(html, 'og:title')
    const ogDesc    = getMeta(html, 'og:description')
    const ogImage   = getMeta(html, 'og:image')
    const ogSite    = getMeta(html, 'og:site_name')

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = ogTitle || titleMatch?.[1]?.trim() || url

    // ── 본문 추출 ───────────────────────────────────
    // 노이즈 제거 (이미지는 남겨두기 위해 figure/figcaption 유지)
    let body = stripTags(html, 'script', 'style', 'nav', 'header', 'footer', 'aside', 'form', 'iframe')

    // 본문 영역 추출 (article > main > .content 우선순위)
    const articleMatch = body.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
    const mainMatch    = body.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
    const divMatch     = body.match(/<div[^>]+(?:class|id)=["'][^"']*(content|article|post|body|text|entry)[^"']*["'][^>]*>([\s\S]{200,}?)<\/div>/i)

    const rawContent = articleMatch?.[1] || mainMatch?.[1] || divMatch?.[2] || body

    // ── 이미지 추출 (본문 HTML에서) ─────────────────
    const images = extractImages(rawContent, url, ogImage)

    // ── 텍스트 추출 ─────────────────────────────────
    const text = htmlToText(rawContent)
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 20)
      .slice(0, 60)
      .join('\n')

    if (!text || text.length < 100) {
      throw new Error('본문을 추출하지 못했습니다. 다른 링크를 시도해보세요.')
    }

    const imageCredit = extractImageCredit(rawContent, text)

    return NextResponse.json({
      title,
      description: ogDesc,
      image:  images[0] || null,   // 하위 호환
      images,                       // 슬라이드별 이미지 배열 (최대 5장)
      site: ogSite || new URL(url).hostname,
      text: text.slice(0, 3000),
      url,
      imageCredit,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
