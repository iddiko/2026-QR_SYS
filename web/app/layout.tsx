import React from 'react'
import '../styles/globals.css'
import ThemeProvider from '../components/theme/ThemeProvider'
import AdminCustomizationProvider from '../lib/adminCustomization'

export const metadata = {
  title: 'QR Parking SYS',
  description: '단지별 QR 주차/방문 관리 시스템 (Next.js + Supabase + Vercel)',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div style={{ padding: 12, borderBottom: '1px solid #ddd' }} className="hidden">
          Tailwind CSS가 로드되지 않았습니다. `web` 폴더에서 `npm run dev`로 실행 중인지 확인하고, 브라우저를 강력
          새로고침(Ctrl+Shift+R) 해주세요.
        </div>
        <ThemeProvider>
          <AdminCustomizationProvider>{children}</AdminCustomizationProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

