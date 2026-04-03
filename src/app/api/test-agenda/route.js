export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const MONGODB_URL = process.env.MONGODB_URL
    if (!MONGODB_URL) return NextResponse.json({ error: 'No MONGODB_URL' })

    const mongoose = (await import('mongoose')).default
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URL)
    }

    const col = mongoose.connection.db.collection('jobs')
    const result = await col.insertOne({
      name: 'warmup_step',
      data: { accountId: 6 },
      type: 'normal',
      priority: 0,
      nextRunAt: new Date(),
      lockedAt: null,
      lastRunAt: null,
      lastFinishedAt: null,
      failCount: 0,
    })

    const count = await col.countDocuments()
    const recent = await col.find({}).sort({ _id: -1 }).limit(3).toArray()
    
    return NextResponse.json({ 
      ok: true, 
      inserted: result.insertedId.toString(),
      totalJobs: count,
      recentJobs: recent.map(j => ({ name: j.name, nextRunAt: j.nextRunAt, lockedAt: j.lockedAt })),
      mongoUrl: MONGODB_URL.replace(/:([^@]+)@/, ':***@')
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
