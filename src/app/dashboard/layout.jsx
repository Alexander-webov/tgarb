'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardLayout({ children }) {
  const router = useRouter()

  useEffect(() => {
    async function check() {
      try {
        const { getMe } = await import('@/lib/supabase/getMe')
        const user = await getMe()
        if (!user || !user.isApproved || user.role === 'PENDING') {
          const { createClient } = await import('@/lib/supabase/client')
          await createClient().auth.signOut()
          router.replace('/login?pending=1')
        }
      } catch {}
    }
    check()
  }, [])

  return <>{children}</>
}
