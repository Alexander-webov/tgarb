'use client'
// src/app/accounts/session-gen/page.jsx
import { useState } from 'react'
import { Phone, MessageSquare, Key, CheckCircle2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Layout, Topbar } from '@/components/layout/Layout'
import { FormField } from '@/components/ui'

const STEPS = [
  { id: 1, label: 'Телефон',  icon: Phone },
  { id: 2, label: 'Код',      icon: MessageSquare },
  { id: 3, label: 'Готово',   icon: CheckCircle2 },
]

export default function SessionGenPage() {
  const [step,     setStep]     = useState(1)
  const [phone,    setPhone]    = useState('')
  const [code,     setCode]     = useState('')
  const [password, setPassword] = useState('')
  const [need2FA,  setNeed2FA]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState(null)

  const handleSendCode = async () => {
    if (!phone) { toast.error('Введи номер телефона'); return }
    setLoading(true)
    const res = await fetch('/api/session-gen/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      toast.success('Код отправлен в Telegram')
      setStep(2)
    } else {
      toast.error(data.error || 'Ошибка')
    }
  }

  const handleConfirm = async () => {
    if (!code) { toast.error('Введи код из Telegram'); return }
    setLoading(true)
    const res = await fetch('/api/session-gen/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code, password: password || undefined }),
    })
    const data = await res.json()
    setLoading(false)

    if (data.needPassword) {
      setNeed2FA(true)
      toast('Введи пароль 2FA')
      return
    }
    if (res.ok && data.ok) {
      setResult(data)
      setStep(3)
      toast.success(data.message || 'Аккаунт добавлен!')
    } else {
      toast.error(data.error || 'Неверный код')
    }
  }

  return (
    <Layout>
      <Topbar
        title="Генератор Session"
        subtitle="Создать .session файл из номера телефона"
        actions={
          <Link href="/accounts" className="btn-ghost">
            <ArrowLeft size={14}/> К аккаунтам
          </Link>
        }
      />
      <div className="p-8 max-w-lg mx-auto">
        {/* Steps indicator */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                step === s.id ? 'bg-accent/10 border border-accent/30 text-accent' :
                step > s.id  ? 'bg-success/10 border border-success/30 text-success' :
                'bg-surface2 border border-border text-muted'
              }`}>
                <s.icon size={14}/>
                <span className="text-sm font-semibold">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 mx-1 ${step > s.id ? 'bg-success' : 'bg-border'}`}/>
              )}
            </div>
          ))}
        </div>

        <div className="card p-6">
          {/* Step 1 — Phone */}
          {step === 1 && (
            <div>
              <div className="text-base font-bold mb-1">Введи номер телефона</div>
              <p className="text-xs text-muted mb-5">
                Telegram отправит код подтверждения. Номер должен быть привязан к аккаунту Telegram.
              </p>
              <FormField label="Номер телефона (с кодом страны)">
                <input className="input text-lg tracking-wider" placeholder="+79991234567"
                       value={phone} onChange={e => setPhone(e.target.value)}
                       onKeyDown={e => e.key === 'Enter' && handleSendCode()}/>
              </FormField>
              <div className="bg-surface2 rounded-lg p-3 text-xs font-mono text-muted mb-4">
                ℹ️ Код придёт в приложение Telegram на этом номере, не в SMS
              </div>
              <button className="btn-primary w-full justify-center" onClick={handleSendCode} disabled={loading}>
                <Phone size={14}/> {loading ? 'Отправляем...' : 'Получить код'}
              </button>
            </div>
          )}

          {/* Step 2 — Code */}
          {step === 2 && (
            <div>
              <div className="text-base font-bold mb-1">Введи код из Telegram</div>
              <p className="text-xs text-muted mb-5">
                Открой Telegram на устройстве с номером <strong>{phone}</strong> — там будет сообщение с кодом.
              </p>
              <FormField label="Код подтверждения">
                <input className="input text-2xl tracking-[0.5em] text-center font-mono" placeholder="12345"
                       value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                       maxLength={6} onKeyDown={e => e.key === 'Enter' && !need2FA && handleConfirm()}/>
              </FormField>

              {need2FA && (
                <FormField label="Пароль 2FA (двухфакторная аутентификация)">
                  <input className="input" type="password" placeholder="Твой пароль Telegram"
                         value={password} onChange={e => setPassword(e.target.value)}
                         onKeyDown={e => e.key === 'Enter' && handleConfirm()}/>
                </FormField>
              )}

              <div className="flex gap-3">
                <button className="btn-ghost" onClick={() => { setStep(1); setCode(''); setNeed2FA(false) }}>
                  <ArrowLeft size={14}/> Назад
                </button>
                <button className="btn-primary flex-1 justify-center" onClick={handleConfirm} disabled={loading}>
                  <MessageSquare size={14}/> {loading ? 'Проверяем...' : 'Подтвердить'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Done */}
          {step === 3 && result && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-success/10 border border-success/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-success"/>
              </div>
              <div className="text-base font-bold mb-1">Аккаунт добавлен!</div>
              <p className="text-sm text-muted mb-5">
                {result.username ? `@${result.username}` : phone} успешно авторизован и добавлен в систему.
              </p>
              <div className="bg-surface2 rounded-lg p-3 text-xs font-mono text-muted mb-5 text-left">
                <div className="text-success mb-1">✓ Session создан</div>
                <div className="text-success mb-1">✓ Аккаунт сохранён в БД</div>
                <div className="text-warning">⚡ Рекомендуем запустить прогрев</div>
              </div>
              <div className="flex gap-3">
                <Link href="/warmup" className="btn-primary flex-1 justify-center">
                  🔥 Запустить прогрев
                </Link>
                <button className="btn-ghost" onClick={() => { setStep(1); setPhone(''); setCode(''); setResult(null) }}>
                  + Ещё аккаунт
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info block */}
        {step === 1 && (
          <div className="mt-5 card p-4">
            <div className="text-sm font-bold mb-3">Зачем это нужно?</div>
            <div className="space-y-2 text-xs text-muted">
              <p>Вместо покупки готовых аккаунтов с .session файлами (~$5-15/шт) ты можешь использовать свои номера телефонов.</p>
              <p>Купи SIM-карты или возьми свои номера → авторизуй их здесь → получи .session файл автоматически.</p>
              <p className="text-accent">Экономия: в 3-5 раз дешевле чем покупать готовые аккаунты.</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
