// ── 캔버스 렌더링 유틸리티 ─────────────────────────────────────
// 숏폼 영상 내보내기에서 사용하는 순수 함수 모음.
// React 의존성 없음 — 어디서든 import 가능.

export const sleep = ms => new Promise(r => setTimeout(r, ms))
export const ease  = p  => p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p  // ease-in-out

/** scene 객체(또는 time 문자열)에서 재생 시간(초)을 추출 */
export function parseDuration(scene) {
  if (typeof scene === 'object') {
    if (typeof scene.duration === 'number' && scene.duration > 0) return scene.duration
    const m = scene.time?.match(/(\d+):(\d+)[~\-–](\d+):(\d+)/)
    if (m) return (parseInt(m[3]) * 60 + parseInt(m[4])) - (parseInt(m[1]) * 60 + parseInt(m[2]))
  }
  if (typeof scene === 'string') {
    const m = scene.match(/(\d+)[~\-–](\d+)/)
    if (m) return Math.max(2, parseInt(m[2]) - parseInt(m[1]))
  }
  return 4
}

/** URL → HTMLImageElement (crossOrigin 설정, 실패 시 null) */
export function imgLoad(url) {
  return new Promise(res => {
    if (!url) return res(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload  = () => res(img)
    img.onerror = () => res(null)
    img.src = url
  })
}

/** ctx에서 text를 maxW 너비 기준으로 줄바꿈한 문자열 배열 반환 */
export function wrapLines(ctx, text, maxW) {
  if (!text) return []
  const words = text.split(' ')
  const lines = []
  let line = ''
  for (const word of words) {
    const test = line ? line + ' ' + word : word
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word }
    else line = test
  }
  if (line) lines.push(line)
  return lines
}

/** 자막 크기 비율 맵 (canvas 너비 대비) */
export const SUB_SIZE_MAP = { sm: 0.050, md: 0.066, lg: 0.084, xl: 0.100 }

/** 자막 폰트 목록 */
export const SUB_FONTS = [
  { id: 'sans-serif',               label: '기본 (고딕)' },
  { id: '"Arial Black", sans-serif', label: 'Arial Black' },
  { id: 'Impact, sans-serif',       label: 'Impact' },
  { id: 'Georgia, serif',           label: 'Georgia' },
  { id: '"Courier New", monospace', label: 'Courier' },
]

/**
 * 단일 씬을 canvas에 렌더링한다.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W  canvas 너비
 * @param {number} H  canvas 높이
 * @param {HTMLImageElement|null} img  배경 이미지
 * @param {object} scene  씬 데이터 { ko, vi, ... }
 * @param {number} progress  씬 내 진행도 0~1 (Ken Burns용)
 * @param {'ko'|'vi'} lang  렌더링할 자막 언어
 * @param {object} opts  자막 스타일 옵션
 */
export function drawScene(ctx, W, H, img, scene, progress, lang, opts = {}) {
  const {
    fontSize   = 'md',
    color      = '#ffffff',
    fontFamily = 'sans-serif',
    bold       = true,
    shadow     = true,
  } = opts

  // 배경: 이미지(Ken Burns 줌인) 또는 그레이디언트
  if (img) {
    const sc = 1 + progress * 0.06
    ctx.save()
    ctx.translate(W / 2, H / 2)
    ctx.scale(sc, sc)
    ctx.drawImage(img, -W / 2, -H / 2, W, H)
    ctx.restore()
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#0f172a')
    g.addColorStop(1, '#1e293b')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }

  // 하단 스크림 (자막 가독성)
  const scrim = ctx.createLinearGradient(0, H * 0.3, 0, H)
  scrim.addColorStop(0, 'rgba(0,0,0,0)')
  scrim.addColorStop(1, 'rgba(0,0,0,0.88)')
  ctx.fillStyle = scrim
  ctx.fillRect(0, 0, W, H)

  // 선택 언어 자막 렌더링
  const text = lang === 'vi'
    ? (scene.vi || scene.ko || '')
    : (scene.ko || scene.vi || '')
  if (!text) return

  const mainSz = Math.round(W * (SUB_SIZE_MAP[fontSize] || 0.066))
  const lineH  = mainSz * 1.46
  const weight = bold ? '700' : '400'

  ctx.textAlign = 'center'
  ctx.font      = `${weight} ${mainSz}px ${fontFamily || 'sans-serif'}`
  const lines   = wrapLines(ctx, text, W * 0.86)
  const totalH  = lines.length * lineH
  const startY  = H - 72 - totalH

  if (shadow) {
    ctx.shadowColor   = 'rgba(0,0,0,0.85)'
    ctx.shadowBlur    = Math.round(mainSz * 0.22)
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 2
  }
  ctx.fillStyle = color
  lines.forEach((l, i) => ctx.fillText(l, W / 2, startY + i * lineH + mainSz))
  ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0
}

/**
 * 두 씬 사이의 전환 효과를 canvas에 렌더링한다.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W
 * @param {number} H
 * @param {HTMLImageElement|null} img1  이전 씬 이미지
 * @param {HTMLImageElement|null} img2  다음 씬 이미지
 * @param {'cut'|'fade'|'dissolve'|'slide'|'zoom'|'glitch'} type
 * @param {number} rawP  진행도 0~1 (easing 적용 전)
 * @param {object} s1  이전 씬 데이터
 * @param {object} s2  다음 씬 데이터
 * @param {'ko'|'vi'} lang
 * @param {object} opts  자막 스타일 옵션
 */
export function drawTransition(ctx, W, H, img1, img2, type, rawP, s1, s2, lang, opts) {
  const p = ease(rawP)

  if (type === 'dissolve') {
    drawScene(ctx, W, H, img1, s1, 1, lang, opts)
    ctx.globalAlpha = p
    drawScene(ctx, W, H, img2, s2, 0, lang, opts)
    ctx.globalAlpha = 1

  } else if (type === 'fade') {
    if (rawP < 0.5) {
      drawScene(ctx, W, H, img1, s1, 1, lang, opts)
      ctx.fillStyle = `rgba(0,0,0,${rawP * 2})`
      ctx.fillRect(0, 0, W, H)
    } else {
      drawScene(ctx, W, H, img2, s2, 0, lang, opts)
      ctx.fillStyle = `rgba(0,0,0,${(1 - rawP) * 2})`
      ctx.fillRect(0, 0, W, H)
    }

  } else if (type === 'slide') {
    ctx.save()
    ctx.beginPath(); ctx.rect(0, 0, W * (1 - p), H); ctx.clip()
    ctx.translate(-W * p, 0)
    drawScene(ctx, W, H, img1, s1, 1, lang, opts)
    ctx.restore()
    ctx.save()
    ctx.beginPath(); ctx.rect(W * (1 - p), 0, W * p, H); ctx.clip()
    ctx.translate(W * (1 - p), 0)
    drawScene(ctx, W, H, img2, s2, 0, lang, opts)
    ctx.restore()

  } else if (type === 'zoom') {
    const sc = 1 + p * 0.28
    ctx.save()
    ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -H / 2)
    drawScene(ctx, W, H, img1, s1, 1, lang, opts)
    ctx.restore()
    ctx.globalAlpha = p
    drawScene(ctx, W, H, img2, s2, 0, lang, opts)
    ctx.globalAlpha = 1

  } else if (type === 'glitch') {
    drawScene(ctx, W, H, img2, s2, 0, lang, opts)
    if (rawP < 0.75) {
      for (let g = 0; g < 7; g++) {
        const sy = Math.random() * H
        const sh = (Math.random() * 0.07 + 0.015) * H
        const ox = (Math.random() - 0.5) * W * 0.1
        ctx.save()
        ctx.beginPath(); ctx.rect(0, sy, W, sh); ctx.clip()
        if (img1) { ctx.translate(ox, 0); ctx.drawImage(img1, 0, 0, W, H) }
        ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '0,255,255' : '255,0,255'},0.28)`
        ctx.fillRect(-ox, sy, W + Math.abs(ox), sh)
        ctx.restore()
      }
      ctx.fillStyle = `rgba(0,0,0,${(1 - rawP) * 0.45})`
      ctx.fillRect(0, 0, W, H)
    }

  } else {
    // 'cut' 또는 미인식 타입 → 즉시 전환
    drawScene(ctx, W, H, img2, s2, 0, lang, opts)
  }
}
