'use client'
import { usePathname } from 'next/navigation'

const titles = {
  '/home': '홈 대시보드',
  '/trend': '트렌드서치',
  '/short': '숏폼 제작기',
  '/news': '숏 뉴스+사진',
  '/card': '카드뉴스메이커',
  '/tracy': '현장 콘텐츠',
  '/cal': '콘텐츠 캘린더',
}

export default function Topbar() {
  const pathname = usePathname()
  const title = titles[pathname] || 'K-POP CMS'

  return (
    <div className="topbar">
      <span className="topbar-title">{title}</span>
      <span className="topbar-pill">베트남 케이팝</span>
      <div className="av-row">
        <div className="av-sm" style={{ background: '#7c3aed' }}>A</div>
        <div className="av-sm" style={{ background: '#be185d' }}>B</div>
        <div className="av-sm" style={{ background: '#0d9488' }}>나</div>
      </div>
    </div>
  )
}
