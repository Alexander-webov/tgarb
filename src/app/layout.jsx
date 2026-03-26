// src/app/layout.jsx
import './globals.css'

export const metadata = {
  title: 'TGArb — Arbitrage Platform',
  description: 'Telegram arbitrage management platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
