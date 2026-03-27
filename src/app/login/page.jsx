'use client'
// src/app/login/page.jsx
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [tab,    setTab]    = useState('login')
  const [login,  setLogin]  = useState({ login: '', password: '' })
  const [reg,    setReg]    = useState({ email: '', username: '', password: '', confirm: '' })
  const [error,  setError]  = useState('')
  const [info,   setInfo]   = useState('')
  const [loading,setLoading]= useState(false)
  const router = useRouter()

  useEffect(() => { setError(''); setInfo('') }, [tab])

  const handleLogin = async () => {
    if (!login.login || !login.password) { setError('Заполни все поля'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(login),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) { router.push('/'); router.refresh() }
    else if (data.error === 'PENDING') setError('⏳ Ваша заявка ожидает одобрения администратора.')
    else setError(data.error || 'Ошибка входа')
  }

  const handleRegister = async () => {
    if (!reg.email || !reg.username || !reg.password) { setError('Заполни все поля'); return }
    if (reg.password !== reg.confirm) { setError('Пароли не совпадают'); return }
    if (reg.password.length < 6) { setError('Пароль минимум 6 символов'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: reg.email, username: reg.username, password: reg.password }),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      if (data.autoLogin) { router.push('/'); router.refresh() }
      else { setInfo('✅ Заявка отправлена! Ожидайте одобрения администратора.'); setTab('login') }
    } else setError(data.error || 'Ошибка регистрации')
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl font-black tracking-tighter bg-gradient-to-r from-accent to-accent3 bg-clip-text text-transparent mb-2">TGArb</div>
          <div className="text-xs font-mono text-muted uppercase tracking-[3px]">Arbitrage Platform</div>
        </div>
        <div className="card p-6">
          {/* Tabs */}
          <div className="flex bg-surface2 rounded-xl p-1 mb-6">
            {[['login','Вход'],['register','Регистрация']].map(([t,l]) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tab===t ? 'bg-accent text-black' : 'text-muted hover:text-[#e8eaf0]'}`}>{l}</button>
            ))}
          </div>

          {error && <div className="bg-danger/10 border border-danger/20 text-danger text-xs font-mono rounded-lg px-3 py-2.5 mb-4 leading-relaxed">{error}</div>}
          {info  && <div className="bg-success/10 border border-success/20 text-success text-xs font-mono rounded-lg px-3 py-2.5 mb-4 leading-relaxed">{info}</div>}

          {tab === 'login' && (
            <div>
              <div className="mb-4">
                <label className="block text-[11px] font-mono text-muted uppercase tracking-widest mb-1.5">Email или Username</label>
                <input className="input" placeholder="admin" value={login.login}
                  onChange={e => setLogin({...login, login: e.target.value})}
                  onKeyDown={e => e.key==='Enter' && handleLogin()}/>
              </div>
              <div className="mb-6">
                <label className="block text-[11px] font-mono text-muted uppercase tracking-widest mb-1.5">Пароль</label>
                <input className="input" type="password" placeholder="••••••••" value={login.password}
                  onChange={e => setLogin({...login, password: e.target.value})}
                  onKeyDown={e => e.key==='Enter' && handleLogin()}/>
              </div>
              <button className="btn-primary w-full justify-center" onClick={handleLogin} disabled={loading}>
                {loading ? 'Входим...' : '→ Войти'}
              </button>
            </div>
          )}

          {tab === 'register' && (
            <div>
              <div className="mb-3">
                <label className="block text-[11px] font-mono text-muted uppercase tracking-widest mb-1.5">Email</label>
                <input className="input" type="email" placeholder="you@example.com" value={reg.email}
                  onChange={e => setReg({...reg, email: e.target.value})}/>
              </div>
              <div className="mb-3">
                <label className="block text-[11px] font-mono text-muted uppercase tracking-widest mb-1.5">Username</label>
                <input className="input" placeholder="myusername" value={reg.username}
                  onChange={e => setReg({...reg, username: e.target.value})}/>
              </div>
              <div className="mb-3">
                <label className="block text-[11px] font-mono text-muted uppercase tracking-widest mb-1.5">Пароль</label>
                <input className="input" type="password" placeholder="минимум 6 символов" value={reg.password}
                  onChange={e => setReg({...reg, password: e.target.value})}/>
              </div>
              <div className="mb-6">
                <label className="block text-[11px] font-mono text-muted uppercase tracking-widest mb-1.5">Повтори пароль</label>
                <input className="input" type="password" placeholder="••••••••" value={reg.confirm}
                  onChange={e => setReg({...reg, confirm: e.target.value})}
                  onKeyDown={e => e.key==='Enter' && handleRegister()}/>
              </div>
              <button className="btn-primary w-full justify-center" onClick={handleRegister} disabled={loading}>
                {loading ? 'Регистрируемся...' : '→ Зарегистрироваться'}
              </button>
              <div className="mt-4 text-center text-[11px] font-mono text-muted">
                Первый пользователь становится<br/>администратором автоматически
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
