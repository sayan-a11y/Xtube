import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { unlink, rm } from 'fs/promises'
import { join } from 'path'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, description, category } = body

    const video = await db.video.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
      },
    })

    return NextResponse.json({ success: true, video })
  } catch (error) {
    console.error('Error updating video:', error)
    return NextResponse.json({ error: 'Failed to update video' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const video = await db.video.findUnique({ where: { id } })

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // Delete video file
    if (video.filePath) {
      const fileName = video.filePath.split('/').pop()
      try {
        await unlink(join(process.cwd(), 'public', 'storage', 'videos', fileName || ''))
      } catch (e) {
        console.error('Failed to delete video file:', e)
      }
    }

    // Delete thumbnail
    if (video.thumbnail) {
      const thumbName = video.thumbnail.split('/').pop()
      try {
        await unlink(join(process.cwd(), 'public', 'storage', 'thumbnails', thumbName || ''))
      } catch (e) {
        console.error('Failed to delete thumbnail:', e)
      }
    }

    // Delete HLS folder
    if (video.hlsPath) {
      try {
        await rm(join(process.cwd(), 'public', 'storage', 'hls', id), { recursive: true, force: true })
      } catch (e) {
        console.error('Failed to delete HLS folder:', e)
      }
    }

    // Delete from database
    await db.video.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting video:', error)
    return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 })
  }
}
