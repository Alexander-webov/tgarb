'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Login() {
  const [tab,    setTab]    = useState('login')
  const [form,   setForm]   = useState({ email: '', password: '', username: '' })
  const [error,  setError]  = useState('')
  const [info,   setInfo]   = useState('')
  const [loading,setLoading]= useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async () => {
    if (!form.email || !form.password) { setError('Заполни все поля'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email, password: form.password
    })
    setLoading(false)
    if (error) {
      if (error.message.includes('Invalid login')) setError('Неверный email или пароль')
      else if (error.message.includes('Email not confirmed')) setError('Подтверди email — проверь почту')
      else setError(error.message)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  const handleRegister = async () => {
    if (!form.email || !form.password || !form.username) { setError('Заполни все поля'); return }
    if (form.password.length < 6) { setError('Пароль минимум 6 символов'); return }
    setLoading(true); setError('')

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { username: form.username },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    })
    setLoading(false)
    if (error) { setError(error.message); return }

    // Save to our users table via API
    await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, username: form.username, supabaseId: data.user?.id }),
    })

    setInfo('✅ Проверь почту — мы отправили ссылку для подтверждения. После подтверждения ожидай одобрения администратора.')
    setTab('login')
  }

  const handleForgot = async () => {
    if (!form.email) { setError('Введи email'); return }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setLoading(false)
    if (error) setError(error.message)
    else setInfo('✅ Письмо для сброса пароля отправлено на ' + form.email)
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
              <button key={t} onClick={() => { setTab(t); setError(''); setInfo('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tab===t?'bg-accent text-black':'text-muted hover:text-[#e8eaf0]'}`}>{l}</button>
            ))}
          </div>

          {error && <div className="bg-danger/10 border border-danger/20 text-danger text-xs font-mono rounded-lg px-3 py-2.5 mb-4">{error}</div>}
          {info  && <div className="bg-success/10 border border-success/20 text-success text-xs font-mono rounded-lg px-3 py-2.5 mb-4">{info}</div>}

          <div className="mb-4">
            <label className="block text-[11px] font-mono text-muted uppercase tracking-widest mb-1.5">Email</label>
            <input className="input" type="email" placeholder="you@example.com" value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}/>
          </div>

          {tab === 'register' && (
            <div className="mb-4">
              <label className="block text-[11px] font-mono text-muted uppercase tracking-widest mb-1.5">Username</label>
              <input className="input" placeholder="myusername" value={form.username}
                onChange={e => setForm({...form, username: e.target.value})}/>
            </div>
          )}

          <div className="mb-2">
            <label className="block text-[11px] font-mono text-muted uppercase tracking-widest mb-1.5">Пароль</label>
            <input className="input" type="password" placeholder="••••••••" value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
              onKeyDown={e => e.key==='Enter' && (tab==='login' ? handleLogin() : handleRegister())}/>
          </div>

          {tab === 'login' && (
            <div className="text-right mb-4">
              <button onClick={handleForgot} className="text-[11px] font-mono text-accent hover:underline">
                Забыл пароль?
              </button>
            </div>
          )}

          {tab === 'login' ? (
            <button className="btn-primary w-full justify-center" onClick={handleLogin} disabled={loading}>
              {loading ? 'Входим...' : '→ Войти'}
            </button>
          ) : (
            <>
              <div className="mb-4"/>
              <button className="btn-primary w-full justify-center" onClick={handleRegister} disabled={loading}>
                {loading ? 'Регистрируемся...' : '→ Зарегистрироваться'}
              </button>
              <div className="mt-4 text-center text-[11px] font-mono text-muted">
                После регистрации нужно подтвердить email<br/>и ожидать одобрения администратора
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
