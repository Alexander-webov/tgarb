export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { accountPool } from '@/lib/telegram/client'
import { Api } from 'telegram/tl/index.js'

export async function POST(req) {
  const { title, about, isChannel, accountId, username } = await req.json()
  const client = await accountPool.getClient(accountId)
  if (!client) return NextResponse.json({ error: 'Аккаунт не подключён' }, { status: 400 })

  try {
    let result
    if (isChannel) {
      result = await client.invoke(new Api.channels.CreateChannel({ title, about: about || '', broadcast: true, megagroup: false }))
      if (username) await client.invoke(new Api.channels.UpdateUsername({ channel: result.chats[0], username })).catch(() => {})
    } else {
      result = await client.invoke(new Api.messages.CreateChat({ title, users: [] }))
    }
    return NextResponse.json({ ok: true, chat: result.chats?.[0] || result, title })
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
