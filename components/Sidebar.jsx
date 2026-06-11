'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useSave } from '@/contexts/SaveContext'
import { useEffect, useState } from 'react'

const workspaceItems = [
  { id: 'trend',   path: '/trend',   label: '트렌드서치',
    svg: <svg viewBox="0 0 20 20"><path d="M3 14l5-5 3.5 3.5L17 5"/></svg> },
  { id: 'card',    path: '/card',    label: '카드뉴스',
    svg: <svg viewBox="0 0 20 20"><rect x="2" y="2" width="7" height="10" rx="1.5"/><rect x="11" y="2" width="7" height="10" rx="1.5"/><rect x="2" y="14" width="16" height="4" rx="1.5"/></svg> },
  { id: 'short',   path: '/short',   label: '숏폼', disabled: true,
    svg: <svg viewBox="0 0 20 20"><rect x="5" y="2" width="10" height="16" rx="2"/><path d="M8.5 8l4 2.5-4 2.5V8z"/></svg> },
  { id: 'history', path: '/history', label: '히스토리',
    svg: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="7"/><path d="M10 6v4l2.5 2.5"/></svg> },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const { guardNavigation } = useSave()
  const [isLight, setIsLight] = useState(false)

  // 초기 테마 로드
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'light') {
      setIsLight(true)
      document.documentElement.classList.add('light')
    }
  }, [])

  function toggleTheme() {
    const next = !isLight
    setIsLight(next)
    document.documentElement.classList.toggle('light', next)
    localStorage.setItem('theme', next ? 'light' : 'dark')
    // 카드메이커 iframe에 테마 동기화
    window.dispatchEvent(new CustomEvent('themeChange', { detail: { light: next } }))
  }

  function navigate(path) {
    guardNavigation(() => router.push(path))
  }

  return (
    <nav className="sb" role="navigation" aria-label="메인 메뉴">
      {/* 로고 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 6px', marginBottom: 20 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'var(--lime)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 900, color: '#000', flexShrink: 0,
        }}>K</div>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--tx1)', letterSpacing: '-.3px' }}>
          KPOP <span style={{ color: 'var(--lime)' }}>NOW</span>
        </span>
      </div>

      {/* WORKSPACE 섹션 */}
      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--tx3)', letterSpacing: '.1em', padding: '0 6px', marginBottom: 6 }}>
        WORKSPACE
      </div>
      {workspaceItems.map(item => {
        const isOn = pathname === item.path
        return (
          <button
            key={item.id}
            className={`sb-btn${isOn ? ' on' : ''}`}
            onClick={() => !item.disabled && navigate(item.path)}
            aria-label={item.label}
            disabled={item.disabled}
            style={item.disabled ? { opacity: .35, cursor: 'not-allowed' } : {}}
          >
            {item.svg}
            <span className="sb-tip">{item.label}</span>
          </button>
        )
      })}

      {/* 테마 토글 */}
      <button
        onClick={toggleTheme}
        title={isLight ? '다크 모드로 전환' : '라이트 모드로 전환'}
        style={{
          marginTop: 'auto', width: 32, height: 32, borderRadius: 8,
          border: '1px solid var(--b2)', background: 'var(--s2)',
          color: 'var(--tx2)', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start',
          marginLeft: 6, transition: 'all .15s', flexShrink: 0,
        }}
      >
        {isLight
          ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 12.5A5 5 0 0 1 6.5 4c0-.34.03-.67.09-1A6 6 0 1 0 13 11.91c-.33.06-.67.09-1 .09z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1v1M8 14v1M1 8h1M14 8h1M3.05 3.05l.7.7M12.25 12.25l.7.7M3.05 12.95l.7-.7M12.25 3.75l.7-.7M11 8A3 3 0 1 1 5 8a3 3 0 0 1 6 0z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
        }
      </button>
    </nav>
  )
}
