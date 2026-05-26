'use client'
import { useState, useEffect } from 'react'

const FIELDS = [
  {
    key: 'YOUTUBE_API_KEY',
    label: 'YouTube Data API v3',
    desc: 'Google Cloud Console에서 발급 · 트렌드서치에 사용됩니다',
    placeholder: 'AIzaSy...',
  },
  {
    key: 'ANTHROPIC_API_KEY',
    label: 'Anthropic API (Claude)',
    desc: 'console.anthropic.com에서 발급 · 스크립트/카드뉴스 생성에 사용됩니다',
    placeholder: 'sk-ant-api03-...',
  },
  {
    key: 'GEMINI_API_KEY',
    label: 'Google Gemini API',
    desc: 'aistudio.google.com에서 발급 · 번역·씬 재생성에 사용됩니다',
    placeholder: 'AIzaSy...',
  },
  {
    key: 'ELEVENLABS_API_KEY',
    label: 'ElevenLabs API',
    desc: 'elevenlabs.io에서 발급 · 숏폼 TTS 음성 생성에 사용됩니다',
    placeholder: 'sk_...',
  },
]

/* ── 비밀번호 게이트 ── */
function PasswordGate({ onAuthed }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!pw.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/settings-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      sessionStorage.setItem('settings_authed', 'true')
      onAuthed()
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 24 }}>
      <div style={{
        background: 'var(--s1)', border: '1px solid var(--b1)',
        borderRadius: 'var(--r)', padding: '32px 28px',
        width: '100%', maxWidth: 360,
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>🔒 API 키 관리</div>
        <div style={{ fontSize: 12, color: 'var(--tx3)', marginBottom: 24 }}>
          관리자 비밀번호를 입력하세요
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            placeholder="비밀번호"
            autoFocus
            style={{
              background: 'var(--s2)', border: '1px solid var(--b2)',
              borderRadius: 'var(--r-sm)', padding: '10px 12px',
              color: 'var(--tx1)', fontSize: 13, outline: 'none',
            }}
          />
          {error && (
            <div style={{ fontSize: 11, color: '#f87171' }}>⚠️ {error}</div>
          )}
          <button
            className="btn"
            style={{ fontSize: 13, padding: '10px 0', fontWeight: 700 }}
            disabled={loading || !pw.trim()}
          >
            {loading ? '확인 중...' : '입력'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ── 메인 페이지 ── */
export default function SettingsPage() {
  const [authed, setAuthed] = useState(false)
  const [status, setStatus] = useState({})
  const [values, setValues] = useState({ YOUTUBE_API_KEY: '', ANTHROPIC_API_KEY: '', GEMINI_API_KEY: '', ELEVENLABS_API_KEY: '' })
  const [show, setShow] = useState({ YOUTUBE_API_KEY: false, ANTHROPIC_API_KEY: false, GEMINI_API_KEY: false, ELEVENLABS_API_KEY: false })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (sessionStorage.getItem('settings_authed') === 'true') {
      setAuthed(true)
    }
  }, [])

  useEffect(() => {
    if (!authed) return
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => setStatus(data))
      .catch(() => {})
  }, [authed])

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const body = {}
      for (const f of FIELDS) {
        if (values[f.key].trim()) body[f.key] = values[f.key].trim()
      }
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSaved(true)
      setValues({ YOUTUBE_API_KEY: '', ANTHROPIC_API_KEY: '', GEMINI_API_KEY: '', ELEVENLABS_API_KEY: '' })
      const fresh = await fetch('/api/settings').then(r => r.json())
      setStatus(fresh)
    } catch (e) {
      setError(e.message)
    }
    setSaving(false)
  }

  if (!authed) {
    return <PasswordGate onAuthed={() => setAuthed(true)} />
  }

  return (
    <>
      <div className="top-row">
        <div>
          <div className="sec-title">API 키 설정</div>
          <div className="sec-sub">외부 서비스 연동에 필요한 키를 입력하세요 · .env.local에 저장됩니다</div>
        </div>
        <button
          className="btn-g"
          style={{ fontSize: 11, padding: '6px 12px' }}
          onClick={() => { sessionStorage.removeItem('settings_authed'); setAuthed(false) }}
        >
          🔒 잠금
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 560 }}>
        {FIELDS.map(f => {
          const isSet = status[`${f.key}_set`]
          const current = status[f.key]
          return (
            <div key={f.key} style={{
              background: 'var(--s1)', border: '1px solid var(--b1)',
              borderRadius: 'var(--r)', padding: '16px 18px',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 3 }}>{f.desc}</div>
                </div>
                <span style={{
                  fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 600,
                  background: isSet ? 'rgba(190,242,100,.12)' : 'rgba(255,255,255,.05)',
                  color: isSet ? 'var(--lime)' : 'var(--tx3)',
                }}>
                  {isSet ? '✓ 설정됨' : '미설정'}
                </span>
              </div>

              {isSet && (
                <div style={{
                  fontSize: 11, color: 'var(--tx2)', background: 'var(--s2)',
                  borderRadius: 'var(--r-sm)', padding: '7px 10px',
                  fontFamily: 'var(--mono)', letterSpacing: '.04em',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {show[f.key] ? status[f.key] : current}
                </div>
              )}

              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type={show[f.key] ? 'text' : 'password'}
                  value={values[f.key]}
                  onChange={e => setValues(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={isSet ? '새 키로 교체하려면 입력' : f.placeholder}
                  style={{
                    flex: 1, background: 'var(--s2)', border: '1px solid var(--b2)',
                    borderRadius: 'var(--r-sm)', padding: '8px 10px',
                    color: 'var(--tx1)', fontSize: 12, fontFamily: 'var(--mono)',
                  }}
                />
                <button
                  className="btn-g"
                  style={{ fontSize: 11, padding: '0 10px', flexShrink: 0 }}
                  onClick={() => setShow(p => ({ ...p, [f.key]: !p[f.key] }))}
                >
                  {show[f.key] ? '숨김' : '표시'}
                </button>
              </div>
            </div>
          )
        })}

        {error && (
          <div className="warn">⚠️ {error}</div>
        )}

        {saved && (
          <div style={{
            fontSize: 12, color: 'var(--lime)', background: 'rgba(190,242,100,.08)',
            border: '1px solid rgba(190,242,100,.2)', borderRadius: 'var(--r-sm)',
            padding: '10px 14px',
          }}>
            ✓ 저장 완료 · 서버를 재시작해야 변경사항이 적용됩니다
          </div>
        )}

        <button
          className="btn"
          style={{ fontSize: 13, padding: '10px 0', fontWeight: 700 }}
          disabled={saving || FIELDS.every(f => !values[f.key].trim())}
          onClick={handleSave}
        >
          {saving ? '저장 중...' : '저장하기'}
        </button>
      </div>
    </>
  )
}
