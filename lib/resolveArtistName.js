/**
 * 아티스트 영문명 해석기
 *
 * 우선순위:
 *   1. 정적 매핑 테이블 (artistNames.js) — 비용 0, 즉시
 *   2. 런타임 인메모리 캐시 — 같은 서버 인스턴스 내 재검색 방지
 *   3. Gemini Google Search grounding — 테이블에 없는 신규 아티스트 대응
 */

import { ARTIST_NAME_MAP } from './artistNames'

// 서버 인스턴스 내 런타임 캐시 (재시작 시 초기화됨)
const _cache = new Map()

/**
 * 소스 텍스트 전체에서 알려진 한국어 이름을 스캔해
 * { 키나: 'Keena', 보이넥스트도어: 'BOYNEXTDOOR', ... } 형태로 반환
 */
export function scanSourceForNames(sourceText) {
  if (!sourceText) return {}
  const found = {}

  // 1. 정적 테이블
  for (const [ko, en] of Object.entries(ARTIST_NAME_MAP)) {
    if (sourceText.includes(ko)) found[ko] = en
  }

  // 2. 런타임 캐시 (이번 서버 세션 중 Gemini가 발견한 이름)
  for (const [ko, en] of _cache) {
    if (sourceText.includes(ko) && !found[ko]) found[ko] = en
  }

  return found
}

/**
 * 단일 한국어 이름을 공식 영문명으로 해석
 * 테이블/캐시 미스 시 Gemini 검색 수행 (비동기)
 * @returns {Promise<string|null>}  영문명 또는 null (확인 불가)
 */
export async function resolveArtistName(koName) {
  if (!koName) return null

  // 1. 정적 테이블
  if (ARTIST_NAME_MAP[koName]) return ARTIST_NAME_MAP[koName]

  // 2. 런타임 캐시
  if (_cache.has(koName)) return _cache.get(koName)

  // 3. Gemini 검색
  const enName = await _searchWithGemini(koName)
  if (enName) {
    _cache.set(koName, enName)
    // 개발 환경에서 새로 발견된 이름 로그 → 나중에 테이블에 추가할 수 있도록
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[artistName] Gemini 발견: '${koName}' → '${enName}'  (lib/artistNames.js에 추가 권장)`)
    }
  }

  return enName || null
}

/**
 * Gemini 2.0 Flash + Google Search grounding으로 영문명 검색
 * @returns {Promise<string|null>}
 */
async function _searchWithGemini(koName) {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `K-pop 아티스트 또는 멤버 "${koName}"의 공식 영문 스테이지 네임(official English stage name)을 알려주세요.\n\n규칙:\n- 공식 표기만 답하세요 (예: "Keena", "BOYNEXTDOOR", "LE SSERAFIM")\n- 확실하지 않으면 정확히 "UNKNOWN"이라고만 답하세요\n- 설명, 부연, 마침표 없이 이름만 한 줄로 답하세요`,
            }],
          }],
          tools: [{ google_search: {} }],
          generationConfig: { maxOutputTokens: 30, temperature: 0 },
        }),
      }
    )

    const data = await res.json()
    if (data.error) {
      console.warn('[artistName] Gemini 검색 오류:', data.error.message)
      return null
    }

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''

    // "UNKNOWN" 또는 빈 응답 처리
    if (!raw || raw.toUpperCase() === 'UNKNOWN') return null

    // 첫 줄만 추출, 따옴표 제거
    const cleaned = raw.split('\n')[0].replace(/^["']|["']$/g, '').trim()

    // 검증: 한글이 포함되어 있거나 너무 길면 신뢰하지 않음
    if (/[가-힣]/.test(cleaned)) return null
    if (cleaned.length > 40) return null
    if (cleaned.length < 1) return null

    return cleaned
  } catch (e) {
    console.warn('[artistName] Gemini 검색 예외:', e.message)
    return null
  }
}
