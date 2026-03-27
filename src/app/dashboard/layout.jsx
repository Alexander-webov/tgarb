'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardLayout({ children }) {
  const router = useRouter()

  useEffect(() => {
    // Check if user is approved
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(({ user }) => {
        if (!user) {
          router.push('/login')
          return
        }
        if (!user.isApproved || user.role === 'PENDING') {
          // Sign out and redirect
          fetch('/api/auth/logout', { method: 'POST' }).then(() => {
            router.push('/login?pending=1')
          })
        }
      })
      .catch(() => {})
  }, [])

  return <>{children}</>
}
