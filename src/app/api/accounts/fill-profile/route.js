export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { accountPool } from '@/lib/telegram/client'
import { Api } from 'telegram/tl/index.js'

const RU_NAMES_M = ['Александр','Михаил','Иван','Дмитрий','Андрей','Сергей','Алексей','Артём','Максим','Никита']
const RU_NAMES_F = ['Мария','Анна','Татьяна','Елена','Ольга','Наталья','Екатерина','Алина','Дарья','Юлия']
const LAST_NAMES = ['Иванов','Смирнов','Кузнецов','Попов','Васильев','Петров','Соколов','Михайлов','Новиков','Федоров']

export async function POST(req) {
  const { accountIds, gender, setUsername, firstName: customFirst, lastName: customLast } = await req.json()
  const results = []

  for (const id of accountIds) {
    const client = await accountPool.getClient(id)
    if (!client) { results.push({ id, error: 'Нет подключения' }); continue }

    try {
      const pool = gender === 'male' ? RU_NAMES_M : gender === 'female' ? RU_NAMES_F : [...RU_NAMES_M, ...RU_NAMES_F]
      const first = customFirst || pool[Math.floor(Math.random() * pool.length)]
      const last = customLast || LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]

      await client.invoke(new Api.account.UpdateProfile({ firstName: first, lastName: last }))

      if (setUsername) {
        const username = `${first.toLowerCase()}${Math.floor(Math.random() * 9999)}`
        await client.invoke(new Api.account.UpdateUsername({ username })).catch(() => {})
      }

      await prisma.tgAccount.update({ where: { id }, data: { firstName: first } })
      results.push({ id, ok: true, name: `${first} ${last}` })
    } catch(e) {
      results.push({ id, error: e.message })
    }
  }
  return NextResponse.json({ results })
}
