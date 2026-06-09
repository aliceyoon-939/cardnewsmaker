'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSave } from '@/contexts/SaveContext'

/* ── 노드 프로그레스 컴포넌트 ── */
function ProgressNodes({ status, isCrawl, hasVideoId }) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 1800)
    return () => clearInterval(t)
  }, [])

  // 메인 노드 (실제 실행 경로별)
  const nodes = isCrawl
    ? [
        { icon: '📄', label: '기사 파싱', done: true,   active: false },
        { icon: '🤖', label: 'Claude AI', done: false,  active: true  },
        { icon: '🃏', label: '슬라이드',  done: false,  active: false },
      ]
    : hasVideoId
      ? [
          { icon: '📺', label: 'YouTube',   done: status === 'generating', active: status === 'fetching'   },
          { icon: '📰', label: '뉴스 수집', done: status === 'generating', active: status === 'fetching'   },
          { icon: '🤖', label: 'Claude AI', done: false,                   active: status === 'generating' },
          { icon: '🃏', label: '슬라이드',  done: false,                   active: false                  },
        ]
      : [
          { icon: '🤖', label: 'Claude AI', done: false, active: status === 'generating' },
          { icon: '🃏', label: '슬라이드',  done: false, active: false                  },
        ]

  // Claude AI 서브 스텝 (경로별 세부 작업)
  const AI_SUBSTEPS = isCrawl
    ? [
        { icon: '🔍', label: '내용 분석' },
        { icon: '🌐', label: '베트남어 번역' },
        { icon: '🃏', label: '슬라이드 구성' },
      ]
    : hasVideoId
      ? [
          { icon: '📊', label: '팩트 정리' },
          { icon: '🌐', label: '베트남어 번역' },
          { icon: '🃏', label: '슬라이드 구성' },
        ]
      : [
          { icon: '📝', label: '내용 작성' },
          { icon: '🌐', label: '베트남어 번역' },
          { icon: '🃏', label: '슬라이드 구성' },
        ]

  const aiSubStep = Math.min(Math.floor(tick / 2), AI_SUBSTEPS.length - 1)

  const FETCH_MESSAGES = ['YouTube 영상 데이터 수집 중...', '관련 뉴스 탐색 중...', '팩트 데이터 정리 중...']
  const fetchMsg = FETCH_MESSAGES[tick % FETCH_MESSAGES.length]

  const isGenerating = status === 'generating' || (isCrawl && status !== 'idle')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginTop: 8 }}>
      <style>{`
        @keyframes nodePulse {
          0%,100%{box-shadow:0 0 0 0 rgba(190,242,100,.5)}
          50%{box-shadow:0 0 0 7px rgba(190,242,100,0)}
        }
        @keyframes nodeFade {
          0%,100%{opacity:1} 50%{opacity:.5}
        }
        .node-pulse{animation:nodePulse 1.4s ease-in-out infinite}
        .node-fade{animation:nodeFade 1.8s ease-in-out infinite}
      `}</style>

      {/* 메인 노드 행 */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {nodes.map((n, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
              <div
                className={n.active ? 'node-pulse' : ''}
                style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: n.done ? 'var(--lime)' : n.active ? 'rgba(190,242,100,.12)' : 'rgba(255,255,255,.06)',
                  border: n.done ? 'none' : n.active ? '2px solid var(--lime)' : '1.5px solid rgba(255,255,255,.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: n.done ? 15 : 18, transition: 'all .3s',
                }}
              >
                {n.done ? <span style={{ color: '#09090b', fontWeight: 800, fontSize: 15 }}>✓</span> : n.icon}
              </div>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '.05em', whiteSpace: 'nowrap',
                color: n.done ? 'rgba(190,242,100,.75)' : n.active ? 'var(--lime)' : 'rgba(255,255,255,.28)',
              }}>
                {n.label}
              </span>
            </div>
            {i < nodes.length - 1 && (
              <div style={{ width: 32, height: 1.5, marginBottom: 20, flexShrink: 0, background: n.done ? 'rgba(190,242,100,.5)' : 'rgba(255,255,255,.1)' }} />
            )}
          </div>
        ))}
      </div>

      {/* Claude AI 서브 스텝 (generating 단계) */}
      {isGenerating && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {AI_SUBSTEPS.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div
                  className={i === aiSubStep ? 'node-pulse' : ''}
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: i < aiSubStep ? 'rgba(190,242,100,.7)' : i === aiSubStep ? 'rgba(190,242,100,.1)' : 'rgba(255,255,255,.04)',
                    border: i < aiSubStep ? 'none' : i === aiSubStep ? '1.5px solid var(--lime)' : '1px solid rgba(255,255,255,.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, transition: 'all .3s',
                  }}
                >
                  {i < aiSubStep
                    ? <span style={{ color: '#09090b', fontWeight: 800, fontSize: 10 }}>✓</span>
                    : s.icon}
                </div>
                <span style={{
                  fontSize: 8, fontWeight: 600, letterSpacing: '.04em', whiteSpace: 'nowrap',
                  color: i < aiSubStep ? 'rgba(190,242,100,.6)' : i === aiSubStep ? 'var(--lime)' : 'rgba(255,255,255,.18)',
                }}>
                  {s.label}
                </span>
              </div>
              {i < AI_SUBSTEPS.length - 1 && (
                <div style={{ width: 20, height: 1, marginBottom: 18, flexShrink: 0, background: i < aiSubStep ? 'rgba(190,242,100,.35)' : 'rgba(255,255,255,.08)' }} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* fetching 중 메시지 */}
      {status === 'fetching' && (
        <div key={tick} className="node-fade" style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', letterSpacing: '.03em' }}>
          {fetchMsg}
        </div>
      )}
    </div>
  )
}

function CardInner() {
  const router  = useRouter()
  const params  = useSearchParams()
  const iframeRef = useRef(null)
  const { registerPending } = useSave()

  const artist   = params.get('artist')   || ''
  const topic    = params.get('topic')    || ''
  const type     = params.get('type')     || ''
  const hook     = params.get('hook')     || ''
  const reason   = params.get('reason')  || ''
  const keywords = params.get('keywords') || ''
  const videoId  = params.get('videoId') || ''

  const hasContext = !!(artist && topic)

  const keys = ['artist', 'topic', 'type', 'hook', 'reason', 'keywords']
  const hashStr = keys
    .filter(k => params.get(k))
    .map(k => `${k}=${encodeURIComponent(params.get(k))}`)
    .join('&')

  const [ragData,  setRagData]  = useState(null)
  const [status,   setStatus]   = useState('idle') // idle | fetching | generating | done | error
  const [error,    setError]    = useState('')
  const [koSlides,      setKoSlides]      = useState([])
  const [refreshingIdx, setRefreshingIdx] = useState(-1)
  const lastMsgRef = useRef(null) // 마지막으로 전송한 fillSlides 메시지 저장

  // 슬라이드별 썸네일 + 이미지 피커
  const [cardThumbs,  setCardThumbs]  = useState([])
  const [imagePicker, setImagePicker] = useState({ idx: -1, loading: false, images: [] })

  // 슬라이드 매핑: Vi 우선, 없으면 Ko 폴백 (빈 카드 방지)
  function mapSlides(rawSlides) {
    return rawSlides.map(s => ({
      tag:   '',
      title: s.titleVi   || s.titleKo   || s.title   || '',
      body:  [
        s.subtitleVi || s.subtitleKo || s.subtitle || '',
        s.bodyVi     || s.bodyKo     || s.body     || '',
      ].filter(Boolean).join('\n'),
    }))
  }

  const [source, setSource] = useState('')

  // 기사 크롤링 state
  const [crawlUrl,     setCrawlUrl]     = useState('')
  const [crawlLoading, setCrawlLoading] = useState(false)
  const [crawlData,    setCrawlData]    = useState(null) // { title, description, image, site, text, url }
  const [crawlError,   setCrawlError]   = useState('')
  const [crawlOpen,    setCrawlOpen]    = useState(true)

  async function doCrawl() {
    if (!crawlUrl.trim()) return
    setCrawlLoading(true)
    setCrawlError('')
    setCrawlData(null)
    try {
      const res  = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: crawlUrl.trim() }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCrawlData(data)
    } catch (e) {
      setCrawlError(e.message)
    }
    setCrawlLoading(false)
  }

  async function generateFromCrawl() {
    if (!crawlData) return
    setStatus('generating')
    setError('')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'card',
          artist: crawlData.site,
          topic:  crawlData.title,
          type:   '카드뉴스',
          hook:   '',
          reason: '기사 크롤링 기반 카드뉴스',
          keywords: '',
          articleText: crawlData.text,
          articleSite: crawlData.site,
          articleUrl:  crawlData.url,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const slides = mapSlides(data.result.slides || [])
      setKoSlides(data.result.slides || [])
      // 기사에서 추출한 이미지 배열(최대 5장)을 슬라이드별로 전달
      const imgArr = crawlData.images?.length ? crawlData.images : (crawlData.image ? [crawlData.image] : [])
      sendSlides(slides, imgArr)
      setSource(crawlData.imageCredit ? `Ảnh - ${crawlData.imageCredit}` : '')
      setStatus('done')
      registerPending({
        type: 'card',
        artist: crawlData.site,
        topic:  crawlData.title,
        result: data.result,
        params: { artist: crawlData.site, topic: crawlData.title },
      })
    } catch (e) {
      setError(e.message)
      setStatus('error')
    }
  }


  // iframe 메시지 수신: cardmakerReady + openChannelPicker
  useEffect(() => {
    function onMsg(e) {
      // 준비 완료 → 마지막 슬라이드 메시지 재전송
      if (e.data?.type === 'cardmakerReady') {
        if (lastMsgRef.current) {
          iframeRef.current?.contentWindow?.postMessage(lastMsgRef.current, '*')
        }
      }
      // 편집 패널에서 "공식 채널에서 선택" 버튼 클릭
      if (e.data?.type === 'openChannelPicker') {
        openImagePicker(e.data.cardIdx ?? 0)
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  function sendSlides(slides, thumbnails) {
    const arr = Array.isArray(thumbnails) ? thumbnails : (thumbnails ? [thumbnails] : [])
    setCardThumbs(arr)
    const msg = { type: 'fillSlides', slides, thumbnails: arr, thumbnail: arr[0] || null, source }
    lastMsgRef.current = msg
    iframeRef.current?.contentWindow?.postMessage(msg, '*')
  }

  // ── 이미지 피커: 공식 채널 썸네일 ───────────────────────────
  async function openImagePicker(i) {
    if (imagePicker.idx === i) {
      setImagePicker({ idx: -1, loading: false, images: [] })
      return
    }
    setImagePicker({ idx: i, loading: true, images: [] })
    try {
      const chId      = ragData?.video?.channelId || ''
      const effArtist = artist || crawlData?.site || ''
      const url = chId
        ? `/api/images?channelId=${encodeURIComponent(chId)}&artist=${encodeURIComponent(effArtist)}&count=12`
        : `/api/images?artist=${encodeURIComponent(effArtist)}&count=12`
      const res  = await fetch(url)
      const data = await res.json()
      setImagePicker({ idx: i, loading: false, images: data.images || [] })
    } catch {
      setImagePicker({ idx: i, loading: false, images: [] })
    }
  }

  function selectPickerImage(i, url) {
    // iframe에 직접 전달 — fillSlides 전체 재전송 없이 해당 카드만 교체
    iframeRef.current?.contentWindow?.postMessage({ type: 'setCardImage', url, cardIdx: i }, '*')
    setImagePicker({ idx: -1, loading: false, images: [] })
  }

  useEffect(() => {
    if (hasContext) fetchAndGenerate()
  }, [])

  async function refreshSlideKo(i) {
    const s = koSlides[i]
    if (!s) return
    setRefreshingIdx(i)
    try {
      const call = (text) => fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, target: 'ko' }),
      }).then(r => r.json())
      const [titleRes, subtitleRes, bodyRes] = await Promise.all([
        s.titleVi   ? call(s.titleVi)   : Promise.resolve({}),
        s.subtitleVi? call(s.subtitleVi): Promise.resolve({}),
        s.bodyVi    ? call(s.bodyVi)    : Promise.resolve({}),
      ])
      setKoSlides(prev => prev.map((sl, idx) => idx !== i ? sl : {
        ...sl,
        titleKo:    titleRes.ko    || sl.titleKo,
        subtitleKo: subtitleRes.ko || sl.subtitleKo,
        bodyKo:     bodyRes.ko     || sl.bodyKo,
      }))
    } catch {}
    setRefreshingIdx(-1)
  }

  // source 필드가 바뀌면 iframe에 즉시 반영
  useEffect(() => {
    if (!lastMsgRef.current) return
    const msg = { ...lastMsgRef.current, source }
    lastMsgRef.current = msg
    iframeRef.current?.contentWindow?.postMessage(msg, '*')
  }, [source])

  async function fetchAndGenerate() {
    setError('')

    let rag = { video: null, captions: null, news: [] }
    if (videoId) {
      setStatus('fetching')
      try {
        const r = await fetch(`/api/rag?videoId=${encodeURIComponent(videoId)}&artist=${encodeURIComponent(artist)}`)
        if (r.ok) rag = await r.json()
      } catch {}
      setRagData(rag)
    }
    setStatus('generating')

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'card', ...rag, artist, topic, type, hook, reason, keywords }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // cardmaker에 전송 (Vi 우선, 없으면 Ko 폴백)
      const slides = mapSlides(data.result.slides || [])

      // 우측 패널용 한국어 번역 저장
      setKoSlides(data.result.slides || [])

      sendSlides(slides, rag.thumbnails?.length ? rag.thumbnails : rag.thumbnail)
      if (rag.video?.channelTitle) setSource(prev => prev || `Ảnh - YOUTUBE ${rag.video.channelTitle}`)
      setStatus('done')
      registerPending({
        type: 'card',
        artist, topic,
        result: data.result,
        params: { artist, topic, type, hook, reason, keywords, videoId },
      })
    } catch (e) {
      setError(e.message)
      setStatus('error')
    }
  }

  const statusBar = () => {
    if (status === 'fetching')   return { label: 'YouTube · 뉴스 수집 중...', color: 'var(--amber)' }
    if (status === 'generating') return { label: 'Claude AI 슬라이드 생성 중...', color: 'var(--purple)' }
    if (status === 'done') {
      const parts = []
      if (ragData?.video)    parts.push(`YouTube ${(ragData.video.viewCount/1e6).toFixed(1)}M뷰`)
      if (ragData?.captions) parts.push(`자막 (${ragData.captions.lang.toUpperCase()})`)
      if (ragData?.news?.length) parts.push(`뉴스 ${ragData.news.length}건`)
      return { label: `✓ 슬라이드 자동 생성 완료 · ${parts.join(' · ')}`, color: 'var(--lime)' }
    }
    if (status === 'error')   return { label: `⚠️ ${error}`, color: 'var(--pink)' }
    return null
  }

  const bar = statusBar()
  const isLoading = status === 'fetching' || status === 'generating'

  const ROLE_LABEL = { '커버': '🎴 커버', '팩트': '📌 팩트', '반응': '💬 반응', '분위기': '🔥 분위기', 'CTA': '📣 CTA' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── 기사 크롤링 패널 (접기/펼치기) ── */}
      <div style={{ borderBottom: '1px solid var(--b1)', flexShrink: 0 }}>

        {/* 진입점 버튼 — 항상 표시 */}
        <div
          onClick={() => { setCrawlOpen(o => !o); setCrawlError('') }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 16px 14px', cursor: 'pointer', userSelect: 'none',
            background: crawlOpen ? 'var(--s2)' : 'var(--s1)',
            transition: 'background .15s',
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx1)', letterSpacing: '-.01em' }}>기사 URL로 자동 생성</div>
            <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 4 }}>
              {crawlData ? `✓ ${crawlData.title.slice(0, 28)}…` : '뉴스 기사를 붙여넣으면 슬라이드를 자동 생성합니다'}
            </div>
          </div>
          <span style={{ fontSize: 11, color: 'var(--tx3)', transition: 'transform .2s', display: 'inline-block', transform: crawlOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
        </div>

        {/* 펼쳐진 입력 영역 */}
        {crawlOpen && (
          <div style={{ padding: '0 16px 16px', background: 'var(--s2)', display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 800 }}>

            {/* URL 입력 + 버튼 */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="url"
                value={crawlUrl}
                onChange={e => setCrawlUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doCrawl()}
                placeholder="https://news.daum.net/... 또는 다른 기사 URL"
                autoFocus
                style={{
                  flex: 1, background: 'var(--s1)', border: '1px solid var(--b1)',
                  borderRadius: 'var(--r-sm)', padding: '9px 12px', fontSize: 12,
                  color: 'var(--tx1)', outline: 'none', fontFamily: 'inherit',
                }}
              />
              <button
                onClick={doCrawl}
                disabled={crawlLoading || !crawlUrl.trim()}
                style={{
                  flexShrink: 0, whiteSpace: 'nowrap', cursor: 'pointer',
                  fontSize: 12, fontWeight: 800, padding: '9px 18px',
                  borderRadius: 'var(--r-sm)', border: 'none', fontFamily: 'inherit',
                  background: crawlLoading || !crawlUrl.trim()
                    ? 'rgba(190,242,100,0.25)'
                    : 'var(--lime)',
                  color: crawlLoading || !crawlUrl.trim() ? 'rgba(0,0,0,0.35)' : '#09090b',
                  boxShadow: crawlLoading || !crawlUrl.trim() ? 'none' : '0 0 0 2px rgba(190,242,100,0.4)',
                  transition: 'all .15s',
                }}
              >
                {crawlLoading
                  ? <><span className="spin" style={{ width: 10, height: 10, borderWidth: 1.5, display: 'inline-block', marginRight: 4 }} />수집 중</>
                  : '크롤링 시작'}
              </button>
            </div>

            {/* 에러 */}
            {crawlError && (
              <div style={{ fontSize: 11, color: 'var(--pink)', padding: '6px 10px', background: 'rgba(244,114,182,.08)', borderRadius: 'var(--r-sm)' }}>
                ⚠️ {crawlError}
              </div>
            )}

            {/* 수집 결과 */}
            {crawlData && (
              <div style={{
                display: 'flex', gap: 10, alignItems: 'center',
                background: 'var(--s1)', border: '1px solid var(--b1)',
                borderRadius: 'var(--r-sm)', padding: '8px 10px',
              }}>
                {crawlData.image && (
                  <img src={crawlData.image} alt="" style={{ width: 52, height: 36, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx1)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {crawlData.title}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 2 }}>
                    {crawlData.site} · {crawlData.text.length.toLocaleString()}자 추출
                    {crawlData.images?.length > 0 && (
                      <span style={{ marginLeft: 6, color: 'var(--lime)', fontWeight: 700 }}>
                        🖼 사진 {crawlData.images.length}장
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className="btn"
                  style={{ fontSize: 11, padding: '7px 14px', fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}
                  onClick={() => { generateFromCrawl(); setCrawlOpen(false) }}
                  disabled={isLoading}
                >
                  {isLoading
                    ? <><span className="spin" style={{ width: 10, height: 10, borderWidth: 1.5, display: 'inline-block', marginRight: 4 }} />생성 중</>
                    : '카드뉴스로 만들기'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 상단 상태 바 */}
      {(hasContext || status !== 'idle') && bar && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 14px', borderBottom: '1px solid var(--b1)',
          background: 'var(--s1)', flexShrink: 0, gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isLoading && <div className="spin" style={{ width: 12, height: 12, borderWidth: 2 }} />}
            <span style={{ fontSize: 11, color: bar.color, fontWeight: 600 }}>{bar.label}</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {status === 'done' && (
              <button className="btn-g" style={{ fontSize: 10, padding: '4px 10px' }} onClick={fetchAndGenerate}>
                ↻ 재생성
              </button>
            )}
            <button className="btn-g" style={{ fontSize: 10, padding: '4px 10px' }} onClick={() => router.push('/trend')}>
              ← 트렌드서치
            </button>
          </div>
        </div>
      )}

      {/* 메인 영역: iframe + 우측 한국어 번역 패널 */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* 카드뉴스 메이커 iframe */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

          {/* iframe 영역 (이미지 피커 오버레이 포함) */}
          <div style={{ flex: 1, position: 'relative' }}>
          <iframe
            ref={iframeRef}
            src={`/cardmaker.html${hashStr ? '#' + hashStr : ''}`}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            allow="clipboard-write"
          />

          {/* 로딩 오버레이 */}
          {isLoading && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(9,9,18,.82)', backdropFilter: 'blur(6px)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
              <div className="spin" style={{ width: 26, height: 26, borderWidth: 3 }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx1)' }}>
                {status === 'fetching' ? 'YouTube · 뉴스 데이터 수집 중' : 'AI 슬라이드 생성 중'}
              </div>
              <ProgressNodes status={status} isCrawl={!!crawlData} hasVideoId={!!videoId} />
            </div>
          )}
          {/* 이미지 피커 오버레이 — iframe 위, 하단 슬라이드인 형태 */}
          {imagePicker.idx !== -1 && (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
              background: 'rgba(9,9,18,.95)', backdropFilter: 'blur(8px)',
              borderTop: '1px solid rgba(190,242,100,.25)',
              padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--lime)' }}>
                  🖼 공식 채널 이미지
                  {ragData?.video?.channelTitle && (
                    <span style={{ fontWeight: 400, color: 'var(--tx3)', marginLeft: 6 }}>
                      · {ragData.video.channelTitle}
                    </span>
                  )}
                </span>
                <button
                  onClick={() => setImagePicker({ idx: -1, loading: false, images: [] })}
                  style={{ background: 'none', border: 'none', color: 'var(--tx3)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
                >×</button>
              </div>

              {imagePicker.loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--tx3)', fontSize: 11 }}>
                  <div className="spin" style={{ width: 12, height: 12, borderWidth: 2 }} />
                  공식 채널에서 이미지 불러오는 중...
                </div>
              )}

              {!imagePicker.loading && imagePicker.images.length === 0 && (
                <div style={{ fontSize: 11, color: 'var(--tx3)' }}>이미지를 불러올 수 없습니다.</div>
              )}

              {!imagePicker.loading && imagePicker.images.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
                  {imagePicker.images.map((img, k) => (
                    <button
                      key={k}
                      onClick={() => selectPickerImage(imagePicker.idx, img.url)}
                      title={img.title}
                      style={{
                        padding: 0, cursor: 'pointer', borderRadius: 6,
                        border: '2px solid transparent',
                        overflow: 'hidden', aspectRatio: '16/9',
                        transition: 'border-color .15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--lime)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                    >
                      <img
                        src={img.url} alt={img.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          </div>{/* /iframe 영역 */}
        </div>{/* /iframe flex column */}

        {/* 우측 한국어 번역 패널 */}
        {koSlides.length > 0 && (
          <div style={{
            width: 240, flexShrink: 0,
            borderLeft: '1px solid var(--b1)',
            overflowY: 'auto',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              padding: '10px 14px', borderBottom: '1px solid var(--b1)',
              fontSize: 10, fontWeight: 700, color: 'var(--tx3)', letterSpacing: '.08em', flexShrink: 0,
            }}>
              🇰🇷 한국어 번역
            </div>
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {koSlides.map((s, i) => (
                <div key={i} style={{
                  background: 'var(--s1)', border: '1px solid var(--b1)',
                  borderRadius: 'var(--r-sm)', padding: '9px 11px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--lime)', letterSpacing: '.05em' }}>
                      {ROLE_LABEL[s.role] || s.role} {i + 1}
                    </div>
                    <button
                      onClick={() => refreshSlideKo(i)}
                      disabled={refreshingIdx !== -1}
                      title="이 슬라이드 재번역"
                      style={{
                        background: 'none', border: 'none', cursor: refreshingIdx !== -1 ? 'default' : 'pointer',
                        padding: 2, color: 'var(--tx3)', opacity: refreshingIdx === i ? 1 : 0.5,
                        display: 'flex', alignItems: 'center',
                      }}
                    >
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none"
                        style={{ animation: refreshingIdx === i ? 'spin 0.8s linear infinite' : 'none' }}>
                        <path d="M10 6A4 4 0 1 1 6 2a4 4 0 0 1 2.83 1.17L10 2v4H6l1.5-1.5A2.5 2.5 0 1 0 8.5 6"
                          stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx1)', lineHeight: 1.4, marginBottom: s.bodyKo || s.subtitleKo ? 4 : 0 }}>
                    {s.titleKo || s.title || ''}
                  </div>
                  {(s.subtitleKo || s.subtitle) && (
                    <div style={{ fontSize: 10, color: 'var(--tx2)', lineHeight: 1.5 }}>
                      {s.subtitleKo || s.subtitle}
                    </div>
                  )}
                  {(s.bodyKo || s.body) && (
                    <div style={{ fontSize: 10, color: 'var(--tx2)', lineHeight: 1.5 }}>
                      {s.bodyKo || s.body}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CardPage() {
  return (
    <Suspense fallback={<div className="loading"><div className="spin" /></div>}>
      <CardInner />
    </Suspense>
  )
}
