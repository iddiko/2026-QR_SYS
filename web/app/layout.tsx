import React from 'react'
import '../styles/globals.css'

export const metadata = {
  title: 'QR Apartment Manager',
  description: '계층별 메뉴, QR, 출입 기록을 포함한 아파트 단지 관리자',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
