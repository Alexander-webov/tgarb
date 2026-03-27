'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardLayout({ children }) {
  const router = useRouter()

  useEffect(() => {
    async function checkApproval() {
      try {
        const { getMe } = await import('@/lib/supabase/getMe')
        const user = await getMe()
        if (!user) {
          router.push('/login')
          return
        }
        if (!user.isApproved || user.role === 'PENDING') {
          const { createClient } = await import('@/lib/supabase/client')
          await createClient().auth.signOut()
          router.push('/login?pending=1')
        }
      } catch {}
    }
    checkApproval()
  }, [])

  return <>{children}</>
}
