import { NextResponse } from 'next/server'

const SYSTEM = `당신은 열정적인 케이팝 전문 미디어 에디터입니다.
팬들의 언어로 소통하며, 딱딱한 뉴스 문체 대신 생동감 있고 공감 가는 문장을 씁니다.

[역할]
- 케이팝 팬덤 문화에 깊이 공감하는 에디터
- 팬의 시선으로 아티스트의 성과를 함께 기뻐하는 어조
- 과장되지 않지만 설레고 흥미로운 문체

[작성 규칙]
1. 뉴스 보도체 금지
   - ❌ "~을 기록했다" / "~인 것으로 나타났다"
   - ✅ "~을 찍었어요!" / "~라는 거 알고 있었어요?"
2. 문장 길이: 2~3문장 이내로 짧고 임팩트 있게
3. 숫자 표현: 단순 나열이 아닌 의미 부여
   - ❌ "7,180만 조회수를 기록했습니다"
   - ✅ "7,180만 뷰. 이 숫자가 얼마나 대단한지 실감 나시나요?"
4. 독자를 팬으로 호칭, 2인칭 활용 권장 (여러분, 팬분들, 우리)
5. 어미 스타일: ~요, ~죠, ~네요, ~잖아요 등 부드러운 어미 / 감탄사 자연스럽게 활용 (와, 진짜, 벌써, 역시)
6. 이모지 사용 금지 (카드 디자인과 충돌)

베트남어로 작성할 때도 동일한 톤을 유지하세요:
- 딱딱한 보도체 대신 팬 친화적이고 생동감 있는 문체
- "các bạn", "chúng mình" 등 2인칭 호칭 활용
- 숫자에 감탄과 의미 부여
- 짧고 임팩트 있는 문장

[팩트 규칙 — 반드시 준수]
1. 아래 "검증된 데이터" 섹션에 있는 정보만 사용하세요.
2. 데이터에 없는 사실, 수치, 날짜는 절대 만들지 마세요.
3. 가사·영상 원문을 그대로 복사하지 마세요 (저작권).
4. 불확실하면 생략하거나 "~로 알려진" 형태로 표현하세요.
5. 모든 수치는 반드시 데이터에서 가져온 것만 사용하세요.

[시간에 따라 바뀌는 정보 — 특별 주의]
멤버 수, 현재 활동 멤버 구성, 컴백 일정 등은 영상 촬영·업로드 당시 기준과 현재가 다를 수 있습니다.
- 멤버 수는 절대 숫자로 명시하지 마세요. "멤버들", "그룹" 등 중립적 표현을 사용하세요.
  - ❌ "일곱 명이 맞추는 칼군무" / "6명의 퍼포먼스"
  - ✅ "멤버들이 맞추는 칼군무" / "그룹의 퍼포먼스"
- 활동 여부, 탈퇴, 복귀 관련 정보도 제공된 뉴스에 명시된 경우에만 언급하세요.`

function buildContext({ video, captions, news, artist, topic, type, hook, reason, keywords, articleText, articleSite, articleUrl }) {
  const lines = []

  // 기사 크롤링 데이터 (직접 붙여넣기 경로)
  if (articleText) {
    lines.push(`[기사 본문 — 검증된 데이터]\n출처: ${articleSite || ''}${articleUrl ? ` (${articleUrl})` : ''}\n\n${articleText}`)
  }

  if (video) {
    const fv = n => n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(0)+'K' : String(n)
    lines.push(`[YouTube 영상 — 검증된 데이터]
제목: ${video.title}
채널: ${video.channelTitle}
게시일: ${video.publishedAt?.slice(0,10)}
조회수: ${fv(video.viewCount)} (${video.viewCount.toLocaleString()}회)
좋아요: ${fv(video.likeCount)}
댓글: ${fv(video.commentCount)}
설명: ${video.description}
태그: ${video.tags.join(', ')}`)
  }

  if (captions?.text) {
    lines.push(`[${captions.lang.toUpperCase()} 자막 — 팩트 근거]\n${captions.text}`)
  }

  if (news?.length) {
    lines.push(`[최신 뉴스 — Google News VN]\n${news.map(n => `• ${n.title}${n.source ? ` (${n.source})` : ''}`).join('\n')}`)
  }

  const ctxLines = ['[AI 분석 컨텍스트]']
  if (artist)   ctxLines.push(`아티스트: ${artist}`)
  if (topic)    ctxLines.push(`주제: ${topic}`)
  if (type)     ctxLines.push(`유형: ${type}`)
  if (reason)   ctxLines.push(`분석 근거: ${reason}`)
  if (hook)     ctxLines.push(`후킹 레퍼런스: ${hook}`)
  if (keywords) ctxLines.push(`키워드: ${keywords}`)
  lines.push(ctxLines.join('\n'))

  return lines.join('\n\n')
}

// ── promptCard용 고정 지시문 (system 캐시 대상) ──────────────────
const SYSTEM_CARD = `You are a K-pop card news editor for Vietnamese fans.

CRITICAL LANGUAGE RULE — NEVER VIOLATE:
- ALL "Vi" fields (titleVi, subtitleVi, bodyVi) → MUST be written in VIETNAMESE (Tiếng Việt)
- ALL "Ko" fields (titleKo, subtitleKo, bodyKo) → MUST be written in KOREAN (한국어)
- Even if the source data is in Korean, the Vi fields MUST be translated into Vietnamese
- Do NOT put Korean text in any Vi field. Ever.

Vietnamese writing style for K-pop fans:
• Tone: fan-to-fan, energetic, reaction-focused (not journalistic)
• Use expressions like: "các bạn ơi", "thật sự", "quá đỉnh", "chúng mình", "không thể tin được"
• Short, punchy sentences — SNS-optimized
• Convey excitement and fandom energy

Korean writing style (for Ko fields):
• Same fan-friendly tone but in Korean
• Use: "여러분", "진짜", "역시", "벌써", "~네요", "~잖아요"

━━━ SLIDE COUNT RULE (STRICT) ━━━
- One distinct fact per body slide — never combine multiple facts into one slide.
- Minimum 3 slides total: 1 cover + at least 1 body + 1 CTA.
- Maximum 5 slides total — never exceed this limit.
- Let the source content determine the count naturally within this range.
NEVER pad slides to reach a higher count. NEVER invent a slide to fill space.

━━━ FABRICATION RULES (HARD BLOCK) ━━━
The following are STRICTLY FORBIDDEN unless the source data explicitly contains them:
✗ Fan reaction slides ("팬들이 SNS에서...", "팬덤 반응은..." etc.) — ONLY allowed if actual fan quotes or reaction data exist in the source
✗ Emotional background slides ("긴 여정 끝에...", "그 동안의 노력이..." etc.) — vague sentiment with no factual basis
✗ Album/title name interpretation slides ("이름이 모든 걸 말해주네요" etc.) — speculation
✗ Any number, date, or fact not present in the source data
If you cannot fill a slide with real data → reduce the slide count instead.

Allowed body slide roles (use only when supported by source data):
- "팩트": concrete news fact (release date, event, chart result, etc.)
- "포인트": meaningful context or significance of a fact already stated
- "비교": comparison using data explicitly in the source
- "배경": factual background — only if the source explains it directly

Slide structure:
- Slide 1 (cover): SNS headline + short subtitle → titleVi + subtitleVi (+ Ko equivalents)
- Body slides: one fact per slide, titleVi + bodyVi strictly 2 sentences max, each sentence under 25 words (+ Ko equivalents)
- Last slide (CTA): "Follow us!" + channel intro → titleVi + bodyVi (+ Ko equivalents)`

// ── 각 포맷 프롬프트 — { systemText, userContent } 반환 ──────────

function promptShort(ctx) {
  // ctx 안의 AI 분석 컨텍스트에서 topic/hook/reason 추출해 최상단에 배치
  const topicMatch  = ctx.match(/주제:\s*(.+)/)
  const hookMatch   = ctx.match(/후킹 레퍼런스:\s*(.+)/)
  const reasonMatch = ctx.match(/분석 근거:\s*(.+)/)
  const topic  = topicMatch?.[1]?.trim()  || ''
  const hook   = hookMatch?.[1]?.trim()   || ''
  const reason = reasonMatch?.[1]?.trim() || ''

  return {
    systemText: SYSTEM,
    userContent: `

━━━ 이번 영상의 핵심 방향 (반드시 준수) ━━━
주제: ${topic}
후킹 포인트: ${hook}
이 주제를 선택한 이유: ${reason}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[중요] 위 "주제"를 영상 전체의 중심축으로 삼으세요.
아래 검증된 데이터는 주제를 뒷받침하는 팩트로만 활용하며,
주제와 무관한 수치(예: 조회수)를 억지로 끼워 넣지 마세요.

검증된 데이터:
${ctx}

베트남 팬 대상 60초 숏폼 스크립트를 작성하세요.

[씬별 역할 — 반드시 준수]
씬1 (0:00-0:10) 【도입 — 주제로 바로 시작】
- 위 "후킹 포인트"를 활용해 첫 문장 작성
- 주제와 관련된 임팩트 있는 사실이나 상황으로 시청자를 멈추게 할 것
- 데이터에 수치가 있다면 활용하되, 없으면 생략
- 한국어 3~4문장, 베트남어도 동일 밀도

씬2 (0:10-0:20) 【주제 심화 1】
- 주제의 핵심 내용을 구체적으로 전달
- 관련 데이터(영상, 자막, 뉴스)에서 뒷받침할 팩트 1개 선택
- 한국어 3~5문장, 베트남어도 동일 밀도

씬3 (0:20-0:35) 【주제 심화 2 + 맥락】
- 주제의 두 번째 각도 (비교, 배경, 의미 등)
- 팬들이 공감할 수 있는 맥락으로 연결
- 한국어 4~5문장, 베트남어도 동일 밀도

씬4 (0:35-0:50) 【팬 시선 해석】
- "왜 이게 화제인가?" 주제를 팬의 시선으로 해석
- 공감 유도 질문으로 마무리
- 한국어 4~5문장, 베트남어도 동일 밀도

씬5 (0:50-1:00) 【CTA】
- 다음 행동 유도 (팔로우, 스트리밍 등)
- 한국어 2~3문장, 베트남어도 동일 밀도

[추가 규칙]
- 전체 흐름이 "주제"를 중심으로 일관되게 이어져야 함
- 수치는 반드시 데이터에서만, 없으면 생략 (조회수 등 무관한 수치 금지)
- 씬 간 자연스러운 연결 ("그런데", "그뿐만 아니라", "벌써" 등 활용)

JSON만 반환 (코드블록 없이):
{"hook":"0-3초 후킹 멘트(베트남어)","scenes":[{"time":"0:00-0:10","duration":10,"ko":"한국어 나레이션 3~4문장","vi":"베트남어 나레이션","visual":"화면 설명","imageKeyword":"영어 이미지 검색 키워드 (예: BTS World Cup stage performance 2026)"},{"time":"0:10-0:20","duration":10,"ko":"","vi":"","visual":"","imageKeyword":""},{"time":"0:20-0:35","duration":15,"ko":"","vi":"","visual":"","imageKeyword":""},{"time":"0:35-0:50","duration":15,"ko":"","vi":"","visual":"","imageKeyword":""},{"time":"0:50-1:00","duration":10,"ko":"","vi":"","visual":"","imageKeyword":""}],"cta":"마지막 CTA(베트남어)","hashtags":["#tag1","#tag2","#tag3","#tag4","#tag5"],"sources":["사용 출처1","사용 출처2"]}

[duration 규칙]
- duration은 해당 씬의 나레이션 읽기 시간(초)을 정수로 기입
- time 레이블 구간과 일치해야 함 (예: "0:10-0:20" → duration: 10)
- 나레이션이 길면 구간을 늘리고 duration도 맞게 조정

[imageKeyword 규칙]
- 해당 씬의 핵심 장면을 Google 이미지 검색으로 찾을 수 있는 영어 키워드
- 아티스트 이름 + 구체적 상황/이벤트 + 연도 형식 권장
- 예: "BTS World Cup halftime show 2026", "aespa WDA performance stage"
- 저작권 없는 공식 사진을 찾을 수 있는 키워드로 작성`,
  }
}

function promptNews(ctx) {
  return {
    systemText: SYSTEM,
    userContent: `검증된 데이터:
${ctx}

위 데이터만 사용해 SNS 뉴스카드 카피를 작성하세요.
JSON만 반환 (코드블록 없이):
{"headline":"15자 이내 베트남어 제목","body":"50자 이내 베트남어 본문(수치 포함)","cta":"팔로우 유도(베트남어)","source":"출처(예: YouTube · 2026.05)","hashtags":["#tag1","#tag2","#tag3","#tag4"],"fact_note":"사용한 팩트 출처 한 줄"}`,
  }
}

function promptCard(ctx) {
  return {
    systemText: SYSTEM_CARD,
    userContent: `Source data:
${ctx}

Return ONLY valid JSON (no code blocks).
Every Vi field must contain actual Vietnamese text — never empty, never Korean.

{"slides":[
  {"idx":1,"role":"커버","titleVi":"aespa mở màn siêu to — từ Seoul đến toàn thế giới! 🌍","titleKo":"에스파, 서울에서 전 세계를 물들인다! 🌍","subtitleVi":"Popup 'LEMONADE' đang đến rồi, các bạn ơi!","subtitleKo":"'LEMONADE' 팝업이 온다!"},
  {"idx":2,"role":"팩트","titleVi":"6 thành phố, 1 lúc — aespa WEEK chính thức bắt đầu! 🔥","titleKo":"6개 도시 동시! aespa WEEK 시작! 🔥","bodyVi":"Từ ngày 29/5 đến 7/6, aespa tổ chức popup tại Seoul, LA, New York, Thành Đô, Đài Bắc và Bangkok cùng lúc. Quy mô không thể tin được!","bodyKo":"5월 29일부터 6월 7일까지 서울, LA, 뉴욕, 청두, 타이베이, 방콕에서 동시 팝업 진행. 믿기지 않는 규모!"},
  {"idx":5,"role":"CTA","titleVi":"Follow us!","titleKo":"팔로우해주세요!","bodyVi":"Theo dõi để không bỏ lỡ tin tức K-pop mới nhất nhé, các bạn!","bodyKo":"최신 K-pop 소식을 놓치지 않으려면 팔로우하세요!"}
],"sources":["출처"]}`,
  }
}

const PROMPTS = { short: promptShort, news: promptNews, card: promptCard }

export async function POST(req) {
  const body = await req.json()
  const { format, video, captions, news, artist, topic, type, hook, reason, keywords, articleText, articleSite, articleUrl } = body

  const AI_KEY = process.env.ANTHROPIC_API_KEY
  if (!AI_KEY) return NextResponse.json({ error: 'Claude API 키가 없습니다.' }, { status: 500 })

  const promptFn = PROMPTS[format]
  if (!promptFn) return NextResponse.json({ error: '지원하지 않는 포맷' }, { status: 400 })

  const ctx = buildContext({ video, captions, news, artist, topic, type, hook, reason, keywords, articleText, articleSite, articleUrl })
  const { systemText, userContent } = promptFn(ctx)

  // max_tokens: news는 출력 JSON이 작으므로 600으로 제한
  const maxTok = format === 'short' ? 4000 : format === 'card' ? 3000 : 600

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': AI_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31',  // 프롬프트 캐싱 활성화
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTok,
      // system 파라미터로 분리 → cache_control 으로 캐시 고정
      system: [{ type: 'text', text: systemText, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userContent }],
    }),
  })

  const data = await res.json()
  if (data.error) return NextResponse.json({ error: data.error.message }, { status: 500 })

  const raw = data.content?.[0]?.text || ''
  try {
    // 코드블록 제거 후 첫 { ~ 마지막 } 범위만 추출
    const cleaned = raw.replace(/```[\w]*\n?/g, '').trim()
    const start   = cleaned.indexOf('{')
    const end     = cleaned.lastIndexOf('}')
    const jsonStr = (start !== -1 && end !== -1) ? cleaned.slice(start, end + 1) : cleaned
    const result  = JSON.parse(jsonStr)
    return NextResponse.json({
      result,
      meta: {
        hasVideo: !!video,
        hasCaptions: !!captions,
        newsCount: news?.length || 0,
      },
    })
  } catch {
    return NextResponse.json({ error: 'JSON 파싱 실패', raw }, { status: 500 })
  }
}
