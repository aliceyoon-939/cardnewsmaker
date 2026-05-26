'use client'
import { createContext, useContext, useState, useCallback } from 'react'
import { saveHistory } from '@/lib/history'

const SaveCtx = createContext(null)

export function SaveProvider({ children }) {
  const [pending, setPending] = useState(null) // { type, artist, topic, result, params }
  const [modal,   setModal]   = useState(null) // { onSave, onDiscard }

  const registerPending = useCallback((data) => {
    setPending(data)
  }, [])

  const clearPending = useCallback(() => {
    setPending(null)
  }, [])

  // 네비게이션 전에 호출 — pending 있으면 모달, 없으면 즉시 콜백 실행
  const guardNavigation = useCallback((onProceed) => {
    if (!pending) {
      onProceed()
      return
    }
    setModal({
      onSave: () => {
        saveHistory(pending)
        setPending(null)
        setModal(null)
        onProceed()
      },
      onDiscard: () => {
        setPending(null)
        setModal(null)
        onProceed()
      },
      onCancel: () => {
        setModal(null)
      },
    })
  }, [pending])

  return (
    <SaveCtx.Provider value={{ pending, registerPending, clearPending, guardNavigation }}>
      {children}

      {/* 저장 확인 모달 */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--s2)', border: '1px solid var(--b1)',
            borderRadius: 'var(--r)', padding: '24px 28px',
            width: 340, display: 'flex', flexDirection: 'column', gap: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,.5)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>💾</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx1)' }}>임시저장하시겠습니까?</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--tx2)', lineHeight: 1.6 }}>
              생성된 콘텐츠를 히스토리에 저장하지 않으면 페이지를 떠날 때 사라집니다.
            </div>
            {/* 콘텐츠 미리보기 */}
            <div style={{
              background: 'var(--s1)', border: '1px solid var(--b1)',
              borderRadius: 'var(--r-sm)', padding: '10px 12px',
            }}>
              <div style={{ fontSize: 10, color: 'var(--tx3)', fontWeight: 700, marginBottom: 3 }}>
                {pending?.type === 'short' ? '숏폼' : pending?.type === 'card' ? '카드뉴스' : '숏뉴스'}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx1)' }}>{pending?.artist}</div>
              <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {pending?.topic}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn"
                style={{ flex: 1, fontSize: 13, padding: '9px 0', fontWeight: 700 }}
                onClick={modal.onSave}
              >
                저장
              </button>
              <button
                className="btn-g"
                style={{ flex: 1, fontSize: 13, padding: '9px 0' }}
                onClick={modal.onDiscard}
              >
                저장 안 함
              </button>
              <button
                className="btn-g"
                style={{ fontSize: 13, padding: '9px 14px' }}
                onClick={modal.onCancel}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </SaveCtx.Provider>
  )
}

export function useSave() {
  const ctx = useContext(SaveCtx)
  if (!ctx) throw new Error('useSave must be used within SaveProvider')
  return ctx
}
