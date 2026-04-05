export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { accountPool } from '@/lib/telegram/client'
import { Api } from 'telegram/tl/index.js'

export async function POST(req) {
  const { target, reason, accountIds, message } = await req.json()
  if (!target || !accountIds?.length) return NextResponse.json({ error: 'target и accountIds обязательны' }, { status: 400 })

  const REASONS = {
    spam: new Api.InputReportReasonSpam(),
    violence: new Api.InputReportReasonViolence(),
    porn: new Api.InputReportReasonPornography(),
    childAbuse: new Api.InputReportReasonChildAbuse(),
    illegal: new Api.InputReportReasonIllegalDrugs(),
    other: new Api.InputReportReasonOther(),
  }
  const reportReason = REASONS[reason] || REASONS.spam
  const results = []

  for (const id of accountIds) {
    const client = await accountPool.getClient(id)
    if (!client) { results.push({ id, error: 'Нет подключения' }); continue }
    try {
      const entity = await client.getEntity(target)
      await client.invoke(new Api.account.ReportPeer({ peer: entity, reason: reportReason, message: message || '' }))
      results.push({ id, ok: true })
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000))
    } catch(e) {
      results.push({ id, error: e.message })
    }
  }
  return NextResponse.json({ results, sent: results.filter(r=>r.ok).length })
}
