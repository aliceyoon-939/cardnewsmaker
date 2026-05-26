'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return '방금'
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}일 전`
  return `${Math.floor(d / 30)}개월 전`
}

function detectLang(text) {
  // 한글 포함 → 한국어
  if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(text)) return 'ko'
  // 베트남어 성조 포함
  if (/[àáâãèéêìíòóôõùúýăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(text)) return 'vi'
  // 일본어 (히라가나·카타카나) — 한자보다 먼저 체크해야 일본어 문장이 중국어로 오판되지 않음
  if (/[぀-ヿ]/.test(text)) return 'ja'
  // 한자 (일본어 제외 후) → 중국어
  if (/[一-鿿]/.test(text)) return 'zh'
  // 영어/기타
  return 'en'
}

function langLabel(code) {
  const m = { ko: '🇰🇷 한국어', vi: '🇻🇳 베트남어', en: '🇺🇸 영어', zh: '🇨🇳 중국어', ja: '🇯🇵 일본어' }
  return m[code] || '🌐 기타'
}

function CommentCard({ c, artist }) {
  const [trans, setTrans] = useState({})   // { ko: string, vi: string }
  const [loading, setLoading] = useState({ ko: false, vi: false })
  const lang = detectLang(c.text)

  async function translate(target) {
    if (trans[target] || loading[target]) return
    setLoading(p => ({ ...p, [target]: true }))
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: c.text, target, artist }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setTrans(p => ({ ...p, [target]: data[target] }))
    } catch (e) {
      setTrans(p => ({ ...p, [target]: `⚠️ ${e.message}` }))
    }
    setLoading(p => ({ ...p, [target]: false }))
  }

  return (
    <div style={{
      background: 'var(--s2)',
      border: '1px solid var(--b1)',
      borderRadius: 'var(--r)',
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--purple2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {c.author?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx1)' }}>{c.author}</div>
            <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 1 }}>
              {langLabel(lang)} · {timeAgo(c.publishedAt)}
            </div>
          </div>
        </div>
        {c.likes > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'rgba(251,191,36,.12)', borderRadius: 20,
            padding: '5px 12px',
          }}>
            <span style={{ fontSize: 14 }}>♥</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--amber)' }}>
              {c.likes.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* 원문 */}
      <div style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--tx1)', wordBreak: 'break-word' }}>
        {c.text}
      </div>

      {/* 번역 버튼 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {lang !== 'ko' && (
          <button
            className="btn-g"
            style={{ fontSize: 13, padding: '7px 16px', fontWeight: 600 }}
            onClick={() => translate('ko')}
            disabled={loading.ko}
          >
            {loading.ko ? '번역 중...' : trans.ko ? '🇰🇷 한국어 번역됨' : '🇰🇷 한국어로 번역'}
          </button>
        )}
        {lang !== 'vi' && (
          <button
            className="btn-g"
            style={{ fontSize: 13, padding: '7px 16px', fontWeight: 600 }}
            onClick={() => translate('vi')}
            disabled={loading.vi}
          >
            {loading.vi ? '번역 중...' : trans.vi ? '🇻🇳 베트남어 번역됨' : '🇻🇳 베트남어로 번역'}
          </button>
        )}
        {lang === 'ko' && (
          <button
            className="btn-g"
            style={{ fontSize: 13, padding: '7px 16px', fontWeight: 600 }}
            onClick={() => translate('vi')}
            disabled={loading.vi}
          >
            {loading.vi ? '번역 중...' : trans.vi ? '🇻🇳 베트남어 번역됨' : '🇻🇳 베트남어로 번역'}
          </button>
        )}
      </div>

      {/* 번역 결과 */}
      {(trans.ko || trans.vi) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--b1)', paddingTop: 12 }}>
          {trans.ko && (
            <div style={{ background: 'rgba(124,58,237,.08)', borderRadius: 'var(--r-sm)', padding: '12px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--purple)', marginBottom: 6, letterSpacing: '.06em' }}>
                🇰🇷 한국어 번역
              </div>
              <div style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--tx1)' }}>{trans.ko}</div>
            </div>
          )}
          {trans.vi && (
            <div style={{ background: 'rgba(45,212,191,.08)', borderRadius: 'var(--r-sm)', padding: '12px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal)', marginBottom: 6, letterSpacing: '.06em' }}>
                🇻🇳 베트남어 번역
              </div>
              <div style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--tx1)' }}>{trans.vi}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FanReactContent() {
  const router = useRouter()
  const params = useSearchParams()
  const videoId = params.get('videoId')
  const artist  = params.get('artist')
  const title   = params.get('title')

  const [tab, setTab] = useState('all')   // 'all' | 'vi'

  // 전체 인기 댓글
  const [comments, setComments] = useState([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  // 베트남어 댓글
  const [viComments, setViComments]   = useState([])
  const [viTotal, setViTotal]         = useState(0)
  const [viScanned, setViScanned]     = useState(0)
  const [viLoading, setViLoading]     = useState(false)
  const [viError, setViError]         = useState('')
  const [viLoaded, setViLoaded]       = useState(false)

  const loadComments = useCallback(async () => {
    if (!videoId) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/comments?videoId=${videoId}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setComments(data.comments || [])
      setTotal(data.total || 0)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }, [videoId])

  const loadViComments = useCallback(async () => {
    if (!videoId || viLoading) return
    setViLoading(true)
    setViError('')
    try {
      const res = await fetch(`/api/comments?videoId=${videoId}&lang=vi`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setViComments(data.comments || [])
      setViTotal(data.total || 0)
      setViScanned(data.scanned || 0)
      setViLoaded(true)
    } catch (e) {
      setViError(e.message)
    }
    setViLoading(false)
  }, [videoId])

  useEffect(() => { loadComments() }, [loadComments])

  // 베트남어 탭 첫 진입 시 lazy load
  useEffect(() => {
    if (tab === 'vi' && !viLoaded && !viLoading) {
      loadViComments()
    }
  }, [tab, viLoaded, viLoading, loadViComments])

  // 언어별 통계 (전체 탭)
  const langStats = comments.reduce((acc, c) => {
    const l = detectLang(c.text)
    acc[l] = (acc[l] || 0) + 1
    return acc
  }, {})

  const activeLoading = tab === 'all' ? loading : viLoading
  const activeError   = tab === 'all' ? error   : viError

  return (
    <>
      {/* 헤더 */}
      <div className="top-row" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <button
            style={{ fontSize: 13, color: 'var(--tx3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => router.back()}
          >
            ← 트렌드서치로 돌아가기
          </button>
          <div className="sec-title" style={{ fontSize: 22 }}>💬 팬 반응</div>
          <div className="sec-sub" style={{ fontSize: 14 }}>
            {artist && <strong style={{ color: 'var(--tx1)' }}>{artist}</strong>}
            {title && <span style={{ color: 'var(--tx3)', marginLeft: 6 }}>· {title.slice(0, 40)}{title.length > 40 ? '...' : ''}</span>}
          </div>
        </div>
        <button
          className="btn-g"
          style={{ fontSize: 12, padding: '7px 14px', flexShrink: 0 }}
          onClick={() => tab === 'all' ? loadComments() : loadViComments()}
        >
          ↻ 새로고침
        </button>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { id: 'all', label: '🏆 전체 인기 댓글' },
          { id: 'vi',  label: '🇻🇳 베트남어 댓글' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 18px',
              borderRadius: 20,
              border: tab === t.id ? '1.5px solid var(--lime)' : '1.5px solid var(--b1)',
              background: tab === t.id ? 'rgba(190,242,100,.12)' : 'var(--s2)',
              color: tab === t.id ? 'var(--lime)' : 'var(--tx2)',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              transition: 'all .15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 전체 탭 — 통계 배지 */}
      {tab === 'all' && !loading && comments.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
          <span style={{
            fontSize: 13, padding: '5px 14px', borderRadius: 20, fontWeight: 600,
            background: 'rgba(190,242,100,.1)', color: 'var(--lime)',
            border: '1px solid rgba(190,242,100,.2)',
          }}>
            전체 {total.toLocaleString()}개 댓글
          </span>
          {Object.entries(langStats)
            .sort((a, b) => b[1] - a[1])
            .map(([l, n]) => (
              <span key={l} style={{
                fontSize: 12, padding: '5px 12px', borderRadius: 20,
                background: 'var(--s2)', color: 'var(--tx2)',
                border: '1px solid var(--b1)',
              }}>
                {langLabel(l)} {n}개
              </span>
            ))}
        </div>
      )}

      {/* 베트남어 탭 — 스캔 통계 */}
      {tab === 'vi' && !viLoading && viLoaded && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
          <span style={{
            fontSize: 13, padding: '5px 14px', borderRadius: 20, fontWeight: 600,
            background: 'rgba(45,212,191,.1)', color: 'var(--teal)',
            border: '1px solid rgba(45,212,191,.2)',
          }}>
            {viScanned.toLocaleString()}개 댓글 스캔 · 베트남어 {viComments.length}개 발견
          </span>
          <span style={{
            fontSize: 12, padding: '5px 12px', borderRadius: 20,
            background: 'var(--s2)', color: 'var(--tx3)',
            border: '1px solid var(--b1)',
          }}>
            전체 {viTotal.toLocaleString()}개 댓글 중
          </span>
        </div>
      )}

      {/* 로딩 */}
      {activeLoading && (
        <div className="loading" style={{ padding: '48px 0' }}>
          <div className="spin" />
          <div className="load-t" style={{ fontSize: 17 }}>
            {tab === 'vi' ? '베트남어 댓글 수집 중...' : 'YouTube 팬 댓글 수집 중...'}
          </div>
          <div className="load-s" style={{ fontSize: 14 }}>
            {tab === 'vi' ? '최대 300개 댓글 스캔 · 좋아요순 상위 20개' : '인기순 상위 댓글 · YouTube Data API'}
          </div>
        </div>
      )}

      {/* 에러 */}
      {!activeLoading && activeError && (
        <div className="warn" style={{ fontSize: 15 }}>
          ⚠️ {activeError}
          <div style={{ marginTop: 6, fontSize: 13 }}>YouTube API 키 또는 해당 영상의 댓글이 비활성화된 경우 발생합니다.</div>
        </div>
      )}

      {/* 전체 탭 — 댓글 없음 */}
      {tab === 'all' && !loading && !error && comments.length === 0 && (
        <div className="warn" style={{ fontSize: 15 }}>댓글을 불러올 수 없습니다.</div>
      )}

      {/* 베트남어 탭 — 댓글 없음 */}
      {tab === 'vi' && !viLoading && !viError && viLoaded && viComments.length === 0 && (
        <div className="warn" style={{ fontSize: 15 }}>베트남어 댓글을 찾지 못했습니다.</div>
      )}

      {/* 전체 탭 — 댓글 목록 */}
      {tab === 'all' && !loading && !error && comments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {comments.map((c, i) => (
            <CommentCard key={i} c={c} artist={artist} />
          ))}
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--tx3)', padding: '12px 0' }}>
            인기순 상위 {comments.length}개 표시 · 전체 {total.toLocaleString()}개 댓글 중
          </div>
        </div>
      )}

      {/* 베트남어 탭 — 댓글 목록 */}
      {tab === 'vi' && !viLoading && !viError && viComments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {viComments.map((c, i) => (
            <CommentCard key={i} c={c} artist={artist} />
          ))}
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--tx3)', padding: '12px 0' }}>
            좋아요 순 상위 {viComments.length}개 표시 · {viScanned.toLocaleString()}개 댓글 스캔
          </div>
        </div>
      )}
    </>
  )
}

export default function FanReactPage() {
  return (
    <Suspense fallback={
      <div className="loading" style={{ padding: '48px 0' }}>
        <div className="spin" />
        <div className="load-t">로딩 중...</div>
      </div>
    }>
      <FanReactContent />
    </Suspense>
  )
}
