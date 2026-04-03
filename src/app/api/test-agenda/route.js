export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const mongoose = (await import('mongoose')).default
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL)
    }
    const col = mongoose.connection.db.collection('jobs')
    
    // Show ALL jobs sorted by insertion time
    const all = await col.find({}).sort({ _id: -1 }).limit(5).toArray()
    const total = await col.countDocuments()
    
    return NextResponse.json({ 
      total,
      latest5: all.map(j => ({
        _id: j._id,
        name: j.name,
        data: j.data,
        nextRunAt: j.nextRunAt,
        lockedAt: j.lockedAt,
        lastRunAt: j.lastRunAt,
        lastFinishedAt: j.lastFinishedAt,
      }))
    })
  } catch (err) {
    return NextResponse.json({ error: err.message })
  }
}
