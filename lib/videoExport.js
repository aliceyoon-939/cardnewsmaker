// ── 영상 내보내기 (브라우저 Canvas + MediaRecorder) ───────────────
// React 의존성 없는 순수 async 함수.
// page.jsx에서 state 값을 인자로 넘겨 호출한다.

import { sleep, parseDuration, imgLoad, drawScene, drawTransition } from '@/lib/canvasUtils'

const W   = 720
const H   = 1280
const FPS = 30
const TX_SEC = 0.5   // 전환 효과 길이(초)

/**
 * 씬 배열을 WebM 영상으로 렌더링하고 자동 다운로드한다.
 *
 * @param {object} params
 * @param {Array}  params.scenes           result.scenes 배열
 * @param {Array}  params.sceneImages      씬별 이미지 URL 배열
 * @param {Array}  params.sceneTransitions 씬 사이 전환 효과 ID 배열
 * @param {'vi'|'ko'} params.lang          자막 언어
 * @param {object} params.subtitleOpts     { fontSize, color, fontFamily, bold, shadow }
 * @param {string} params.artist           파일명에 사용할 아티스트명
 * @param {string} params.topic            파일명에 사용할 주제
 * @param {function} params.onProgress     진행도 콜백 (0~100)
 * @param {{ current: boolean }} params.cancelRef  취소 ref (true 로 설정하면 중단)
 */
export async function exportVideo({
  scenes,
  sceneImages,
  sceneTransitions,
  lang,
  subtitleOpts,
  artist,
  topic,
  onProgress,
  cancelRef,
}) {
  // 이미지 사전 로딩
  const imgs = await Promise.all(sceneImages.map(u => imgLoad(u)))

  // 전체 시간(초) 계산 → 진행도 계산에 사용
  const totalSec = scenes.reduce((s, sc) => s + parseDuration(sc), 0)
                 + (scenes.length - 1) * TX_SEC
  let elapsed = 0

  // Canvas / MediaRecorder 설정
  const canvas    = document.createElement('canvas')
  canvas.width    = W
  canvas.height   = H
  const ctx       = canvas.getContext('2d', { alpha: false })
  const mimeType  = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm'
  const stream    = canvas.captureStream(FPS)
  const recorder  = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 })
  const chunks    = []
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

  await new Promise((resolve, reject) => {
    recorder.onstop  = resolve
    recorder.onerror = reject
    recorder.start(200)

    ;(async () => {
      for (let i = 0; i < scenes.length; i++) {
        if (cancelRef.current) { recorder.stop(); return }

        const s       = scenes[i]
        const img     = imgs[i] || null
        const nextImg = i < scenes.length - 1 ? (imgs[i + 1] || null) : null
        const tx      = sceneTransitions[i] || 'cut'
        const dur     = parseDuration(s)

        // 씬 프레임
        const sceneFrames = Math.round(dur * FPS)
        for (let f = 0; f < sceneFrames; f++) {
          if (cancelRef.current) { recorder.stop(); return }
          drawScene(ctx, W, H, img, s, f / sceneFrames, lang, subtitleOpts)
          await sleep(1000 / FPS)
          elapsed += 1 / FPS
          onProgress(Math.min(98, Math.round(elapsed / totalSec * 100)))
        }

        // 전환 프레임 (마지막 씬 제외, cut은 건너뜀)
        if (i < scenes.length - 1 && tx !== 'cut') {
          const txFrames = Math.round(TX_SEC * FPS)
          for (let f = 0; f < txFrames; f++) {
            if (cancelRef.current) { recorder.stop(); return }
            drawTransition(ctx, W, H, img, nextImg, tx, f / txFrames, s, scenes[i + 1], lang, subtitleOpts)
            await sleep(1000 / FPS)
            elapsed += 1 / FPS
            onProgress(Math.min(98, Math.round(elapsed / totalSec * 100)))
          }
        }
      }
      recorder.stop()
    })().catch(reject)
  })

  // 취소되지 않았으면 파일 다운로드
  if (!cancelRef.current) {
    onProgress(100)
    const blob     = new Blob(chunks, { type: mimeType })
    const url      = URL.createObjectURL(blob)
    const a        = document.createElement('a')
    a.href         = url
    a.download     = `${artist || 'short'}_${(topic || 'video').slice(0, 24)}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 3000)
  }
}
