'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleReset = async () => {
    if (password !== confirm) { setError('Пароли не совпадают'); return }
    if (password.length < 6)  { setError('Минимум 6 символов'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) setError(error.message)
    else { router.push('/dashboard'); router.refresh() }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm card p-6">
        <div className="text-lg font-black mb-6">Новый пароль</div>
        {error && <div className="bg-danger/10 border border-danger/20 text-danger text-xs font-mono rounded-lg px-3 py-2 mb-4">{error}</div>}
        <div className="mb-4">
          <label className="block text-[11px] font-mono text-muted uppercase tracking-widest mb-1.5">Новый пароль</label>
          <input className="input" type="password" placeholder="минимум 6 символов"
            value={password} onChange={e => setPassword(e.target.value)}/>
        </div>
        <div className="mb-6">
          <label className="block text-[11px] font-mono text-muted uppercase tracking-widest mb-1.5">Повтори пароль</label>
          <input className="input" type="password" placeholder="••••••••"
            value={confirm} onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => e.key==='Enter' && handleReset()}/>
        </div>
        <button className="btn-primary w-full justify-center" onClick={handleReset} disabled={loading}>
          {loading ? 'Сохраняем...' : 'Сохранить пароль'}
        </button>
      </div>
    </div>
  )
}
