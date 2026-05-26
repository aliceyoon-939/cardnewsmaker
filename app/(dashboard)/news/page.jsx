'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSave } from '@/contexts/SaveContext'

/* ── 포맷 정의 ───────────────────────────────── */
const FMTS = {
  '9:16': { W: 1080, H: 1920, imgFrac: 0.58, label: 'TikTok · Reels' },
  '4:5':  { W: 1080, H: 1350, imgFrac: 0.52, label: 'Instagram' },
  '1:1':  { W: 1080, H: 1080, imgFrac: 0.46, label: 'Square' },
}
const PREVIEW_W = 320

/* ── 유틸 ────────────────────────────────────── */
function hexToRgba(hex, opacity) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `rgba(${r},${g},${b},${opacity/100})`
}

function wrapCanvas(ctx, text, maxW) {
  const words = text.split(' ')
  const lines = []; let line = ''
  for (const w of words) {
    const t = line + w + ' '
    if (ctx.measureText(t).width > maxW && line) { lines.push(line.trim()); line = w + ' ' }
    else line = t
  }
  if (line.trim()) lines.push(line.trim())
  return lines
}

function SliderRow({ label, value, min, max, step = 1, unit = '', onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 10, color: 'var(--tx3)', width: 64, flexShrink: 0 }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        style={{ flex: 1, accentColor: 'var(--lime)', height: 3 }} />
      <span style={{ fontSize: 11, color: 'var(--lime)', width: 42, textAlign: 'right', flexShrink: 0, fontWeight: 600 }}>
        {value}{unit}
      </span>
    </div>
  )
}

function ColorRow({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 10, color: 'var(--tx3)', width: 64, flexShrink: 0 }}>{label}</span>
      <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
        <div style={{ width: 28, height: 20, borderRadius: 4, background: value, border: '1px solid var(--b1)', flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: 'var(--tx2)' }}>{value}</span>
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', border: 'none', padding: 0 }} />
      </label>
    </div>
  )
}

/* ── 메인 컴포넌트 ───────────────────────────── */
function NewsInner() {
  const router  = useRouter()
  const params  = useSearchParams()
  const { registerPending } = useSave()

  const artist   = params.get('artist')   || ''
  const topic    = params.get('topic')    || ''
  const type     = params.get('type')     || ''
  const hook     = params.get('hook')     || ''
  const reason   = params.get('reason')  || ''
  const keywords = params.get('keywords') || ''
  const videoId  = params.get('videoId') || ''
  const hasContext = !!(artist && topic)

  const [ragData,    setRagData]    = useState(null)
  const [ragLoading, setRagLoading] = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [imgSrc,     setImgSrc]     = useState(null)
  const [imgCredit,  setImgCredit]  = useState('')
  const [fmt,        setFmt]        = useState('9:16')
  const [text, setText] = useState({ headline: '', body: '', cta: '', source: '', hashtags: [] })
  const [sty, setSty]   = useState({
    fontSize:       36,
    letterSpacing:  0,
    lineHeight:     1.6,
    textBgColor:    '#000000',
    textBgOpacity:  90,
    textColor:      '#ffffff',
  })

  useEffect(() => { if (hasContext) fetchAndGenerate() }, [])

  async function fetchAndGenerate() {
    setRagLoading(true); setError('')
    let rag = { video: null, captions: null, news: [] }
    if (videoId) {
      try {
        const r = await fetch(`/api/rag?videoId=${encodeURIComponent(videoId)}&artist=${encodeURIComponent(artist)}`)
        if (r.ok) rag = await r.json()
      } catch {}
    }
    setRagData(rag)
    if (rag.thumbnail) {
      setImgSrc(rag.thumbnail)
      if (rag.video?.channelTitle) setImgCredit(prev => prev || `Ảnh - YOUTUBE ${rag.video.channelTitle}`)
    }
    setRagLoading(false)
    await generate(rag)
  }

  async function generate(rag = ragData) {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'news', ...(rag||{}), artist, topic, type, hook, reason, keywords }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const d = data.result
      setText({ headline: d.headline||'', body: d.body||'', cta: d.cta||'', source: d.source||'', hashtags: d.hashtags||[] })
      registerPending({ type:'news', artist, topic, result:d, params:{artist,topic,type,hook,reason,keywords,videoId} })
    } catch(e) { setError(e.message) }
    setLoading(false)
  }

  const up = (k,v) => setSty(p => ({ ...p, [k]: v }))

  /* ── PNG 익스포트 ── */
  async function exportPng() {
    const { W, H, imgFrac } = FMTS[fmt]
    const canvas = document.createElement('canvas')
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')
    const pad = 64
    const textTop = Math.floor(H * imgFrac)
    const bgRgba  = hexToRgba(sty.textBgColor, sty.textBgOpacity)

    // 배경
    ctx.fillStyle = '#0a0a12'; ctx.fillRect(0, 0, W, H)

    // 이미지
    if (imgSrc) {
      const img = await new Promise(resolve => {
        const im = new Image(); im.onload = () => resolve(im); im.onerror = () => resolve(null); im.src = imgSrc
      })
      if (img) {
        const sc = Math.max(W / img.width, textTop / img.height)
        const iw = img.width*sc, ih = img.height*sc
        ctx.drawImage(img, (W-iw)/2, 0, iw, ih)
        const grad = ctx.createLinearGradient(0, textTop*0.65, 0, textTop)
        grad.addColorStop(0, 'rgba(0,0,0,0)')
        grad.addColorStop(1, bgRgba)
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, textTop)
      }
    }

    // 텍스트 영역 배경
    ctx.fillStyle = bgRgba; ctx.fillRect(0, textTop, W, H - textTop)

    // 아티스트 태그
    let y = textTop + 56
    if (artist) {
      ctx.font = 'bold 26px sans-serif'
      const tw = ctx.measureText(artist).width
      ctx.fillStyle = 'rgba(190,242,100,0.15)'
      ctx.beginPath(); ctx.roundRect(pad, y-26, tw+36, 42, 21); ctx.fill()
      ctx.fillStyle = '#bef264'; ctx.fillText(artist, pad+18, y)
      y += 60
    }

    // 헤드라인
    ctx.font = `bold ${sty.fontSize}px sans-serif`
    ctx.letterSpacing = sty.letterSpacing + 'px'
    ctx.fillStyle = sty.textColor
    for (const line of wrapCanvas(ctx, text.headline, W - pad*2)) {
      ctx.fillText(line, pad, y); y += sty.fontSize * sty.lineHeight
    }
    y += 20

    // 본문
    const bsz = Math.round(sty.fontSize * 0.72)
    ctx.font = `${bsz}px sans-serif`
    ctx.fillStyle = sty.textColor + 'bb'
    for (const line of wrapCanvas(ctx, text.body, W - pad*2)) {
      ctx.fillText(line, pad, y); y += bsz * sty.lineHeight
    }
    y += 24

    // CTA
    const csz = Math.round(sty.fontSize * 0.65)
    ctx.font = `bold ${csz}px sans-serif`
    ctx.fillStyle = '#bef264'
    ctx.fillText(text.cta, pad, y); y += csz * 1.5 + 8

    // 출처 + 해시태그
    const hsz = Math.round(sty.fontSize * 0.52)
    ctx.font = `${hsz}px sans-serif`
    ctx.fillStyle = 'rgba(167,139,250,0.75)'
    ctx.fillText([text.source, ...text.hashtags].filter(Boolean).join('  '), pad, y)

    // 이미지 출처 (우하단 작게)
    if (imgCredit) {
      const csz2 = Math.round(sty.fontSize * 0.42)
      ctx.font = `${csz2}px sans-serif`
      ctx.fillStyle = 'rgba(255,255,255,0.22)'
      ctx.textAlign = 'right'
      ctx.shadowColor = 'rgba(0,0,0,0.7)'
      ctx.shadowBlur = 3
      ctx.fillText(imgCredit, W - pad, H - Math.round(csz2 * 0.8))
      ctx.textAlign = 'left'
      ctx.shadowBlur = 0
    }

    canvas.toBlob(blob => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
      a.download = `${artist||'news'}_${fmt.replace(':','x')}_${Date.now()}.png`; a.click()
    }, 'image/png')
  }

  /* ── 미리보기 계산 (패널 실제 너비 동적 측정) ── */
  const { W, H, imgFrac, label } = FMTS[fmt]
  const previewRef = useRef(null)
  const [panelW, setPanelW] = useState(500)
  const [maxH, setMaxH]     = useState(700)

  useEffect(() => {
    const updateH = () => setMaxH(window.innerHeight - 180)
    updateH()
    window.addEventListener('resize', updateH)
    return () => window.removeEventListener('resize', updateH)
  }, [])

  useEffect(() => {
    if (!previewRef.current) return
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width
      if (w) setPanelW(Math.floor(w))
    })
    obs.observe(previewRef.current)
    return () => obs.disconnect()
  }, [])

  // 너비·높이 양쪽 제한 → 뷰포트 안에 딱 맞게
  const sc = Math.min(panelW / W, maxH / H)
  const previewH = Math.round(H * sc)
  const previewW = Math.round(W * sc)
  const bgRgba = hexToRgba(sty.textBgColor, sty.textBgOpacity)

  return (
    <>
      {/* 상단 바 */}
      <div className="top-row">
        <div>
          <div className="sec-title">숏 뉴스 + 사진</div>
          <div className="sec-sub" style={{ display:'flex', alignItems:'center', gap:6 }}>
            {hasContext
              ? <><span style={{color:'var(--tx2)'}}>{artist}</span><span style={{color:'var(--tx3)'}}>·</span><span style={{color:'var(--tx3)',fontSize:11}}>{topic}</span></>
              : <span>사진 + AI 카피 → SNS 이미지</span>}
          </div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {hasContext && (
            <button className="btn-g" style={{fontSize:10,padding:'4px 10px'}} onClick={() => router.push('/trend')}>← 트렌드서치</button>
          )}
          <button className="btn-g" style={{fontSize:11,padding:'6px 12px'}} disabled={loading||ragLoading} onClick={() => generate()}>
            {loading ? '생성 중...' : '↻ 재생성'}
          </button>
          <button className="btn" style={{fontSize:11,padding:'6px 14px',fontWeight:700}} onClick={exportPng}>
            ⬇ PNG 저장
          </button>
        </div>
      </div>

      {/* RAG 배지 */}
      {ragData && (
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:4}}>
          {[
            { ok: ragData.video,         label: ragData.video ? `✓ YouTube (${(ragData.video.viewCount/1e6).toFixed(1)}M뷰)` : '○ YouTube 없음' },
            { ok: ragData.captions,      label: ragData.captions ? `✓ 자막 (${ragData.captions.lang.toUpperCase()})` : '○ 자막 없음' },
            { ok: ragData.news?.length,  label: ragData.news?.length ? `✓ 뉴스 ${ragData.news.length}건` : '○ 뉴스 없음' },
          ].map(({ok,label},i) => (
            <span key={i} style={{fontSize:10,padding:'3px 8px',borderRadius:20,fontWeight:600,background:ok?'rgba(190,242,100,.12)':'rgba(255,255,255,.05)',color:ok?'var(--lime)':'var(--tx3)'}}>
              {label}
            </span>
          ))}
        </div>
      )}

      {(ragLoading||loading) && (
        <div className="loading" style={{padding:'16px 0'}}>
          <div className="spin"/>
          <div className="load-t">{ragLoading?'YouTube · 뉴스 수집 중...':'베트남어 카피 생성 중...'}</div>
        </div>
      )}
      {error && <div className="warn">⚠️ {error}</div>}

      {/* 메인 레이아웃 */}
      <div style={{display:'grid', gridTemplateColumns:'3fr 2fr', gap:18, alignItems:'start'}}>

        {/* 왼쪽: 텍스트 편집 + 스타일 */}
        <div style={{display:'flex', flexDirection:'column', gap:10}}>

          {/* 텍스트 필드 */}
          {[
            { key:'headline', label:'헤드라인', color:'var(--lime)',   rows:2 },
            { key:'body',     label:'본문',     color:'var(--purple)', rows:3 },
            { key:'cta',      label:'CTA',      color:'var(--amber)',  rows:1 },
            { key:'source',   label:'출처',     color:'var(--teal)',   rows:1 },
          ].map(({key,label,color,rows}) => (
            <div key={key}>
              <div style={{fontSize:10,color,fontWeight:700,marginBottom:4}}>{label}</div>
              <textarea
                value={text[key]}
                onChange={e => setText(p => ({...p, [key]:e.target.value}))}
                rows={rows}
                style={{
                  width:'100%', background:'var(--s2)', border:'1px solid var(--b1)',
                  borderRadius:6, padding:'7px 10px', color:'var(--tx1)', fontSize:12,
                  resize:'vertical', fontFamily:'inherit', lineHeight:1.5,
                }}
              />
            </div>
          ))}

          {/* 해시태그 */}
          <div>
            <div style={{fontSize:10,color:'var(--purple)',fontWeight:700,marginBottom:4}}>해시태그</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
              {text.hashtags.map(t => (
                <span key={t} style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:'rgba(167,139,250,.12)',color:'var(--purple)'}}>{t}</span>
              ))}
            </div>
          </div>

          {/* 이미지 업로드 */}
          <div>
            <div style={{fontSize:10,color:'var(--tx3)',fontWeight:700,marginBottom:4}}>
              이미지 {imgSrc ? '— YouTube 자동 크롤링' : '— 직접 업로드'}
            </div>
            <label style={{
              display:'flex',alignItems:'center',gap:8,cursor:'pointer',
              padding:'8px 12px',background:'var(--s2)',border:'1px dashed var(--b1)',
              borderRadius:6,fontSize:11,color:'var(--tx3)',
            }}>
              📸 {imgSrc ? '이미지 변경' : '이미지 업로드'}
              <input type="file" accept="image/*" style={{display:'none'}} onChange={e => {
                const f = e.target.files?.[0]; if(!f) return
                const reader = new FileReader()
                reader.onload = ev => { setImgSrc(ev.target.result); setImgCredit('') }
                reader.readAsDataURL(f)
              }} />
            </label>
          </div>

          {/* 스타일 컨트롤 */}
          <div style={{background:'var(--s1)',border:'1px solid var(--b1)',borderRadius:'var(--r)',padding:'12px 14px'}}>
            <div style={{fontSize:10,color:'var(--tx3)',fontWeight:700,marginBottom:10,letterSpacing:'.06em'}}>텍스트 스타일</div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <SliderRow label="글자 크기" value={sty.fontSize}       min={28} max={80}  unit="px" onChange={v => up('fontSize',v)} />
              <SliderRow label="자간"     value={sty.letterSpacing}   min={-4} max={12} step={0.5} unit="px" onChange={v => up('letterSpacing',v)} />
              <SliderRow label="행간"     value={sty.lineHeight}      min={1.1} max={2.4} step={0.1} onChange={v => up('lineHeight',v)} />
              <SliderRow label="배경 투명도" value={sty.textBgOpacity} min={0} max={100} step={5} unit="%" onChange={v => up('textBgOpacity',v)} />
              <ColorRow  label="배경색"   value={sty.textBgColor}  onChange={v => up('textBgColor',v)} />
              <ColorRow  label="텍스트색" value={sty.textColor}    onChange={v => up('textColor',v)} />
            </div>
          </div>

          {/* 다른 포맷 */}
          {hasContext && (
            <div style={{display:'flex',gap:6,paddingTop:4}}>
              <button className="btn-g" style={{fontSize:11,padding:'7px 0',flex:1}}
                onClick={() => router.push(`/short?artist=${encodeURIComponent(artist)}&topic=${encodeURIComponent(topic)}&type=${encodeURIComponent(type)}&hook=${encodeURIComponent(hook)}&reason=${encodeURIComponent(reason)}&keywords=${encodeURIComponent(keywords)}&videoId=${encodeURIComponent(videoId)}`)}>
                🎬 숏폼으로
              </button>
              <button className="btn-g" style={{fontSize:11,padding:'7px 0',flex:1}}
                onClick={() => router.push(`/card?artist=${encodeURIComponent(artist)}&topic=${encodeURIComponent(topic)}&type=${encodeURIComponent(type)}&hook=${encodeURIComponent(hook)}&reason=${encodeURIComponent(reason)}&keywords=${encodeURIComponent(keywords)}&videoId=${encodeURIComponent(videoId)}`)}>
                🎨 카드뉴스로
              </button>
            </div>
          )}
        </div>

        {/* 오른쪽: 프리뷰 */}
        <div ref={previewRef} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,position:'sticky',top:16}}>

          {/* 포맷 선택 */}
          <div style={{display:'flex',gap:4,width:'100%'}}>
            {Object.entries(FMTS).map(([f, {label:lb}]) => (
              <button key={f} onClick={() => setFmt(f)} style={{
                fontSize:10, padding:'4px 0', flex:1, borderRadius:6, border:'none', cursor:'pointer', fontWeight:700,
                background: fmt===f ? 'var(--lime)' : 'var(--s2)',
                color: fmt===f ? '#000' : 'var(--tx3)',
              }}>
                {f}
              </button>
            ))}
          </div>
          <div style={{fontSize:9,color:'var(--tx3)',textAlign:'center',width:'100%'}}>{label}</div>

          {/* WYSIWYG 프리뷰 (CSS transform scale) */}
          <div style={{width:previewW, height:previewH, overflow:'hidden', position:'relative', borderRadius:10, border:'1.5px solid rgba(255,255,255,0.15)', boxShadow:'0 0 0 1px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.5)'}}>
            <div style={{
              width:W, height:H,
              transform:`scale(${sc})`, transformOrigin:'top left', willChange:'transform',
              position:'absolute', top:0, left:0,
              background:'#0a0a12', fontFamily:'sans-serif',
            }}>
              {/* 이미지 영역 */}
              <div style={{width:'100%', height:H*imgFrac, position:'relative', overflow:'hidden', background:'#111'}}>
                {imgSrc
                  ? <img src={imgSrc} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                  : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',opacity:.2,fontSize:80}}>📸</div>
                }
                <div style={{position:'absolute',bottom:0,left:0,right:0,height:'45%',background:`linear-gradient(transparent,${bgRgba})`}} />
              </div>

              {/* 텍스트 영역 */}
              <div style={{
                background:bgRgba,
                padding:'56px 64px 48px',
                display:'flex', flexDirection:'column', gap:20,
                minHeight: H*(1-imgFrac),
              }}>
                {artist && (
                  <span style={{
                    fontSize:26, fontWeight:700, color:'#bef264',
                    padding:'6px 18px', borderRadius:24, alignSelf:'flex-start',
                    background:'rgba(190,242,100,0.15)',
                  }}>
                    {artist}
                  </span>
                )}
                <div style={{
                  fontSize:sty.fontSize, fontWeight:700, color:sty.textColor,
                  letterSpacing:sty.letterSpacing+'px', lineHeight:sty.lineHeight,
                  wordBreak:'keep-all',
                }}>
                  {text.headline || (hasContext ? '...' : '헤드라인')}
                </div>
                <div style={{
                  fontSize:sty.fontSize*0.72, color:sty.textColor+'bb',
                  letterSpacing:sty.letterSpacing*0.8+'px', lineHeight:sty.lineHeight,
                  wordBreak:'keep-all',
                }}>
                  {text.body || (hasContext ? '' : '본문 내용이 여기 표시됩니다.')}
                </div>
                {text.cta && (
                  <div style={{fontSize:sty.fontSize*0.65, fontWeight:700, color:'#bef264'}}>
                    {text.cta}
                  </div>
                )}
                {text.hashtags.length > 0 && (
                  <div style={{fontSize:sty.fontSize*0.52, color:'rgba(167,139,250,0.75)'}}>
                    {text.hashtags.join(' ')}
                  </div>
                )}
                {text.source && (
                  <div style={{fontSize:sty.fontSize*0.48, color:'rgba(255,255,255,0.3)'}}>
                    {text.source}
                  </div>
                )}
              </div>
            </div>
          </div>

          <button className="btn" style={{fontSize:12,padding:'9px 0',fontWeight:700,width:'100%'}} onClick={exportPng}>
            ⬇ PNG 저장 ({fmt})
          </button>
          <div style={{fontSize:9,color:'var(--tx3)',textAlign:'center'}}>
            {W} × {H}px · 고해상도
          </div>
        </div>
      </div>

      {/* 출처 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, padding: '5px 10px', background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)' }}>
        <span style={{ fontSize: 9, color: 'var(--tx3)', fontWeight: 700, letterSpacing: '.05em', whiteSpace: 'nowrap', flexShrink: 0 }}>이미지 출처</span>
        <input
          type="text"
          value={imgCredit}
          onChange={e => setImgCredit(e.target.value)}
          placeholder="이미지 출처 URL (YouTube 크롤링 시 자동 채워짐)"
          style={{ flex: 1, background: 'transparent', border: 'none', fontSize: 10, color: 'var(--tx3)', outline: 'none', fontFamily: 'inherit' }}
        />
      </div>
    </>
  )
}

export default function NewsPage() {
  return (
    <Suspense fallback={<div className="loading"><div className="spin"/></div>}>
      <NewsInner />
    </Suspense>
  )
}
