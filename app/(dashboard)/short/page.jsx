'use client'
import { useRouter } from 'next/navigation'

export default function ShortPage() {
  const router = useRouter()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
      <div style={{ fontSize: 32 }}>🚧</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx1)' }}>숏폼 기능 준비 중</div>
      <div style={{ fontSize: 12, color: 'var(--tx3)' }}>2차 스펙에서 오픈 예정입니다</div>
      <button className="btn-g" style={{ fontSize: 11, padding: '7px 16px', marginTop: 8 }} onClick={() => router.push('/trend')}>
        트렌드서치로 돌아가기
      </button>
    </div>
  )
}
