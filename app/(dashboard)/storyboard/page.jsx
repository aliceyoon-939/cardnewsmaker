'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

function parseTime(timeStr) {
  const parts = timeStr.split('-')
  const toSec = t => {
    const [m, s] = t.trim().split(':').map(Number)
    return m * 60 + (s || 0)
  }
  return { start: toSec(parts[0]), end: toSec(parts[1] ?? parts[0]) }
}

function toSrtTime(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},000`
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ')
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line + w + ' '
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line.trim()); line = w + ' '
    } else { line = test }
  }
  if (line.trim()) lines.push(line.trim())
  return lines
}

function fmtDuration(sec) {
  const m = Math.floor(sec / 60), s = Math.round(sec % 60)
  return m > 0 ? `${m}분 ${s}초` : `${s}초`
}

function drawSceneCore(ctx, W, H, s, img, kenBurns = 1.0) {
  ctx.fillStyle = '#0a0a12'
  ctx.fillRect(0, 0, W, H)

  if (img) {
    // 블러 배경
    ctx.save()
    ctx.filter = 'blur(36px)'
    const bgScale = Math.max(W / img.width, H / img.height) * kenBurns
    const bgW = img.width * bgScale, bgH = img.height * bgScale
    ctx.drawImage(img, (W - bgW) / 2, (H - bgH) / 2, bgW, bgH)
    ctx.restore()

    // 어두운 오버레이
    ctx.fillStyle = 'rgba(10,10,18,0.52)'
    ctx.fillRect(0, 0, W, H)

    // 전면 이미지 (Ken Burns 적용, 상단 60% 영역)
    const fgAreaH = H * 0.60
    const fgScale = Math.min(W / img.width, fgAreaH / img.height)
    const fgW = img.width * fgScale, fgH = img.height * fgScale
    const fgX = (W - fgW) / 2, fgY = (fgAreaH - fgH) / 2
    const pivotX = W / 2, pivotY = fgY + fgH / 2

    ctx.save()
    ctx.translate(pivotX, pivotY)
    ctx.scale(kenBurns, kenBurns)
    ctx.translate(-pivotX, -pivotY)
    ctx.beginPath()
    ctx.roundRect(fgX, fgY, fgW, fgH, 20)
    ctx.clip()
    ctx.drawImage(img, fgX, fgY, fgW, fgH)
    ctx.restore()

    // 하단 그라데이션
    const grad = ctx.createLinearGradient(0, fgAreaH * 0.65, 0, H * 0.72)
    grad.addColorStop(0, 'rgba(10,10,18,0)')
    grad.addColorStop(1, 'rgba(10,10,18,1)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H * 0.72)
  }

  // 타임 뱃지
  ctx.fillStyle = 'rgba(190,242,100,0.92)'
  ctx.beginPath()
  ctx.roundRect(60, H * 0.56, 190, 50, 10)
  ctx.fill()
  ctx.fillStyle = '#000'
  ctx.font = 'bold 26px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(s.time, 78, H * 0.56 + 34)

  // 베트남어 자막
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 54px sans-serif'
  let y = H * 0.635
  for (const line of wrapText(ctx, s.vi, W - 120)) {
    ctx.fillText(line, 60, y); y += 72
  }

  // 한국어 (흐리게)
  ctx.fillStyle = 'rgba(255,255,255,0.42)'
  ctx.font = '34px sans-serif'
  y += 20
  for (const line of wrapText(ctx, s.ko, W - 120)) {
    ctx.fillText(line, 60, y); y += 48
  }
}

export default function StoryboardPage() {
  const router = useRouter()
  const [data, setData]       = useState(null)
  const [scenes, setScenes]   = useState([])
  const [speed, setSpeed]         = useState(1.0)
  const [translating, setTranslating] = useState({}) // { [idx]: true }
  const [exporting, setExporting]     = useState(false)
  const [exportProgress, setProgress] = useState(0)
  const [imgPool, setImgPool]         = useState([])  // 아티스트 이미지 풀
  const [imgLoading, setImgLoading]   = useState(false)
  const [picker, setPicker]           = useState(null) // 열린 씬 index or null
  const [source, setSource]           = useState('')

  useEffect(() => {
    const raw = sessionStorage.getItem('storyboard')
    if (!raw) { router.push('/short'); return }
    const d = JSON.parse(raw)
    setData(d)
    if (d.ragData?.video?.channelTitle) setSource(`Ảnh - YOUTUBE ${d.ragData.video.channelTitle}`)
    const thumbs = d.ragData?.thumbnails || []
    const sceneCount = (d.result.scenes || []).length
    // 썸네일을 씬 수만큼 순환 배정 (이미지가 부족해도 빈칸 없음)
    setScenes((d.result.scenes || []).map((s, i) => ({
      ...s,
      imgSrc: thumbs.length > 0 ? thumbs[i % thumbs.length] : null,
    })))
    // 이미지 풀 자동 수집
    fetchImgPool(d.artist, d.ragData?.videoId, thumbs, sceneCount)
  }, [])

  async function fetchImgPool(artist, videoId, existingThumbs, needed) {
    setImgLoading(true)
    try {
      const qs = new URLSearchParams({ artist, count: Math.max(needed * 2, 12) })
      if (videoId) qs.set('videoId', videoId)
      const res = await fetch(`/api/images?${qs}`)
      const data = await res.json()
      const newUrls = (data.images || []).map(img => img.url)
      // 기존 썸네일 + 새 이미지 통합 (중복 제거)
      const all = [...new Set([...existingThumbs, ...newUrls])]
      setImgPool(all)
      // 이미지가 없던 씬에 자동 배정
      setScenes(prev => prev.map((s, i) =>
        s.imgSrc ? s : { ...s, imgSrc: all[i % all.length] || null }
      ))
    } catch {}
    setImgLoading(false)
  }

  function updateScene(i, field, val) {
    setScenes(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s))
  }

  async function translateScene(i) {
    const ko = scenes[i]?.ko
    if (!ko) return
    setTranslating(prev => ({ ...prev, [i]: true }))
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ko, artist: data.artist }),
      })
      const json = await res.json()
      if (json.vi) updateScene(i, 'vi', json.vi)
    } catch {}
    setTranslating(prev => ({ ...prev, [i]: false }))
  }

  const totalDuration = scenes.reduce((sum, s) => {
    const { start, end } = parseTime(s.time)
    return sum + (end - start) / speed
  }, 0)

  function triggerDownload(blob, filename) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename; a.click()
  }

  function downloadSrt() {
    const lines = scenes.map((s, i) => {
      const { start, end } = parseTime(s.time)
      return `${i + 1}\n${toSrtTime(start)} --> ${toSrtTime(end)}\n${s.vi}\n`
    })
    triggerDownload(new Blob([lines.join('\n')], { type: 'text/plain' }), `${data.artist}_vi.srt`)
  }

  function downloadTxt() {
    const text = [
      `[후킹] ${data.result.hook}`, '',
      ...scenes.map(s => `${s.time}\n🇰🇷 ${s.ko}\n🇻🇳 ${s.vi}\n📷 ${s.visual}`), '',
      `[CTA] ${data.result.cta}`, '',
      data.result.hashtags?.join(' ') || '',
    ].join('\n')
    triggerDownload(new Blob([text], { type: 'text/plain' }), `${data.artist}_script.txt`)
  }

  async function loadImg(src) {
    if (!src) return null
    return new Promise(resolve => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = src
    })
  }

  async function exportVideo() {
    setExporting(true); setProgress(0)

    const W = 1080, H = 1920
    const FADE_SEC = 0.45 // 크로스페이드 길이(초)
    const speedSnap = speed

    // 씬별 유효 재생 시간
    const durations = scenes.map(s => {
      const { start, end } = parseTime(s.time)
      return (end - start) / speedSnap
    })
    const totalDur = durations.reduce((a, b) => a + b, 0)

    // 이미지 프리로드
    const imgs = await Promise.all(scenes.map(s => loadImg(s.imgSrc)))

    // 메인 캔버스 + 오프스크린 2개 (크로스페이드용)
    const canvas = document.createElement('canvas')
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')

    const offA = Object.assign(document.createElement('canvas'), { width: W, height: H })
    const offB = Object.assign(document.createElement('canvas'), { width: W, height: H })
    const ctxA = offA.getContext('2d')
    const ctxB = offB.getContext('2d')

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9' : 'video/webm'
    const chunks = []
    const stream = canvas.captureStream(30)
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 })
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
    recorder.start()

    await new Promise(resolve => {
      let startTime = null
      let sceneIdx = 0
      let sceneStartElapsed = 0 // 현재 씬이 시작된 시점의 총 경과 시간

      function frame(ts) {
        if (startTime === null) startTime = ts
        const totalElapsed = (ts - startTime) / 1000

        // 씬 전진
        while (
          sceneIdx < scenes.length - 1 &&
          totalElapsed >= sceneStartElapsed + durations[sceneIdx]
        ) {
          sceneStartElapsed += durations[sceneIdx]
          sceneIdx++
        }

        const sceneElapsed = totalElapsed - sceneStartElapsed
        const sceneDur    = durations[sceneIdx]
        const sceneProgress = Math.min(sceneElapsed / sceneDur, 1)

        // Ken Burns: 짝수 씬 줌인, 홀수 씬 줌아웃 (교차)
        const kbFrom = sceneIdx % 2 === 0 ? 1.00 : 1.08
        const kbTo   = sceneIdx % 2 === 0 ? 1.08 : 1.00
        const kenBurns = kbFrom + (kbTo - kbFrom) * sceneProgress

        // 크로스페이드 진행도 (0 → 1)
        const fadeStart = sceneDur - FADE_SEC
        const fadeProgress = sceneElapsed > fadeStart && sceneIdx + 1 < scenes.length
          ? Math.min((sceneElapsed - fadeStart) / FADE_SEC, 1)
          : 0

        // 렌더링
        if (fadeProgress > 0) {
          // 오프스크린에 각 씬 렌더 후 합성
          drawSceneCore(ctxA, W, H, scenes[sceneIdx],     imgs[sceneIdx],     kenBurns)
          drawSceneCore(ctxB, W, H, scenes[sceneIdx + 1], imgs[sceneIdx + 1], 1.0)
          ctx.clearRect(0, 0, W, H)
          ctx.globalAlpha = 1 - fadeProgress; ctx.drawImage(offA, 0, 0)
          ctx.globalAlpha = fadeProgress;     ctx.drawImage(offB, 0, 0)
          ctx.globalAlpha = 1
        } else {
          drawSceneCore(ctx, W, H, scenes[sceneIdx], imgs[sceneIdx], kenBurns)
        }

        setProgress(Math.min(Math.round((totalElapsed / totalDur) * 100), 99))

        if (totalElapsed >= totalDur) resolve()
        else requestAnimationFrame(frame)
      }
      requestAnimationFrame(frame)
    })

    recorder.stop()
    await new Promise(r => { recorder.onstop = r })
    triggerDownload(new Blob(chunks, { type: 'video/webm' }), `${data.artist}_${Date.now()}.webm`)
    setExporting(false); setProgress(0)
  }

  if (!data) return <div className="loading"><div className="spin" /></div>

  return (
    <>
      <div className="top-row">
        <div>
          <div className="sec-title">스토리보드 편집</div>
          <div className="sec-sub" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ color: 'var(--tx2)' }}>{data.artist}</span>
            <span style={{ color: 'var(--tx3)' }}>·</span>
            <span style={{ color: 'var(--tx3)', fontSize: 11 }}>{data.topic}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn-g" style={{ fontSize: 10, padding: '4px 10px' }} onClick={() => router.back()}>
            ← 스크립트
          </button>
          <button className="btn-g" style={{ fontSize: 11, padding: '6px 12px' }} onClick={downloadTxt}>
            📄 TXT
          </button>
          <button className="btn-g" style={{ fontSize: 11, padding: '6px 12px' }} onClick={downloadSrt}>
            💬 SRT 자막
          </button>
          {imgLoading && (
            <span style={{ fontSize: 10, color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span className="spin" style={{ width: 10, height: 10, borderWidth: 1.5 }} />
              이미지 수집 중
            </span>
          )}
          <button
            className="btn"
            style={{ fontSize: 11, padding: '6px 14px', fontWeight: 700, opacity: exporting ? .6 : 1 }}
            onClick={exportVideo}
            disabled={exporting}
          >
            {exporting ? `🎬 렌더링 ${exportProgress}%` : '🎬 영상 익스포트'}
          </button>
        </div>
      </div>

      {/* 속도 조절 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '10px 16px', background: 'var(--s1)',
        border: '1px solid var(--b1)', borderRadius: 'var(--r)', marginBottom: 2,
      }}>
        <span style={{ fontSize: 11, color: 'var(--tx3)', flexShrink: 0 }}>영상 속도</span>
        <input
          type="range" min={0.5} max={2} step={0.1} value={speed}
          onChange={e => setSpeed(+e.target.value)}
          style={{ flex: 1, accentColor: 'var(--lime)' }}
        />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--lime)', width: 38, textAlign: 'right', flexShrink: 0 }}>
          {speed.toFixed(1)}×
        </span>
        <span style={{ fontSize: 10, color: 'var(--tx3)', flexShrink: 0, paddingLeft: 4, borderLeft: '1px solid var(--b1)' }}>
          예상 {fmtDuration(totalDuration)}
        </span>
        <span style={{ fontSize: 9, color: 'var(--tx3)', flexShrink: 0 }}>
          Ken Burns · 크로스페이드 0.45s
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Hook */}
        <div style={{ background: 'var(--s1)', border: '1px solid rgba(190,242,100,.25)', borderRadius: 'var(--r)', padding: '12px 14px' }}>
          <div style={{ fontSize: 10, color: 'var(--lime)', fontWeight: 700, marginBottom: 5 }}>0–3초 후킹</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{data.result.hook}</div>
        </div>

        {/* Scenes */}
        {scenes.map((s, i) => (
          <div key={i} style={{
            background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 'var(--r)',
            padding: '12px 14px', display: 'grid', gridTemplateColumns: '140px 1fr', gap: 14,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* 이미지 미리보기 */}
              <div
                style={{
                  width: '100%', aspectRatio: '9/16', background: 'var(--s3)', borderRadius: 6,
                  overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', position: 'relative',
                }}
                onClick={() => setPicker(i)}
              >
                {s.imgSrc
                  ? <img src={s.imgSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>🖼️</div>
                      <div style={{ fontSize: 9, color: 'var(--tx3)' }}>클릭하여 선택</div>
                    </div>
                  )
                }
                {/* 호버 오버레이 */}
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transition: 'opacity .15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0}
                >
                  <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>🔍 변경</span>
                </div>
              </div>

              {/* 파일 업로드 */}
              <label style={{
                fontSize: 10, color: 'var(--purple)', textAlign: 'center', cursor: 'pointer',
                padding: '4px 6px', borderRadius: 4, border: '1px solid rgba(167,139,250,.25)',
              }}>
                📁 파일 업로드
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                  const file = e.target.files?.[0]; if (!file) return
                  const reader = new FileReader()
                  reader.onload = ev => updateScene(i, 'imgSrc', ev.target.result)
                  reader.readAsDataURL(file)
                }} />
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--lime)', fontWeight: 700 }}>{s.time}</div>
              <div>
                <div style={{ fontSize: 9, color: 'var(--tx3)', marginBottom: 4 }}>🇻🇳 베트남어 — 영상 자막</div>
                <textarea
                  value={s.vi}
                  onChange={e => updateScene(i, 'vi', e.target.value)}
                  rows={3}
                  style={{
                    width: '100%', background: 'var(--s2)', border: '1px solid var(--b1)',
                    borderRadius: 6, padding: '7px 10px', color: 'var(--tx1)', fontSize: 12,
                    resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5,
                  }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontSize: 9, color: 'var(--tx3)' }}>🇰🇷 한국어 나레이션</div>
                  <button
                    onClick={() => translateScene(i)}
                    disabled={translating[i]}
                    style={{
                      fontSize: 10, padding: '3px 9px', borderRadius: 20,
                      background: translating[i] ? 'var(--s3)' : 'rgba(167,139,250,.15)',
                      color: translating[i] ? 'var(--tx3)' : 'var(--purple)',
                      border: '1px solid rgba(167,139,250,.25)',
                      cursor: translating[i] ? 'default' : 'pointer', fontWeight: 600,
                    }}
                  >
                    {translating[i] ? '번역 중...' : '🔄 베트남어 번역'}
                  </button>
                </div>
                <textarea
                  value={s.ko}
                  onChange={e => updateScene(i, 'ko', e.target.value)}
                  rows={3}
                  style={{
                    width: '100%', background: 'var(--s2)', border: '1px solid var(--b1)',
                    borderRadius: 6, padding: '7px 10px', color: 'var(--tx2)', fontSize: 12,
                    resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5,
                  }}
                />
              </div>
              <div>
                <div style={{ fontSize: 9, color: 'var(--tx3)', marginBottom: 3 }}>📷 화면 설명</div>
                <div style={{ fontSize: 11, color: 'var(--tx3)', lineHeight: 1.5 }}>{s.visual}</div>
              </div>
            </div>
          </div>
        ))}

        {/* CTA + Hashtags */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 'var(--r)', padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: 'var(--amber)', fontWeight: 700, marginBottom: 4 }}>CTA</div>
            <div style={{ fontSize: 13 }}>{data.result.cta}</div>
          </div>
          <div style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 'var(--r)', padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: 'var(--purple)', fontWeight: 700, marginBottom: 6 }}>해시태그</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {data.result.hashtags?.map(t => (
                <span key={t} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(167,139,250,.12)', color: 'var(--purple)' }}>{t}</span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 10, color: 'var(--tx3)', padding: '8px 12px', background: 'var(--s2)', borderRadius: 'var(--r-sm)', border: '1px solid var(--b1)' }}>
          💡 무음 WebM (1080×1920) · CapCut에서 SRT 자막 + 더빙 추가 권장
        </div>

        {/* 출처 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)' }}>
          <span style={{ fontSize: 9, color: 'var(--tx3)', fontWeight: 700, letterSpacing: '.05em', whiteSpace: 'nowrap', flexShrink: 0 }}>이미지 출처</span>
          <input
            type="text"
            value={source}
            onChange={e => setSource(e.target.value)}
            placeholder="이미지 출처 URL (YouTube 크롤링 시 자동 채워짐)"
            style={{ flex: 1, background: 'transparent', border: 'none', fontSize: 10, color: 'var(--tx3)', outline: 'none', fontFamily: 'inherit' }}
          />
        </div>
      </div>

      {/* 이미지 피커 모달 */}
      {picker !== null && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(9,9,18,.88)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24,
          }}
          onClick={() => setPicker(null)}
        >
          <div
            style={{
              background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 'var(--r)',
              width: '100%', maxWidth: 680, maxHeight: '80vh', overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>씬 {picker + 1} 이미지 선택</div>
                <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>
                  {imgLoading ? '🔄 YouTube에서 이미지 수집 중...' : `이미지 ${imgPool.length}장`}
                </div>
              </div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--tx3)' }} onClick={() => setPicker(null)}>✕</button>
            </div>

            {/* 이미지 그리드 */}
            <div style={{ overflowY: 'auto', padding: 14 }}>
              {imgLoading && imgPool.length === 0 ? (
                <div className="loading" style={{ padding: '32px 0' }}>
                  <div className="spin" />
                  <div className="load-t">YouTube에서 공식 이미지 수집 중...</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {imgPool.map((url, idx) => (
                    <div
                      key={idx}
                      style={{
                        aspectRatio: '16/9', borderRadius: 6, overflow: 'hidden', cursor: 'pointer',
                        border: scenes[picker]?.imgSrc === url ? '2px solid var(--lime)' : '2px solid transparent',
                        transition: 'border-color .15s, transform .15s',
                      }}
                      onClick={() => { updateScene(picker, 'imgSrc', url); setPicker(null) }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              )}
              {/* 파일 업로드 옵션 */}
              <label style={{
                display: 'block', marginTop: 12, padding: '12px', textAlign: 'center',
                border: '1px dashed var(--b1)', borderRadius: 8, cursor: 'pointer',
                fontSize: 12, color: 'var(--tx3)',
              }}>
                📁 내 파일에서 업로드
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                  const file = e.target.files?.[0]; if (!file) return
                  const reader = new FileReader()
                  reader.onload = ev => {
                    updateScene(picker, 'imgSrc', ev.target.result)
                    setImgPool(prev => [ev.target.result, ...prev])
                    setPicker(null)
                  }
                  reader.readAsDataURL(file)
                }} />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 익스포트 오버레이 */}
      {exporting && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(9,9,18,.88)', backdropFilter: 'blur(6px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, zIndex: 1000,
        }}>
          <div className="spin" style={{ width: 36, height: 36, borderWidth: 3 }} />
          <div style={{ fontSize: 17, fontWeight: 700 }}>영상 렌더링 중... {exportProgress}%</div>
          <div style={{ width: 300, height: 6, background: 'var(--s3)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${exportProgress}%`, background: 'var(--lime)', transition: 'width .3s' }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--tx3)' }}>Ken Burns · 크로스페이드 렌더링 중 — 완료 후 자동 다운로드</div>
        </div>
      )}
    </>
  )
}
