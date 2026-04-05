export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { accountPool } from '@/lib/telegram/client'
import { Api } from 'telegram/tl/index.js'

export async function POST(req) {
  const { accountIds } = await req.json()
  const results = []

  for (const id of accountIds) {
    const client = await accountPool.getClient(id)
    if (!client) { results.push({ id, error: 'Нет подключения' }); continue }
    try {
      await client.invoke(new Api.auth.ResetAuthorizations())
      results.push({ id, ok: true, message: 'Все сторонние сессии закрыты' })
    } catch(e) {
      results.push({ id, error: e.message })
    }
  }
  return NextResponse.json({ results })
}
