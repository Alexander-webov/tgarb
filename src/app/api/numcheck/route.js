export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { accountPool } from '@/lib/telegram/client'
import { Api } from 'telegram/tl/index.js'

export async function POST(req) {
  const { phones, accountId } = await req.json()
  if (!phones?.length || !accountId) return NextResponse.json({ error: 'phones and accountId required' }, { status: 400 })

  const client = await accountPool.getClient(accountId)
  if (!client) return NextResponse.json({ error: 'Аккаунт не подключён' }, { status: 400 })

  const results = []
  // Process in batches of 100
  for (let i = 0; i < phones.length; i += 100) {
    const batch = phones.slice(i, i + 100)
    try {
      const contacts = batch.map((p, j) => new Api.InputPhoneContact({
        clientId: BigInt(j), phone: p.startsWith('+') ? p : '+' + p,
        firstName: '', lastName: ''
      }))
      const res = await client.invoke(new Api.contacts.ImportContacts({ contacts }))
      for (const u of res.users) {
        results.push({ phone: u.phone || batch[0], exists: true, username: u.username, firstName: u.firstName, lastName: u.lastName, tgId: u.id.toString() })
        await prisma.numberCheck.upsert({
          where: { phone: u.phone || batch[0] },
          create: { phone: u.phone || batch[0], exists: true, username: u.username, firstName: u.firstName, lastName: u.lastName },
          update: { exists: true, username: u.username, firstName: u.firstName, lastName: u.lastName }
        }).catch(() => {})
      }
      // Mark not found
      const found = res.users.map(u => u.phone)
      for (const p of batch) {
        if (!found.includes(p)) results.push({ phone: p, exists: false })
      }
      await client.invoke(new Api.contacts.DeleteContacts({ id: res.users.map(u => u) })).catch(() => {})
    } catch(e) {
      results.push(...batch.map(p => ({ phone: p, error: e.message })))
    }
  }
  return NextResponse.json({ results, total: results.length, found: results.filter(r=>r.exists).length })
}
