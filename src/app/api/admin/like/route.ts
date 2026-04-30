import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { videoId } = body

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })
    }

    const video = await db.video.update({
      where: { id: videoId },
      data: { likes: { increment: 1 } },
    })

    return NextResponse.json({ success: true, likes: video.likes })
  } catch (error) {
    console.error('Error liking video:', error)
    return NextResponse.json({ error: 'Failed to like video' }, { status: 500 })
  }
}
