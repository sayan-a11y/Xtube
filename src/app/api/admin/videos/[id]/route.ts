import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { deleteFromR2, deletePrefixFromR2 } from '@/lib/r2'

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

    // Extract keys from URLs
    const extractKey = (url: string) => {
      if (url.includes('.r2.dev/')) {
        return url.split('.r2.dev/')[1]
      }
      return url.split('/').pop() || ''
    }

    // 1. Delete original video file
    if (video.filePath) {
      try {
        const key = extractKey(video.filePath)
        await deleteFromR2(key)
        console.log('Deleted original file:', key)
      } catch (e) {
        console.error('Failed to delete original file:', e)
      }
    }

    // 2. Delete all assets in the video's dedicated folder (HLS, thumbnails, sprites)
    try {
      // Everything related to the video is stored under videos/[id]/
      const folderPrefix = `videos/${id}/`
      await deletePrefixFromR2(folderPrefix)
      console.log('Deleted video assets folder:', folderPrefix)
    } catch (e) {
      console.error('Failed to delete video assets folder:', e)
    }

    // Delete from database
    await db.video.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting video:', error)
    return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 })
  }
}

