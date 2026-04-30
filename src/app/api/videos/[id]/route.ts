import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const video = await db.video.findUnique({ where: { id } })

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // Increment views
    await db.video.update({
      where: { id },
      data: { views: { increment: 1 } },
    })

    return NextResponse.json({ ...video, views: video.views + 1 })
  } catch (error) {
    console.error('Error fetching video:', error)
    return NextResponse.json({ error: 'Failed to fetch video' }, { status: 500 })
  }
}
