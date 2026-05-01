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

    // 1. Prepare cleanup tasks
    const cleanupTasks: Promise<any>[] = []

    // Original file cleanup
    if (video.filePath) {
      const key = extractKey(video.filePath)
      cleanupTasks.push(deleteFromR2(key).catch(e => console.error('R2: Failed to delete original file:', e)))
    }

    // Folder (HLS/Assets) cleanup
    const folderPrefix = `videos/${id}/`
    cleanupTasks.push(deletePrefixFromR2(folderPrefix).catch(e => console.error('R2: Failed to delete prefix:', e)))

    // 2. Delete from database (Primary action)
    await db.video.delete({ where: { id } })

    // 3. Wait for cleanup tasks to complete (or at least start them)
    // We await them here to ensure the request doesn't end before they finish in some environments
    await Promise.allSettled(cleanupTasks)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting video:', error)
    return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 })
  }
}

