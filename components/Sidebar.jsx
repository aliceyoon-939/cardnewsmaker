'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useSave } from '@/contexts/SaveContext'

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

    </nav>
  )
}
