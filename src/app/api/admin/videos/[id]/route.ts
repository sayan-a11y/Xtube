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

    // Delete video file from R2
    if (video.filePath) {
      try {
        if (video.filePath.includes('http')) {
          await deleteFromR2(extractKey(video.filePath))
        }
      } catch (e) {
        console.error('Failed to delete video from R2:', e)
      }
    }

    // Delete thumbnail from R2
    if (video.thumbnail) {
      try {
        if (video.thumbnail.includes('http')) {
          await deleteFromR2(extractKey(video.thumbnail))
        }
      } catch (e) {
        console.error('Failed to delete thumbnail from R2:', e)
      }
    }

    // Delete HLS folder from R2
    if (video.hlsPath) {
      try {
        if (video.hlsPath.includes('http')) {
          await deletePrefixFromR2(`hls/${id}/`)
        }
      } catch (e) {
        console.error('Failed to delete HLS prefix from R2:', e)
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

