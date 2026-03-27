'use client'
// src/app/register/page.jsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Register() {
  const [form, setForm] = useState({ email: '', username: '', password: '', confirm: '' })
  const [error, setError]   = useState('')
  const [pending, setPending] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleRegister = async () => {
    if (form.password !== form.confirm) { setError('Пароли не совпадают'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, username: form.username, password: form.password }),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      if (data.autoLogin) { router.push('/dashboard'); router.refresh() }
      else setPending(true)
    } else {
      setError(data.error || 'Ошибка регистрации')
    }
  }

  if (pending) return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm card p-8 text-center">
        <div className="text-4xl mb-4">⏳</div>
        <div className="text-lg font-black mb-2">Заявка отправлена!</div>
        <p className="text-sm text-muted mb-6">
          Ожидайте одобрения администратора.<br/>
          Как только вас одобрят — сможете войти.
        </p>
        <Link href="/login" className="btn-ghost w-full justify-center">Вернуться к входу</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl font-black tracking-tighter bg-gradient-to-r from-accent to-accent3 bg-clip-text text-transparent mb-2">TGArb</div>
          <div className="text-xs font-mono text-muted uppercase tracking-widest">Регистрация</div>
        </div>
        <div className="card p-6">
          {error && <div className="bg-danger/10 border border-danger/20 text-danger text-xs font-mono rounded-lg px-3 py-2 mb-4">{error}</div>}

          <div className="mb-4">
            <label className="block text-[11px] font-mono text-muted uppercase tracking-widest mb-1.5">Email</label>
            <input className="input" type="email" placeholder="you@example.com"
              value={form.email} onChange={e => setForm({...form, email: e.target.value})}/>
          </div>
          <div className="mb-4">
            <label className="block text-[11px] font-mono text-muted uppercase tracking-widest mb-1.5">Username</label>
            <input className="input" placeholder="myusername"
              value={form.username} onChange={e => setForm({...form, username: e.target.value})}/>
          </div>
          <div className="mb-4">
            <label className="block text-[11px] font-mono text-muted uppercase tracking-widest mb-1.5">Пароль</label>
            <input className="input" type="password" placeholder="минимум 6 символов"
              value={form.password} onChange={e => setForm({...form, password: e.target.value})}/>
          </div>
          <div className="mb-6">
            <label className="block text-[11px] font-mono text-muted uppercase tracking-widest mb-1.5">Повтори пароль</label>
            <input className="input" type="password" placeholder="••••••••"
              value={form.confirm} onChange={e => setForm({...form, confirm: e.target.value})}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}/>
          </div>

          <button className="btn-primary w-full justify-center mb-4" onClick={handleRegister} disabled={loading}>
            {loading ? 'Регистрируемся...' : 'Зарегистрироваться'}
          </button>

          <div className="text-center text-xs text-muted">
            Уже есть аккаунт?{' '}
            <Link href="/login" className="text-accent hover:underline">Войти</Link>
          </div>

          <div className="mt-4 text-[11px] font-mono text-muted text-center">
            Первый зарегистрированный пользователь<br/>автоматически становится администратором.
          </div>
        </div>
      </div>
    </div>
  )
}
