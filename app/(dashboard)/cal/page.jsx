'use client'
import { useState, useEffect } from 'react'
import { loadHistory } from '@/lib/history'

const KO_MONTH_EN = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER']
const KO_DAY      = ['MON','TUE','WED','THU','FRI','SAT','SUN']

const TYPE_EVENT = {
  short: { label: '숏폼',    bg: 'rgba(244,114,182,.2)',  color: '#f472b6' },
  card:  { label: '카드뉴스', bg: 'rgba(167,139,250,.2)',  color: '#a78bfa' },
  news:  { label: '숏뉴스',  bg: 'rgba(190,242,100,.15)', color: '#bef264' },
}

function buildDays(year, month) {
  const firstDow = new Date(year, month, 1).getDay()
  const offset   = (firstDow + 6) % 7
  const total    = new Date(year, month + 1, 0).getDate()
  const days = []
  for (let i = 0; i < offset; i++) days.push(null)
  for (let d = 1; d <= total; d++) days.push(d)
  while (days.length < 42) days.push(null)
  return days
}

export default function CalPage() {
  const now   = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [events, setEvents] = useState({})

  const today          = now.getDate()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()
  const days           = buildDays(year, month)

  useEffect(() => {
    const history = loadHistory()
    const map = {}
    history.forEach(item => {
      const d = new Date(item.createdAt)
      if (d.getFullYear() !== year || d.getMonth() !== month) return
      const key = d.getDate()
      if (!map[key]) map[key] = []
      map[key].push(item)
    })
    setEvents(map)
  }, [year, month])

  function prev() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function next() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* 월/년 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={prev} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx3)', fontSize: 20, lineHeight: 1, padding: '0 2px' }}>‹</button>
          <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1px', color: 'var(--tx1)', lineHeight: 1 }}>
            {KO_MONTH_EN[month]}
          </span>
          <span style={{ fontSize: 18, fontWeight: 300, color: 'var(--tx3)', letterSpacing: '-0.5px' }}>{year}</span>
          <button onClick={next} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx3)', fontSize: 20, lineHeight: 1, padding: '0 2px' }}>›</button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()) }}
            style={{ fontSize: 11, padding: '4px 12px', background: 'none', border: '1px solid var(--b1)', borderRadius: 20, color: 'var(--tx3)', cursor: 'pointer' }}
          >
            오늘
          </button>
          <button className="btn" style={{ fontSize: 11, padding: '5px 13px' }}>+ 일정 추가</button>
        </div>
      </div>

      {/* 캘린더 테이블 전체 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--b2)', borderRadius: 4, overflow: 'hidden' }}>

        {/* 요일 헤더 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '2px solid var(--b2)', flexShrink: 0 }}>
          {KO_DAY.map((d, i) => (
            <div key={d} style={{
              textAlign: 'center', padding: '10px 0', fontSize: 11, fontWeight: 700,
              letterSpacing: '.08em', color: i === 6 ? '#f472b6' : i === 5 ? '#60a5fa' : 'var(--tx3)',
              borderRight: i < 6 ? '1px solid var(--b1)' : 'none',
            }}>{d}</div>
          ))}
        </div>

        {/* 날짜 그리드 (6행) */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gridTemplateRows: 'repeat(6,1fr)' }}>
          {days.map((d, i) => {
            const col = i % 7
            const row = Math.floor(i / 7)
            const isSat = col === 5
            const isSun = col === 6
            const isToday = isCurrentMonth && d === today
            const dayEvents = d ? (events[d] || []) : []
            const isNull = d === null

            return (
              <div
                key={i}
                style={{
                  borderRight: col < 6 ? '1px solid var(--b1)' : 'none',
                  borderBottom: row < 5 ? '1px solid var(--b1)' : 'none',
                  padding: '8px 10px',
                  background: isNull ? 'rgba(0,0,0,.15)' : isToday ? 'rgba(190,242,100,.04)' : 'transparent',
                  display: 'flex', flexDirection: 'column', gap: 4,
                  cursor: isNull ? 'default' : 'pointer',
                  transition: 'background .1s',
                }}
                onMouseEnter={e => { if (!isNull) e.currentTarget.style.background = isToday ? 'rgba(190,242,100,.07)' : 'rgba(255,255,255,.03)' }}
                onMouseLeave={e => { e.currentTarget.style.background = isNull ? 'rgba(0,0,0,.15)' : isToday ? 'rgba(190,242,100,.04)' : 'transparent' }}
              >
                {d !== null && (
                  <>
                    {/* 날짜 번호 */}
                    {isToday ? (
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--lime)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#000' }}>{d}</span>
                      </div>
                    ) : (
                      <span style={{
                        fontSize: 12, fontWeight: 500, lineHeight: '26px',
                        color: isSun ? '#f472b6' : isSat ? '#60a5fa' : 'var(--tx2)',
                      }}>{d}</span>
                    )}

                    {/* 이벤트 뱃지 */}
                    {dayEvents.slice(0, 2).map((ev, ei) => {
                      const meta = TYPE_EVENT[ev.type] || TYPE_EVENT.short
                      return (
                        <div key={ei} style={{
                          fontSize: 10, padding: '2px 6px', borderRadius: 3,
                          background: meta.bg, color: meta.color, fontWeight: 600,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {meta.label} · {ev.artist}
                        </div>
                      )
                    })}
                    {dayEvents.length > 2 && (
                      <span style={{ fontSize: 9, color: 'var(--tx3)', paddingLeft: 2 }}>+{dayEvents.length - 2}개</span>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 범례 */}
      <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11, color: 'var(--tx3)', alignItems: 'center', flexShrink: 0 }}>
        {Object.entries(TYPE_EVENT).map(([, meta]) => (
          <span key={meta.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: meta.bg, border: `1px solid ${meta.color}`, display: 'inline-block' }} />
            <span style={{ color: meta.color, fontWeight: 600 }}>{meta.label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
