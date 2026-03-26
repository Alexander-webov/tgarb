'use client'
// src/app/login/page.jsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [form, setForm]   = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        router.push('/')
        router.refresh()
      } else {
        setError(data.error || 'Ошибка входа')
      }
    } catch {
      setError('Ошибка соединения')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl font-black tracking-tighter bg-gradient-to-r from-accent to-accent3 bg-clip-text text-transparent mb-2">
            TGArb
          </div>
          <div className="text-xs font-mono text-muted uppercase tracking-widest">
            Arbitrage Platform
          </div>
        </div>

        {/* Card */}
        <div className="card p-6">
          <div className="text-sm font-bold mb-5">Вход в панель</div>

          {error && (
            <div className="bg-danger/10 border border-danger/20 text-danger text-xs font-mono rounded-lg px-3 py-2 mb-4">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-[11px] font-mono text-muted uppercase tracking-widest mb-1.5">
              Логин
            </label>
            <input
              className="input"
              placeholder="admin"
              value={form.username}
              onChange={e => setForm({...form, username: e.target.value})}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <div className="mb-6">
            <label className="block text-[11px] font-mono text-muted uppercase tracking-widest mb-1.5">
              Пароль
            </label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <button
            className="btn-primary w-full justify-center"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? 'Входим...' : 'Войти'}
          </button>

          <div className="mt-4 text-[11px] font-mono text-muted text-center">
            Первый вход — введи любой логин и пароль.<br/>
            Они станут твоими постоянными данными.
          </div>
        </div>
      </div>
    </div>
  )
}
