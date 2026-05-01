import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, readdir, readFile, rm } from 'fs/promises'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { randomUUID } from 'crypto'
import { uploadToR2 } from '@/lib/r2'

const execAsync = promisify(exec)

export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    
    // Handle Direct Sync (JSON)
    if (contentType.includes('application/json')) {
      const { id, title, description, category, filePath, thumbnail, hlsPath, size, duration } = await request.json()
      
      const video = await db.video.create({
        data: {
          id: id || randomUUID(),
          title,
          description: description || '',
          category: category || 'Uncategorized',
          filePath,
          thumbnail: thumbnail || 'https://via.placeholder.com/640x360?text=No+Thumbnail',
          hlsPath: hlsPath || '',
          duration: duration || '0:00',
          size: size || 0,
        },
      })
      return NextResponse.json({ success: true, video })
    }

    // Handle Multipart Upload (Fallback/Legacy)
    const formData = await request.formData()
    const file = formData.get('video') as File | null
    const title = formData.get('title') as string
    const description = (formData.get('description') as string) || ''
    const category = (formData.get('category') as string) || 'Uncategorized'

    if (!file) return NextResponse.json({ error: 'No video file provided' }, { status: 400 })
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

    const videoId = randomUUID()
    const ext = file.name.split('.').pop() || 'mp4'
    const fileName = `${videoId}.${ext}`
    const tempDir = join(process.cwd(), 'tmp-uploads', videoId)
    await mkdir(tempDir, { recursive: true })
    const videoPath = join(tempDir, fileName)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(videoPath, buffer)

    const videoR2Url = await uploadToR2(buffer, `videos/${fileName}`, file.type || 'video/mp4')
    
    const video = await db.video.create({
      data: {
        id: videoId,
        title,
        description,
        category,
        filePath: videoR2Url,
        thumbnail: 'https://via.placeholder.com/640x360?text=No+Thumbnail',
        hlsPath: '',
        duration: '0:00',
        size: buffer.length,
      },
    })

    try { await rm(tempDir, { recursive: true, force: true }) } catch {}

    return NextResponse.json({ success: true, video })
  } catch (error) {
    console.error('Upload/Sync error:', error)
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
  }
}

