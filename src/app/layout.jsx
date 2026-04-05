import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata = {
  title: 'TGArb — Arbitrage Platform',
  description: 'Telegram arbitrage management platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 5000,
            style: {
              background: '#1a1d27',
              color: '#e8eaf0',
              border: '1px solid #2a2d3a',
              borderRadius: '12px',
              fontSize: '13px',
              fontFamily: 'monospace',
              maxWidth: '420px',
            },
            success: {
              duration: 4000,
              iconTheme: { primary: '#00ff9d', secondary: '#1a1d27' },
            },
            error: {
              duration: 8000,
              iconTheme: { primary: '#ff4757', secondary: '#1a1d27' },
              style: {
                background: '#1a1d27',
                border: '1px solid #ff475744',
                color: '#e8eaf0',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
