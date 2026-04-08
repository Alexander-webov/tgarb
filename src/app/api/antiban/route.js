export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAccountsHealthReport } from '@/lib/antiban'

export async function GET() {
  const report = await getAccountsHealthReport()
  return NextResponse.json(report)
}
