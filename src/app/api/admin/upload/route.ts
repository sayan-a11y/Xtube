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
    const formData = await request.formData()
    const file = formData.get('video') as File | null
    const title = formData.get('title') as string
    const description = (formData.get('description') as string) || ''
    const category = (formData.get('category') as string) || 'Uncategorized'

    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 })
    }

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const videoId = randomUUID()
    const ext = file.name.split('.').pop() || 'mp4'
    const fileName = `${videoId}.${ext}`

    // Create a temporary directory for processing
    const tempDir = join(process.cwd(), 'tmp-uploads', videoId)
    await mkdir(tempDir, { recursive: true })
    const videoPath = join(tempDir, fileName)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(videoPath, buffer)

    // 1. Upload original video to R2
    const videoR2Url = await uploadToR2(buffer, `videos/${fileName}`, file.type || 'video/mp4')

    const thumbnailPath = join(tempDir, `${videoId}.jpg`)
    
    // 2. Generate thumbnail and metadata with ffmpeg
    let duration = '0:00'
    try {
      const { stdout: durOut } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
      )
      const durSec = parseFloat(durOut.trim())
      if (!isNaN(durSec)) {
        const mins = Math.floor(durSec / 60)
        const secs = Math.floor(durSec % 60)
        duration = `${mins}:${secs.toString().padStart(2, '0')}`
      }

      const seekTime = Math.max(2, durSec * 0.1)
      await execAsync(
        `ffmpeg -y -ss ${seekTime} -i "${videoPath}" -vframes 1 -q:v 2 -vf "scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2" "${thumbnailPath}"`
      )
    } catch (err) {
      console.error('Thumbnail/duration generation failed:', err)
      try {
        await execAsync(
          `ffmpeg -y -i "${videoPath}" -vframes 1 -q:v 2 -vf "scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2" "${thumbnailPath}"`
        )
      } catch (e) {
        console.error('Fallback thumbnail failed:', e)
      }
    }

    // 3. Upload thumbnail to R2
    let thumbnailUrl = ''
    try {
      const thumbBuffer = await readFile(thumbnailPath)
      thumbnailUrl = await uploadToR2(thumbBuffer, `thumbnails/${videoId}.jpg`, 'image/jpeg')
    } catch (err) {
      console.error('Thumbnail upload failed:', err)
    }

    // 4. Generate and upload HLS stream
    const hlsDir = join(tempDir, 'hls')
    let hlsR2Url = ''
    try {
      await mkdir(hlsDir, { recursive: true })
      await execAsync(
        `ffmpeg -y -i "${videoPath}" -codec:v libx264 -codec:a aac -start_number 0 -hls_time 10 -hls_list_size 0 -f hls -vf "scale=-2:720" "${join(hlsDir, 'index.m3u8')}"`
      )
      
      const files = await readdir(hlsDir)
      for (const f of files) {
        const fPath = join(hlsDir, f)
        const fBuffer = await readFile(fPath)
        const contentType = f.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T'
        const r2Path = await uploadToR2(fBuffer, `hls/${videoId}/${f}`, contentType)
        if (f === 'index.m3u8') {
          hlsR2Url = r2Path
        }
      }
    } catch (err) {
      console.error('HLS conversion/upload failed:', err)
    }

    // 5. Save to database
    const video = await db.video.create({
      data: {
        id: videoId,
        title,
        description,
        category,
        filePath: videoR2Url,
        thumbnail: thumbnailUrl,
        hlsPath: hlsR2Url,
        duration,
        size: buffer.length,
      },
    })

    // 6. Clean up temporary directory
    try {
      await rm(tempDir, { recursive: true, force: true })
    } catch (err) {
      console.error('Temp cleanup failed:', err)
    }

    return NextResponse.json({ success: true, video })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

