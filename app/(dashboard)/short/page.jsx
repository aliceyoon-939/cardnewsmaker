'use client'
import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ── 준비중 페이지 ────────────────────────────────────────────────
export default function ShortPage() {
  const router = useRouter()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
      <div style={{ fontSize: 32 }}>🚧</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx1)' }}>숏폼 기능 준비 중</div>
      <div style={{ fontSize: 12, color: 'var(--tx3)' }}>2차 스펙에서 오픈 예정입니다</div>
      <button className="btn-g" style={{ fontSize: 11, padding: '7px 16px', marginTop: 8 }} onClick={() => router.push('/trend')}>
        트렌드서치로 돌아가기
      </button>
    </div>
  )
}

// ── 원본 컴포넌트 (비활성화) ─────────────────────────────────────
function _OriginalShortPage() {
import { useSave } from '@/contexts/SaveContext'
import { parseDuration, SUB_FONTS, drawScene, imgLoad } from '@/lib/canvasUtils'
import { exportVideo as runExportVideo } from '@/lib/videoExport'

// ── 전환 효과 목록 (UI용 메타데이터) ────────────────────────────
const TRANSITIONS = [
  { id: 'cut',      label: '컷',    symbol: '✂',  desc: '즉시 전환 (하드컷)' },
  { id: 'fade',     label: '페이드', symbol: '◐',  desc: '암전 후 전환' },
  { id: 'dissolve', label: '디졸브', symbol: '⬡',  desc: '크로스 디졸브' },
  { id: 'slide',    label: '밀기',   symbol: '→',  desc: '슬라이드 푸시' },
  { id: 'zoom',     label: '줌',    symbol: '⊕',  desc: '줌인 → 줌아웃' },
  { id: 'glitch',   label: '글리치', symbol: '⌇',  desc: '디지털 글리치' },
]

// ── ElevenLabs 보이스 프리셋 ─────────────────────────────────────
const VOICES = [
  { id: '',                        label: '직접 입력' },
  { id: 'cgSgspJ2msm6clMCkdW9',  label: 'Jessica (다국어 여성)' },
  { id: 'onwK4e9ZLuTAKqWW03F9',  label: 'Daniel (다국어 남성)' },
  { id: 'XB0fDUnXU5powFXDhCwa',  label: 'Charlotte (다국어 여성)' },
  { id: 'nPczCjzI2devNBz1zQrb',  label: 'Brian (다국어 남성)' },
]

// ────────────────────────────────────────────────────────────────
function ShortInner() {
  const router = useRouter()
  const params = useSearchParams()
  const { registerPending } = useSave()

  // URL params (트렌드서치 → 자동 실행 경로)
  const pArtist   = params.get('artist')   || ''
  const pTopic    = params.get('topic')    || ''
  const pHook     = params.get('hook')     || ''
  const pReason   = params.get('reason')   || ''
  const pKeywords = params.get('keywords') || ''
  const pVideoId  = params.get('videoId')  || ''

  const fromTrend = !!(pArtist && pTopic)

  // 입력 모드
  const [inputMode, setInputMode] = useState('direct') // 'direct' | 'url'

  // 직접 입력 폼
  const [fArtist, setFArtist] = useState('')
  const [fTopic,  setFTopic]  = useState('')

  // URL 입력 폼
  const [fUrl,       setFUrl]       = useState('')
  const [urlLoading, setUrlLoading] = useState(false)

  // 실제 사용 값 (URL 우선)
  const [effArtist,   setEffArtist]   = useState(pArtist)
  const [effTopic,    setEffTopic]    = useState(pTopic)
  const [effHook,     setEffHook]     = useState(pHook)
  const [effReason,   setEffReason]   = useState(pReason)
  const [effKeywords, setEffKeywords] = useState(pKeywords)
  const [effVideoId,  setEffVideoId]  = useState(pVideoId)

  // 스크립트 상태
  const [ragData,          setRagData]          = useState(null)
  const [ragLoading,       setRagLoading]       = useState(false)
  const [result,           setResult]           = useState(null)
  const [loading,          setLoading]          = useState(false)
  const [error,            setError]            = useState('')
  const [view,             setView]             = useState('script') // 'script' | 'tts'
  const [source,           setSource]           = useState('')
  const [refreshingScene,  setRefreshingScene]  = useState(-1)
  const [sceneImages,      setSceneImages]      = useState([])
  const [sceneTransitions, setSceneTransitions] = useState([])
  const [dragOver,         setDragOver]         = useState(null)
  // 이미지 피커 상태 (씬별 이미지 검색)
  const [imagePicker, setImagePicker] = useState({ idx: -1, loading: false, images: [] })

  const dragSrcRef       = useRef(-1)
  const exportCancel     = useRef(false)
  const previewCanvasRef = useRef(null)
  const translateAbortRef = useRef({})   // { [sceneIdx]: AbortController }

  // 생성 단계 (0=idle 1=YT검색 2=RAG수집 3=AI생성)
  const [genStep, setGenStep] = useState(0)

  // 자동번역 로딩 (씬 인덱스, -1=없음)
  const [translating, setTranslating] = useState(-1)

  // 씬 미리보기 패널
  const [previewIdx,  setPreviewIdx]  = useState(null)
  const [previewLang, setPreviewLang] = useState('vi')

  // 영상 내보내기 상태
  const [exportingVideo,    setExportingVideo]    = useState(false)
  const [exportProgress,    setExportProgress]    = useState(0)
  const [exportLang,        setExportLang]        = useState('vi')
  const [exportSettingsOpen, setExportSettingsOpen] = useState(false)

  // 자막 스타일
  const [subFontSize,   setSubFontSize]   = useState('md')
  const [subColor,      setSubColor]      = useState('#ffffff')
  const [subFontFamily, setSubFontFamily] = useState('sans-serif')
  const [subBold,       setSubBold]       = useState(true)
  const [subShadow,     setSubShadow]     = useState(true)

  // TTS 설정
  const [ttsLang,       setTtsLang]       = useState('vi')
  const [ttsVoiceId,    setTtsVoiceId]    = useState('')
  const [ttsModel,      setTtsModel]      = useState('eleven_multilingual_v2')
  const [ttsStability,  setTtsStability]  = useState(0.5)
  const [ttsSimilarity, setTtsSimilarity] = useState(0.75)
  const [ttsStyle,      setTtsStyle]      = useState(0.0)
  const [ttsSpeed,      setTtsSpeed]      = useState(1.0)

  // 트렌드서치에서 넘어온 경우 자동 실행
  useEffect(() => {
    if (fromTrend) fetchAndGenerate(pArtist, pTopic, pHook, pReason, pKeywords, pVideoId)
  }, [])

  // ── 데이터 수집 + 스크립트 생성 ─────────────────────────────
  async function fetchAndGenerate(artist, topic, hook, reason, keywords, videoId) {
    setRagLoading(true)
    setError('')
    setResult(null)
    setGenStep(1) // YouTube 검색

    let resolvedVideoId = videoId

    // videoId 없으면 YouTube에서 자동 검색
    if (!resolvedVideoId) {
      try {
        const sr = await fetch(`/api/search?q=${encodeURIComponent(`${artist} ${topic}`)}&artist=${encodeURIComponent(artist)}`)
        if (sr.ok) {
          const sd = await sr.json()
          resolvedVideoId = sd.items?.[0]?.videoId || ''
        }
      } catch {}
    }

    setGenStep(2) // 데이터 수집

    // RAG 수집
    let rag = { video: null, captions: null, news: [] }
    try {
      const url = resolvedVideoId
        ? `/api/rag?videoId=${encodeURIComponent(resolvedVideoId)}&artist=${encodeURIComponent(artist)}`
        : `/api/rag?artist=${encodeURIComponent(artist)}`
      const r = await fetch(url)
      if (r.ok) rag = await r.json()
    } catch {}

    setRagData(rag)
    setRagLoading(false)
    await generate(rag, artist, topic, hook, reason, keywords, resolvedVideoId)
  }

  async function generate(rag, artist, topic, hook, reason, keywords, videoId) {
    const a  = artist   ?? effArtist
    const t  = topic    ?? effTopic
    const h  = hook     ?? effHook
    const re = reason   ?? effReason
    const kw = keywords ?? effKeywords
    const vi = videoId  ?? effVideoId
    const r  = rag      ?? ragData

    setGenStep(3) // AI 생성
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'short', ...r, artist: a, topic: t, hook: h, reason: re, keywords: kw }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // 씬에 stable ID 부여 (drag/delete 시 key 안정화)
      const uid = () => Math.random().toString(36).slice(2, 9)
      const resultWithIds = {
        ...data.result,
        scenes: (data.result.scenes || []).map(s => ({ _id: uid(), ...s })),
      }
      setResult(resultWithIds)
      setPreviewIdx(null)

      // 씬별 이미지 배정 — 항상 리셋 (재생성 시 이전 이미지 잔류 방지)
      const thumbs = r?.thumbnails?.length ? r.thumbnails : (r?.thumbnail ? [r.thumbnail] : [])
      setSceneImages(
        resultWithIds.scenes.map((_, i) =>
          thumbs.length ? thumbs[i % thumbs.length] : ''
        )
      )
      // 씬 전환 초기화 (기본 'fade')
      setSceneTransitions(Array(Math.max(0, (resultWithIds.scenes?.length || 0) - 1)).fill('fade'))

      setSource(prev => prev || (r?.video?.channelTitle ? `Ảnh - YOUTUBE ${r.video.channelTitle}` : ''))
      setEffArtist(a); setEffTopic(t)
      setEffHook(h); setEffReason(re); setEffKeywords(kw); setEffVideoId(vi)
      registerPending({
        type: 'short',
        artist: a, topic: t,
        result: resultWithIds,        // _id 포함된 버전으로 저장
        params: { artist: a, topic: t, hook: h, reason: re, keywords: kw, videoId: vi },
      })
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
    setGenStep(0)
  }

  function handleFormSubmit(e) {
    e.preventDefault()
    if (!fArtist.trim() || !fTopic.trim()) return
    fetchAndGenerate(fArtist.trim(), fTopic.trim(), '', '', '', '')
  }

  async function handleUrlSubmit(e) {
    e.preventDefault()
    if (!fUrl.trim()) return
    setUrlLoading(true)
    setError('')
    setResult(null)
    try {
      const crawlRes = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fUrl.trim() }),
      })
      const crawlData = await crawlRes.json()
      if (crawlData.error) throw new Error(crawlData.error)

      setGenStep(3)
      setLoading(true)
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'short',
          artist: '',
          topic: crawlData.title,
          hook: '', reason: '', keywords: '',
          articleText: crawlData.text,
          articleSite: crawlData.site,
          articleUrl:  crawlData.url,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const uid = () => Math.random().toString(36).slice(2, 9)
      const resultWithIds = {
        ...data.result,
        scenes: (data.result.scenes || []).map(s => ({ _id: uid(), ...s })),
      }
      setResult(resultWithIds)
      setPreviewIdx(null)

      const articleImages = crawlData.images?.length ? crawlData.images : (crawlData.image ? [crawlData.image] : [])
      setSceneImages(resultWithIds.scenes.map((_, i) => articleImages[i % articleImages.length] || ''))
      setSceneTransitions(Array(Math.max(0, (resultWithIds.scenes?.length || 0) - 1)).fill('fade'))
      setSource(crawlData.site ? `출처: ${crawlData.site}` : '')
      setEffArtist(''); setEffTopic(crawlData.title)
      setEffHook(''); setEffReason(''); setEffKeywords(''); setEffVideoId('')
      registerPending({
        type: 'short',
        artist: '', topic: crawlData.title,
        result: resultWithIds,
        params: { artist: '', topic: crawlData.title, hook: '', reason: '', keywords: '', videoId: '' },
      })
    } catch (err) {
      setError(err.message)
    }
    setUrlLoading(false)
    setLoading(false)
    setGenStep(0)
  }

  // ── 씬 조작 ─────────────────────────────────────────────────
  function moveScene(from, to) {
    const move = arr => {
      const next = [...arr]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    }
    setResult(prev => ({ ...prev, scenes: move(prev.scenes) }))
    setSceneImages(move)
    setSceneTransitions(move)
    // previewIdx가 이동된 씬을 계속 따라가도록 보정
    setPreviewIdx(prev => {
      if (prev === null) return null
      if (prev === from) return to                              // 이동된 씬 자체
      if (from < to && prev > from && prev <= to) return prev - 1  // 앞→뒤 이동: 중간 씬 당기기
      if (from > to && prev >= to && prev < from) return prev + 1  // 뒤→앞 이동: 중간 씬 밀기
      return prev
    })
  }

  function deleteScene(i) {
    setResult(prev => ({ ...prev, scenes: prev.scenes.filter((_, idx) => idx !== i) }))
    setSceneImages(prev => prev.filter((_, idx) => idx !== i))
    setSceneTransitions(prev => {
      if (prev.length === 0) return prev
      const removeIdx = i < prev.length ? i : prev.length - 1
      return prev.filter((_, j) => j !== removeIdx)
    })
    if (refreshingScene === i) setRefreshingScene(-1)
    // previewIdx 범위 보정
    setPreviewIdx(prev =>
      prev === null ? null
      : prev === i   ? null          // 삭제된 씬을 보고 있었으면 닫기
      : prev > i     ? prev - 1      // 삭제된 씬 뒤였으면 인덱스 당기기
      : prev                         // 그 외 그대로
    )
  }

  function addScene(afterIdx) {
    const uid = Math.random().toString(36).slice(2, 9)
    const newScene = { _id: uid, time: '새 씬', duration: 10, ko: '', vi: '', visual: '', imageKeyword: '' }
    setResult(prev => {
      const scenes = [...prev.scenes]
      scenes.splice(afterIdx + 1, 0, newScene)
      return { ...prev, scenes }
    })
    setSceneImages(prev => { const next = [...prev]; next.splice(afterIdx + 1, 0, ''); return next })
    setSceneTransitions(prev => { const next = [...prev]; next.splice(afterIdx, 0, 'fade'); return next })
  }

  async function refreshScene(i) {
    if (!result?.scenes || refreshingScene !== -1) return
    setRefreshingScene(i)
    const { scenes } = result
    const cur  = scenes[i]
    const prev = scenes[i - 1]
    const next = scenes[i + 1]

    const context = [
      effArtist && `아티스트: ${effArtist}`,
      effTopic  && `주제: ${effTopic}`,
    ].filter(Boolean).join('\n')

    const adjacentInfo = [
      prev && `이전 씬(${prev.time}): ${prev.ko}`,
      next && `다음 씬(${next.time}): ${next.ko}`,
    ].filter(Boolean).join('\n')

    const prompt = `케이팝 숏폼 에디터로서 아래 씬 하나만 새롭게 작성해줘.

${context}
${adjacentInfo ? `\n인접 씬 (흐름 유지):\n${adjacentInfo}` : ''}

재작성할 씬: ${cur.time}
현재 내용(이것과 다르게 써줘):
한국어: ${cur.ko}
베트남어: ${cur.vi}
화면: ${cur.visual}

[작성 규칙]
- 팬 친화적 문체 (~요, ~네요, ~잖아요), 이모지 금지
- 베트남어는 팬 to 팬 톤 (các bạn, thật sự 등)
- 현재 내용과 확실히 다른 각도로
- 인접 씬과 자연스럽게 이어지게

JSON만 반환 (코드블록 없이):
{"time":"${cur.time}","ko":"한국어 나레이션","vi":"베트남어 나레이션","visual":"화면 설명"}`

    try {
      const res  = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      const raw  = (data.text || '').replace(/```json|```/g, '').trim()
      const newScene = JSON.parse(raw)
      setResult(prev => ({
        ...prev,
        scenes: prev.scenes.map((s, idx) => idx === i ? { ...s, ...newScene } : s),
      }))
    } catch {}
    setRefreshingScene(-1)
  }

  // ── 한국어 수정 → 베트남어 자동 번역 ────────────────────────
  async function translateScene(i, koText) {
    if (!koText.trim()) return

    // 이전 요청 취소 (race condition 방지)
    translateAbortRef.current[i]?.abort()
    const ctrl = new AbortController()
    translateAbortRef.current[i] = ctrl

    setTranslating(i)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ko: koText, artist: effArtist }),
        signal: ctrl.signal,
      })
      const data = await res.json()
      if (data.vi) {
        setResult(prev => ({
          ...prev,
          scenes: prev.scenes.map((sc, j) => j === i ? { ...sc, vi: data.vi } : sc),
        }))
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.error('[translate]', e)
    } finally {
      if (translateAbortRef.current[i] === ctrl) {
        delete translateAbortRef.current[i]
        setTranslating(prev => prev === i ? -1 : prev)
      }
    }
  }

  // ── 씬 미리보기 캔버스 렌더링 ────────────────────────────────
  useEffect(() => {
    if (previewIdx === null || !result?.scenes) return
    const canvas = previewCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    const scene = result.scenes[previewIdx]
    if (!scene) return
    const opts = { fontSize: subFontSize, color: subColor, fontFamily: subFontFamily, bold: subBold, shadow: subShadow }
    const url  = sceneImages[previewIdx]
    if (url) {
      imgLoad(url).then(img => {
        if (!previewCanvasRef.current) return
        drawScene(ctx, 200, 356, img, scene, 0.5, previewLang, opts)
      })
    } else {
      drawScene(ctx, 200, 356, null, scene, 0.5, previewLang, opts)
    }
  }, [previewIdx, result, sceneImages, previewLang, subFontSize, subColor, subFontFamily, subBold, subShadow])

  // ── 씬 이미지 피커: 공식 채널 썸네일 ────────────────────────
  async function openImagePicker(i) {
    // 같은 씬을 다시 클릭하면 닫기
    if (imagePicker.idx === i) {
      setImagePicker({ idx: -1, loading: false, images: [] })
      return
    }
    setImagePicker({ idx: i, loading: true, images: [] })
    try {
      const chId = ragData?.video?.channelId || ''
      const url = chId
        ? `/api/images?channelId=${encodeURIComponent(chId)}&artist=${encodeURIComponent(effArtist)}&count=12`
        : `/api/images?artist=${encodeURIComponent(effArtist)}&videoId=${encodeURIComponent(effVideoId)}&count=12`
      const res = await fetch(url)
      const data = await res.json()
      setImagePicker({ idx: i, loading: false, images: data.images || [] })
    } catch {
      setImagePicker({ idx: i, loading: false, images: [] })
    }
  }

  function selectPickerImage(i, url) {
    setSceneImages(prev => prev.map((img, j) => j === i ? url : img))
    setImagePicker({ idx: -1, loading: false, images: [] })
  }

  // ── 영상 내보내기 (lib/videoExport.js 호출) ──────────────────
  async function handleExportVideo() {
    if (!result?.scenes?.length || exportingVideo) return
    exportCancel.current = false
    setExportSettingsOpen(false)
    setExportingVideo(true)
    setExportProgress(0)

    try {
      await runExportVideo({
        scenes:           result.scenes,
        sceneImages,
        sceneTransitions,
        lang:             exportLang,
        subtitleOpts: {
          fontSize:   subFontSize,
          color:      subColor,
          fontFamily: subFontFamily,
          bold:       subBold,
          shadow:     subShadow,
        },
        artist:     effArtist,
        topic:      effTopic,
        onProgress: p => setExportProgress(p),
        cancelRef:  exportCancel,
      })
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setTimeout(() => { setExportingVideo(false); setExportProgress(0) }, 800)
    }
  }

  // ── 전체 복사 ────────────────────────────────────────────────
  const copyAll = () => {
    if (!result) return
    const txLabel = { cut: '컷', fade: '페이드', dissolve: '디졸브', slide: '밀기', zoom: '줌', glitch: '글리치' }
    const scenesText = result.scenes.flatMap((s, i) => {
      const lines = [`🇰🇷 ${s.ko}`, `🇻🇳 ${s.vi}`, `📷 ${s.visual}`]
      const tx = sceneTransitions[i]
      if (tx && i < result.scenes.length - 1) lines.push(`↓ [${txLabel[tx] || tx}] 전환`)
      return [...lines, '']
    })
    navigator.clipboard.writeText([
      `[후킹] ${result.hook}`, '',
      ...scenesText,
      `[CTA] ${result.cta}`, '',
      result.hashtags?.join(' '), '',
      result.sources?.length ? `출처: ${result.sources.join(' / ')}` : '',
      source ? `이미지 출처: ${source}` : '',
    ].filter(l => l !== undefined).join('\n'))
  }

  const hasResult = !!(result && !loading)
  const isRunning = ragLoading || loading

  // ════════════════════════════════════════════════════════════
  // JSX
  // ════════════════════════════════════════════════════════════
  return (
    <>
      {/* ── 자막 설정 모달 ──────────────────────────────────── */}
      {exportSettingsOpen && !exportingVideo && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
          onClick={e => { if (e.target === e.currentTarget) setExportSettingsOpen(false) }}
        >
          <div style={{
            background: 'var(--s2)', border: '1px solid var(--b1)',
            borderRadius: 16, padding: '28px 32px', width: 420,
            display: 'flex', flexDirection: 'column', gap: 22,
            boxShadow: '0 24px 80px rgba(0,0,0,.6)',
          }}>
            {/* 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx1)' }}>🎬 영상 내보내기 설정</div>
                <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 3 }}>720×1280 · 30fps · WebM</div>
              </div>
              <button onClick={() => setExportSettingsOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--tx3)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            {/* 자막 언어 */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', letterSpacing: '.06em', marginBottom: 8 }}>자막 언어</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['vi', '🇻🇳 베트남어'], ['ko', '🇰🇷 한국어']].map(([v, label]) => (
                  <button key={v} onClick={() => setExportLang(v)} style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
                    border: `1.5px solid ${exportLang === v ? 'var(--lime)' : 'var(--b1)'}`,
                    background: exportLang === v ? 'rgba(190,242,100,.1)' : 'var(--s1)',
                    color: exportLang === v ? 'var(--lime)' : 'var(--tx2)',
                    fontSize: 12, fontWeight: exportLang === v ? 700 : 400,
                  }}>{label}</button>
                ))}
              </div>
            </div>

            {/* 폰트 */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', letterSpacing: '.06em', marginBottom: 8 }}>폰트</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {SUB_FONTS.map(f => (
                  <button key={f.id} onClick={() => setSubFontFamily(f.id)} style={{
                    padding: '8px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                    border: `1.5px solid ${subFontFamily === f.id ? 'var(--lime)' : 'var(--b1)'}`,
                    background: subFontFamily === f.id ? 'rgba(190,242,100,.1)' : 'var(--s1)',
                    color: subFontFamily === f.id ? 'var(--lime)' : 'var(--tx2)',
                    fontFamily: f.id, fontSize: 13,
                  }}>
                    {f.label}
                    <span style={{ fontSize: 11, opacity: .5, marginLeft: 8, fontFamily: 'sans-serif' }}>가나다 Aa Bb</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 크기 + 스타일 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', letterSpacing: '.06em', marginBottom: 8 }}>자막 크기</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[['sm', 'S'], ['md', 'M'], ['lg', 'L'], ['xl', 'XL']].map(([v, label]) => (
                    <button key={v} onClick={() => setSubFontSize(v)} style={{
                      flex: 1, padding: '7px 0', borderRadius: 6, cursor: 'pointer',
                      border: `1.5px solid ${subFontSize === v ? 'var(--lime)' : 'var(--b1)'}`,
                      background: subFontSize === v ? 'rgba(190,242,100,.1)' : 'var(--s1)',
                      color: subFontSize === v ? 'var(--lime)' : 'var(--tx2)',
                      fontSize: 11, fontWeight: 700,
                    }}>{label}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', letterSpacing: '.06em', marginBottom: 8 }}>스타일</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[
                    ['bold',   subBold,   () => setSubBold(b => !b),   'Bold'],
                    ['shadow', subShadow, () => setSubShadow(s => !s), '그림자'],
                  ].map(([key, active, toggle, label]) => (
                    <button key={key} onClick={toggle} style={{
                      flex: 1, padding: '7px 0', borderRadius: 6, cursor: 'pointer',
                      border: `1.5px solid ${active ? 'var(--lime)' : 'var(--b1)'}`,
                      background: active ? 'rgba(190,242,100,.1)' : 'var(--s1)',
                      color: active ? 'var(--lime)' : 'var(--tx2)',
                      fontSize: 11, fontWeight: active ? 700 : 400,
                    }}>{label}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* 색상 */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', letterSpacing: '.06em', marginBottom: 8 }}>자막 색상</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {['#ffffff', '#BEFF4B', '#FACC15', '#F9A8D4', '#93C5FD', '#000000'].map(c => (
                  <button key={c} onClick={() => setSubColor(c)} style={{
                    width: 30, height: 30, borderRadius: '50%', cursor: 'pointer',
                    background: c,
                    border: subColor === c ? '3px solid var(--lime)' : '2px solid var(--b1)',
                    outline: subColor === c ? '2px solid rgba(190,242,100,.4)' : 'none',
                    flexShrink: 0,
                  }} />
                ))}
                <div style={{ flex: 1 }} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--tx3)', cursor: 'pointer' }}>
                  직접 입력
                  <input type="color" value={subColor} onChange={e => setSubColor(e.target.value)}
                    style={{ width: 30, height: 30, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'none', padding: 0 }} />
                </label>
              </div>
            </div>

            {/* 미리보기 */}
            <div style={{
              background: '#111', borderRadius: 10, padding: '18px',
              textAlign: 'center', minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontFamily: subFontFamily, fontWeight: subBold ? 700 : 400,
                fontSize: ({ sm: 14, md: 18, lg: 22, xl: 26 }[subFontSize] || 18),
                color: subColor,
                textShadow: subShadow ? '0 2px 8px rgba(0,0,0,0.9)' : 'none',
              }}>
                {exportLang === 'vi' ? 'Các bạn có ngờ được không?' : '여러분 이거 알고 계셨나요?'}
              </span>
            </div>

            {/* 렌더링 시작 */}
            <button onClick={handleExportVideo} style={{
              padding: '13px 0', borderRadius: 10, cursor: 'pointer',
              background: 'var(--lime)', border: 'none',
              color: '#000', fontSize: 14, fontWeight: 800,
            }}>
              🎬 렌더링 시작
            </button>
          </div>
        </div>
      )}

      {/* ── 영상 내보내기 진행 오버레이 ─────────────────────── */}
      {exportingVideo && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,.80)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--s2)', border: '1px solid var(--b1)',
            borderRadius: 16, padding: '32px 36px', width: 360,
            display: 'flex', flexDirection: 'column', gap: 20,
            boxShadow: '0 24px 80px rgba(0,0,0,.6)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 28, lineHeight: 1 }}>🎬</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx1)' }}>영상 렌더링 중</div>
                <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 3 }}>
                  {exportLang === 'vi' ? '🇻🇳 베트남어' : '🇰🇷 한국어'} 자막 · 720×1280 · 30fps
                </div>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--tx3)' }}>
                  {exportProgress < 100 ? '씬 렌더링 + 전환 효과 적용...' : '완료! 다운로드 중...'}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--lime)' }}>{exportProgress}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--s1)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3, width: `${exportProgress}%`,
                  background: 'linear-gradient(90deg, var(--lime), rgba(190,242,100,.6))',
                  transition: 'width .3s ease',
                }} />
              </div>
            </div>
            <div style={{
              fontSize: 10, color: 'var(--tx3)', lineHeight: 1.7,
              background: 'var(--s1)', borderRadius: 8, padding: '10px 14px',
            }}>
              실시간 렌더링 중입니다. 탭을 전환하거나 창을 최소화하면 속도가 느려질 수 있어요.<br />
              완료 후 <strong>.webm</strong> 파일이 자동 다운로드됩니다 — CapCut, DaVinci Resolve에서 바로 열 수 있습니다.
            </div>
            <button
              onClick={() => { exportCancel.current = true }}
              style={{
                fontSize: 12, padding: '8px 0', background: 'none',
                border: '1px solid var(--b1)', borderRadius: 8,
                color: 'var(--tx3)', cursor: 'pointer',
              }}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* ── 씬 미리보기 패널 (fixed, 우하단) ───────────────── */}
      {previewIdx !== null && result?.scenes?.[previewIdx] && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9990,
          background: 'var(--s2)', border: '1px solid var(--b1)',
          borderRadius: 16, padding: '14px',
          boxShadow: '0 20px 60px rgba(0,0,0,.7)',
          display: 'flex', flexDirection: 'column', gap: 10,
          width: 232,
        }}>
          {/* 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx2)' }}>
              씬 {previewIdx + 1}
              <span style={{ fontWeight: 400, color: 'var(--tx3)', marginLeft: 4 }}>
                / {result.scenes.length} · {result.scenes[previewIdx].time}
              </span>
            </div>
            <button onClick={() => setPreviewIdx(null)}
              style={{ background: 'none', border: 'none', color: 'var(--tx3)', fontSize: 16, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>×</button>
          </div>

          {/* 캔버스 */}
          <div style={{ borderRadius: 10, overflow: 'hidden', background: '#0a0a12', flexShrink: 0 }}>
            <canvas ref={previewCanvasRef} width={200} height={356}
              style={{ display: 'block', width: 200, height: 356 }} />
          </div>

          {/* 언어 토글 */}
          <div style={{ display: 'flex', gap: 4 }}>
            {[['vi','🇻🇳 베트남어'],['ko','🇰🇷 한국어']].map(([v, label]) => (
              <button key={v} onClick={() => setPreviewLang(v)} style={{
                flex: 1, padding: '5px 0', borderRadius: 6, cursor: 'pointer',
                fontSize: 10, fontWeight: previewLang === v ? 700 : 400,
                border: `1px solid ${previewLang === v ? 'rgba(190,242,100,.5)' : 'var(--b1)'}`,
                background: previewLang === v ? 'rgba(190,242,100,.1)' : 'transparent',
                color: previewLang === v ? 'var(--lime)' : 'var(--tx3)',
                transition: 'all .15s',
              }}>{label}</button>
            ))}
          </div>

          {/* 이전/다음 */}
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => setPreviewIdx(i => Math.max(0, i - 1))}
              disabled={previewIdx === 0}
              style={{
                flex: 1, padding: '5px 0', borderRadius: 6, cursor: previewIdx === 0 ? 'default' : 'pointer',
                fontSize: 11, border: '1px solid var(--b1)', background: 'none',
                color: previewIdx === 0 ? 'var(--b1)' : 'var(--tx2)', transition: 'color .15s',
              }}>← 이전</button>
            <button
              onClick={() => setPreviewIdx(i => Math.min(result.scenes.length - 1, i + 1))}
              disabled={previewIdx === result.scenes.length - 1}
              style={{
                flex: 1, padding: '5px 0', borderRadius: 6,
                cursor: previewIdx === result.scenes.length - 1 ? 'default' : 'pointer',
                fontSize: 11, border: '1px solid var(--b1)', background: 'none',
                color: previewIdx === result.scenes.length - 1 ? 'var(--b1)' : 'var(--tx2)', transition: 'color .15s',
              }}>다음 →</button>
          </div>
        </div>
      )}

      {/* ── 헤더 행 ─────────────────────────────────────────── */}
      <div className="top-row">
        <div>
          <div className="sec-title">숏폼 스크립트</div>
          <div className="sec-sub" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {effArtist ? (
              <>
                <span style={{ color: 'var(--tx2)' }}>{effArtist}</span>
                <span style={{ color: 'var(--tx3)' }}>·</span>
                <span style={{ color: 'var(--tx2)', fontSize: 11 }}>{effTopic}</span>
              </>
            ) : (
              <span>아티스트와 주제를 입력해 스크립트를 생성하세요</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {fromTrend && (
            <button className="btn-g" style={{ fontSize: 10, padding: '4px 10px' }} onClick={() => router.push('/trend')}>
              ← 트렌드서치
            </button>
          )}
          {hasResult && (
            <>
              {view === 'script' && (
                <>
                  <button className="btn-g" style={{ fontSize: 11, padding: '6px 12px' }} onClick={copyAll}>
                    📋 전체 복사
                  </button>
                  <button className="btn-g" style={{ fontSize: 11, padding: '6px 12px' }}
                    onClick={() => generate(ragData, effArtist, effTopic, effHook, effReason, effKeywords, effVideoId)}>
                    ↻ 재생성
                  </button>
                  {/* 영상 내보내기 컨트롤 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
                    {['vi', 'ko'].map(l => (
                      <button key={l} onClick={() => setExportLang(l)} style={{
                        fontSize: 10, padding: '6px 8px',
                        background: exportLang === l ? 'rgba(190,242,100,.15)' : 'transparent',
                        color: exportLang === l ? 'var(--lime)' : 'var(--tx3)',
                        border: 'none', borderRight: '1px solid var(--b1)',
                        cursor: 'pointer', fontWeight: exportLang === l ? 700 : 400,
                      }}>{l === 'vi' ? '🇻🇳' : '🇰🇷'}</button>
                    ))}
                    <button
                      onClick={() => setExportSettingsOpen(true)}
                      disabled={exportingVideo}
                      style={{
                        fontSize: 11, padding: '6px 12px', background: 'none', border: 'none',
                        color: exportingVideo ? 'var(--tx3)' : 'var(--lime)',
                        cursor: exportingVideo ? 'default' : 'pointer',
                        fontWeight: 700, whiteSpace: 'nowrap',
                      }}
                    >
                      🎬 영상 내보내기
                    </button>
                  </div>
                </>
              )}
              <button
                className="btn"
                style={{ fontSize: 11, padding: '6px 14px', fontWeight: 700 }}
                onClick={() => setView(v => v === 'tts' ? 'script' : 'tts')}
              >
                {view === 'tts' ? '← 스크립트' : '🎙️ TTS 설정 →'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── 입력 폼 ──────────────────────────────────────────── */}
      {!fromTrend && !isRunning && (
        <div style={{
          background: 'var(--s1)', border: '1px solid var(--b1)',
          borderRadius: 'var(--r)', padding: '18px 20px', marginBottom: 4,
        }}>
          {/* 탭 */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
            {[['direct', '🎬 직접 입력'], ['url', '🔗 기사 URL']].map(([mode, label]) => (
              <button key={mode} type="button" onClick={() => setInputMode(mode)} style={{
                padding: '5px 14px', fontSize: 12, fontWeight: 700,
                borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer',
                background: inputMode === mode ? 'var(--lime)' : 'var(--s2)',
                color: inputMode === mode ? '#000' : 'var(--tx2)',
              }}>{label}</button>
            ))}
          </div>

          {inputMode === 'direct' ? (
            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600 }}>아티스트 *</label>
                <input type="text" value={fArtist} onChange={e => setFArtist(e.target.value)}
                  placeholder="예: aespa, BTS, BLACKPINK" required
                  style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)', padding: '9px 12px', color: 'var(--tx1)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600 }}>영상 주제 *</label>
                <input type="text" value={fTopic} onChange={e => setFTopic(e.target.value)}
                  placeholder="예: aespa WDA 조회수 1억 돌파 비결, BTS 진 제대 후 첫 컴백" required
                  style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)', padding: '9px 12px', color: 'var(--tx1)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button type="submit" className="btn" style={{ fontSize: 13, padding: '9px 22px', fontWeight: 700 }}
                  disabled={!fArtist.trim() || !fTopic.trim()}>
                  🎬 스크립트 생성
                </button>
                <span style={{ fontSize: 11, color: 'var(--tx3)' }}>
                  또는 <button type="button" className="btn-g" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => router.push('/trend')}>트렌드서치</button>에서 주제 선택
                </span>
              </div>
            </form>
          ) : (
            <form onSubmit={handleUrlSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600 }}>기사 URL *</label>
                <input type="url" value={fUrl} onChange={e => setFUrl(e.target.value)}
                  placeholder="예: https://news.daum.net/..." required
                  style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)', padding: '9px 12px', color: 'var(--tx1)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <button type="submit" className="btn" style={{ fontSize: 13, padding: '9px 22px', fontWeight: 700, alignSelf: 'flex-start' }}
                disabled={!fUrl.trim() || urlLoading}>
                {urlLoading ? '기사 불러오는 중...' : '🔗 기사로 숏폼 생성'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ── RAG 소스 배지 ────────────────────────────────────── */}
      {(ragLoading || ragData) && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {ragLoading ? (
            <>
              {['YouTube 영상 수집 중...', '자막 확인 중...', '뉴스 검색 중...'].map(label => (
                <span key={label} style={{
                  fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 600,
                  background: 'rgba(255,255,255,.05)', color: 'var(--tx3)',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <span style={{
                    display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                    border: '1.5px solid var(--tx3)', borderTopColor: 'var(--lime)',
                    animation: 'spin .8s linear infinite', flexShrink: 0,
                  }} />
                  {label}
                </span>
              ))}
              <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 600, background: 'rgba(167,139,250,.12)', color: 'var(--purple)' }}>
                🔒 팩트 기반 생성 · 할루시네이션 방지
              </span>
            </>
          ) : (
            <>
              {[
                { ok: ragData.video,         ok_label: `✓ YouTube 영상 데이터 (${(ragData.video?.viewCount / 1e6).toFixed(1)}M뷰)`, fail_label: '○ YouTube 데이터 없음' },
                { ok: ragData.captions,      ok_label: `✓ 자막 확보 (${ragData.captions?.lang?.toUpperCase()})`,                   fail_label: '○ 자막 없음' },
                { ok: ragData.news?.length,  ok_label: `✓ 뉴스 ${ragData.news?.length}건`,                                          fail_label: '○ 뉴스 없음' },
              ].map(({ ok, ok_label, fail_label }) => (
                <span key={fail_label} style={{
                  fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 600,
                  background: ok ? 'rgba(190,242,100,.12)' : 'rgba(255,255,255,.05)',
                  color: ok ? 'var(--lime)' : 'var(--tx3)',
                }}>
                  {ok ? ok_label : fail_label}
                </span>
              ))}
              <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 600, background: 'rgba(167,139,250,.12)', color: 'var(--purple)' }}>
                🔒 팩트 기반 생성 · 할루시네이션 방지
              </span>
            </>
          )}
        </div>
      )}

      {/* ── 노드 파이프라인 로딩 UI ──────────────────────────── */}
      {isRunning && (() => {
        const GEN_NODES = [
          { step: 1, emoji: '🔍', label: 'YouTube\n검색',   sub: 'MV · 조회수 탐색' },
          { step: 2, emoji: '📊', label: '데이터\n수집',    sub: '자막 · 뉴스 수집' },
          { step: 3, emoji: '✍️', label: 'AI\n생성',        sub: 'Claude Sonnet' },
        ]
        return (
          <div style={{
            background: 'var(--s1)', border: '1px solid var(--b1)',
            borderRadius: 'var(--r)', padding: '36px 28px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32,
          }}>
            {/* 노드 행 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%', maxWidth: 420 }}>
              {GEN_NODES.map(({ step, emoji, label }, i) => {
                const isDone   = genStep > step
                const isActive = genStep === step
                const isPending = genStep < step
                return (
                  <React.Fragment key={step}>
                    {/* 노드 원 + 라벨 */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flex: 1 }}>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {/* 핑 링 (active일 때) */}
                        {isActive && (
                          <div style={{
                            position: 'absolute', inset: -8, borderRadius: '50%',
                            border: '2px solid var(--lime)',
                            animation: 'ping 1.4s ease-out infinite',
                            pointerEvents: 'none',
                          }} />
                        )}
                        {/* 원 */}
                        <div style={{
                          width: 58, height: 58, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: isDone
                            ? 'rgba(190,242,100,.18)'
                            : isActive
                            ? 'rgba(190,242,100,.08)'
                            : 'var(--s2)',
                          border: `2px solid ${isPending ? 'var(--b1)' : 'var(--lime)'}`,
                          transition: 'all .45s ease',
                          fontSize: 22,
                        }}>
                          {isDone
                            ? <span style={{ color: 'var(--lime)', fontSize: 22, fontWeight: 800, lineHeight: 1 }}>✓</span>
                            : <span style={{ lineHeight: 1 }}>{emoji}</span>
                          }
                        </div>
                      </div>
                      {/* 라벨 */}
                      <div style={{
                        fontSize: 11, fontWeight: isPending ? 400 : 700,
                        color: isPending ? 'var(--tx3)' : 'var(--lime)',
                        textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.5,
                        transition: 'color .45s',
                      }}>{label}</div>
                    </div>

                    {/* 연결선 (마지막 노드 제외) */}
                    {i < GEN_NODES.length - 1 && (
                      <div style={{
                        flex: 0, width: 48, height: 2,
                        marginTop: 28, flexShrink: 0, position: 'relative', overflow: 'hidden',
                        background: genStep > step ? 'var(--lime)' : 'var(--b1)',
                        transition: 'background .5s ease',
                        borderRadius: 2,
                      }}>
                        {/* 흐르는 빛 (다음 스텝 진행 중) */}
                        {genStep === step + 1 && (
                          <div style={{
                            position: 'absolute', top: 0, left: 0,
                            width: '60%', height: '100%',
                            background: 'linear-gradient(90deg, transparent, rgba(190,242,100,.9), transparent)',
                            animation: 'node-flow .9s ease-in-out infinite',
                          }} />
                        )}
                      </div>
                    )}
                  </React.Fragment>
                )
              })}
            </div>

            {/* 현재 단계 텍스트 */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx1)', marginBottom: 6 }}>
                {genStep === 1 ? 'YouTube 영상 검색 중...'
                  : genStep === 2 ? '자막 · 뉴스 데이터 수집 중...'
                  : 'AI 스크립트 생성 중...'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--tx3)' }}>
                {genStep === 1 ? '관련 MV · 영상을 자동 탐색하고 있어요'
                  : genStep === 2 ? '조회수 · 자막 · 최신 뉴스를 모으고 있어요'
                  : 'Claude Sonnet이 팩트 기반으로 작성 중이에요'}
              </div>
            </div>

            {/* 미니 스핀 + 단계 표시 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="spin" style={{ width: 14, height: 14, borderWidth: 2 }} />
              <span style={{ fontSize: 10, color: 'var(--tx3)', fontWeight: 600 }}>
                {genStep} / 3 단계
              </span>
            </div>
          </div>
        )
      })()}
      {error && (
        <div className="warn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>⚠️ {error}</span>
          <button className="btn-g" style={{ fontSize: 11, padding: '5px 12px' }}
            onClick={() => generate(ragData, effArtist, effTopic, effHook, effReason, effKeywords, effVideoId)}>
            ↻ 재시도
          </button>
        </div>
      )}

      {/* ── TTS 설정 화면 ────────────────────────────────────── */}
      {hasResult && view === 'tts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            background: 'rgba(167,139,250,.08)', border: '1px solid rgba(167,139,250,.25)',
            borderRadius: 'var(--r)', padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 16 }}>🔌</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--purple)' }}>ElevenLabs API 연동 준비 중</div>
              <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>아래에서 설정을 미리 구성해두면 API 키 입력 후 바로 사용 가능합니다</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 12, alignItems: 'start' }}>
            {/* 왼쪽: 글로벌 설정 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* API 설정 */}
              <div style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 'var(--r)', padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx3)', letterSpacing: '.08em', marginBottom: 10 }}>API 설정</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--tx2)', marginBottom: 4 }}>ElevenLabs API Key</div>
                    <input type="password" placeholder="sk-... (추후 입력)" disabled
                      style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)', padding: '7px 10px', fontSize: 11, color: 'var(--tx3)', boxSizing: 'border-box', cursor: 'not-allowed' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--tx2)', marginBottom: 4 }}>모델</div>
                    <select value={ttsModel} onChange={e => setTtsModel(e.target.value)}
                      style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)', padding: '7px 10px', fontSize: 11, color: 'var(--tx1)', boxSizing: 'border-box' }}>
                      <option value="eleven_multilingual_v2">Multilingual v2 (권장)</option>
                      <option value="eleven_turbo_v2_5">Turbo v2.5 (빠름)</option>
                      <option value="eleven_flash_v2_5">Flash v2.5 (최저지연)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 보이스 설정 */}
              <div style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 'var(--r)', padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx3)', letterSpacing: '.08em', marginBottom: 10 }}>보이스 설정</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--tx2)', marginBottom: 4 }}>나레이션 언어</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[['vi', '🇻🇳 베트남어'], ['ko', '🇰🇷 한국어']].map(([val, label]) => (
                        <button key={val} onClick={() => setTtsLang(val)} style={{
                          flex: 1, padding: '7px 0', fontSize: 11, fontWeight: 600,
                          borderRadius: 'var(--r-sm)', cursor: 'pointer',
                          border: `1.5px solid ${ttsLang === val ? 'var(--lime)' : 'var(--b1)'}`,
                          background: ttsLang === val ? 'rgba(190,242,100,.1)' : 'var(--s2)',
                          color: ttsLang === val ? 'var(--lime)' : 'var(--tx2)',
                        }}>{label}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--tx2)', marginBottom: 4 }}>보이스 프리셋</div>
                    <select value={ttsVoiceId} onChange={e => setTtsVoiceId(e.target.value)}
                      style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)', padding: '7px 10px', fontSize: 11, color: 'var(--tx1)', boxSizing: 'border-box' }}>
                      {VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* 음성 파라미터 */}
              <div style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 'var(--r)', padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx3)', letterSpacing: '.08em', marginBottom: 12 }}>음성 파라미터</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { label: 'Stability',       sub: '낮을수록 표현 풍부 / 높을수록 안정적', val: ttsStability,  set: setTtsStability,  min: 0,   max: 1,   step: 0.01 },
                    { label: 'Similarity Boost', sub: '보이스 클론 유사도',                    val: ttsSimilarity, set: setTtsSimilarity, min: 0,   max: 1,   step: 0.01 },
                    { label: 'Style',            sub: '스타일 과장도 (0 권장)',                 val: ttsStyle,      set: setTtsStyle,      min: 0,   max: 1,   step: 0.01 },
                    { label: 'Speed',            sub: '말하기 속도',                           val: ttsSpeed,      set: setTtsSpeed,      min: 0.7, max: 1.2, step: 0.05 },
                  ].map(({ label, sub, val, set, min, max, step }) => (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx1)' }}>{label}</span>
                          <span style={{ fontSize: 10, color: 'var(--tx3)', marginLeft: 6 }}>{sub}</span>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--lime)' }}>{val.toFixed(2)}</span>
                      </div>
                      <input type="range" min={min} max={max} step={step} value={val}
                        onChange={e => set(parseFloat(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--lime)' }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 오른쪽: 씬별 TTS 텍스트 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx3)', letterSpacing: '.08em', marginBottom: 2 }}>
                씬별 TTS 텍스트 — {ttsLang === 'vi' ? '🇻🇳 베트남어' : '🇰🇷 한국어'} 기준
              </div>
              {/* 후킹 */}
              <div style={{ background: 'var(--s1)', border: '1px solid rgba(190,242,100,.2)', borderRadius: 'var(--r-sm)', padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0, width: 52 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--lime)', letterSpacing: '.06em' }}>HOOK</div>
                  <div style={{ fontSize: 9, color: 'var(--tx3)', marginTop: 2 }}>0–3초</div>
                </div>
                <div style={{ flex: 1, fontSize: 12, color: 'var(--tx1)', lineHeight: 1.6 }}>{result.hook}</div>
                <button disabled style={{ flexShrink: 0, fontSize: 10, padding: '4px 10px', background: 'var(--s3)', border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)', color: 'var(--tx3)', cursor: 'not-allowed' }}>▶ 재생</button>
              </div>
              {/* 씬 목록 */}
              {result.scenes?.map((s, i) => (
                <div key={i} style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)', padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ flexShrink: 0, width: 52 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--purple)', letterSpacing: '.06em' }}>씬 {i + 1}</div>
                    <div style={{ fontSize: 9, color: 'var(--tx3)', marginTop: 2 }}>{s.time}</div>
                  </div>
                  <div style={{ flex: 1, fontSize: 12, color: 'var(--tx1)', lineHeight: 1.6 }}>{ttsLang === 'vi' ? s.vi : s.ko}</div>
                  <button disabled style={{ flexShrink: 0, fontSize: 10, padding: '4px 10px', background: 'var(--s3)', border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)', color: 'var(--tx3)', cursor: 'not-allowed' }}>▶ 재생</button>
                </div>
              ))}
              {/* CTA */}
              <div style={{ background: 'var(--s1)', border: '1px solid rgba(251,191,36,.2)', borderRadius: 'var(--r-sm)', padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0, width: 52 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--amber)', letterSpacing: '.06em' }}>CTA</div>
                  <div style={{ fontSize: 9, color: 'var(--tx3)', marginTop: 2 }}>마무리</div>
                </div>
                <div style={{ flex: 1, fontSize: 12, color: 'var(--tx1)', lineHeight: 1.6 }}>{result.cta}</div>
                <button disabled style={{ flexShrink: 0, fontSize: 10, padding: '4px 10px', background: 'var(--s3)', border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)', color: 'var(--tx3)', cursor: 'not-allowed' }}>▶ 재생</button>
              </div>
              <button disabled style={{
                marginTop: 4, padding: '12px 0', width: '100%',
                background: 'rgba(190,242,100,.08)', border: '1px dashed rgba(190,242,100,.3)',
                borderRadius: 'var(--r)', fontSize: 13, fontWeight: 700,
                color: 'rgba(190,242,100,.5)', cursor: 'not-allowed',
              }}>
                🎙️ 전체 TTS 생성 (API 연동 후 활성화)
              </button>
              <div style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)', padding: '10px 14px', fontSize: 10, color: 'var(--tx3)', lineHeight: 1.8 }}>
                <span style={{ fontWeight: 700, color: 'var(--tx2)' }}>현재 설정 요약</span><br />
                모델: <span style={{ color: 'var(--tx1)' }}>{ttsModel}</span> · 언어: <span style={{ color: 'var(--tx1)' }}>{ttsLang === 'vi' ? '베트남어' : '한국어'}</span> · Stability: <span style={{ color: 'var(--tx1)' }}>{ttsStability.toFixed(2)}</span> · Similarity: <span style={{ color: 'var(--tx1)' }}>{ttsSimilarity.toFixed(2)}</span> · Style: <span style={{ color: 'var(--tx1)' }}>{ttsStyle.toFixed(2)}</span> · Speed: <span style={{ color: 'var(--tx1)' }}>{ttsSpeed.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 스크립트 뷰 ──────────────────────────────────────── */}
      {hasResult && view === 'script' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* 영상 메타 요약 바 */}
          {(() => {
            const scenes = result.scenes || []
            const totalSec = scenes.reduce((sum, s) => sum + parseDuration(s), 0)
              + Math.max(0, scenes.length - 1) * 0.5
            const hasDuration = scenes.some(s => typeof s.duration === 'number')
            const mm = Math.floor(totalSec / 60)
            const ss = Math.round(totalSec % 60)
            return (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 14px', background: 'var(--s2)',
                border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)',
                fontSize: 11, color: 'var(--tx3)',
              }}>
                <span>씬 <strong style={{ color: 'var(--tx1)' }}>{scenes.length}개</strong></span>
                <span style={{ color: 'var(--b1)' }}>|</span>
                <span>
                  예상 영상 길이&nbsp;
                  <strong style={{ color: 'var(--lime)' }}>{mm > 0 ? `${mm}분 ${ss}초` : `${ss}초`}</strong>
                  {!hasDuration && <span style={{ fontSize: 10, opacity: .6 }}> (추정)</span>}
                </span>
                {hasDuration && (
                  <>
                    <span style={{ color: 'var(--b1)' }}>|</span>
                    <span style={{ fontSize: 10, color: 'rgba(96,165,250,.8)' }}>🔍 이미지 키워드 포함</span>
                  </>
                )}
              </div>
            )
          })()}

          {/* 후킹 */}
          <div style={{ background: 'var(--s1)', border: '1px solid rgba(190,242,100,.25)', borderRadius: 'var(--r)', padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: 'var(--lime)', fontWeight: 700, letterSpacing: '.08em', marginBottom: 5 }}>0–3초 후킹</div>
            <div
              style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx1)', outline: 'none', minHeight: '1.4em' }}
              contentEditable suppressContentEditableWarning
              onBlur={e => setResult(prev => ({ ...prev, hook: e.currentTarget.textContent }))}
            >
              {result.hook}
            </div>
          </div>

          {/* 씬 목록 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {result.scenes?.map((s, i) => {
              const isRefreshing = refreshingScene === i
              const overTop = dragOver?.idx === i && dragOver.pos === 'top'
              const overBot = dragOver?.idx === i && dragOver.pos === 'bot'
              return (
                <React.Fragment key={s._id || i}>
                  <div
                    draggable
                    onDragStart={e => {
                      dragSrcRef.current = i
                      e.dataTransfer.effectAllowed = 'move'
                      setTimeout(() => e.target.style.opacity = '0.35', 0)
                    }}
                    onDragEnd={e => {
                      e.target.style.opacity = '1'
                      dragSrcRef.current = -1
                      setDragOver(null)
                    }}
                    onDragOver={e => {
                      e.preventDefault()
                      if (dragSrcRef.current === -1 || dragSrcRef.current === i) return
                      const rect = e.currentTarget.getBoundingClientRect()
                      setDragOver({ idx: i, pos: e.clientY < rect.top + rect.height / 2 ? 'top' : 'bot' })
                    }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={e => {
                      e.preventDefault()
                      const from = dragSrcRef.current
                      if (from === -1 || from === i) return
                      const rect = e.currentTarget.getBoundingClientRect()
                      let to = e.clientY < rect.top + rect.height / 2 ? i : i + 1
                      if (to > from) to--
                      moveScene(from, to)
                      setDragOver(null)
                    }}
                    style={{
                      background: 'var(--s1)',
                      border: `1px solid ${isRefreshing ? 'rgba(190,242,100,.4)' : 'var(--b1)'}`,
                      borderTop: overTop ? '2px solid var(--lime)' : undefined,
                      borderBottom: overBot ? '2px solid var(--lime)' : undefined,
                      borderRadius: 'var(--r)', padding: '10px 14px',
                      display: 'grid', gridTemplateColumns: '16px 70px 1fr 1fr 1fr auto', gap: 10, alignItems: 'start',
                      transition: 'border-color .15s', opacity: isRefreshing ? 0.6 : 1,
                    }}
                  >
                    {/* 드래그 핸들 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2.5, paddingTop: 4, cursor: 'grab', opacity: 0.35, flexShrink: 0 }}>
                      {[0, 1, 2].map(k => <div key={k} style={{ width: 12, height: 1.5, borderRadius: 1, background: 'var(--tx2)' }} />)}
                    </div>

                    <div
                      style={{ fontSize: 10, color: 'var(--lime)', fontWeight: 700, paddingTop: 2, outline: 'none', cursor: 'text' }}
                      contentEditable suppressContentEditableWarning
                      title="시간 구간 직접 수정"
                      onBlur={e => {
                        const t = e.currentTarget.textContent.trim()
                        if (t) setResult(prev => ({ ...prev, scenes: prev.scenes.map((sc, j) => j === i ? { ...sc, time: t } : sc) }))
                      }}
                    >{s.time}</div>

                    <div>
                      <div style={{ fontSize: 9, color: 'var(--tx3)', marginBottom: 3 }}>🇰🇷 나레이션</div>
                      <div
                        style={{ fontSize: 12, color: 'var(--tx1)', lineHeight: 1.5, outline: 'none', minHeight: '1.2em' }}
                        contentEditable suppressContentEditableWarning
                        onBlur={e => {
                          const text = e.currentTarget.textContent
                          const prev_ko = s.ko
                          setResult(prev => ({ ...prev, scenes: prev.scenes.map((sc, j) => j === i ? { ...sc, ko: text } : sc) }))
                          // 실제 변경된 경우에만 번역 (빈 포커스 / 미변경 제외)
                          if (text.trim() && text !== prev_ko) translateScene(i, text)
                        }}
                      >{s.ko}</div>
                    </div>

                    <div>
                      <div style={{ fontSize: 9, color: 'var(--tx3)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                        🇻🇳 베트남어
                        {translating === i && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--lime)', fontSize: 9 }}>
                            <div className="spin" style={{ width: 8, height: 8, borderWidth: 1.5, flexShrink: 0 }} />
                            번역 중
                          </span>
                        )}
                      </div>
                      <div
                        style={{ fontSize: 12, color: 'var(--tx1)', lineHeight: 1.5, outline: 'none', minHeight: '1.2em',
                          opacity: translating === i ? 0.45 : 1, transition: 'opacity .2s' }}
                        contentEditable suppressContentEditableWarning
                        onBlur={e => setResult(prev => ({ ...prev, scenes: prev.scenes.map((sc, j) => j === i ? { ...sc, vi: e.currentTarget.textContent } : sc) }))}
                      >{s.vi}</div>
                    </div>

                    <div>
                      <div style={{ fontSize: 9, color: 'var(--tx3)', marginBottom: 3 }}>📷 화면</div>
                      {/* 이미지 썸네일 */}
                      {(() => {
                        const thumbs = ragData?.thumbnails?.length ? ragData.thumbnails : (ragData?.thumbnail ? [ragData.thumbnail] : [])
                        const cur = sceneImages[i]
                        if (!cur) return null
                        const cycleNext = () => {
                          if (thumbs.length < 2) return
                          const idx = thumbs.indexOf(cur)
                          setSceneImages(prev => prev.map((img, j) => j === i ? thumbs[(idx + 1) % thumbs.length] : img))
                        }
                        return (
                          <div
                            onClick={thumbs.length > 1 ? cycleNext : undefined}
                            title={thumbs.length > 1 ? '클릭해서 다른 이미지로 교체' : undefined}
                            style={{
                              position: 'relative', marginBottom: 6, borderRadius: 6, overflow: 'hidden',
                              cursor: thumbs.length > 1 ? 'pointer' : 'default',
                              aspectRatio: '16/9', background: 'var(--s2)',
                            }}
                          >
                            <img src={cur} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              onError={e => { e.target.style.display = 'none' }} />
                            {thumbs.length > 1 && (
                              <div style={{
                                position: 'absolute', bottom: 4, right: 4,
                                background: 'rgba(0,0,0,.55)', borderRadius: 4,
                                padding: '2px 5px', fontSize: 9, color: '#fff',
                              }}>
                                {thumbs.indexOf(cur) + 1}/{thumbs.length}
                              </div>
                            )}
                          </div>
                        )
                      })()}
                      <div
                        style={{ fontSize: 11, color: 'var(--tx2)', lineHeight: 1.5, outline: 'none', minHeight: '1.2em' }}
                        contentEditable suppressContentEditableWarning
                        onBlur={e => setResult(prev => ({ ...prev, scenes: prev.scenes.map((sc, j) => j === i ? { ...sc, visual: e.currentTarget.textContent } : sc) }))}
                      >{s.visual}</div>
                      <button
                        onClick={() => openImagePicker(i)}
                        title="공식 채널 이미지에서 선택"
                        style={{
                          marginTop: 5, display: 'flex', alignItems: 'center', gap: 5,
                          background: imagePicker.idx === i ? 'rgba(190,242,100,.12)' : 'rgba(255,255,255,.04)',
                          border: `1px solid ${imagePicker.idx === i ? 'rgba(190,242,100,.4)' : 'var(--b1)'}`,
                          borderRadius: 5, padding: '4px 8px',
                          cursor: 'pointer', transition: 'all .15s',
                          width: '100%',
                        }}
                      >
                        {imagePicker.idx === i && imagePicker.loading
                          ? <div className="spin" style={{ width: 9, height: 9, borderWidth: 1.5, flexShrink: 0 }} />
                          : <span style={{ fontSize: 9, flexShrink: 0 }}>🖼</span>
                        }
                        <span style={{ fontSize: 9, fontWeight: 600,
                          color: imagePicker.idx === i ? 'var(--lime)' : 'var(--tx3)',
                          flex: 1, textAlign: 'left',
                        }}>
                          이미지 선택
                        </span>
                        <span style={{ fontSize: 9, color: 'var(--tx3)', flexShrink: 0 }}>
                          {imagePicker.idx === i ? '▲' : '▼'}
                        </span>
                      </button>
                    </div>

                    {/* 씬 액션 버튼 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0, marginTop: 1 }}>
                      {/* 미리보기 */}
                      <button
                        onClick={() => setPreviewIdx(prev => prev === i ? null : i)}
                        title="씬 미리보기"
                        style={{
                          background: previewIdx === i ? 'rgba(190,242,100,.12)' : 'none',
                          border: `1px solid ${previewIdx === i ? 'rgba(190,242,100,.5)' : 'var(--b1)'}`,
                          borderRadius: 6, width: 26, height: 26, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, color: previewIdx === i ? 'var(--lime)' : 'var(--tx3)',
                          transition: 'all .15s',
                        }}
                      >👁</button>
                      {/* 재생성 */}
                      <button onClick={() => refreshScene(i)} disabled={refreshingScene !== -1} title="이 씬 재생성"
                        style={{
                          background: 'none', border: '1px solid var(--b1)', borderRadius: 6,
                          width: 26, height: 26, cursor: refreshingScene !== -1 ? 'default' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: isRefreshing ? 'var(--lime)' : 'var(--tx3)', transition: 'color .2s',
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                          style={{ animation: isRefreshing ? 'spin .7s linear infinite' : 'none' }}>
                          <path d="M10 6A4 4 0 1 1 6 2a4 4 0 0 1 2.83 1.17L10 2v4H6l1.5-1.5A2.5 2.5 0 1 0 8.5 6"
                            stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {/* 삭제 */}
                      <button onClick={() => deleteScene(i)} disabled={refreshingScene !== -1} title="이 씬 삭제"
                        style={{
                          background: 'none', border: '1px solid var(--b1)', borderRadius: 6,
                          width: 26, height: 26, cursor: refreshingScene !== -1 ? 'default' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--tx3)', fontSize: 14, lineHeight: 1,
                        }}
                        onMouseEnter={e => { if (refreshingScene === -1) { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(248,113,113,.4)' } }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--tx3)'; e.currentTarget.style.borderColor = 'var(--b1)' }}
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {/* 이미지 피커 패널 */}
                  {imagePicker.idx === i && (
                    <div style={{
                      background: 'var(--s2)', border: '1px solid rgba(190,242,100,.2)',
                      borderRadius: 'var(--r-sm)', padding: '10px 12px',
                      display: 'flex', flexDirection: 'column', gap: 8,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--lime)' }}>
                          🖼 공식 채널 이미지
                          {ragData?.video?.channelTitle && (
                            <span style={{ fontWeight: 400, color: 'var(--tx3)', marginLeft: 5 }}>
                              · {ragData.video.channelTitle}
                            </span>
                          )}
                        </span>
                        <button
                          onClick={() => setImagePicker({ idx: -1, loading: false, images: [] })}
                          style={{ background: 'none', border: 'none', color: 'var(--tx3)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px' }}
                        >×</button>
                      </div>

                      {imagePicker.loading && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', color: 'var(--tx3)', fontSize: 11 }}>
                          <div className="spin" style={{ width: 12, height: 12, borderWidth: 2 }} />
                          공식 채널에서 이미지 불러오는 중...
                        </div>
                      )}

                      {!imagePicker.loading && imagePicker.images.length === 0 && (
                        <div style={{ fontSize: 11, color: 'var(--tx3)', padding: '6px 0' }}>
                          이미지를 불러올 수 없습니다. YouTube API 키를 확인해주세요.
                        </div>
                      )}

                      {!imagePicker.loading && imagePicker.images.length > 0 && (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                            {imagePicker.images.map((img, k) => {
                              const isSelected = sceneImages[i] === img.url
                              return (
                                <button
                                  key={k}
                                  onClick={() => selectPickerImage(i, img.url)}
                                  title={img.title}
                                  style={{
                                    padding: 0, border: `2px solid ${isSelected ? 'var(--lime)' : 'transparent'}`,
                                    borderRadius: 6, overflow: 'hidden', cursor: 'pointer',
                                    background: 'var(--s3)', aspectRatio: '16/9',
                                    outline: isSelected ? '2px solid rgba(190,242,100,.3)' : 'none',
                                    transition: 'border-color .15s',
                                    position: 'relative',
                                  }}
                                >
                                  <img
                                    src={img.url}
                                    alt={img.title}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    onError={e => { e.target.style.display = 'none' }}
                                  />
                                  {isSelected && (
                                    <div style={{
                                      position: 'absolute', inset: 0,
                                      background: 'rgba(190,242,100,.15)',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                      <span style={{ fontSize: 16 }}>✓</span>
                                    </div>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--tx3)' }}>
                            클릭하면 이 씬의 배경 이미지로 적용됩니다 · YouTube 공식 영상 썸네일
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* 씬 사이 전환 효과 선택바 + 씬 추가 버튼 */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', margin: '4px 0', gap: 6 }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--b1)' }} />
                    {i < result.scenes.length - 1 && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 2,
                        background: 'var(--s2)', border: '1px solid var(--b1)',
                        borderRadius: 20, padding: '3px 6px',
                      }}>
                        {TRANSITIONS.map(tx => {
                          const active = (sceneTransitions[i] || 'fade') === tx.id
                          return (
                            <button
                              key={tx.id}
                              onClick={() => setSceneTransitions(prev => prev.map((t, j) => j === i ? tx.id : t))}
                              title={tx.desc}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 3,
                                padding: active ? '2px 8px' : '2px 5px',
                                borderRadius: 12,
                                border: active ? '1px solid rgba(190,242,100,.5)' : '1px solid transparent',
                                background: active ? 'rgba(190,242,100,.12)' : 'transparent',
                                color: active ? 'var(--lime)' : 'var(--tx3)',
                                fontSize: 10, fontWeight: active ? 700 : 400,
                                cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap',
                              }}
                            >
                              <span style={{ fontSize: 11, lineHeight: 1 }}>{tx.symbol}</span>
                              {active && <span>{tx.label}</span>}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    {/* 이 아래에 씬 추가 */}
                    <button
                      onClick={() => addScene(i)}
                      title="이 아래에 새 씬 추가"
                      style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'none', border: '1px solid var(--b1)',
                        color: 'var(--tx3)', fontSize: 13, lineHeight: 1,
                        cursor: 'pointer', transition: 'all .15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--lime)'; e.currentTarget.style.borderColor = 'rgba(190,242,100,.5)'; e.currentTarget.style.background = 'rgba(190,242,100,.08)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--tx3)'; e.currentTarget.style.borderColor = 'var(--b1)'; e.currentTarget.style.background = 'none' }}
                    >+</button>
                    <div style={{ flex: 1, height: 1, background: 'var(--b1)' }} />
                  </div>
                </React.Fragment>
              )
            })}

            {/* 맨 끝 씬 추가 버튼 */}
            <button
              onClick={() => addScene((result.scenes?.length ?? 1) - 1)}
              style={{
                marginTop: 6, padding: '8px 0', width: '100%', cursor: 'pointer',
                background: 'none', border: '1px dashed var(--b1)', borderRadius: 'var(--r)',
                color: 'var(--tx3)', fontSize: 11, fontWeight: 600, transition: 'all .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--lime)'; e.currentTarget.style.borderColor = 'rgba(190,242,100,.4)'; e.currentTarget.style.background = 'rgba(190,242,100,.04)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--tx3)'; e.currentTarget.style.borderColor = 'var(--b1)'; e.currentTarget.style.background = 'none' }}
            >
              + 씬 추가
            </button>
          </div>

          {/* 팩트 출처 */}
          {result.sources?.length > 0 && (
            <div style={{ fontSize: 10, color: 'var(--tx3)', padding: '8px 12px', background: 'var(--s2)', borderRadius: 'var(--r-sm)', border: '1px solid var(--b1)' }}>
              🔍 팩트 출처: {result.sources.join(' · ')}
            </div>
          )}

          {/* 이미지 출처 입력 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--s1)', border: '1px solid var(--b1)',
            borderRadius: 'var(--r-sm)', padding: '9px 14px',
          }}>
            <span style={{ fontSize: 10, color: 'var(--tx3)', fontWeight: 700, letterSpacing: '.05em', whiteSpace: 'nowrap', flexShrink: 0 }}>이미지 출처</span>
            <input
              type="text"
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder="예) Ảnh - YOUTUBE HYBE LABELS  (AI 크롤링 시 자동 채워짐)"
              style={{ flex: 1, background: 'transparent', border: 'none', fontSize: 11, color: 'var(--tx2)', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>

          {/* 다른 포맷으로 */}
          <div style={{ display: 'flex', gap: 6, paddingTop: 4 }}>
            <button className="btn-g" style={{ fontSize: 11, padding: '7px 0', flex: 1 }}
              onClick={() => router.push(`/news?artist=${encodeURIComponent(effArtist)}&topic=${encodeURIComponent(effTopic)}&hook=${encodeURIComponent(effHook)}&reason=${encodeURIComponent(effReason)}&keywords=${encodeURIComponent(effKeywords)}&videoId=${encodeURIComponent(effVideoId)}`)}>
              📰 숏뉴스로
            </button>
            <button className="btn-g" style={{ fontSize: 11, padding: '7px 0', flex: 1 }}
              onClick={() => router.push(`/card?artist=${encodeURIComponent(effArtist)}&topic=${encodeURIComponent(effTopic)}&hook=${encodeURIComponent(effHook)}&reason=${encodeURIComponent(effReason)}&keywords=${encodeURIComponent(effKeywords)}&videoId=${encodeURIComponent(effVideoId)}`)}>
              🎨 카드뉴스로
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default function ShortPage() {
  return (
    <Suspense fallback={<div className="loading"><div className="spin" /></div>}>
      <ShortInner />
    </Suspense>
  )
}
}
