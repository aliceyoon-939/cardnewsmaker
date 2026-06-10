'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

/* ── Utilities ──────────────────────────────────────────── */
function formatViews(n) {
  if (!n) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K'
  return n.toString()
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return '방금'
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

function daysSince(iso) {
  return iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : 0
}

function getBadge(item, maxTrendScore) {
  if (item._type === 'new')
    return { label: '신규', color: 'var(--teal)', bg: 'rgba(45,212,191,.12)' }
  const ratio = maxTrendScore > 0 ? (item.trendScore || 0) / maxTrendScore : 0
  if (item.rank <= 5 || ratio > 0.6)
    return { label: 'hot', color: 'var(--purple)', bg: 'rgba(167,139,250,.15)' }
  return { label: 'steady', color: 'var(--tx2)', bg: 'rgba(255,255,255,.06)' }
}

/* ── News utils (module-level) ──────────────────────────── */
const NEWS_ARTISTS = [
  'BTS','BLACKPINK','TWICE','aespa','NewJeans','LE SSERAFIM','IVE','STAYC','ITZY','NMIXX',
  'BABYMONSTER','ILLIT','RIIZE','ZEROBASEONE','BOYNEXTDOOR','Stray Kids','SEVENTEEN',
  'TXT','ENHYPEN','NCT','ATEEZ','SHINee','EXO','BIGBANG','SUPER JUNIOR','TVXQ',
  'Red Velvet','MAMAMOO','OH MY GIRL','LOONA','fromis_9','SF9','THE BOYZ','PENTAGON',
  'BTOB','VIXX','DAY6','MONSTA X','GOT7','AB6IX','CIX','ONEUS','CRAVITY','TEMPEST',
  'KATSEYE','KISS OF LIFE','tripleS','TWS','UNIS','MEOVV',
  'Taeyeon','Baekhyun','Taemin','Jennie','Jisoo','Lisa','Jimin','Jungkook','J-Hope',
  'IU','HyunA','Sunmi','CL','G-Dragon','Zico',
]

function extractArtistFromNews(title) {
  if (!title) return ''
  for (const a of NEWS_ARTISTS) {
    if (title.toLowerCase().includes(a.toLowerCase())) return a
  }
  return title.split(/[,\s]/)[0] || ''
}

/* ── TopicCard ──────────────────────────────────────────── */
const TYPE_STYLE = {
  비하인드: { bg: 'rgba(244,114,182,.15)', color: 'var(--pink)' },
  차트:    { bg: 'rgba(251,191,36,.12)',  color: 'var(--amber)' },
  컴백:    { bg: 'rgba(167,139,250,.15)', color: 'var(--purple)' },
  반응:    { bg: 'rgba(190,242,100,.1)',  color: 'var(--lime)' },
  리뷰:    { bg: 'rgba(45,212,191,.12)',  color: 'var(--teal)' },
  비교:    { bg: 'rgba(167,139,250,.15)', color: 'var(--purple)' },
}

function TopicCard({ topic, artist, onScript }) {
  const [picking, setPicking] = useState(false)
  const s = TYPE_STYLE[topic.type] || TYPE_STYLE['리뷰']
  return (
    <div style={{
      background: 'var(--s2)', border: `1px solid ${picking ? 'rgba(190,242,100,.25)' : 'var(--b1)'}`,
      borderRadius: 'var(--r-sm)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6,
      transition: 'border-color .15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 600, background: s.bg, color: s.color }}>{topic.type}</span>
        <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{topic.title}</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--tx2)', fontStyle: 'italic', lineHeight: 1.5 }}>"{topic.hook}"</div>
      <div style={{ fontSize: 10, color: 'var(--tx3)', lineHeight: 1.5 }}>{topic.reason}</div>
      {!picking ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn" style={{ fontSize: 10, padding: '5px 11px' }} onClick={() => setPicking(true)}>
            → 만들기
          </button>
        </div>
      ) : (
        <div style={{ borderTop: '1px solid var(--b1)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ fontSize: 10, color: 'var(--tx3)', marginBottom: 2 }}>포맷 선택</div>
          <div style={{ display: 'flex', gap: 5 }}>
            <button disabled style={{ fontSize: 11, padding: '6px 0', flex: 1, borderRadius: 'var(--r-sm)', background: 'var(--s3)', border: '1px solid var(--b1)', color: 'var(--tx3)', cursor: 'not-allowed', opacity: .45 }}>숏폼</button>
            <button className="btn-g" style={{ fontSize: 11, padding: '6px 0', flex: 1 }} onClick={() => onScript(topic, 'card')}>카드뉴스</button>
          </div>
          <button style={{ fontSize: 10, color: 'var(--tx3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }} onClick={() => setPicking(false)}>
            ← 취소
          </button>
        </div>
      )}
    </div>
  )
}

/* ── FeedRow ─────────────────────────────────────────────── */
function FeedRow({ item, isOpen, onToggle, anl, badge, onAnalyze, onScript, onShort, onCard }) {
  const isTrend = item._type === 'trending'
  const days    = daysSince(item.publishedAt)
  const isStale = isTrend && days >= 7

  return (
    <div>
      {/* Main row */}
      <div
        onClick={onToggle}
        style={{
          display: 'grid',
          gridTemplateColumns: '32px 96px 1fr 72px 72px 58px',
          gap: 8,
          alignItems: 'center',
          padding: '6px 10px',
          cursor: 'pointer',
          background: !isTrend ? 'rgba(45,212,191,.025)' : 'var(--s1)',
          border: `1px solid ${isOpen ? 'rgba(190,242,100,.22)' : 'var(--b1)'}`,
          borderRadius: isOpen ? 'var(--r-sm) var(--r-sm) 0 0' : 'var(--r-sm)',
          transition: 'background .15s, border-color .15s',
        }}
      >
        {/* 순위 */}
        <div style={{ textAlign: 'center', lineHeight: 1 }}>
          {isTrend ? (
            <span style={{
              fontSize: 12, fontWeight: 700,
              color: item.rank <= 3 ? 'var(--amber)' : 'var(--tx3)',
            }}>
              {item.rank}
            </span>
          ) : (
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal)', letterSpacing: '.02em' }}>N</span>
          )}
        </div>

        {/* 썸네일 */}
        <img
          src={item.thumbnail}
          alt=""
          style={{ width: 96, height: 60, objectFit: 'cover', borderRadius: 4, background: 'var(--s3)', display: 'block' }}
        />

        {/* 곡명 + 아티스트 */}
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: 'var(--tx1)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {item.title}
          </div>
          <div style={{
            fontSize: 10, color: 'var(--tx2)', marginTop: 2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {item.artist}
          </div>
          {isStale && (
            <div style={{ fontSize: 9, color: 'var(--amber)', marginTop: 1, fontWeight: 500 }}>
              {days}일째 트렌딩
            </div>
          )}
        </div>

        {/* 조회수 */}
        <div style={{
          fontSize: 11, color: 'var(--tx2)', textAlign: 'right',
          fontVariantNumeric: 'tabular-nums', fontWeight: 500,
        }}>
          {formatViews(item.totalViews || item.viewCount)}
        </div>

        {/* 일 상승폭 */}
        <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
          {isTrend ? (
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--lime2)' }}>
              +{formatViews(item.dailyViews)}
            </span>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--tx3)' }}>—</span>
          )}
        </div>

        {/* 상태 배지 */}
        <div style={{ textAlign: 'right' }}>
          <span style={{
            display: 'inline-block',
            fontSize: 9, padding: '2px 7px', borderRadius: 20, fontWeight: 700,
            background: badge.bg, color: badge.color,
            letterSpacing: '.04em', textTransform: 'uppercase',
          }}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* 확장 패널 */}
      {isOpen && (
        <div style={{
          background: 'var(--s1)',
          border: '1px solid rgba(190,242,100,.22)',
          borderTop: 'none',
          borderRadius: '0 0 var(--r-sm) var(--r-sm)',
          padding: '10px 12px',
        }}>
          {/* 액션 버튼 */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={onAnalyze}
              disabled={anl?.loading}
              style={{
                flex: 1, fontSize: 11, padding: '8px 0', fontWeight: 700,
                background: anl?.loading ? 'rgba(190,242,100,.4)' : anl?.data ? 'rgba(190,242,100,.15)' : 'var(--lime)',
                color: anl?.data ? 'var(--lime)' : '#000',
                border: anl?.data ? '1px solid rgba(190,242,100,.3)' : 'none',
                borderRadius: 'var(--r-sm)',
                cursor: anl?.loading ? 'not-allowed' : 'pointer',
                opacity: anl?.loading ? .7 : 1,
                transition: 'all .2s',
              }}
            >
              {anl?.loading ? '분석 중...' : anl?.data ? '분석 완료' : '컨텐츠 분석'}
            </button>
            <button className="btn-g" style={{ flex: 1, fontSize: 11, padding: '8px 0' }} onClick={onCard}>카드뉴스 제작</button>
            <button disabled style={{ flex: 1, fontSize: 11, padding: '8px 0', borderRadius: 'var(--r-sm)', background: 'var(--s3)', border: '1px solid var(--b1)', color: 'var(--tx3)', cursor: 'not-allowed', opacity: .45 }}>숏폼 제작</button>
            <a
              href={`https://www.youtube.com/watch?v=${item.videoId}`}
              target="_blank" rel="noopener noreferrer"
              className="btn-g"
              style={{
                flex: 1, fontSize: 11, padding: '8px 0',
                textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              YouTube ↗
            </a>
          </div>

          {/* 분석 로딩 */}
          {anl?.loading && (
            <div className="loading" style={{ padding: '14px 0' }}>
              <div className="spin" />
              <div className="load-t">YouTube 영상 분석 중...</div>
              <div className="load-s">Claude AI · 베트남 팬 트렌드</div>
            </div>
          )}

          {/* 분석 에러 */}
          {anl?.error && <div className="warn" style={{ marginTop: 8 }}>{anl.error}</div>}

          {/* 분석 결과 */}
          {anl?.data && (
            <div style={{ marginTop: 12 }}>
              {/* 베트남 팬 반응 */}
              {anl.data.fanComments?.length > 0 && (
                <div style={{
                  background: 'rgba(45,212,191,.06)', border: '1px solid rgba(45,212,191,.15)',
                  borderRadius: 'var(--r-sm)', padding: '8px 10px', marginBottom: 10,
                }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--teal)', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 5 }}>
                    베트남 팬 반응 반영
                  </div>
                  {anl.data.fanComments.map((c, i) => (
                    <div key={i} style={{ fontSize: 10, color: 'var(--tx2)', lineHeight: 1.4, marginBottom: i < anl.data.fanComments.length - 1 ? 4 : 0 }}>
                      "{c.text.slice(0, 70)}{c.text.length > 70 ? '…' : ''}"
                      {c.likes > 0 && <span style={{ color: 'var(--amber)', marginLeft: 5, fontSize: 9 }}>♥{c.likes}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* 주제 추천 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--tx3)', letterSpacing: '.07em', textTransform: 'uppercase' }}>AI 주제 추천</span>
                <span style={{ fontSize: 9, color: 'var(--tx3)' }}>· YouTube {anl.data.refVideos?.length}개 영상 분석</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {anl.data.topics.map((topic, i) => (
                  <TopicCard key={i} topic={topic} artist={item.artist} onScript={onScript} />
                ))}
              </div>
              <div style={{ fontSize: 9, color: 'var(--tx3)', marginTop: 8 }}>
                참고: {anl.data.refVideos?.map(v => `"${v.title.slice(0, 18)}..."`).join(' · ')}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── NewsItem (사이드바용) ───────────────────────────────── */
function NewsItem({ item, idx, isOpen, onToggle, onAction }) {
  const title = item.titleKo || item.title
  return (
    <div>
      <div
        onClick={() => onToggle(idx)}
        style={{
          padding: '8px 10px', cursor: 'pointer',
          background: isOpen ? 'rgba(190,242,100,.03)' : 'transparent',
          border: `1px solid ${isOpen ? 'rgba(190,242,100,.2)' : 'var(--b1)'}`,
          borderRadius: isOpen ? 'var(--r-sm) var(--r-sm) 0 0' : 'var(--r-sm)',
          transition: 'all .15s',
        }}
      >
        <div style={{
          fontSize: 11, fontWeight: 500, color: 'var(--tx1)',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', lineHeight: 1.5,
        }}>
          {title}
        </div>
        <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 3 }}>{item.timeLabel}</div>
      </div>
      {isOpen && (
        <div style={{
          background: 'var(--s1)', border: '1px solid rgba(190,242,100,.2)',
          borderTop: 'none', borderRadius: '0 0 var(--r-sm) var(--r-sm)',
          padding: '7px 10px', display: 'flex', gap: 4,
        }}>
          <button className="btn-g" style={{ fontSize: 10, padding: '5px 0', flex: 1 }} onClick={() => onAction(item, 'card')}>카드뉴스</button>
          <button disabled style={{ fontSize: 10, padding: '5px 0', flex: 1, borderRadius: 'var(--r-sm)', background: 'var(--s3)', border: '1px solid var(--b1)', color: 'var(--tx3)', cursor: 'not-allowed', opacity: .45 }}>숏폼</button>
          <a
            href={item.link} target="_blank" rel="noopener noreferrer"
            className="btn-g"
            style={{
              fontSize: 10, padding: '5px 10px',
              textDecoration: 'none', display: 'flex', alignItems: 'center',
            }}
          >
            원문 ↗
          </a>
        </div>
      )}
    </div>
  )
}

/* ── Main Page ──────────────────────────────────────────── */
export default function TrendPage() {
  const router = useRouter()

  const [trends,         setTrends]         = useState([])
  const [trendsLoading,  setTrendsLoading]  = useState(true)
  const [trendsError,    setTrendsError]    = useState('')
  const [updatedAt,      setUpdatedAt]      = useState('')
  const [releases,       setReleases]       = useState([])
  const [releasesLoading,setReleasesLoading]= useState(true)
  const [selected,       setSelected]       = useState(null)
  const [analysis,       setAnalysis]       = useState({})
  const [news,           setNews]           = useState([])
  const [newsLoading,    setNewsLoading]    = useState(true)
  const [selectedNews,   setSelectedNews]   = useState(null)
  const [filter,         setFilter]         = useState('전체')

  useEffect(() => { fetchTrends(); fetchReleases(); fetchNews() }, [])

  const isLoading = trendsLoading || releasesLoading

  /* ── 통합 피드 ─────────────────────────────────────────── */
  const feed = useMemo(() => {
    const trendIds = new Set(trends.map(t => t.videoId))
    const trendItems   = trends.map(t => ({ ...t, _type: 'trending' }))
    const releaseItems = releases
      .filter(r => !trendIds.has(r.videoId))
      .map(r => ({ ...r, _type: 'new', totalViews: r.viewCount }))
    return [...trendItems, ...releaseItems]
  }, [trends, releases])

  const filteredFeed = useMemo(() => {
    if (filter === '트렌딩') return feed.filter(i => i._type === 'trending')
    if (filter === '신규')   return feed.filter(i => i._type === 'new')
    return feed
  }, [feed, filter])

  const maxTrendScore = useMemo(
    () => Math.max(...trends.map(t => t.trendScore || 0), 1),
    [trends]
  )

  const newCount = useMemo(
    () => releases.filter(r => !trends.some(t => t.videoId === r.videoId)).length,
    [trends, releases]
  )


  /* ── Fetchers ──────────────────────────────────────────── */
  async function fetchTrends() {
    setTrendsLoading(true); setTrendsError('')
    try {
      const res = await fetch('/api/trends')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setTrends(data.trends || [])
      setUpdatedAt(data.updatedAt)
    } catch (e) { setTrendsError(e.message) }
    setTrendsLoading(false)
  }

  async function fetchReleases() {
    setReleasesLoading(true)
    try {
      const res = await fetch('/api/newreleases')
      const data = await res.json()
      setReleases(data.releases || [])
    } catch (e) { console.error('신곡 로딩 실패', e) }
    setReleasesLoading(false)
  }

  async function fetchNews() {
    setNewsLoading(true)
    try {
      const res = await fetch('/api/news')
      const data = await res.json()
      setNews(data.news || [])
    } catch (e) { console.error('뉴스 로딩 실패', e) }
    setNewsLoading(false)
  }

  function refreshAll() {
    fetch('/api/analyze?clearCache=true')  // 서버 분석 캐시 초기화
    fetch('/api/news?clearCache=true')     // 서버 뉴스 캐시 초기화
    setAnalysis({})                         // 클라이언트 분석 결과 초기화
    fetchTrends(); fetchReleases(); fetchNews()
  }

  async function analyzeArtist(item) {
    const key = item.videoId
    if (analysis[key]?.data || analysis[key]?.loading) return
    setAnalysis(prev => ({ ...prev, [key]: { loading: true, data: null, error: '' } }))
    try {
      const qs = new URLSearchParams({ artist: item.artist, title: item.title, videoId: item.videoId })
      const res = await fetch(`/api/analyze?${qs}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAnalysis(prev => ({ ...prev, [key]: { loading: false, data, error: '' } }))
    } catch (e) {
      setAnalysis(prev => ({ ...prev, [key]: { loading: false, data: null, error: e.message } }))
    }
  }

  function goScript(topic, fmt, artist, videoId) {
    const params = new URLSearchParams({
      artist, topic: topic.title, hook: topic.hook,
      reason: topic.reason, keywords: (topic.keywords || []).join(','),
      videoId: videoId || '',
    })
    router.push(`${fmt === 'card' ? '/card' : '/short'}?${params}`)
  }

  function goNewsScript(item, fmt) {
    const title  = item.titleKo || item.title
    const artist = extractArtistFromNews(title)
    const params = new URLSearchParams({ artist, topic: title })
    router.push(`${fmt === 'card' ? '/card' : '/short'}?${params}`)
  }

  /* ── Render ────────────────────────────────────────────── */
  const COLS = '32px 96px 1fr 72px 72px 58px'

  return (
    <>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-.3px' }}>트렌드서치</div>
          <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 2 }}>
            베트남 YouTube K-pop
            {updatedAt && ` · ${new Date(updatedAt).toLocaleDateString('ko-KR')} 기준`}
          </div>
        </div>
        <button className="btn-g" style={{ fontSize: 10, padding: '5px 10px' }} onClick={refreshAll}>
          새로고침
        </button>
      </div>

      {/* 필터 칩 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[
          { key: '전체',   count: feed.length },
          { key: '트렌딩', count: trends.length },
          { key: '신규',   count: newCount },
        ].map(({ key, count }) => {
          const active = filter === key
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: '5px 14px', borderRadius: 20,
                border: active ? '1.5px solid var(--purple)' : '1px solid var(--b1)',
                background: active ? 'rgba(167,139,250,.22)' : 'rgba(255,255,255,.03)',
                color: active ? '#d8b4fe' : 'var(--tx3)',
                fontSize: 11, fontWeight: active ? 700 : 400, cursor: 'pointer',
                transition: 'all .15s',
                boxShadow: active ? '0 0 0 1px rgba(167,139,250,.3)' : 'none',
              }}
            >
              {key}
              {!isLoading && (
                <span style={{ marginLeft: 5, fontSize: 10, opacity: .65 }}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* 2-컬럼 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 460px', gap: 16, alignItems: 'start' }}>

        {/* ── 좌측: 피드 테이블 ─────────────────────────────── */}
        <div>
          {/* 에러 */}
          {!isLoading && trendsError && (
            <div style={{
              background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.22)',
              borderRadius: 'var(--r)', padding: '14px 16px', marginBottom: 10,
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f87171' }}>트렌딩 수집 실패</div>
              <div style={{ fontSize: 11, color: 'var(--tx2)' }}>{trendsError}</div>
              <button className="btn" style={{ fontSize: 11, padding: '6px 14px', alignSelf: 'flex-start' }} onClick={fetchTrends}>
                다시 시도
              </button>
            </div>
          )}

          {/* 스켈레톤 */}
          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* 컬럼 헤더 스켈레톤 */}
              <div style={{ height: 22 }} />
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: COLS, gap: 8,
                  padding: '7px 10px', background: 'var(--s1)', border: '1px solid var(--b1)',
                  borderRadius: 'var(--r-sm)', alignItems: 'center', opacity: 1 - i * 0.08,
                }}>
                  <div style={{ width: 20, height: 13, borderRadius: 3, background: 'var(--s3)', animation: 'pulse 1.4s ease-in-out infinite', margin: 'auto' }} />
                  <div style={{ width: 96, height: 60, borderRadius: 4, background: 'var(--s3)', animation: 'pulse 1.4s ease-in-out infinite' }} />
                  <div>
                    <div style={{ height: 12, borderRadius: 3, background: 'var(--s3)', width: `${[75,60,80,65,70,55,72,68][i%8]}%`, animation: 'pulse 1.4s ease-in-out infinite', marginBottom: 5 }} />
                    <div style={{ height: 9,  borderRadius: 3, background: 'var(--s3)', width: '35%', animation: 'pulse 1.4s ease-in-out infinite' }} />
                  </div>
                  <div style={{ height: 11, borderRadius: 3, background: 'var(--s3)', animation: 'pulse 1.4s ease-in-out infinite' }} />
                  <div style={{ height: 11, borderRadius: 3, background: 'var(--s3)', animation: 'pulse 1.4s ease-in-out infinite' }} />
                  <div style={{ width: 44, height: 18, borderRadius: 20, background: 'var(--s3)', animation: 'pulse 1.4s ease-in-out infinite', marginLeft: 'auto' }} />
                </div>
              ))}
            </div>
          )}

          {/* 테이블 */}
          {!isLoading && (
            <>
              {/* 컬럼 헤더 */}
              <div style={{
                display: 'grid', gridTemplateColumns: COLS, gap: 8,
                padding: '0 10px 7px',
                fontSize: 9, color: 'var(--tx3)', fontWeight: 600,
                letterSpacing: '.07em', textTransform: 'uppercase',
                borderBottom: '1px solid var(--b1)', marginBottom: 6,
              }}>
                <span style={{ textAlign: 'center' }}>#</span>
                <span />
                <span>트랙</span>
                <span style={{ textAlign: 'right' }}>조회수</span>
                <span style={{ textAlign: 'right' }}>일 상승</span>
                <span style={{ textAlign: 'right' }}>상태</span>
              </div>

              {filteredFeed.length === 0 ? (
                <div className="warn">데이터를 불러오지 못했습니다.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {filteredFeed.map(item => (
                    <FeedRow
                      key={item.videoId}
                      item={item}
                      isOpen={selected === item.videoId}
                      onToggle={() => setSelected(selected === item.videoId ? null : item.videoId)}
                      anl={analysis[item.videoId]}
                      badge={getBadge(item, maxTrendScore)}
                      onAnalyze={() => analyzeArtist(item)}
                      onScript={(t, fmt) => goScript(t, fmt, item.artist, item.videoId)}
                      onShort={() => router.push(`/short?artist=${encodeURIComponent(item.artist)}&topic=${encodeURIComponent(item.title)}&videoId=${item.videoId}`)}
                      onCard={() => router.push(`/card?artist=${encodeURIComponent(item.artist)}&topic=${encodeURIComponent(item.title)}&videoId=${item.videoId}`)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── 우측: 사이드바 ──────────────────────────────── */}
        <div style={{ position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* K-pop 뉴스 */}
          <div style={{
            background: 'var(--s1)',
            border: '1px solid var(--b1)',
            borderRadius: 'var(--r)',
            padding: '12px 12px 10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx1)', letterSpacing: '-.2px' }}>K-pop 뉴스</span>
                <span style={{
                  fontSize: 9, padding: '1px 6px', borderRadius: 10,
                  background: 'rgba(167,139,250,.12)', color: 'var(--purple)', fontWeight: 600,
                }}>Soompi</span>
              </div>
              <button
                onClick={fetchNews}
                style={{
                  fontSize: 12, color: 'var(--tx3)', background: 'none', border: 'none',
                  cursor: 'pointer', padding: '2px 6px', borderRadius: 4,
                  transition: 'color .15s',
                }}
                title="뉴스 새로고침"
              >
                ↻
              </button>
            </div>

            {newsLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{
                    height: 54, background: 'var(--s1)', border: '1px solid var(--b1)',
                    borderRadius: 'var(--r-sm)', animation: 'pulse 1.4s ease-in-out infinite',
                    opacity: 1 - i * 0.12,
                  }} />
                ))}
              </div>
            )}

            {!newsLoading && news.length === 0 && (
              <div className="warn" style={{ fontSize: 10 }}>뉴스를 불러올 수 없습니다.</div>
            )}

            {!newsLoading && news.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {news.map((item, i) => (
                  <NewsItem
                    key={i}
                    item={item}
                    idx={i}
                    isOpen={selectedNews === i}
                    onToggle={(idx) => setSelectedNews(selectedNews === idx ? null : idx)}
                    onAction={goNewsScript}
                  />
                ))}
              </div>
            )}
          </div>{/* /K-pop 뉴스 패널 */}
        </div>
      </div>
    </>
  )
}
