'use client'
// src/app/login/page.jsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Login() {
  const [form, setForm]   = useState({ login: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async () => {
    setLoading(true); setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) { router.push('/'); router.refresh() }
    else if (data.error === 'PENDING') {
      setError('Ваша заявка ожидает одобрения администратора')
    } else {
      setError(data.error || 'Ошибка входа')
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl font-black tracking-tighter bg-gradient-to-r from-accent to-accent3 bg-clip-text text-transparent mb-2">TGArb</div>
          <div className="text-xs font-mono text-muted uppercase tracking-widest">Arbitrage Platform</div>
        </div>
        <div className="card p-6">
          <div className="text-sm font-bold mb-5">Вход в панель</div>
          {error && (
            <div className={`text-xs font-mono rounded-lg px-3 py-2 mb-4 border ${
              error.includes('ожидает') ? 'bg-warning/10 border-warning/20 text-warning' : 'bg-danger/10 border-danger/20 text-danger'
            }`}>{error}</div>
          )}
          <div className="mb-4">
            <label className="block text-[11px] font-mono text-muted uppercase tracking-widest mb-1.5">Email или Username</label>
            <input className="input" placeholder="admin" value={form.login}
              onChange={e => setForm({...form, login: e.target.value})}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}/>
          </div>
          <div className="mb-6">
            <label className="block text-[11px] font-mono text-muted uppercase tracking-widest mb-1.5">Пароль</label>
            <input className="input" type="password" placeholder="••••••••" value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}/>
          </div>
          <button className="btn-primary w-full justify-center mb-4" onClick={handleLogin} disabled={loading}>
            {loading ? 'Входим...' : 'Войти'}
          </button>
          <div className="text-center text-xs text-muted">
            Нет аккаунта?{' '}
            <Link href="/register" className="text-accent hover:underline">Зарегистрироваться</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
