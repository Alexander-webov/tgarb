// Проверяет аккаунт перед любым действием и возвращает понятную ошибку

export function checkAccount(accounts) {
  if (!accounts || accounts.length === 0) {
    return { ok: false, error: 'Нет аккаунтов. Добавь аккаунт во вкладке «Аккаунты».' }
  }

  const active = accounts.find(a => a.status === 'ACTIVE')
  if (active) return { ok: true, account: active }

  const warming = accounts.find(a => a.status === 'WARMING')
  if (warming) return { ok: true, account: warming }

  const banned = accounts.filter(a => a.status === 'BANNED')
  const offline = accounts.filter(a => a.status === 'OFFLINE')
  const limited = accounts.filter(a => a.status === 'LIMITED')

  if (banned.length > 0 && offline.length === 0 && limited.length === 0) {
    const reason = banned[0].banReason || 'причина неизвестна'
    return { ok: false, error: `Аккаунт ${banned[0].phone} забанен (${reason}). Импортируй новый аккаунт.` }
  }
  if (limited.length > 0) {
    return { ok: false, error: `Аккаунт ${limited[0].phone} ограничен SpamBot. Подожди 24 часа или используй другой аккаунт.` }
  }
  if (offline.length > 0) {
    return { ok: false, error: `Аккаунт ${offline[0].phone} не подключён. Зайди в «Аккаунты» и нажми кнопку Wi-Fi.` }
  }

  return { ok: false, error: 'Нет подходящего аккаунта для этого действия.' }
}
