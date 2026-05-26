import './globals.css'

export const metadata = { title: 'KPOP NOW - AI 콘텐츠 제작 툴', description: '베트남 케이팝 콘텐츠 플랫폼' }

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
