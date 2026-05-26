'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { loadHistory, deleteHistory, clearHistory } from '@/lib/history'

const TYPE_META = {
  short: { label: '숏폼',   color: 'var(--pink)',   bg: 'rgba(244,114,182,.12)', path: '/short' },
  card:  { label: '카드뉴스', color: 'var(--purple)', bg: 'rgba(167,139,250,.12)', path: '/card'  },
  news:  { label: '숏뉴스',  color: 'var(--lime)',   bg: 'rgba(190,242,100,.1)',  path: '/news'  },
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}일 전`
  return `${Math.floor(d / 30)}개월 전`
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function ShortPreview({ result }) {
  if (!result) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {result.hook && (
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--lime)', lineHeight: 1.4 }}>
          "{result.hook}"
        </div>
      )}
      {result.scenes?.slice(0, 2).map((s, i) => (
        <div key={i} style={{ fontSize: 11, color: 'var(--tx2)', lineHeight: 1.5 }}>
          <span style={{ color: 'var(--tx3)', marginRight: 6 }}>{s.time}</span>{s.vi}
        </div>
      ))}
      {result.scenes?.length > 2 && (
        <div style={{ fontSize: 10, color: 'var(--tx3)' }}>+ {result.scenes.length - 2}개 씬 더...</div>
      )}
    </div>
  )
}

function CardPreview({ result }) {
  if (!result?.slides) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {result.slides.slice(0, 3).map((s, i) => (
        <div key={i} style={{ fontSize: 11, color: 'var(--tx2)', display: 'flex', gap: 8, alignItems: 'baseline' }}>
          <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, background: 'rgba(167,139,250,.12)', color: 'var(--purple)', flexShrink: 0 }}>{s.role}</span>
          <span style={{ lineHeight: 1.4 }}>{s.title}</span>
        </div>
      ))}
    </div>
  )
}

function NewsPreview({ result }) {
  if (!result) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {result.headline && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx1)' }}>{result.headline}</div>}
      {result.body && <div style={{ fontSize: 11, color: 'var(--tx2)', lineHeight: 1.5 }}>{result.body}</div>}
    </div>
  )
}

const PREVIEWS = { short: ShortPreview, card: CardPreview, news: NewsPreview }

const DATE_FILTERS = [
  { value: 'all',   label: '전체 기간' },
  { value: 'today', label: '오늘' },
  { value: 'week',  label: '이번 주' },
  { value: 'month', label: '이번 달' },
]

function inDateRange(iso, range) {
  const d = new Date(iso)
  const now = new Date()
  if (range === 'today') {
    return d.toDateString() === now.toDateString()
  }
  if (range === 'week') {
    const start = new Date(now); start.setDate(now.getDate() - now.getDay())
    start.setHours(0, 0, 0, 0)
    return d >= start
  }
  if (range === 'month') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }
  return true
}

export default function HistoryPage() {
  const router = useRouter()
  const [items,    setItems]    = useState([])
  const [filter,   setFilter]   = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [search,   setSearch]   = useState('')
  const [expanded, setExpanded] = useState(null)
  const [sortDesc, setSortDesc] = useState(true)

  useEffect(() => { setItems(loadHistory()) }, [])

  function handleDelete(id) {
    deleteHistory(id)
    setItems(prev => prev.filter(h => h.id !== id))
    if (expanded === id) setExpanded(null)
  }

  function handleClear() {
    if (!confirm('전체 히스토리를 삭제할까요?')) return
    clearHistory(); setItems([])
  }

  function reopen(item) {
    const p = new URLSearchParams(item.params || {})
    router.push(`${TYPE_META[item.type]?.path}?${p.toString()}`)
  }

  const filtered = useMemo(() => {
    let list = items
    if (filter !== 'all')     list = list.filter(h => h.type === filter)
    if (dateRange !== 'all')  list = list.filter(h => inDateRange(h.createdAt, dateRange))
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(h =>
        h.artist?.toLowerCase().includes(q) ||
        h.topic?.toLowerCase().includes(q)
      )
    }
    return sortDesc ? list : [...list].reverse()
  }, [items, filter, dateRange, search, sortDesc])

  const counts = useMemo(() => ({
    short: items.filter(h => h.type === 'short').length,
    card:  items.filter(h => h.type === 'card').length,
    news:  items.filter(h => h.type === 'news').length,
  }), [items])

  return (
    <>
      <div className="top-row">
        <div>
          <div className="sec-title">히스토리</div>
          <div className="sec-sub">생성된 콘텐츠 기록 · 총 {items.length}건</div>
        </div>
        {items.length > 0 && (
          <button className="btn-g" style={{ fontSize: 11, padding: '6px 12px', color: 'var(--pink)' }} onClick={handleClear}>
            전체 삭제
          </button>
        )}
      </div>

      {/* 검색창 */}
      <div style={{ position: 'relative', marginBottom: 4 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--tx3)' }}>🔍</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="아티스트 또는 주제로 검색..."
          style={{
            width: '100%', background: 'var(--s2)', border: '1px solid var(--b1)',
            borderRadius: 'var(--r-sm)', padding: '9px 12px 9px 34px',
            color: 'var(--tx1)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx3)', fontSize: 14,
          }}>✕</button>
        )}
      </div>

      {/* 필터 행 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
        {/* 타입 필터 */}
        <div style={{ display: 'flex', gap: 5 }}>
          {[['all', '전체', items.length], ['short', '숏폼', counts.short], ['card', '카드뉴스', counts.card], ['news', '숏뉴스', counts.news]].map(([v, l, n]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              style={{
                fontSize: 11, padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600,
                background: filter === v ? 'var(--lime)' : 'var(--s2)',
                color: filter === v ? '#000' : 'var(--tx3)',
              }}
            >
              {l} <span style={{ opacity: .7, marginLeft: 2 }}>{n}</span>
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 18, background: 'var(--b1)', margin: '0 2px' }} />

        {/* 날짜 필터 */}
        <div style={{ display: 'flex', gap: 5 }}>
          {DATE_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setDateRange(value)}
              style={{
                fontSize: 11, padding: '5px 12px', borderRadius: 20, border: '1px solid var(--b1)', cursor: 'pointer',
                background: dateRange === value ? 'rgba(45,212,191,.15)' : 'var(--s2)',
                color: dateRange === value ? 'var(--teal)' : 'var(--tx3)',
                fontWeight: dateRange === value ? 700 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 정렬 토글 */}
        <button
          onClick={() => setSortDesc(p => !p)}
          style={{
            marginLeft: 'auto', fontSize: 11, padding: '5px 10px', borderRadius: 20,
            border: '1px solid var(--b1)', background: 'var(--s2)', color: 'var(--tx3)', cursor: 'pointer',
          }}
        >
          {sortDesc ? '↓ 최신순' : '↑ 오래된순'}
        </button>
      </div>

      {/* 검색 결과 없음 */}
      {filtered.length === 0 && (
        <div className="notice">
          {items.length === 0
            ? '💡 숏폼 스크립트, 카드뉴스, 숏뉴스를 생성하면 자동으로 여기에 저장됩니다.'
            : search
            ? `"${search}"에 해당하는 결과가 없습니다.`
            : '해당 조건의 히스토리가 없습니다.'}
        </div>
      )}

      {/* 결과 수 표시 */}
      {filtered.length > 0 && (filtered.length !== items.length || search) && (
        <div style={{ fontSize: 11, color: 'var(--tx3)', marginBottom: 4 }}>
          {filtered.length}건 표시
          {search && ` · "${search}" 검색 결과`}
        </div>
      )}

      {/* 리스트 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map(item => {
          const meta = TYPE_META[item.type] || TYPE_META.short
          const Preview = PREVIEWS[item.type]
          const isOpen = expanded === item.id
          return (
            <div key={item.id} style={{
              background: isOpen ? 'rgba(190,242,100,.02)' : 'var(--s1)',
              border: `1px solid ${isOpen ? 'rgba(190,242,100,.2)' : 'var(--b1)'}`,
              borderRadius: 'var(--r-sm)', transition: 'all .15s',
            }}>
              {/* 헤더 행 */}
              <div
                style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
                onClick={() => setExpanded(isOpen ? null : item.id)}
              >
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600, flexShrink: 0, background: meta.bg, color: meta.color }}>
                  {meta.label}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.artist}
                    {item.topic && <span style={{ fontWeight: 400, color: 'var(--tx3)', marginLeft: 6, fontSize: 11 }}>{item.topic}</span>}
                  </div>
                </div>
                <span style={{ fontSize: 10, color: 'var(--tx3)', flexShrink: 0 }} title={formatDate(item.createdAt)}>{timeAgo(item.createdAt)}</span>
                <span style={{ fontSize: 10, color: 'var(--tx3)', transition: 'transform .15s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
              </div>

              {/* 펼쳐지는 내용 */}
              {isOpen && (
                <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--b1)' }}>
                  <div style={{ paddingTop: 12, marginBottom: 12 }}>
                    <Preview result={item.result} />
                  </div>
                  {item.result?.hashtags?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                      {item.result.hashtags.map(t => (
                        <span key={t} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'rgba(167,139,250,.1)', color: 'var(--purple)' }}>{t}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn" style={{ fontSize: 11, padding: '6px 14px' }} onClick={() => reopen(item)}>
                      ↻ 다시 생성
                    </button>
                    {item.type === 'short' && item.result && (
                      <button className="btn-g" style={{ fontSize: 11, padding: '6px 14px' }} onClick={() => {
                        sessionStorage.setItem('storyboard', JSON.stringify({ result: item.result, ragData: null, artist: item.artist, topic: item.topic }))
                        router.push('/storyboard')
                      }}>
                        🎬 스토리보드
                      </button>
                    )}
                    <button onClick={() => handleDelete(item.id)} style={{
                      fontSize: 11, padding: '6px 10px', marginLeft: 'auto',
                      background: 'none', border: '1px solid var(--b1)',
                      borderRadius: 'var(--r-sm)', color: 'var(--tx3)', cursor: 'pointer',
                    }}>
                      삭제
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
